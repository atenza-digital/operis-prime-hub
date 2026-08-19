import express from "express";
import cors from "cors";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { authenticateToken, changePassword, hashPassword, loginWithPassword, normalizeEmail, revokeSession } from "./auth.mjs";
import { ensureDatabaseShape, pool, query, withTransaction } from "./db.mjs";
import { assertCertificateSource, resolveCertificateSource } from "./certificate-rules.mjs";
import { buildAttachmentSecurityMetadata, createAttachmentStoragePlan, persistAttachmentContent, readAttachmentContentFromStorage, resolveAttachmentPolicy, validateAttachmentPayload } from "./storage.mjs";
import { buildProposalCatalogContext, extractProposalPdfDeterministically, generateProposalAssistDraft, normalizeProposalAssistDraft } from "./proposal-ai.mjs";
import { normalizeCommercialConfig, normalizeTenantSlug } from "./commercial-config.mjs";
import { sanitizeContracts, sanitizeContractTemplates, sanitizeMeasurements } from "./commercial-visibility.mjs";
import { renderHtmlToPdf } from "./render-pdf.mjs";
import { validateScheduleOrigin } from "./schedule-rules.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT || 3001);
const MEASUREMENT_FINANCIAL_STATUSES = new Set([
  "em_conferencia",
  "emitida",
  "enviada_ao_cliente",
  "aceita",
  "aguardando_nf",
  "nf_registrada",
  "nf_enviada",
  "aguardando_pagamento",
  "paga",
  "pago_no_erp",
  "pendente_cliente",
  "cancelada",
  "substituida",
]);
const COMMERCIAL_DOCUMENT_TEMPLATES = {
  proposta: { code: "proposta-comercial", version: "p0-ciperprag-v1" },
  contrato: { code: "contrato-prestacao-servicos", version: "p0-ciperprag-v1" },
  minuta: { code: "minuta-contrato-cliente", version: "p0-ciperprag-v1" },
};

function buildProposalPdfCoverage(deterministic, aiCoverage = {}) {
  return {
    paginasAnalisadas: deterministic?.paginasAnalisadas ?? aiCoverage.paginasAnalisadas ?? null,
    tabelasEncontradas: Math.max(Number(deterministic?.tabelasEncontradas || 0), Number(aiCoverage.tabelasEncontradas || 0)),
    itensExtraidos: Math.max(Number(deterministic?.itensExtraidos || 0), Number(aiCoverage.itensExtraidos || 0)),
    regrasFrequencia: Array.isArray(aiCoverage.regrasFrequencia) ? aiCoverage.regrasFrequencia : [],
    camposNaoInterpretados: Array.isArray(aiCoverage.camposNaoInterpretados) ? aiCoverage.camposNaoInterpretados : [],
  };
}

app.use(cors());
app.use(express.json({ limit: "15mb" }));

function getRequestIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket.remoteAddress || null;
}

function getPublicBaseUrl(req) {
  const configured = process.env.PUBLIC_APP_URL || process.env.APP_PUBLIC_URL || process.env.APP_URL;
  if (configured) return String(configured).replace(/\/+$/, "");
  const proto = String(req?.headers?.["x-forwarded-proto"] || req?.protocol || "http").split(",")[0].trim();
  const host = String(req?.headers?.["x-forwarded-host"] || req?.headers?.host || "").split(",")[0].trim();
  return host ? `${proto}://${host}` : "http://localhost:3001";
}

async function getCommercialConfig(tenantId, tenantSlug) {
  const { rows } = await query(
    "SELECT commercial_config FROM ciperprag_hub.empresa_config WHERE tenant_id = $1 ORDER BY id LIMIT 1",
    [tenantId],
  );
  return normalizeCommercialConfig(rows[0]?.commercial_config, tenantSlug);
}

function getTenantSlugFromRequest(req) {
  const explicit = normalizeTenantSlug(req.query.tenant || req.query.tenantSlug || req.headers["x-tenant-slug"]);
  if (explicit) return explicit;

  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "")
    .split(",")[0]
    .trim()
    .split(":")[0]
    .toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || /^[\d.]+$/.test(host)) return null;

  const baseDomain = String(process.env.SAAS_BASE_DOMAIN || "").trim().toLowerCase();
  if (baseDomain && host.endsWith(`.${baseDomain}`)) {
    return normalizeTenantSlug(host.slice(0, -(baseDomain.length + 1)).split(".").pop());
  }

  return normalizeTenantSlug(host.split(".")[0]);
}

function getBearerToken(req) {
  const authorization = String(req.headers.authorization || "");
  if (!authorization.toLowerCase().startsWith("bearer ")) return null;
  return authorization.slice(7).trim();
}

async function requireAuth(req, res, next) {
  try {
    const auth = await authenticateToken(getBearerToken(req));
    if (!auth) return res.status(401).json({ error: "Sessao expirada ou nao autenticada." });
    req.auth = auth;
    return next();
  } catch (error) {
    return next(error);
  }
}

function requirePermission(...permissions) {
  return (req, res, next) => {
    if (req.auth?.user?.senhaTemporaria) {
      return res.status(428).json({ error: "Troca de senha obrigatoria antes de continuar." });
    }
    const granted = new Set(req.auth?.user?.permissoes || []);
    if (permissions.some((permission) => granted.has(permission))) return next();
    return res.status(403).json({ error: "Usuario sem permissao para esta acao." });
  };
}

function addDays(dateStr, days) {
  const date = new Date(`${dateStr}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function buildCertificateStatus(dataExecucao, validadeDias) {
  if (!validadeDias) return "valid";
  const expiry = new Date(`${addDays(dataExecucao, validadeDias)}T23:59:59`);
  return expiry.getTime() < Date.now() ? "expired" : "valid";
}

async function generateUniqueCertificateHash(db = { query }) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 12; attempt += 1) {
    let suffix = "";
    for (let index = 0; index < 8; index += 1) {
      suffix += chars[Math.floor(Math.random() * chars.length)];
    }
    const hash = `HSH-${new Date().getFullYear()}-${suffix.slice(0, 4)}-${suffix.slice(4)}`;
    const { rows } = await db.query("SELECT 1 FROM ciperprag_hub.certificados WHERE hash = $1 LIMIT 1", [hash]);
    if (!rows.length) return hash;
  }
  throw new Error("Nao foi possivel gerar um hash unico para o certificado.");
}

function currentTenantDate(timeZone = "America/Fortaleza") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function minIsoDate(left, right) {
  if (!left) return right;
  if (!right) return left;
  return left <= right ? left : right;
}

function moneyLineTotal(quantity, unitValue) {
  const normalizedQuantity = Number(quantity || 0);
  const unitValueCents = Math.round(Number(unitValue || 0) * 100);
  return Math.round(normalizedQuantity * unitValueCents) / 100;
}

function buildShortPublicCertificateCode(hash) {
  const clean = String(hash || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  let first = 0x811c9dc5;
  let second = 0x45d9f3b;
  for (const char of clean) {
    first = Math.imul(first ^ char.charCodeAt(0), 16777619) >>> 0;
    second = Math.imul(second + char.charCodeAt(0), 2654435761) >>> 0;
  }
  const partA = first.toString(36).toUpperCase().padStart(4, "0").slice(-4);
  const partB = second.toString(36).toUpperCase().padStart(4, "0").slice(-4);
  return `${partA}-${partB}`;
}

function certificateSnapshotSha256(snapshot) {
  return crypto.createHash("sha256").update(JSON.stringify(snapshot), "utf8").digest("hex");
}

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

function formatSequential(format, value) {
  const year = new Date().getFullYear();
  return String(format || "CERT-{SEQ}/{ANO}")
    .replaceAll("{SEQ}", String(value).padStart(3, "0"))
    .replaceAll("{ANO}", String(year));
}

function assertTenantWrite(rowCount, entityName) {
  if (rowCount > 0) return;
  const error = new Error(`${entityName} nao encontrado neste tenant ou pertence a outro tenant.`);
  error.status = 404;
  throw error;
}

function normalizeOptionalText(value, maxLength = 500) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text.slice(0, maxLength) : null;
}

function normalizeOptionalDate(value) {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const error = new Error("Data invalida. Use o formato AAAA-MM-DD.");
    error.status = 400;
    throw error;
  }
  return text;
}

function normalizeJsonArray(value) {
  if (!value) return [];
  const source = Array.isArray(value) ? value : [value];
  return source
    .map((item) => {
      if (item === null || item === undefined || item === "") return null;
      if (typeof item !== "string") return item;
      try {
        return JSON.parse(item);
      } catch {
        return { nome: item };
      }
    })
    .filter(Boolean);
}

function htmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function htmlList(items = []) {
  return items.length ? `<ul>${items.map((item) => `<li>${htmlEscape(item)}</li>`).join("")}</ul>` : "<p>-</p>";
}

function encodeHtmlDocument(html) {
  const base64 = Buffer.from(html, "utf8").toString("base64");
  return {
    dataUrl: `data:text/html;base64,${base64}`,
    bytes: Buffer.byteLength(html, "utf8"),
    hash: crypto.createHash("sha256").update(html, "utf8").digest("hex"),
  };
}

function decodeStoredAttachmentContent(content) {
  const value = String(content || "");
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], buffer: Buffer.from(match[2], "base64") };
  }
  return { mimeType: null, buffer: Buffer.from(value, "utf8") };
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map((item) => canonicalJson(item));
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = canonicalJson(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function snapshotHash(snapshot) {
  return sha256Hex(JSON.stringify(canonicalJson(snapshot || {})));
}

function encodeBinaryDocument(buffer, mimeType) {
  return {
    dataUrl: `data:${mimeType};base64,${buffer.toString("base64")}`,
    bytes: buffer.length,
    hash: sha256Hex(buffer),
  };
}


function createPdfBuffer() {
  throw new Error("PDF server-side por desenho manual desativado. Usar template visual aprovado.");
}

function drawLabelValue(doc, label, value, x, y, width = 240) {
  doc.fontSize(7).fillColor("#64748b").text(label.toUpperCase(), x, y, { width });
  doc.fontSize(9).fillColor("#0f172a").text(String(value || "-"), x, y + 10, { width });
}

function formatDateBr(value) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(`${String(value).split("T")[0]}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("pt-BR");
}

function formatCurrencyBr(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function safeFileNamePart(value) {
  return String(value || "documento").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 80);
}

function imageBufferFromDataUrl(value) {
  const match = String(value || "").match(/^data:image\/(?:png|jpe?g);base64,(.+)$/i);
  return match ? Buffer.from(match[1], "base64") : null;
}

function drawCompanyHeader(doc, company, { x, y, width, logoWidth = 92 }) {
  const logoBuffer = imageBufferFromDataUrl(company.logoUrl);
  let textX = x;
  let textWidth = width;
  if (logoBuffer) {
    doc.image(logoBuffer, x, y, { fit: [logoWidth, 42], align: "left", valign: "center" });
    textX = x + logoWidth + 16;
    textWidth = Math.max(160, width - logoWidth - 16);
  }
  doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(12).text(company.razaoSocial || company.nomeFantasia || "Empresa emissora", textX, y, { width: textWidth, lineGap: 1 });
  doc.font("Helvetica").fontSize(8).fillColor("#475569").text([company.cnpj ? `CNPJ ${company.cnpj}` : null, company.endereco].filter(Boolean).join(" | "), textX, y + 38, { width: textWidth });
}

async function saveImmutablePdfAttachment(client, { tenantId, tenantSlug, userId, entityType, entityId, fileName, pdfBuffer, snapshot, template, metadata = {} }) {
  const encoded = encodeBinaryDocument(pdfBuffer, "application/pdf");
  const snapHash = snapshotHash(snapshot);
  const storageTarget = createAttachmentStoragePlan({
    tenantSlug,
    entityType,
    entityId,
    category: "pdf_historico",
    fileName,
    hashSha256: encoded.hash,
  });
  const persisted = await persistAttachmentContent({
    storagePlan: storageTarget,
    buffer: pdfBuffer,
    contentBase64: encoded.dataUrl,
    mimeType: "application/pdf",
    hashSha256: encoded.hash,
    fileName,
    metadata: {
      ...metadata,
      formato: "pdf_server_side",
      hashSha256: encoded.hash,
      snapshotHashSha256: snapHash,
      templateCodigo: template.code,
      templateVersao: template.version,
    },
  });
  await client.query(
    `INSERT INTO ciperprag_hub.evidencias_anexos
     (id, tenant_id, entidade_tipo, entidade_id, categoria, nome_arquivo, mime_type, tamanho_bytes, conteudo_base64, metadados, hash_sha256, snapshot_hash_sha256, template_codigo, template_versao, storage_provider, storage_bucket, storage_key, storage_etag, imutavel, criado_por)
     VALUES ($1,$2,$3,$4,'pdf_historico',$5,'application/pdf',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,TRUE,$16)
     ON CONFLICT (id) DO NOTHING`,
    [
      makeId("PDF"),
      tenantId,
      entityType,
      entityId,
      fileName,
      encoded.bytes,
      persisted.contentBase64,
      JSON.stringify(persisted.metadata),
      encoded.hash,
      snapHash,
      template.code,
      template.version,
      persisted.provider,
      persisted.bucket,
      persisted.key,
      persisted.etag,
      userId || null,
    ],
  );
  return { hashSha256: encoded.hash, snapshotHashSha256: snapHash, bytes: encoded.bytes, storageProvider: persisted.provider };
}

async function buildMeasurementPdfBuffer(snapshot, measurement) {
  throw new Error("PDF server-side da medicao deve reproduzir o layout aprovado antes de ser habilitado.");
  return createPdfBuffer((doc) => {
    const company = snapshot.empresa || {};
    const client = snapshot.cliente || {};
    const itens = snapshot.itens || [];
    const primary = "#065f46";
    const pageWidth = doc.page.width;
    const left = 36;
    const right = pageWidth - 36;
    let y = 36;

    doc.rect(0, 0, pageWidth, 108).fill("#f8fafc");
    doc.rect(0, 0, 12, doc.page.height).fill(primary);
    drawCompanyHeader(doc, company, { x: left, y, width: 360 });
    doc.font("Helvetica-Bold").fontSize(22).fillColor(primary).text("Medição", right - 190, y, { width: 190, align: "right" });
    doc.font("Helvetica-Bold").fontSize(22).fillColor(primary).text("de Serviços", right - 190, y + 26, { width: 190, align: "right" });
    doc.font("Helvetica").fontSize(9).fillColor("#475569").text(measurement.numero || snapshot.numero || "-", right - 190, y + 56, { width: 190, align: "right" });

    y = 132;
    doc.roundedRect(left, y, right - left, 88, 12).strokeColor("#d9e2e7").lineWidth(1).stroke();
    drawLabelValue(doc, "Cliente", client.nome || measurement.cliente_nome, left + 16, y + 16, 245);
    drawLabelValue(doc, "CNPJ", client.cnpj || measurement.cliente_cnpj, left + 280, y + 16, 130);
    drawLabelValue(doc, "Período", `${formatDateBr(snapshot.periodo?.inicio || measurement.periodo_inicio)} a ${formatDateBr(snapshot.periodo?.fim || measurement.periodo_fim)}`, left + 425, y + 16, 110);
    drawLabelValue(doc, "Endereço", client.endereco || measurement.cliente_endereco, left + 16, y + 52, 360);
    drawLabelValue(doc, "Forma de pagamento", snapshot.formaPagamento || measurement.forma_pagamento, left + 390, y + 52, 145);

    y += 118;
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#0f172a").text("Serviços executados", left, y);
    y += 22;
    const cols = { item: left, servico: left + 36, os: left + 258, data: left + 335, qtd: left + 400, total: left + 468 };
    doc.rect(left, y, right - left, 22).fill("#e7f5ee");
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#064e3b");
    doc.text("Item", cols.item + 6, y + 7, { width: 28 });
    doc.text("Descrição", cols.servico, y + 7, { width: 210 });
    doc.text("OS", cols.os, y + 7, { width: 70 });
    doc.text("Data", cols.data, y + 7, { width: 60 });
    doc.text("Qtd.", cols.qtd, y + 7, { width: 55, align: "right" });
    doc.text("Total", cols.total, y + 7, { width: 60, align: "right" });
    y += 22;

    itens.forEach((item, index) => {
      const rowHeight = 36;
      if (y + rowHeight > 700) {
        doc.addPage();
        y = 42;
      }
      doc.rect(left, y, right - left, rowHeight).fill(index % 2 ? "#ffffff" : "#fbfdff");
      doc.font("Helvetica").fontSize(8).fillColor("#0f172a");
      doc.text(String(index + 1).padStart(2, "0"), cols.item + 6, y + 10, { width: 28 });
      doc.text(item.servico || "-", cols.servico, y + 8, { width: 210, height: 24 });
      doc.text(item.osNumero || "-", cols.os, y + 10, { width: 70 });
      doc.text(formatDateBr(item.dataExecucao), cols.data, y + 10, { width: 60 });
      doc.text(`${Number(item.quantidade || 0).toLocaleString("pt-BR")} ${item.unidade || ""}`.trim(), cols.qtd, y + 10, { width: 55, align: "right" });
      doc.font("Helvetica-Bold").text(formatCurrencyBr(item.valorTotal), cols.total, y + 10, { width: 60, align: "right" });
      doc.moveTo(left, y + rowHeight).lineTo(right, y + rowHeight).strokeColor("#e2e8f0").stroke();
      y += rowHeight;
    });

    y += 18;
    doc.roundedRect(right - 200, y, 200, 48, 10).fill(primary);
    doc.font("Helvetica").fontSize(9).fillColor("#d1fae5").text("Total da medição", right - 184, y + 10, { width: 168 });
    doc.font("Helvetica-Bold").fontSize(18).fillColor("#ffffff").text(formatCurrencyBr(snapshot.total || measurement.total), right - 184, y + 24, { width: 168, align: "right" });

    const footerY = 760;
    const snapHash = snapshotHash(snapshot);
    doc.font("Helvetica").fontSize(7).fillColor("#64748b").text(`Template ${DOCUMENT_TEMPLATE_VERSIONS.measurementPdf.code} v${DOCUMENT_TEMPLATE_VERSIONS.measurementPdf.version} | Snapshot ${snapHash.slice(0, 16)}...`, left, footerY, { width: 360 });
    doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, right - 180, footerY, { width: 180, align: "right" });
  });
}

async function buildCertificatePdfBuffer(snapshot, certificate, { validationUrl }) {
  throw new Error("PDF server-side do certificado deve usar o modelo Ciperprag aprovado antes de ser habilitado.");
  const qrDataUrl = await QRCode.toDataURL(validationUrl, { width: 180, margin: 1 });
  const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");
  return createPdfBuffer((doc) => {
    const company = snapshot.empresa || {};
    const client = snapshot.cliente || {};
    const service = snapshot.servico || {};
    const os = snapshot.os || {};
    const cert = snapshot.certificado || {};
    const primary = "#065f46";
    const pageWidth = doc.page.width;
    const left = 42;
    const right = pageWidth - 42;

    doc.rect(0, 0, pageWidth, doc.page.height).fill("#ffffff");
    doc.rect(0, 0, pageWidth, 92).fill("#f4fbf7");
    doc.circle(pageWidth - 28, 28, 72).fill("#0f6b4f");
    drawCompanyHeader(doc, company, { x: left, y: 32, width: 390 });

    doc.font("Helvetica-Bold").fontSize(27).fillColor(primary).text("Certificado de Execução", left, 128, { width: right - left, align: "center" });
    doc.font("Helvetica").fontSize(10).fillColor("#64748b").text(`Nº ${certificate.numero || cert.numero || "-"} | Código ${certificate.hash || cert.hash || "-"}`, left, 164, { width: right - left, align: "center" });

    doc.roundedRect(left, 205, right - left, 150, 14).strokeColor("#d9e2e7").lineWidth(1).stroke();
    doc.font("Helvetica").fontSize(12).fillColor("#0f172a").text("Certificamos que o cliente abaixo recebeu o serviço técnico descrito neste documento, conforme dados registrados no sistema.", left + 22, 226, { width: right - left - 44, align: "center" });
    drawLabelValue(doc, "Cliente", client.nome || certificate.cliente_nome, left + 24, 276, 260);
    drawLabelValue(doc, "CNPJ", client.cnpj || certificate.cliente_cnpj, left + 304, 276, 130);
    drawLabelValue(doc, "Data de execução", formatDateBr(os.dataExecucao || certificate.data_execucao), left + 448, 276, 80);
    drawLabelValue(doc, "Endereço", client.endereco || certificate.cliente_endereco, left + 24, 314, 320);
    drawLabelValue(doc, "Validade", cert.validadeAte ? formatDateBr(cert.validadeAte) : "Indeterminada", left + 360, 314, 170);

    doc.roundedRect(left, 382, right - left, 120, 14).fill("#f8fafc").strokeColor("#e2e8f0").stroke();
    drawLabelValue(doc, "Serviço", service.nome || certificate.servico, left + 24, 404, 280);
    drawLabelValue(doc, "Ordem de serviço", os.numero || certificate.os_numero, left + 324, 404, 110);
    drawLabelValue(doc, "Local de execução", os.localExecucao || certificate.local_execucao, left + 24, 442, 225);
    drawLabelValue(doc, "Técnico responsável", os.tecnicoNome || certificate.tecnico_nome, left + 270, 442, 150);
    drawLabelValue(doc, "Tag/equipamento", os.tagEquipamentoServico || "-", left + 438, 442, 90);

    doc.image(qrBuffer, left, 542, { width: 92, height: 92 });
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a").text("Validação pública", left + 112, 548, { width: 260 });
    doc.font("Helvetica").fontSize(8).fillColor("#475569").text("Leia o QR Code ou confira o código na rota pública de validação. O certificado só deve ser aceito quando os dados desta consulta coincidirem com o documento apresentado.", left + 112, 566, { width: 300 });
    doc.font("Helvetica-Bold").fontSize(8).fillColor(primary).text(validationUrl, left + 112, 612, { width: 360 });

    doc.moveTo(left + 270, 700).lineTo(right - 40, 700).strokeColor("#0f172a").stroke();
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f172a").text(company.responsavelExecucao || company.responsavelTecnico || "Responsável técnico", left + 270, 708, { width: right - left - 230, align: "center" });
    doc.font("Helvetica").fontSize(8).fillColor("#475569").text(company.cargoResponsavel || "Responsável pela execução", left + 270, 722, { width: right - left - 230, align: "center" });

    const snapHash = snapshotHash(snapshot);
    doc.font("Helvetica").fontSize(7).fillColor("#64748b").text(`Template ${DOCUMENT_TEMPLATE_VERSIONS.certificatePdf.code} v${DOCUMENT_TEMPLATE_VERSIONS.certificatePdf.version} | Snapshot ${snapHash.slice(0, 16)}...`, left, 772, { width: 360 });
    doc.text(`Hash do certificado: ${certificate.hash || cert.hash || "-"}`, right - 230, 772, { width: 230, align: "right" });
  });
}

function attachmentPermissionFor(entityType) {
  const map = {
    os: "os.manage",
    certificado: "certificados.manage",
    medicao: "medicoes.manage",
    servico_pop: "servicos.manage",
    cliente: "clientes.manage",
    contrato: "contratos.manage",
    proposta: "contratos.manage",
    minuta: "contratos.manage",
  };
  return map[entityType] || "dashboard.view";
}

async function logAuditEvent(db, req, { entityType, entityId = null, action, summary, before = null, after = null }) {
  try {
    const runner = db?.query ? db : { query };
    await runner.query(
      `INSERT INTO ciperprag_hub.audit_logs
       (tenant_id, usuario_id, entidade_tipo, entidade_id, acao, resumo, dados_antes, dados_depois, ip, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        req.auth?.user?.tenant?.id || null,
        req.auth?.user?.id || null,
        entityType,
        entityId,
        action,
        summary,
        before ? JSON.stringify(before) : null,
        after ? JSON.stringify(after) : null,
        getRequestIp(req),
        req.headers["user-agent"] || null,
      ],
    );
  } catch (error) {
    console.warn("Falha ao registrar auditoria", error.message);
  }
}

async function saveImmutableDocumentAttachment(client, {
  tenantId,
  userId,
  entityType,
  entityId,
  fileName,
  html,
  snapshot = null,
  template = null,
  tenantSlug = null,
  storage = null,
  metadata = {},
}) {
  const pdfBuffer = await renderHtmlToPdf(html);
  const encoded = encodeBinaryDocument(pdfBuffer, "application/pdf");
  const snapHash = snapshot ? snapshotHash(snapshot) : null;
  const templateCode = template?.code || null;
  const templateVersion = template?.version || null;
  const storageTarget = storage || createAttachmentStoragePlan({
    tenantSlug,
    entityType,
    entityId,
    category: "pdf_historico",
    fileName,
    hashSha256: encoded.hash,
  });
  const persisted = await persistAttachmentContent({
    storagePlan: storageTarget,
    buffer: pdfBuffer,
    contentBase64: encoded.dataUrl,
    mimeType: "application/pdf",
    hashSha256: encoded.hash,
    fileName,
    metadata: {
      ...metadata,
      formato: "pdf_server_side",
      hashSha256: encoded.hash,
      snapshotHashSha256: snapHash,
      templateCodigo: templateCode,
      templateVersao: templateVersion,
    },
  });
  const attachmentId = makeId("DOC");
  await client.query(
    `INSERT INTO ciperprag_hub.evidencias_anexos
     (id, tenant_id, entidade_tipo, entidade_id, categoria, nome_arquivo, mime_type, tamanho_bytes, conteudo_base64, metadados, hash_sha256, snapshot_hash_sha256, template_codigo, template_versao, storage_provider, storage_bucket, storage_key, storage_etag, imutavel, criado_por)
     VALUES ($1,$2,$3,$4,'pdf_historico',$5,'application/pdf',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,TRUE,$17)
    ON CONFLICT (id) DO NOTHING`,
    [
      attachmentId,
      tenantId,
      entityType,
      entityId,
      fileName,
      encoded.bytes,
      persisted.contentBase64,
      JSON.stringify(persisted.metadata),
      encoded.hash,
      snapHash,
      templateCode,
      templateVersion,
      persisted.provider,
      persisted.bucket,
      persisted.key,
      persisted.etag,
      userId || null,
    ],
  );
  return {
    id: attachmentId,
    hashSha256: encoded.hash,
    snapshotHashSha256: snapHash,
    bytes: encoded.bytes,
    templateCodigo: templateCode,
    templateVersao: templateVersion,
    storageProvider: persisted.provider,
    storageBucket: persisted.bucket,
    storageKey: persisted.key,
  };
}

function buildHistoricalOrderHtml(snapshot, order) {
  const data = snapshot.encerramento || snapshot.emissao || {};
  const servico = data.servico || {};
  const pop = servico.pop || {};
  const operacao = data.operacao || {};
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${htmlEscape(order.numero)}</title><style>body{font-family:Arial,sans-serif;color:#111;padding:28px}h1{color:#065f46}table{border-collapse:collapse;width:100%;margin:12px 0}td,th{border:1px solid #999;padding:7px;text-align:left}.muted{color:#666;font-size:12px}.box{border:1px solid #aaa;padding:12px;margin:12px 0}</style></head><body>
    <h1>Ordem de Serviço ${htmlEscape(order.numero)}</h1>
    <p class="muted">Documento histórico gerado em ${new Date().toLocaleString("pt-BR")}.</p>
    <table><tr><th>Cliente</th><td>${htmlEscape(data.cliente?.nome || order.cliente)}</td><th>CNPJ</th><td>${htmlEscape(data.cliente?.cnpj || order.cnpj)}</td></tr>
    <tr><th>Serviço</th><td>${htmlEscape(servico.nome || order.servico)}</td><th>Origem</th><td>${htmlEscape(data.os?.contratoId || order.contrato_id || "Atendimento avulso")}</td></tr>
    <tr><th>Técnico</th><td>${htmlEscape(data.tecnico?.nome || order.tecnico)}</td><th>Local</th><td>${htmlEscape(operacao.localExecucao || order.local_execucao)}</td></tr>
    <tr><th>Emissão</th><td>${htmlEscape(data.os?.dataEmissao || formatDbDate(order.data_emissao))}</td><th>Execução</th><td>${htmlEscape(data.os?.dataExecucao || formatDbDate(order.data_execucao))}</td></tr></table>
    <div class="box"><strong>POP:</strong> ${htmlEscape([pop.codigo, pop.titulo, pop.versao ? `versão ${pop.versao}` : ""].filter(Boolean).join(" - ") || "-")}</div>
    <h2>Procedimentos</h2>${htmlList(servico.procedimentos || [])}
    <h2>Checklist</h2>${htmlList((operacao.checklistRespostas || servico.checklistItens || []).map((item) => typeof item === "string" ? item : `${item.concluido ? "[X]" : "[ ]"} ${item.item}`))}
    <h2>Evidências</h2><p>${(operacao.evidencias || []).length} evidência(s) vinculada(s).</p>
  </body></html>`;
}

function buildHistoricalMeasurementHtml(snapshot, measurement) {
  const itens = snapshot.itens || [];
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${htmlEscape(measurement.numero)}</title><style>body{font-family:Arial,sans-serif;padding:28px}h1{color:#065f46}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:7px;text-align:left}.right{text-align:right}</style></head><body>
    <h1>Medição ${htmlEscape(measurement.numero)}</h1>
    <p><strong>Cliente:</strong> ${htmlEscape(snapshot.cliente?.nome || measurement.cliente_nome)}</p>
    <p><strong>Período:</strong> ${htmlEscape(snapshot.periodo?.inicio || measurement.periodo_inicio)} até ${htmlEscape(snapshot.periodo?.fim || measurement.periodo_fim)}</p>
    <table><thead><tr><th>OS</th><th>Serviço</th><th>Data</th><th>Qtd.</th><th>Valor unit.</th><th>Total</th></tr></thead><tbody>
    ${itens.map((item) => `<tr><td>${htmlEscape(item.osNumero)}</td><td>${htmlEscape(item.servico)}</td><td>${htmlEscape(item.dataExecucao)}</td><td>${htmlEscape(item.quantidade)} ${htmlEscape(item.unidade)}</td><td class="right">${Number(item.valorUnitario || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td><td class="right">${Number(item.valorTotal || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td></tr>`).join("")}
    </tbody><tfoot><tr><th colspan="5" class="right">Total</th><th class="right">${Number(snapshot.total || measurement.total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</th></tr></tfoot></table>
  </body></html>`;
}

function buildHistoricalCertificateHtml(snapshot, certificate) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${htmlEscape(certificate.numero)}</title><style>body{font-family:Arial,sans-serif;padding:28px}h1{color:#065f46}.box{border:1px solid #999;padding:14px;margin:12px 0}</style></head><body>
    <h1>Certificado ${htmlEscape(certificate.numero)}</h1>
    <div class="box"><strong>Hash:</strong> ${htmlEscape(certificate.hash)}</div>
    <p>Certificamos que <strong>${htmlEscape(snapshot.cliente?.nome || certificate.cliente_nome)}</strong>, CNPJ ${htmlEscape(snapshot.cliente?.cnpj || certificate.cliente_cnpj)}, recebeu o serviço de <strong>${htmlEscape(snapshot.servico?.nome || certificate.servico)}</strong>.</p>
    <p><strong>OS:</strong> ${htmlEscape(snapshot.os?.numero || certificate.os_numero)} | <strong>Data de execução:</strong> ${htmlEscape(snapshot.os?.dataExecucao || certificate.data_execucao)}</p>
    <p><strong>Validade até:</strong> ${htmlEscape(snapshot.certificado?.validadeAte || "")}</p>
  </body></html>`;
}

function formatDbDate(value) {
  return value?.toISOString?.().split("T")[0] ?? value ?? null;
}

function buildServiceSnapshot(service) {
  if (!service) return null;
  return {
    id: service.id,
    nome: service.nome,
    tipo: service.tipo,
    descricao: service.descricao,
    unidade: service.unidade,
    recorrenciaDias: Number(service.recorrencia_dias || 0),
    geraCertificado: Boolean(service.gera_certificado),
    validadeCertificadoDias: Number(service.validade_certificado_dias || 0),
    produtosQuimicos: service.produtos_quimicos || [],
      produtosDetalhados: normalizeJsonArray(service.produtos_detalhados),
    epis: service.epis || [],
    riscos: service.riscos || [],
    normasAplicaveis: service.normas_aplicaveis || [],
    procedimentos: service.pop_procedimentos || service.procedimentos || [],
    checklistItens: service.pop_checklist_itens || service.checklist_itens || [],
    exigeFoto: Boolean(service.exige_foto),
    exigeAssinatura: Boolean(service.exige_assinatura),
    permiteNaoExecucao: Boolean(service.permite_nao_execucao),
    pop: service.pop_id ? {
      id: service.pop_id,
      codigo: service.pop_codigo,
      titulo: service.pop_titulo,
      versao: service.pop_versao,
      status: service.pop_status,
      objetivo: service.pop_objetivo,
      aplicacao: service.pop_aplicacao,
      responsabilidades: service.pop_responsabilidades || [],
      materiais: service.pop_materiais || [],
      aprovadoPor: service.pop_aprovado_por,
      aprovadoEm: formatDbDate(service.pop_aprovado_em),
    } : {
      codigo: service.pop_codigo || null,
      titulo: service.pop_titulo || null,
      versao: service.pop_versao || null,
    },
  };
}

function buildOrderOperationalSnapshot({ order, customer, contract, service, company, technician, evidences = [], checklistRespostas = [], phase, existing = {} }) {
  const phaseSnapshot = {
    geradoEm: new Date().toISOString(),
    fase: phase,
    os: {
      id: order.id,
      numero: order.numero,
      agendamentoId: order.agendamento_id,
      contratoId: order.contrato_id,
      dataEmissao: formatDbDate(order.data_emissao),
      dataExecucao: formatDbDate(order.data_execucao),
      status: order.status,
      quantidade: Number(order.quantidade || 0),
      unidade: order.unidade,
      naoExecutada: Boolean(order.nao_executada),
      motivoNaoExecucao: order.motivo_nao_execucao || null,
    },
    cliente: {
      id: order.cliente_id || customer?.id || null,
      nome: order.cliente || customer?.razao_social || null,
      cnpj: order.cnpj || customer?.cnpj || null,
      endereco: order.cliente_endereco || (customer ? `${customer.endereco}, ${customer.bairro}, ${customer.municipio}-${customer.uf}` : null),
      logoUrl: order.cliente_logo_url || customer?.logo_url || null,
    },
    servico: buildServiceSnapshot(service),
    contrato: contract ? {
      id: contract.id,
      status: contract.status,
      contratado: Number(contract.contratado || 0),
      executado: Number(contract.executado || 0),
      unidade: contract.unidade,
      valorUnitario: Number(contract.valor_unitario || 0),
      validadeDias: Number(contract.validade_dias || 0),
      tags: contract.tags || [],
      locais: contract.locais || [],
    } : null,
    tecnico: {
      nome: order.tecnico || technician?.nome || null,
      cpf: order.tecnico_cpf || technician?.cpf || null,
      cargo: technician?.cargo || null,
      dataAdmissao: formatDbDate(order.tecnico_data_admissao || technician?.data_admissao),
      equipeIds: order.equipe_tecnicos_ids || [],
      equipeNomes: order.equipe_tecnicos_nomes || [],
      veiculoId: order.veiculo_id || null,
      veiculoDescricao: order.veiculo_descricao || null,
    },
    operacao: {
      localExecucao: order.local_execucao || null,
      tags: order.tags || null,
      tagEquipamentoServico: order.tag_equipamento_servico || null,
      observacao: order.observacao || null,
      checklistRespostas,
      evidencias: evidences.map((item) => ({
        id: item.id,
        categoria: item.categoria,
        nomeArquivo: item.nome_arquivo || item.nomeArquivo,
        mimeType: item.mime_type || item.mimeType,
        tamanhoBytes: item.tamanho_bytes || item.tamanhoBytes || null,
        metadados: item.metadados || {},
      })),
    },
    empresa: company ? {
      razaoSocial: company.razao_social,
      nomeFantasia: company.nome_fantasia,
      cnpj: company.cnpj,
      endereco: company.endereco,
      telefone: company.telefone,
      email: company.email,
      responsavelTecnico: company.responsavel_tecnico,
      responsavelExecucao: company.responsavel_execucao,
      cargoResponsavel: company.cargo_responsavel,
    } : null,
  };
  return { ...(existing || {}), [phase]: phaseSnapshot };
}

async function getServiceForTenantSnapshot(client, serviceName, tenantId, serviceId = null) {
  const { rows } = await client.query(
    `SELECT
      s.*,
      p.id AS pop_id,
      p.codigo AS pop_codigo,
      p.titulo AS pop_titulo,
      p.versao AS pop_versao,
      p.status AS pop_status,
      p.objetivo AS pop_objetivo,
      p.aplicacao AS pop_aplicacao,
      p.responsabilidades AS pop_responsabilidades,
      p.materiais AS pop_materiais,
      p.procedimentos AS pop_procedimentos,
      p.checklist_itens AS pop_checklist_itens,
      p.aprovado_por AS pop_aprovado_por,
      p.aprovado_em AS pop_aprovado_em
    FROM ciperprag_hub.servicos_catalogo s
    LEFT JOIN ciperprag_hub.servico_pops p ON p.id = s.pop_ativo_id AND p.tenant_id = $2
    WHERE s.tenant_id = $2
      AND (
        ($3::text IS NOT NULL AND s.id = $3)
        OR ($3::text IS NULL AND (s.nome = $1 OR s.nome ILIKE $4))
      )
    ORDER BY
      CASE
        WHEN $3::text IS NOT NULL AND s.id = $3 THEN 0
        WHEN s.nome = $1 THEN 1
        ELSE 2
      END
    LIMIT 1`,
    [serviceName, tenantId, serviceId, `${serviceName || ""}%`],
  );
  return rows[0];
}

function buildCertificateSnapshot({ order, customer, service, company, hash, number, dataExecucao, validadeDias, publicBaseUrl = null, userId = null }) {
  const source = resolveCertificateSource({ order, customer, service });
  const validadeAte = Number(validadeDias || 0) > 0 ? addDays(dataExecucao, Number(validadeDias)) : null;
  const tag = order.tag_equipamento_servico || order.tags || null;
  const codigoPublico = buildShortPublicCertificateCode(hash);
  const snapshot = {
    certificado: {
      hash,
      codigoPublico,
      numero: number,
      status: "emitido",
      emitidoEm: new Date().toISOString(),
      emitidoPorUsuarioId: userId,
      publicBaseUrl,
      templateCodigo: company?.certificado_config?.templateCodigo || "certificado-garantia",
      templateVersao: company?.certificado_config?.templateVersao || "saas-tenant-v1",
      validadeDias: Number(validadeDias || 0),
      validadeAte,
    },
    cliente: {
      id: source.clientId,
      nome: source.clientName,
      cnpj: source.clientCnpj,
      endereco: source.clientAddress,
      logoUrl: source.clientLogoUrl,
    },
    os: {
      id: order.id,
      numero: order.numero,
      contratoId: source.contractId,
      servicoCatalogoId: source.serviceId,
      dataExecucao,
      quantidade: Number(order.quantidade || 0),
      unidade: order.unidade,
      localExecucao: order.local_execucao,
      tagEquipamentoServico: tag,
      tecnicoNome: order.tecnico,
      fotos: order.fotos || [],
    },
    servico: {
      id: source.serviceId,
      nome: source.serviceName,
      tipo: source.serviceType,
      geraCertificado: service?.gera_certificado ?? true,
      produtosQuimicos: service?.produtos_quimicos || [],
      produtosDetalhados: normalizeJsonArray(service?.produtos_detalhados),
      normasAplicaveis: service?.normas_aplicaveis || [],
      popCodigo: service?.pop_codigo || null,
      popTitulo: service?.pop_titulo || null,
      popVersao: service?.pop_versao || null,
    },
    empresa: {
      razaoSocial: company?.razao_social || null,
      nomeFantasia: company?.nome_fantasia || null,
      cnpj: company?.cnpj || null,
      endereco: company?.endereco || null,
      telefone: company?.telefone || null,
      email: company?.email || null,
      logoUrl: company?.logo_url || null,
      alvara: company?.alvara || null,
      cr02: company?.cr02 || null,
      anvisa: company?.anvisa || null,
      vigilanciaSanitaria: company?.vigilancia_sanitaria || null,
      responsavelTecnico: company?.responsavel_tecnico || null,
      responsavelExecucao: company?.responsavel_execucao || null,
      cargoResponsavel: company?.cargo_responsavel || null,
      certificadoTextoLegal: company?.certificado_texto_legal || null,
      certificadoTextoFixacao: company?.certificado_texto_fixacao || null,
      telefoneEmergencia: company?.telefone_emergencia || null,
      certificadoConfig: company?.certificado_config || {},
    },
  };
  snapshot.certificado.snapshotHashSha256 = certificateSnapshotSha256(snapshot);
  return snapshot;
}

function createTemporaryPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!#$%&*+-=?";
  let password = "";
  for (let index = 0; index < 16; index += 1) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

function rowsToClientMap(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        id: row.id,
        razaoSocial: row.razao_social,
        nomeFantasia: row.nome_fantasia,
        cnpj: row.cnpj,
        inscricaoEstadual: row.inscricao_estadual,
        endereco: row.endereco,
        bairro: row.bairro,
        municipio: row.municipio,
        uf: row.uf,
        cep: row.cep,
        logoUrl: row.logo_url,
        ativo: row.ativo,
        contatos: [],
        locaisExecucao: [],
        equipamentos: [],
      });
    }
    if (row.contato_nome) {
      map.get(row.id).contatos.push({
        nome: row.contato_nome,
        cargo: row.contato_cargo,
        funcao: row.contato_funcao || "operacional",
        telefone: row.contato_telefone,
        email: row.contato_email,
        principal: row.contato_principal,
        observacoes: row.contato_observacoes,
      });
    }
  }
  return [...map.values()];
}

async function getClients(tenantId) {
  const { rows } = await query(`
    SELECT
      c.*,
      ct.nome AS contato_nome,
      ct.cargo AS contato_cargo,
      ct.funcao AS contato_funcao,
      ct.telefone AS contato_telefone,
      ct.email AS contato_email,
      ct.principal AS contato_principal,
      ct.observacoes AS contato_observacoes
    FROM ciperprag_hub.clientes c
    LEFT JOIN ciperprag_hub.contatos_cliente ct
      ON ct.cliente_id = c.id
    WHERE c.tenant_id = $1
    ORDER BY c.id, ct.principal DESC, ct.id
  `, [tenantId]);
  const clients = rowsToClientMap(rows);
  const byId = new Map(clients.map((client) => [client.id, client]));

  const { rows: locationRows } = await query("SELECT * FROM ciperprag_hub.cliente_locais_execucao WHERE tenant_id = $1 ORDER BY cliente_id, ativo DESC, nome", [tenantId]);
  for (const row of locationRows) {
    const client = byId.get(row.cliente_id);
    if (!client) continue;
    client.locaisExecucao.push({
      id: row.id,
      clienteId: row.cliente_id,
      nome: row.nome,
      endereco: row.endereco,
      bairro: row.bairro,
      municipio: row.municipio,
      uf: row.uf,
      cep: row.cep,
      observacoes: row.observacoes,
      ativo: row.ativo,
    });
  }

  const { rows: equipmentRows } = await query("SELECT * FROM ciperprag_hub.cliente_equipamentos WHERE tenant_id = $1 ORDER BY cliente_id, ativo DESC, tag", [tenantId]);
  for (const row of equipmentRows) {
    const client = byId.get(row.cliente_id);
    if (!client) continue;
    client.equipamentos.push({
      id: row.id,
      clienteId: row.cliente_id,
      localId: row.local_id,
      tag: row.tag,
      descricao: row.descricao,
      tipo: row.tipo,
      setor: row.setor,
      observacoes: row.observacoes,
      ativo: row.ativo,
    });
  }

  return clients;
}

async function getServices(tenantId) {
  const { rows } = await query(`
    SELECT
      s.*,
      p.id AS active_pop_id,
      p.codigo AS active_pop_codigo,
      p.titulo AS active_pop_titulo,
      p.versao AS active_pop_versao,
      p.status AS active_pop_status,
      p.objetivo AS active_pop_objetivo,
      p.aplicacao AS active_pop_aplicacao,
      p.responsabilidades AS active_pop_responsabilidades,
      p.materiais AS active_pop_materiais,
      p.procedimentos AS active_pop_procedimentos,
      p.checklist_itens AS active_pop_checklist_itens,
      p.aprovado_por AS active_pop_aprovado_por,
      p.aprovado_em AS active_pop_aprovado_em,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'produtoId', sp.produto_id,
          'quantidadePrevista', sp.quantidade_prevista,
          'unidade', COALESCE(sp.unidade, pe.unidade),
          'produtoNome', pe.nome,
          'produtoCodigo', pe.codigo
        ) ORDER BY pe.nome)
        FROM ciperprag_hub.servicos_catalogo_produtos sp
        JOIN ciperprag_hub.produtos_estoque pe ON pe.id = sp.produto_id AND pe.tenant_id = sp.tenant_id
        WHERE sp.servico_id = s.id AND sp.tenant_id = $1
      ), '[]'::jsonb) AS estoque_produtos
    FROM ciperprag_hub.servicos_catalogo s
    LEFT JOIN ciperprag_hub.servico_pops p ON p.id = s.pop_ativo_id AND p.tenant_id = $1
    WHERE s.tenant_id = $1
    ORDER BY s.id
  `, [tenantId]);
  return rows.map((row) => ({
    id: row.id,
    nome: row.nome,
    tipo: row.tipo,
    descricao: row.descricao,
    unidade: row.unidade,
    recorrenciaDias: row.recorrencia_dias,
    geraCertificado: row.gera_certificado,
    validadeCertificadoDias: row.validade_certificado_dias,
    produtosQuimicos: row.produtos_quimicos ?? [],
    produtosDetalhados: normalizeJsonArray(row.produtos_detalhados),
    epis: row.epis ?? [],
    riscos: row.riscos ?? [],
    normasAplicaveis: row.normas_aplicaveis ?? [],
    procedimentos: row.active_pop_procedimentos ?? row.procedimentos ?? [],
    checklistItens: row.active_pop_checklist_itens ?? row.checklist_itens ?? [],
    exigeFoto: row.exige_foto,
    exigeAssinatura: row.exige_assinatura,
    permiteNaoExecucao: row.permite_nao_execucao,
    popId: row.active_pop_id,
    popCodigo: row.active_pop_codigo ?? row.pop_codigo,
    popTitulo: row.active_pop_titulo ?? row.pop_titulo,
    popVersao: row.active_pop_versao ?? row.pop_versao,
    popStatus: row.active_pop_status,
    popObjetivo: row.active_pop_objetivo,
    popAplicacao: row.active_pop_aplicacao,
    popResponsabilidades: row.active_pop_responsabilidades ?? [],
    popMateriais: row.active_pop_materiais ?? [],
    popAprovadoPor: row.active_pop_aprovado_por,
    popAprovadoEm: row.active_pop_aprovado_em?.toISOString?.().split("T")[0] ?? row.active_pop_aprovado_em,
    produtosEstoque: Array.isArray(row.estoque_produtos) ? row.estoque_produtos : normalizeJsonArray(row.estoque_produtos),
    ativo: row.ativo,
  }));
}

async function persistProposalPdfImport(client, { tenantId, userId, fileName, parsed, deterministic }) {
  const hash = sha256Hex(parsed.buffer);
  const existing = await client.query(
    `SELECT id FROM ciperprag_hub.proposta_pdf_importacoes WHERE tenant_id = $1 AND hash_sha256 = $2 LIMIT 1`,
    [tenantId, hash],
  );
  if (existing.rows[0]) return existing.rows[0].id;
  const id = makeId("PIMP");
  await client.query(
    `INSERT INTO ciperprag_hub.proposta_pdf_importacoes
      (id, tenant_id, nome_arquivo, mime_type, tamanho_bytes, conteudo_base64, hash_sha256, texto_extraido, paginas_analisadas, tabelas_encontradas, itens_extraidos, cobertura, criado_por)
     VALUES ($1,$2,$3,'application/pdf',$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      id,
      tenantId,
      fileName,
      parsed.bytes,
      parsed.dataUrl,
      hash,
      deterministic?.textoExtraido || null,
      deterministic?.paginasAnalisadas || null,
      Number(deterministic?.tabelasEncontradas || 0),
      Number(deterministic?.itensExtraidos || 0),
      JSON.stringify({
        fonte: "pdf-parse-local",
        tabelas: deterministic?.tabelas || [],
        linhasDeterministicas: deterministic?.linhasDeterministicas || [],
        metadadosPdf: deterministic?.metadadosPdf || {},
      }),
      userId || null,
    ],
  );
  return id;
}

async function finalizeProposalPdfImport(client, { id, templateId = null, coverage, status = "analisado" }) {
  if (!id) return;
  await client.query(
    `UPDATE ciperprag_hub.proposta_pdf_importacoes
     SET template_id = COALESCE($2, template_id), paginas_analisadas = COALESCE($3, paginas_analisadas),
         tabelas_encontradas = $4, itens_extraidos = $5, cobertura = $6, status = $7, analisado_em = NOW()
     WHERE id = $1`,
    [id, templateId, coverage?.paginasAnalisadas || null, Number(coverage?.tabelasEncontradas || 0), Number(coverage?.itensExtraidos || 0), JSON.stringify(coverage || {}), status],
  );
}

async function getStockProducts(tenantId) {
  const { rows } = await query(`
    SELECT
      p.*,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', m.id,
          'tipo', m.tipo,
          'quantidade', m.quantidade,
          'saldoAnterior', m.saldo_anterior,
          'saldoPosterior', m.saldo_posterior,
          'osId', m.os_id,
          'servicoId', m.servico_id,
          'observacao', m.observacao,
          'criadoEm', m.criado_em
        ) ORDER BY m.criado_em DESC)
        FROM (
          SELECT *
          FROM ciperprag_hub.estoque_movimentacoes
          WHERE produto_id = p.id AND tenant_id = p.tenant_id
          ORDER BY criado_em DESC
          LIMIT 20
        ) m
      ), '[]'::jsonb) AS movimentos
    FROM ciperprag_hub.produtos_estoque p
    WHERE p.tenant_id = $1
    ORDER BY p.ativo DESC, p.nome
  `, [tenantId]);
  return rows.map((row) => ({
    id: row.id,
    codigo: row.codigo,
    nome: row.nome,
    descricao: row.descricao || "",
    unidade: row.unidade || "un.",
    quantidadeAtual: Number(row.quantidade_atual || 0),
    estoqueMinimo: Number(row.estoque_minimo || 0),
    ativo: row.ativo,
    movimentos: Array.isArray(row.movimentos) ? row.movimentos : normalizeJsonArray(row.movimentos),
    atualizadoEm: row.atualizado_em?.toISOString?.() ?? row.atualizado_em,
  }));
}

async function getContracts(tenantId) {
  const { rows } = await query("SELECT * FROM ciperprag_hub.contratos WHERE tenant_id = $1 ORDER BY id", [tenantId]);
  return rows.map((row) => ({
    id: row.id,
    contratoTemplateId: row.contrato_template_id,
    contratoTemplateServicoId: row.contrato_template_servico_id,
    servicoCatalogoId: row.servico_catalogo_id,
    numeroComercial: row.numero_comercial,
    clienteId: row.cliente_id,
    cliente: row.cliente,
    cnpj: row.cnpj,
    servico: row.servico,
    tipo: row.tipo,
    contratado: Number(row.contratado),
    executado: Number(row.executado),
    unidade: row.unidade,
    status: row.status,
    ultimaExecucao: row.ultima_execucao?.toISOString?.().split("T")[0] ?? row.ultima_execucao,
    vigenciaInicio: row.vigencia_inicio?.toISOString?.().split("T")[0] ?? row.vigencia_inicio,
    vigenciaFim: row.vigencia_fim?.toISOString?.().split("T")[0] ?? row.vigencia_fim,
    validadeDias: row.validade_dias,
    valorUnitario: Number(row.valor_unitario ?? 0),
    frequencia: row.frequencia,
    tags: row.tags ?? [],
    produtosQuimicos: row.produtos_quimicos ?? [],
    epis: row.epis ?? [],
    riscos: row.riscos ?? [],
    locais: row.locais ?? [],
  }));
}

async function getSchedules(tenantId) {
  const { rows } = await query("SELECT * FROM ciperprag_hub.agendamentos WHERE tenant_id = $1 ORDER BY created_at, id", [tenantId]);
  return rows.map((row) => ({
    id: row.id,
    clienteId: row.cliente_id,
    clienteNome: row.cliente,
    clienteCnpj: row.cliente_cnpj,
    contratoId: row.contrato_id,
    servicoCatalogoId: row.servico_catalogo_id,
    servico: row.servico,
    tipo: row.tipo,
    dataAgendada: row.data_agendada?.toISOString?.().split("T")[0] ?? row.data_agendada,
    localId: row.local_id,
    localExecucao: row.local_execucao,
    tags: row.tags,
    observacao: row.observacao,
    tecnicosIds: row.tecnicos_ids ?? [],
    tecnicosNomes: row.tecnicos_nomes ?? [],
    veiculoId: row.veiculo_id,
    veiculoDescricao: row.veiculo_descricao,
    status: row.status,
    osId: row.os_id,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
  }));
}

function mapAttachment(row, options = {}) {
  const includeContent = options.includeContent || (options.includeImageContent && row.mime_type?.startsWith("image/"));
  return {
    id: row.id,
    entidadeTipo: row.entidade_tipo,
    entidadeId: row.entidade_id,
    categoria: row.categoria,
    nomeArquivo: row.nome_arquivo,
    mimeType: row.mime_type,
    tamanhoBytes: row.tamanho_bytes,
    conteudoBase64: includeContent ? row.conteudo_base64 : undefined,
    downloadUrl: `/api/attachments/${encodeURIComponent(row.id)}/download`,
    url: row.url,
    metadados: row.metadados ?? {},
    hashSha256: row.hash_sha256,
    snapshotHashSha256: row.snapshot_hash_sha256,
    templateCodigo: row.template_codigo,
    templateVersao: row.template_versao,
    storageProvider: row.storage_provider,
    storageBucket: row.storage_bucket,
    storageKey: row.storage_key,
    storageEtag: row.storage_etag,
    imutavel: row.imutavel,
    criadoEm: row.criado_em?.toISOString?.() ?? row.criado_em,
  };
}

async function getAttachments(tenantId) {
  const { rows } = await query(
    `SELECT id, entidade_tipo, entidade_id, categoria, nome_arquivo, mime_type, tamanho_bytes, url, metadados, hash_sha256, snapshot_hash_sha256, template_codigo, template_versao, storage_provider, storage_bucket, storage_key, storage_etag, imutavel, criado_em
     FROM ciperprag_hub.evidencias_anexos
     WHERE tenant_id = $1
     ORDER BY criado_em DESC, id DESC`,
    [tenantId],
  );
  return rows.map((row) => mapAttachment(row));
}

async function getAttachmentsByEntity(entityType, tenantId) {
  const { rows } = await query(
    `SELECT *
     FROM ciperprag_hub.evidencias_anexos
     WHERE entidade_tipo = $1
       AND tenant_id = $2
     ORDER BY entidade_id, criado_em, id`,
    [entityType, tenantId],
  );
  const map = new Map();
  for (const row of rows) {
    const item = mapAttachment(row, { includeImageContent: true });
    if (!map.has(row.entidade_id)) map.set(row.entidade_id, []);
    map.get(row.entidade_id).push(item);
  }
  return map;
}

async function getOrders(tenantId) {
  const attachmentsByOrder = await getAttachmentsByEntity("os", tenantId);
  const { rows } = await query("SELECT * FROM ciperprag_hub.ordens_servico WHERE tenant_id = $1 ORDER BY data_emissao, id", [tenantId]);
  return rows.map((row) => ({
    id: row.id,
    numero: row.numero,
    agendamentoId: row.agendamento_id,
    clienteId: row.cliente_id,
    clienteNome: row.cliente,
    clienteCnpj: row.cnpj,
    clienteEndereco: row.cliente_endereco,
    clienteLogoUrl: row.cliente_logo_url,
    contratoId: row.contrato_id,
    servico: row.servico,
    tipo: row.tipo,
    tecnicoNome: row.tecnico,
    tecnicoCpf: row.tecnico_cpf,
    tecnicoDataAdmissao: row.tecnico_data_admissao?.toISOString?.().split("T")[0] ?? row.tecnico_data_admissao,
    equipeTecnicosIds: row.equipe_tecnicos_ids ?? [],
    equipeTecnicosNomes: row.equipe_tecnicos_nomes ?? [],
    veiculoId: row.veiculo_id,
    veiculoDescricao: row.veiculo_descricao,
    localExecucao: row.local_execucao,
    tags: row.tags,
    tagEquipamentoServico: row.tag_equipamento_servico,
    observacao: row.observacao,
    dataEmissao: row.data_emissao?.toISOString?.().split("T")[0] ?? row.data_emissao,
    dataExecucao: row.data_execucao?.toISOString?.().split("T")[0] ?? row.data_execucao,
    quantidade: Number(row.quantidade ?? 0),
    unidade: row.unidade,
    status: row.status,
    fotos: row.fotos ?? [],
    evidencias: attachmentsByOrder.get(row.id) ?? [],
    certificadoHash: row.certificado_hash,
    checklistRespostas: row.checklist_respostas ?? [],
    naoExecutada: row.nao_executada ?? false,
    motivoNaoExecucao: row.motivo_nao_execucao,
    snapshotDados: row.snapshot_dados ?? {},
  }));
}

async function getCertificates(tenantId) {
  const { rows } = await query("SELECT * FROM ciperprag_hub.certificados WHERE tenant_id = $1 ORDER BY emitido_em DESC, id DESC", [tenantId]);
  return rows.map((row) => ({
    id: row.id,
    hash: row.hash,
    numero: row.numero,
    osId: row.os_id,
    osNumero: row.os_numero,
    clienteId: row.cliente_id,
    clienteNome: row.cliente_nome,
    clienteCnpj: row.cliente_cnpj,
    clienteEndereco: row.cliente_endereco,
    clienteLogoUrl: row.cliente_logo_url,
    contratoId: row.contrato_id,
    servico: row.servico,
    tecnicoNome: row.tecnico_nome,
    localExecucao: row.local_execucao,
    dataExecucao: row.data_execucao?.toISOString?.().split("T")[0] ?? row.data_execucao,
    emitidoEm: row.emitido_em?.toISOString?.() ?? row.emitido_em,
    validadeDias: row.validade_dias,
    produtosQuimicos: row.produtos_quimicos ?? [],
    produtosDetalhados: normalizeJsonArray(row.produtos_detalhados),
    snapshotDados: row.snapshot_dados ?? {},
    tagEquipamentoServico: row.tag_equipamento_servico || null,
    status: row.status,
    revogadoEm: row.revogado_em?.toISOString?.() ?? row.revogado_em,
    motivoRevogacao: row.motivo_revogacao,
    substituidoPorId: row.substituido_por_id,
    substituiCertificadoId: row.substitui_certificado_id,
  }));
}

async function getCertificateByHash(hash) {
  const normalizedHash = String(hash || "").trim().toUpperCase();
  if (!normalizedHash) return null;
  let { rows } = await query(
    `SELECT
      c.*,
      o.tag_equipamento_servico AS os_tag_equipamento_servico,
      o.quantidade,
      o.unidade,
      o.fotos
     FROM ciperprag_hub.certificados c
     LEFT JOIN ciperprag_hub.ordens_servico o
       ON o.id = c.os_id
     WHERE UPPER(c.hash) = $1
        OR UPPER(c.snapshot_dados #>> '{certificado,codigoPublico}') = $1
        OR UPPER(c.snapshot_dados #>> '{certificado,publicCode}') = $1
        OR UPPER(c.snapshot_dados #>> '{certificado,codigo_publico}') = $1
     LIMIT 1`,
    [normalizedHash],
  );
  if (!rows.length && /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalizedHash)) {
    const fallback = await query(
      `SELECT
        c.*,
        o.tag_equipamento_servico AS os_tag_equipamento_servico,
        o.quantidade,
        o.unidade,
        o.fotos
       FROM ciperprag_hub.certificados c
       LEFT JOIN ciperprag_hub.ordens_servico o
         ON o.id = c.os_id
       ORDER BY c.emitido_em DESC, c.id DESC
       LIMIT 5000`,
    );
    rows = fallback.rows.filter((candidate) => buildShortPublicCertificateCode(candidate.hash) === normalizedHash).slice(0, 1);
  }
  const row = rows[0];
  if (!row) return null;
  const { rows: documentRows } = await query(
    `SELECT nome_arquivo, hash_sha256, snapshot_hash_sha256, template_codigo, template_versao, criado_em
     FROM ciperprag_hub.evidencias_anexos
     WHERE tenant_id = $1
       AND entidade_tipo = 'certificado'
       AND entidade_id = $2
       AND mime_type = 'application/pdf'
       AND imutavel = TRUE
     ORDER BY criado_em DESC
     LIMIT 1`,
    [row.tenant_id, row.id],
  );
  const document = documentRows[0] || null;
  const validadeAte = Number(row.validade_dias || 0) > 0 ? addDays(row.data_execucao?.toISOString?.().split("T")[0] ?? row.data_execucao, Number(row.validade_dias)) : null;
  return {
    id: row.id,
    hash: row.hash,
    numero: row.numero,
    osId: row.os_id,
    osNumero: row.os_numero,
    clienteId: row.cliente_id,
    clienteNome: row.cliente_nome,
    clienteCnpj: row.cliente_cnpj,
    clienteEndereco: row.cliente_endereco,
    clienteLogoUrl: row.cliente_logo_url,
    contratoId: row.contrato_id,
    servico: row.servico,
    tecnicoNome: row.tecnico_nome,
    localExecucao: row.local_execucao,
    dataExecucao: row.data_execucao?.toISOString?.().split("T")[0] ?? row.data_execucao,
    emitidoEm: row.emitido_em?.toISOString?.() ?? row.emitido_em,
    validadeDias: Number(row.validade_dias || 0),
    validadeAte,
    status: row.status === "revogado" ? "revoked" : buildCertificateStatus(row.data_execucao?.toISOString?.().split("T")[0] ?? row.data_execucao, Number(row.validade_dias || 0)),
    certificateStatus: row.status,
    revogadoEm: row.revogado_em?.toISOString?.() ?? row.revogado_em,
    motivoRevogacao: row.motivo_revogacao,
    substituidoPorId: row.substituido_por_id,
    substituiCertificadoId: row.substitui_certificado_id,
    produtosQuimicos: row.produtos_quimicos ?? [],
    produtosDetalhados: normalizeJsonArray(row.produtos_detalhados),
    snapshotDados: row.snapshot_dados ?? {},
    tagEquipamentoServico: row.tag_equipamento_servico || row.os_tag_equipamento_servico,
    quantidade: Number(row.quantidade || 0),
    unidade: row.unidade,
    fotos: row.fotos ?? [],
    documento: document ? {
      nomeArquivo: document.nome_arquivo,
      hashSha256: document.hash_sha256,
      snapshotHashSha256: document.snapshot_hash_sha256,
      templateCodigo: document.template_codigo,
      templateVersao: document.template_versao,
      criadoEm: document.criado_em?.toISOString?.() ?? document.criado_em,
    } : null,
  };
}

function normalizeCertificateTags(order) {
  const values = [order.tag_equipamento_servico, order.tags]
    .flatMap((value) => Array.isArray(value) ? value : String(value || "").split(/[,;|\n]+/))
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  const unique = [];
  const seen = new Set();
  for (const value of values) {
    const key = value.toLocaleUpperCase("pt-BR");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(value);
  }
  return unique.length ? unique : [null];
}

async function issueCertificateForOrder(client, order, { dataExecucao, tenantId, tenantSlug = null, userId = null, publicBaseUrl = null } = {}) {
  const scopedTenantId = tenantId || order.tenant_id;
  const { rows: contractRows } = await client.query("SELECT * FROM ciperprag_hub.contratos WHERE id = $1 AND tenant_id = $2", [order.contrato_id, scopedTenantId]);
  const contract = contractRows[0];
  const service = await getServiceForTenantSnapshot(client, order.servico, scopedTenantId, order.servico_catalogo_id || contract?.servico_catalogo_id || null);
  const { rows: customerRows } = await client.query("SELECT * FROM ciperprag_hub.clientes WHERE id = $1 AND tenant_id = $2", [order.cliente_id, scopedTenantId]);
  const customer = customerRows[0];
  const source = resolveCertificateSource({ order, customer, service });
  assertCertificateSource(source);
  const { rows: companyRows } = await client.query("SELECT * FROM ciperprag_hub.empresa_config WHERE tenant_id = $1 ORDER BY id LIMIT 1", [scopedTenantId]);
  const company = companyRows[0];
  const executionDate = dataExecucao || order.data_execucao?.toISOString?.().split("T")[0] || order.data_execucao || order.data_emissao?.toISOString?.().split("T")[0] || order.data_emissao;
  const validadeDias = Number(service?.validade_certificado_dias || company?.certificado_validade_padrao_dias || 0);
  const hashes = [];

  for (const [index, tag] of normalizeCertificateTags(order).entries()) {
    const { rows: numRows } = await client.query(
      `UPDATE ciperprag_hub.numeracao_config
       SET certificado_ultimo = certificado_ultimo + 1, atualizado_em = NOW()
       WHERE id = (SELECT id FROM ciperprag_hub.numeracao_config WHERE tenant_id = $1 ORDER BY id LIMIT 1)
       RETURNING certificado_formato, certificado_ultimo`,
      [scopedTenantId],
    );
    const certId = makeId("CERT");
    const hash = index === 0 && order.certificado_hash ? order.certificado_hash : await generateUniqueCertificateHash(client);
    const certNumber = formatSequential(numRows[0]?.certificado_formato, numRows[0]?.certificado_ultimo || 1);
    const certificateOrder = {
      ...order,
      cliente: source.clientName,
      cnpj: source.clientCnpj,
      cliente_endereco: source.clientAddress,
      cliente_logo_url: source.clientLogoUrl,
      servico_catalogo_id: source.serviceId,
      servico: source.serviceName,
      tipo: source.serviceType,
      tag_equipamento_servico: tag,
      tags: tag || order.tags,
    };
    const snapshot = buildCertificateSnapshot({
      order: certificateOrder,
      customer,
      service,
      company,
      hash,
      number: certNumber,
      dataExecucao: executionDate,
      validadeDias,
      publicBaseUrl,
      userId,
    });

    const insertResult = await client.query(
      `INSERT INTO ciperprag_hub.certificados
       (id, tenant_id, hash, numero, os_id, os_numero, cliente_id, cliente_nome, cliente_cnpj, cliente_endereco, cliente_logo_url, contrato_id, servico, tecnico_nome, local_execucao, data_execucao, emitido_em, validade_dias, produtos_quimicos, produtos_detalhados, snapshot_dados, status, tag_equipamento_servico)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),$17,$18,$19,$20,'emitido',$21)
       ON CONFLICT (hash) DO NOTHING`,
      [
        certId,
        scopedTenantId,
        hash,
        certNumber,
        order.id,
        order.numero,
        source.clientId,
        source.clientName,
        source.clientCnpj,
        source.clientAddress,
        source.clientLogoUrl,
        source.contractId,
        source.serviceName,
        order.tecnico,
        order.local_execucao,
        executionDate,
        validadeDias,
        service?.produtos_quimicos || [],
        JSON.stringify(normalizeJsonArray(service?.produtos_detalhados)),
        JSON.stringify(snapshot),
        tag,
      ],
    );
    hashes.push(hash);
    if (insertResult.rowCount > 0) {
      const certificate = { ...certificateOrder, id: certId, hash, numero: certNumber, os_numero: order.numero };
      await saveImmutableDocumentAttachment(client, {
        tenantId: scopedTenantId,
        tenantSlug,
        userId,
        entityType: "certificado",
        entityId: certId,
        fileName: `certificado-${certNumber.replaceAll("/", "-")}.pdf`,
        html: buildHistoricalCertificateHtml(snapshot, certificate),
        metadata: { origem: "emissao_certificado", certificadoHash: hash, osId: order.id, tagEquipamentoServico: tag },
      });
    }
  }
  await client.query("UPDATE ciperprag_hub.ordens_servico SET certificado_hash = $2 WHERE id = $1 AND tenant_id = $3", [order.id, hashes[0], scopedTenantId]);
  return { primaryHash: hashes[0], hashes };
}

async function getCompanyConfig(tenantId) {
  const { rows } = await query(
    `SELECT e.*, t.slug AS tenant_slug, COALESCE(t.nome_fantasia, t.razao_social, t.slug) AS tenant_nome
     FROM ciperprag_hub.empresa_config e
     LEFT JOIN ciperprag_hub.tenants t ON t.id = e.tenant_id
     WHERE e.tenant_id = $1
     ORDER BY e.id
     LIMIT 1`,
    [tenantId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    tenantSlug: row.tenant_slug,
    tenantNome: row.tenant_nome,
    razaoSocial: row.razao_social,
    nomeFantasia: row.nome_fantasia,
    cnpj: row.cnpj,
    endereco: row.endereco,
    telefone: row.telefone,
    email: row.email,
    logoUrl: row.logo_url,
    corPrimaria: row.cor_primaria,
    corSecundaria: row.cor_secundaria,
    corDestaque: row.cor_destaque,
    alvara: row.alvara,
    cr02: row.cr02,
    anvisa: row.anvisa,
    vigilanciaSanitaria: row.vigilancia_sanitaria,
    responsavelTecnico: row.responsavel_tecnico,
    responsavelExecucao: row.responsavel_execucao,
    cargoResponsavel: row.cargo_responsavel,
    certificadoValidadePadraoDias: row.certificado_validade_padrao_dias,
    certificadoTextoLegal: row.certificado_texto_legal,
    certificadoTextoFixacao: row.certificado_texto_fixacao,
    telefoneEmergencia: row.telefone_emergencia,
    medicaoFormaPagamentoPadrao: row.medicao_forma_pagamento_padrao,
    medicaoLocalEntregaPadrao: row.medicao_local_entrega_padrao,
    commercialConfig: normalizeCommercialConfig(row.commercial_config, row.tenant_slug),
    certificadoConfig: row.certificado_config || {},
  };
}

async function getNumberingConfig(tenantId) {
  const { rows } = await query("SELECT * FROM ciperprag_hub.numeracao_config WHERE tenant_id = $1 ORDER BY id LIMIT 1", [tenantId]);
  const row = rows[0];
  if (!row) return null;
  return {
    propostaFormato: row.proposta_formato,
    propostaUltimo: row.proposta_ultimo,
    contratoFormato: row.contrato_formato,
    contratoUltimo: row.contrato_ultimo,
    osFormato: row.os_formato,
    osUltimo: row.os_ultimo,
    certificadoFormato: row.certificado_formato,
    certificadoUltimo: row.certificado_ultimo,
    medicaoFormato: row.medicao_formato,
    medicaoUltimo: row.medicao_ultimo,
  };
}

async function getTechnicians(tenantId) {
  const { rows } = await query("SELECT * FROM ciperprag_hub.tecnicos WHERE tenant_id = $1 ORDER BY id", [tenantId]);
  return rows.map((row) => ({
    id: row.id,
    nome: row.nome,
    cpf: row.cpf,
    cargo: row.cargo,
    dataAdmissao: row.data_admissao?.toISOString?.().split("T")[0] ?? row.data_admissao,
    telefone: row.telefone,
    ativo: row.ativo,
  }));
}

async function getVehicles(tenantId) {
  const { rows } = await query("SELECT * FROM ciperprag_hub.veiculos WHERE tenant_id = $1 ORDER BY id", [tenantId]);
  return rows.map((row) => ({
    id: row.id,
    placa: row.placa,
    modelo: row.modelo,
    ano: row.ano,
    ativo: row.ativo,
  }));
}

async function getAllocations(tenantId) {
  const { rows } = await query("SELECT * FROM ciperprag_hub.alocacoes_semanais WHERE tenant_id = $1 ORDER BY id", [tenantId]);
  return rows.map((row) => ({
    id: row.id,
    tecnicoId: row.tecnico_id,
    veiculoId: row.veiculo_id,
    diaSemana: row.dia_semana,
    cliente: row.cliente,
    servico: row.servico,
    turno: row.turno,
  }));
}

async function getContractTemplates(tenantId) {
  const { rows } = await query(`
    SELECT
      t.*,
      s.id AS template_servico_id,
      s.servico_id,
      s.quantidade,
      s.valor_unitario,
      s.frequencia,
      s.descricao_comercial,
      s.unidade_comercial,
      s.enderecos_atividade,
      s.locais_ids,
      o.id AS contrato_operacional_id,
      o.status AS contrato_operacional_status,
      o.executado AS contrato_operacional_executado
    FROM ciperprag_hub.contratos_templates t
    LEFT JOIN ciperprag_hub.contratos_templates_servicos s
      ON s.template_id = t.id
    LEFT JOIN ciperprag_hub.contratos o
      ON o.tenant_id = t.tenant_id
     AND o.contrato_template_id = t.id
     AND o.servico_catalogo_id = s.servico_id
    WHERE t.tenant_id = $1
    ORDER BY t.data_criacao DESC NULLS LAST, t.id DESC, s.id
  `, [tenantId]);
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        id: row.id,
        numero: row.numero,
        clienteId: row.cliente_id,
        tipo: row.tipo,
        servicos: [],
        vigenciaMeses: row.vigencia_meses,
        formaPagamento: row.forma_pagamento,
        prazoPagamentoDias: row.prazo_pagamento_dias,
        status: row.status,
        dataCriacao: row.data_criacao?.toISOString?.().split("T")[0] ?? row.data_criacao,
        observacoes: row.observacoes,
        titulo: row.titulo || "",
        objeto: row.objeto || "",
        validadeDias: Number(row.validade_dias ?? 30),
        modalidade: row.modalidade || "",
        locaisExecucao: Array.isArray(row.locais_execucao) ? row.locais_execucao : [],
        sourcePdfImportId: row.source_pdf_import_id || undefined,
        escopoTecnico: row.escopo_tecnico || "",
        condicoesComerciais: row.condicoes_comerciais || "",
        operacionalizado: false,
        contratosOperacionaisIds: [],
      });
    }
    if (row.servico_id) {
      if (row.contrato_operacional_id) {
        map.get(row.id).operacionalizado = true;
        map.get(row.id).contratosOperacionaisIds.push(row.contrato_operacional_id);
      }
      map.get(row.id).servicos.push({
        id: row.template_servico_id,
        servicoId: row.servico_id,
        quantidade: Number(row.quantidade),
        valorUnitario: Number(row.valor_unitario),
        frequencia: row.frequencia,
        descricaoComercial: row.descricao_comercial || "",
        unidadeComercial: row.unidade_comercial || "",
        enderecoAtividade: row.endereco_atividade || "",
        enderecosAtividade: [row.endereco_atividade, ...(Array.isArray(row.enderecos_atividade) ? row.enderecos_atividade : normalizeJsonArray(row.enderecos_atividade))].filter(Boolean),
        localIds: Array.isArray(row.locais_ids) ? row.locais_ids : normalizeJsonArray(row.locais_ids),
        contratoOperacionalId: row.contrato_operacional_id,
        contratoOperacionalStatus: row.contrato_operacional_status,
        contratoOperacionalExecutado: Number(row.contrato_operacional_executado ?? 0),
      });
    }
  }
  return [...map.values()];
}

async function buildCommercialDocumentSnapshot(client, { tenantId, templateId }) {
  const { rows: templateRows } = await client.query(
    `SELECT t.*, c.razao_social AS cliente_razao_social, c.nome_fantasia AS cliente_nome_fantasia,
            c.cnpj AS cliente_cnpj, c.endereco AS cliente_endereco, c.bairro AS cliente_bairro,
            c.municipio AS cliente_municipio, c.uf AS cliente_uf, c.cep AS cliente_cep,
            c.logo_url AS cliente_logo_url
     FROM ciperprag_hub.contratos_templates t
     LEFT JOIN ciperprag_hub.clientes c ON c.id = t.cliente_id AND c.tenant_id = $2
     WHERE t.id = $1 AND t.tenant_id = $2
     LIMIT 1`,
    [templateId, tenantId],
  );
  const template = templateRows[0];
  if (!template) return null;

  const [{ rows: companyRows }, { rows: serviceRows }] = await Promise.all([
    client.query("SELECT * FROM ciperprag_hub.empresa_config WHERE tenant_id = $1 ORDER BY id LIMIT 1", [tenantId]),
    client.query(
      `SELECT s.*, sc.nome AS catalogo_nome, sc.descricao AS catalogo_descricao, sc.unidade AS catalogo_unidade,
              sc.tipo AS catalogo_tipo, sc.gera_certificado, sc.recorrencia_dias
       FROM ciperprag_hub.contratos_templates_servicos s
       LEFT JOIN ciperprag_hub.servicos_catalogo sc
         ON sc.id = s.servico_id AND sc.tenant_id = $2
       WHERE s.template_id = $1
       ORDER BY s.id`,
      [templateId, tenantId],
    ),
  ]);
  const company = companyRows[0] || {};
  const services = serviceRows.map((item) => ({
    id: item.id,
    servicoId: item.servico_id,
    nome: item.catalogo_nome || "Serviço não informado",
    descricaoCatalogo: item.catalogo_descricao || null,
    tipo: item.catalogo_tipo || null,
    quantidade: Number(item.quantidade || 0),
    unidade: item.catalogo_unidade || "un.",
    enderecoAtividade: item.endereco_atividade || null,
    enderecosAtividade: [item.endereco_atividade, ...(Array.isArray(item.enderecos_atividade) ? item.enderecos_atividade : normalizeJsonArray(item.enderecos_atividade))].filter(Boolean),
    valorUnitario: Number(item.valor_unitario || 0),
    valorTotal: Number(item.quantidade || 0) * Number(item.valor_unitario || 0),
    frequencia: item.frequencia || null,
    geraCertificado: Boolean(item.gera_certificado),
    recorrenciaDias: Number(item.recorrencia_dias || 0),
  }));

  return {
    snapshotVersion: "commercial-document-snapshot-v1",
    capturedAt: new Date().toISOString(),
    tenantId,
    documento: {
      id: template.id,
      numero: template.numero,
      tipo: template.tipo,
      status: template.status,
      dataCriacao: template.data_criacao,
      titulo: template.titulo || null,
      objeto: template.objeto || null,
      validadeDias: Number(template.validade_dias || 0),
      modalidade: template.modalidade || null,
      vigenciaMeses: Number(template.vigencia_meses || 0),
      formaPagamento: template.forma_pagamento || null,
      prazoPagamentoDias: Number(template.prazo_pagamento_dias || 0),
      locaisExecucao: Array.isArray(template.locais_execucao) ? template.locais_execucao : [],
      escopoTecnico: template.escopo_tecnico || null,
      condicoesComerciais: template.condicoes_comerciais || null,
      observacoes: template.observacoes || null,
    },
    empresa: {
      razaoSocial: company.razao_social || null,
      nomeFantasia: company.nome_fantasia || null,
      cnpj: company.cnpj || null,
      endereco: company.endereco || null,
      telefone: company.telefone || null,
      email: company.email || null,
      logoUrl: company.logo_url || null,
      responsavelTecnico: company.responsavel_tecnico || null,
      responsavelExecucao: company.responsavel_execucao || null,
      cargoResponsavel: company.cargo_responsavel || null,
    },
    cliente: {
      id: template.cliente_id || null,
      razaoSocial: template.cliente_razao_social || null,
      nomeFantasia: template.cliente_nome_fantasia || null,
      cnpj: template.cliente_cnpj || null,
      endereco: template.cliente_endereco || null,
      bairro: template.cliente_bairro || null,
      municipio: template.cliente_municipio || null,
      uf: template.cliente_uf || null,
      cep: template.cliente_cep || null,
      logoUrl: template.cliente_logo_url || null,
    },
    servicos: services,
    total: services.reduce((sum, item) => sum + item.valorTotal, 0),
  };
}

function buildCommercialDocumentHtml(snapshot) {
  const document = snapshot.documento || {};
  const company = snapshot.empresa || {};
  const client = snapshot.cliente || {};
  const services = snapshot.servicos || [];
  const total = Number(snapshot.total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const typeLabel = document.tipo === "contrato"
    ? "Contrato de prestação de serviços"
    : document.tipo === "minuta"
      ? "Minuta / modelo do cliente"
      : "Proposta comercial";
  const serviceRows = services.map((item, index) => `<tr><td>${index + 1}</td><td>${htmlEscape(item.nome)}</td><td>${htmlEscape(item.quantidade)} ${htmlEscape(item.unidade)}</td><td>${htmlEscape(item.frequencia || "-")}</td><td>${Number(item.valorUnitario || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td><td>${Number(item.valorTotal || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td></tr>`).join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${htmlEscape(document.numero || typeLabel)}</title><style>body{font-family:Arial,sans-serif;color:#172033;padding:36px;line-height:1.45}h1{color:#087f5b;margin-bottom:4px}h2{font-size:15px;color:#087f5b;border-bottom:2px solid #087f5b;padding-bottom:4px;margin-top:24px}.muted{color:#667085;font-size:12px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;border:1px solid #d7dee8;border-radius:8px;padding:16px}.label{color:#667085;font-size:11px;text-transform:uppercase;font-weight:bold}.value{margin-top:2px}table{border-collapse:collapse;width:100%;font-size:12px}th{background:#087f5b;color:#fff;text-align:left}td,th{border:1px solid #d7dee8;padding:8px}.right{text-align:right}.total{font-size:18px;font-weight:bold;color:#087f5b;text-align:right;margin-top:12px}.section{page-break-inside:avoid}</style></head><body><h1>${htmlEscape(typeLabel)}</h1><p class="muted">${htmlEscape(document.numero || "Documento sem número")} | Snapshot histórico ${htmlEscape(snapshot.snapshotVersion)}</p><div class="grid"><div><div class="label">Contratada</div><div class="value"><strong>${htmlEscape(company.razaoSocial || company.nomeFantasia || "Empresa emissora")}</strong><br>${htmlEscape(company.cnpj || "-")}<br>${htmlEscape(company.endereco || "-")}</div></div><div><div class="label">Contratante</div><div class="value"><strong>${htmlEscape(client.razaoSocial || client.nomeFantasia || "Cliente não informado")}</strong><br>${htmlEscape(client.cnpj || "-")}<br>${htmlEscape([client.endereco, client.municipio, client.uf].filter(Boolean).join(", ") || "-")}</div></div></div><div class="section"><h2>Objeto e condições</h2><p>${htmlEscape(document.objeto || document.titulo || "Serviços técnicos conforme catálogo e condições comerciais registradas.")}</p><p><strong>Modalidade:</strong> ${htmlEscape(document.modalidade || "-")} | <strong>Validade:</strong> ${htmlEscape(document.validadeDias || "-")} dias | <strong>Vigência:</strong> ${htmlEscape(document.vigenciaMeses || "-")} meses</p><p>${htmlEscape(document.condicoesComerciais || document.formaPagamento || "-")}</p></div><div class="section"><h2>Serviços contratados</h2><table><thead><tr><th>#</th><th>Serviço</th><th>Quantidade</th><th>Frequência</th><th>Valor unitário</th><th>Total</th></tr></thead><tbody>${serviceRows || "<tr><td colspan=\"6\">Nenhum serviço informado.</td></tr>"}</tbody></table><div class="total">Total geral: ${total}</div></div><div class="section"><h2>Escopo técnico</h2><p>${htmlEscape(document.escopoTecnico || "Conforme catálogo de serviços, procedimentos e registros operacionais do sistema.")}</p></div><p class="muted">Documento histórico gerado em ${htmlEscape(new Date(snapshot.capturedAt).toLocaleString("pt-BR"))}. A versão impressa deve ser conferida pelo hash do anexo registrado no sistema.</p></body></html>`;
}

function makeCompactId(prefix) {
  const random = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${random}`;
}

function addMonthsToDate(dateStr, months) {
  const date = new Date(`${dateStr || new Date().toISOString().split("T")[0]}T12:00:00`);
  date.setMonth(date.getMonth() + Number(months || 0));
  return date.toISOString().split("T")[0];
}

async function makeUniqueOperationalContractId(client) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const id = makeCompactId("CTO");
    const { rows } = await client.query("SELECT 1 FROM ciperprag_hub.contratos WHERE id = $1 LIMIT 1", [id]);
    if (!rows.length) return id;
  }
  throw new Error("Nao foi possivel gerar um ID unico para o contrato operacional.");
}

async function syncOperationalContractsFromTemplate(client, templateId, tenantId) {
  const { rows: templateRows } = await client.query(
    `SELECT
       t.*,
       c.razao_social,
       c.nome_fantasia,
       c.cnpj
     FROM ciperprag_hub.contratos_templates t
     LEFT JOIN ciperprag_hub.clientes c
       ON c.id = t.cliente_id
      AND c.tenant_id = $2
     WHERE t.id = $1
       AND t.tenant_id = $2`,
    [templateId, tenantId],
  );
  const template = templateRows[0];
  if (!template || template.tipo !== "contrato" || template.status !== "vigente") {
    return { created: 0, updated: 0, disabled: 0, skipped: true };
  }

  const { rows: serviceRows } = await client.query(
    `SELECT
       s.id AS template_servico_id,
       s.servico_id,
       s.quantidade,
       s.valor_unitario,
       s.frequencia,
       sc.nome,
       sc.tipo,
       sc.unidade,
       sc.recorrencia_dias,
       sc.produtos_quimicos,
       sc.epis,
       sc.riscos
     FROM ciperprag_hub.contratos_templates_servicos s
     JOIN ciperprag_hub.contratos_templates t
       ON t.id = s.template_id
      AND t.tenant_id = $2
     LEFT JOIN ciperprag_hub.servicos_catalogo sc
       ON sc.id = s.servico_id
      AND sc.tenant_id = $2
     WHERE s.template_id = $1
     ORDER BY s.id`,
    [templateId, tenantId],
  );

  const validServices = serviceRows.filter((service) => service.servico_id && service.nome);
  if (!validServices.length) return { created: 0, updated: 0, disabled: 0, skipped: true };

  const { rows: locationRows } = await client.query(
    `SELECT nome
     FROM ciperprag_hub.cliente_locais_execucao
     WHERE tenant_id = $1
       AND cliente_id = $2
       AND ativo IS TRUE
     ORDER BY nome`,
    [tenantId, template.cliente_id],
  );
  const { rows: equipmentRows } = await client.query(
    `SELECT tag
     FROM ciperprag_hub.cliente_equipamentos
     WHERE tenant_id = $1
       AND cliente_id = $2
       AND ativo IS TRUE
     ORDER BY tag`,
    [tenantId, template.cliente_id],
  );

  const locais = locationRows.map((row) => row.nome).filter(Boolean);
  const tags = equipmentRows.map((row) => row.tag).filter(Boolean);
  const clienteNome = template.razao_social || template.nome_fantasia || "Cliente sem nome";
  const vigenciaInicio = template.data_criacao?.toISOString?.().split("T")[0] ?? template.data_criacao ?? new Date().toISOString().split("T")[0];
  const vigenciaFim = addMonthsToDate(vigenciaInicio, template.vigencia_meses || 0);
  let created = 0;
  let updated = 0;

  for (const service of validServices) {
    const { rows: existingRows } = await client.query(
      `SELECT id, executado
       FROM ciperprag_hub.contratos
       WHERE tenant_id = $1
         AND contrato_template_id = $2
         AND servico_catalogo_id = $3
       ORDER BY criado_em
       LIMIT 1`,
      [tenantId, templateId, service.servico_id],
    );
    const existing = existingRows[0];
    if (existing) {
      await client.query(
        `UPDATE ciperprag_hub.contratos
         SET contrato_template_servico_id=$4,
             numero_comercial=$5,
             cliente_id=$6,
             cliente=$7,
             cnpj=$8,
             servico=$9,
             tipo=$10,
             contratado=$11,
             unidade=$12,
             status='ativo',
             validade_dias=$13,
             valor_unitario=$14,
             frequencia=$15,
             tags=$16,
             produtos_quimicos=$17,
             epis=$18,
             riscos=$19,
             locais=$20,
             vigencia_inicio=$21,
             vigencia_fim=$22,
             atualizado_em=NOW()
         WHERE id=$1
           AND tenant_id=$2
           AND contrato_template_id=$3`,
        [
          existing.id,
          tenantId,
          templateId,
          service.template_servico_id,
          template.numero,
          template.cliente_id,
          clienteNome,
          template.cnpj,
          service.nome,
          service.tipo,
          service.quantidade,
          service.unidade,
          service.recorrencia_dias || 0,
          service.valor_unitario,
          service.frequencia,
          tags,
          service.produtos_quimicos || [],
          service.epis || [],
          service.riscos || [],
          locais,
          vigenciaInicio,
          vigenciaFim,
        ],
      );
      updated += 1;
    } else {
      const operationalId = await makeUniqueOperationalContractId(client);
      await client.query(
        `INSERT INTO ciperprag_hub.contratos
         (id, tenant_id, contrato_template_id, contrato_template_servico_id, servico_catalogo_id, numero_comercial,
          cliente_id, cliente, cnpj, servico, tipo, contratado, executado, unidade, status, ultima_execucao,
          validade_dias, valor_unitario, frequencia, tags, produtos_quimicos, epis, riscos, locais, vigencia_inicio, vigencia_fim)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,0,$13,'ativo',NULL,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
        [
          operationalId,
          tenantId,
          templateId,
          service.template_servico_id,
          service.servico_id,
          template.numero,
          template.cliente_id,
          clienteNome,
          template.cnpj,
          service.nome,
          service.tipo,
          service.quantidade,
          service.unidade,
          service.recorrencia_dias || 0,
          service.valor_unitario,
          service.frequencia,
          tags,
          service.produtos_quimicos || [],
          service.epis || [],
          service.riscos || [],
          locais,
          vigenciaInicio,
          vigenciaFim,
        ],
      );
      created += 1;
    }
  }

  const currentServiceIds = validServices.map((service) => service.servico_id);
  const { rowCount: disabled } = await client.query(
    `UPDATE ciperprag_hub.contratos
     SET status='vencido',
         atualizado_em=NOW()
     WHERE tenant_id=$1
       AND contrato_template_id=$2
       AND servico_catalogo_id <> ALL($3::text[])`,
    [tenantId, templateId, currentServiceIds],
  );

  return { created, updated, disabled, skipped: false };
}

async function getRecurrenceSuggestions(tenantId) {
  const { rows } = await query("SELECT * FROM ciperprag_hub.recorrencia_sugestoes WHERE tenant_id = $1 ORDER BY created_at DESC", [tenantId]);
  return rows.map((row) => ({
    id: row.id,
    clienteId: row.cliente_id,
    clienteNome: row.cliente_nome,
    clienteCnpj: row.cliente_cnpj,
    contratoId: row.contrato_id,
    servicoCatalogoId: row.servico_catalogo_id,
    servico: row.servico,
    tipo: row.tipo,
    localExecucao: row.local_execucao,
    localId: row.local_id,
    tags: row.tags,
    observacao: row.observacao,
    tecnicosIds: row.tecnicos_ids ?? [],
    tecnicosNomes: row.tecnicos_nomes ?? [],
    veiculoId: row.veiculo_id,
    veiculoDescricao: row.veiculo_descricao,
    suggestedDate: row.suggested_date?.toISOString?.().split("T")[0] ?? row.suggested_date,
    sourceAgendamentoId: row.source_agendamento_id,
    sourceOsId: row.source_os_id,
    status: row.status,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
  }));
}

async function getMeasurements(tenantId) {
  const { rows } = await query(`
    SELECT
      m.*,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', i.id,
            'osId', i.os_id,
            'osNumero', i.os_numero,
            'contratoId', i.contrato_id,
            'servico', i.servico,
            'dataExecucao', i.data_execucao,
            'quantidade', i.quantidade,
            'unidade', i.unidade,
            'valorUnitario', i.valor_unitario,
            'valorTotal', i.valor_total
          )
          ORDER BY i.data_execucao, i.os_numero
        ) FILTER (WHERE i.id IS NOT NULL),
        '[]'
      ) AS itens
    FROM ciperprag_hub.medicoes m
    LEFT JOIN ciperprag_hub.medicao_itens i ON i.medicao_id = m.id
    WHERE m.tenant_id = $1
    GROUP BY m.id
    ORDER BY m.criado_em DESC
  `, [tenantId]);

  return rows.map((row) => ({
    id: row.id,
    numero: row.numero,
    clienteId: row.cliente_id,
    clienteNome: row.cliente_nome,
    clienteCnpj: row.cliente_cnpj,
    clienteEndereco: row.cliente_endereco,
    periodoInicio: row.periodo_inicio?.toISOString?.().split("T")[0] ?? row.periodo_inicio,
    periodoFim: row.periodo_fim?.toISOString?.().split("T")[0] ?? row.periodo_fim,
    status: row.status,
    financeiroStatus: row.financeiro_status || "em_conferencia",
    nfNumero: row.nf_numero,
    nfEnviadaEm: row.nf_enviada_em?.toISOString?.().split("T")[0] ?? row.nf_enviada_em,
    pagamentoPrevistoEm: row.pagamento_previsto_em?.toISOString?.().split("T")[0] ?? row.pagamento_previsto_em,
    pagoNoErpEm: row.pago_no_erp_em?.toISOString?.().split("T")[0] ?? row.pago_no_erp_em,
    financeiroObservacao: row.financeiro_observacao,
    financeiroAtualizadoEm: row.financeiro_atualizado_em?.toISOString?.() ?? row.financeiro_atualizado_em,
    total: Number(row.total || 0),
    formaPagamento: row.forma_pagamento,
    localEntrega: row.local_entrega,
    snapshotDados: row.snapshot_dados ?? {},
    criadoEm: row.criado_em?.toISOString?.() ?? row.criado_em,
    itens: (row.itens ?? []).map((item) => ({
      ...item,
      dataExecucao: item.dataExecucao?.toISOString?.().split("T")[0] ?? item.dataExecucao,
      quantidade: Number(item.quantidade || 0),
      valorUnitario: Number(item.valorUnitario || 0),
      valorTotal: Number(item.valorTotal || 0),
    })),
  }));
}

async function getRolesForTenant(tenantId) {
  const { rows } = await query(
    `SELECT
       p.id,
       p.codigo,
       p.nome,
       p.descricao,
       p.sistema,
       COALESCE(
         ARRAY_AGG(DISTINCT perm.codigo) FILTER (WHERE perm.codigo IS NOT NULL),
         '{}'
       ) AS permissoes
     FROM ciperprag_hub.perfis p
     LEFT JOIN ciperprag_hub.perfil_permissoes pp ON pp.perfil_id = p.id
     LEFT JOIN ciperprag_hub.permissoes perm ON perm.id = pp.permissao_id
     WHERE p.tenant_id = $1
     GROUP BY p.id
     ORDER BY p.sistema DESC, p.nome`,
    [tenantId],
  );

  return rows.map((row) => ({
    id: row.id,
    codigo: row.codigo,
    nome: row.nome,
    descricao: row.descricao,
    sistema: row.sistema,
    permissoes: row.permissoes ?? [],
  }));
}

async function getUsersForTenant(tenantId) {
  const { rows } = await query(
    `SELECT
       u.id,
       u.nome,
       u.email,
       u.status,
       u.ultimo_login_em,
       u.created_at,
       u.updated_at,
       COALESCE(
         JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('codigo', p.codigo, 'nome', p.nome))
           FILTER (WHERE p.id IS NOT NULL),
         '[]'
       ) AS perfis
     FROM ciperprag_hub.usuarios u
     LEFT JOIN ciperprag_hub.usuario_perfis up ON up.usuario_id = u.id
     LEFT JOIN ciperprag_hub.perfis p ON p.id = up.perfil_id
     WHERE u.tenant_id = $1
     GROUP BY u.id
     ORDER BY u.nome`,
    [tenantId],
  );

  return rows.map((row) => ({
    id: row.id,
    nome: row.nome,
    email: row.email,
    status: row.status,
    ultimoLoginEm: row.ultimo_login_em?.toISOString?.() ?? row.ultimo_login_em,
    criadoEm: row.created_at?.toISOString?.() ?? row.created_at,
    atualizadoEm: row.updated_at?.toISOString?.() ?? row.updated_at,
    perfis: row.perfis ?? [],
  }));
}

async function getAuditLogsForTenant(tenantId, filters = {}) {
  const limit = Math.min(Math.max(Number(filters.limit || 150), 1), 500);
  const where = ["l.tenant_id = $1"];
  const params = [tenantId];

  if (filters.entityType && filters.entityType !== "todos") {
    params.push(filters.entityType);
    where.push(`l.entidade_tipo = $${params.length}`);
  }
  if (filters.action && filters.action !== "todas") {
    params.push(filters.action);
    where.push(`l.acao = $${params.length}`);
  }
  if (filters.entityId) {
    params.push(`%${String(filters.entityId).trim()}%`);
    where.push(`l.entidade_id ILIKE $${params.length}`);
  }
  if (filters.user) {
    params.push(`%${String(filters.user).trim()}%`);
    where.push(`(u.email ILIKE $${params.length} OR u.nome ILIKE $${params.length})`);
  }
  if (filters.ip) {
    params.push(`%${String(filters.ip).trim()}%`);
    where.push(`l.ip::text ILIKE $${params.length}`);
  }
  if (filters.dateFrom) {
    params.push(`${filters.dateFrom}T00:00:00`);
    where.push(`l.created_at >= $${params.length}::timestamptz`);
  }
  if (filters.dateTo) {
    params.push(`${filters.dateTo}T23:59:59`);
    where.push(`l.created_at <= $${params.length}::timestamptz`);
  }
  if (filters.search) {
    params.push(`%${String(filters.search).trim()}%`);
    where.push(`(l.resumo ILIKE $${params.length} OR l.entidade_id ILIKE $${params.length} OR l.acao ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.nome ILIKE $${params.length})`);
  }

  params.push(limit);
  const { rows } = await query(
    `SELECT
       l.id,
       l.entidade_tipo,
       l.entidade_id,
       l.acao,
       l.resumo,
       l.dados_antes,
       l.dados_depois,
       l.ip::text AS ip,
       l.user_agent,
       l.created_at,
       u.nome AS usuario_nome,
       u.email AS usuario_email
     FROM ciperprag_hub.audit_logs l
     LEFT JOIN ciperprag_hub.usuarios u ON u.id = l.usuario_id
     WHERE ${where.join(" AND ")}
     ORDER BY l.created_at DESC, l.id DESC
     LIMIT $${params.length}`,
    params,
  );

  return rows.map((row) => ({
    id: row.id,
    entidadeTipo: row.entidade_tipo,
    entidadeId: row.entidade_id,
    acao: row.acao,
    resumo: row.resumo,
    dadosAntes: row.dados_antes,
    dadosDepois: row.dados_depois,
    ip: row.ip,
    userAgent: row.user_agent,
    criadoEm: row.created_at?.toISOString?.() ?? row.created_at,
    usuario: row.usuario_email
      ? {
          nome: row.usuario_nome,
          email: row.usuario_email,
        }
      : null,
  }));
}

async function getBootstrap(tenantId, permissions = []) {
  const [companyConfig, numberingConfig, clients, services, stockProducts, contracts, schedules, orders, certificates, technicians, vehicles, allocations, contractTemplates, recurrenceSuggestions, measurements, attachments] =
    await Promise.all([
      getCompanyConfig(tenantId),
      getNumberingConfig(tenantId),
      getClients(tenantId),
      getServices(tenantId),
      getStockProducts(tenantId),
      getContracts(tenantId),
      getSchedules(tenantId),
      getOrders(tenantId),
      getCertificates(tenantId),
      getTechnicians(tenantId),
      getVehicles(tenantId),
      getAllocations(tenantId),
      getContractTemplates(tenantId),
      getRecurrenceSuggestions(tenantId),
      getMeasurements(tenantId),
      getAttachments(tenantId),
    ]);

  return {
    companyConfig,
    numberingConfig,
    clients,
    services,
    stockProducts,
    contracts: sanitizeContracts(contracts, permissions),
    schedules,
    orders,
    certificates,
    technicians,
    vehicles,
    allocations,
    contractTemplates: sanitizeContractTemplates(contractTemplates, permissions),
    recurrenceSuggestions,
    measurements: sanitizeMeasurements(measurements, permissions),
    attachments,
  };
}

async function nextSequential(field, tenantId) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE ciperprag_hub.numeracao_config
       SET ${field} = ${field} + 1, atualizado_em = NOW()
       WHERE id = (SELECT id FROM ciperprag_hub.numeracao_config WHERE tenant_id = $1 ORDER BY id LIMIT 1)
       RETURNING ${field} AS value`,
      [tenantId],
    );
    if (!rows[0]) throw new Error("Configuracao de numeracao nao encontrada para o tenant.");
    return rows[0].value;
  });
}

async function upsertSchedule(body, tenantId) {
  const id = body.id || makeId("AG");
  const desiredStatus = body.status || "agendado";
  const contractId = body.contratoId || null;
  const serviceId = body.servicoCatalogoId || null;
  const { rows: customerRows } = await query(
    "SELECT id, razao_social, cnpj FROM ciperprag_hub.clientes WHERE id = $1 AND tenant_id = $2 LIMIT 1",
    [body.clienteId, tenantId],
  );
  const customer = customerRows[0];
  if (!customer) {
    const error = new Error("Cliente nao encontrado para o agendamento.");
    error.status = 400;
    throw error;
  }

  const { rows: serviceRows } = await query(
    serviceId
      ? "SELECT id, nome, tipo, unidade, ativo FROM ciperprag_hub.servicos_catalogo WHERE id = $1 AND tenant_id = $2 LIMIT 1"
      : "SELECT id, nome, tipo, unidade, ativo FROM ciperprag_hub.servicos_catalogo WHERE tenant_id = $1 AND lower(trim(nome)) = lower(trim($2)) LIMIT 1",
    serviceId ? [serviceId, tenantId] : [tenantId, body.servico],
  );
  const service = serviceRows[0];
  if (!service || service.ativo === false) {
    const error = new Error("Selecione um servico ativo do catalogo para o agendamento.");
    error.status = 400;
    throw error;
  }

  let contract = null;
  if (contractId && !["cancelado", "encerrado"].includes(desiredStatus)) {
    const { rows: contractRows } = await query(
      `SELECT
         c.id,
         c.status,
         c.contratado,
         c.executado,
         c.servico_catalogo_id,
         t.tipo AS template_tipo,
         t.status AS template_status
       FROM ciperprag_hub.contratos c
       LEFT JOIN ciperprag_hub.contratos_templates t
         ON t.id = c.contrato_template_id
        AND t.tenant_id = c.tenant_id
       WHERE c.id = $1
         AND c.tenant_id = $2
       LIMIT 1`,
      [contractId, tenantId],
    );
    contract = contractRows[0] || null;
  }
  const scheduleRule = validateScheduleOrigin({ contractId, contract, service, desiredStatus });
  if (!scheduleRule.ok) {
    const error = new Error(scheduleRule.error);
      error.status = 400;
      throw error;
  }
  const { rowCount } = await query(
    `INSERT INTO ciperprag_hub.agendamentos
    (id, tenant_id, contrato_id, servico_catalogo_id, cliente_id, cliente, cliente_cnpj, servico, tipo, data_agendada, local_id, local_execucao, tags, observacao, tecnicos_ids, tecnicos_nomes, veiculo_id, veiculo_descricao, status, created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,NOW())
    ON CONFLICT (id) DO UPDATE SET
      contrato_id=EXCLUDED.contrato_id,
      servico_catalogo_id=EXCLUDED.servico_catalogo_id,
      cliente_id=EXCLUDED.cliente_id,
      cliente=EXCLUDED.cliente,
      cliente_cnpj=EXCLUDED.cliente_cnpj,
      servico=EXCLUDED.servico,
      tipo=EXCLUDED.tipo,
      data_agendada=EXCLUDED.data_agendada,
      local_id=EXCLUDED.local_id,
      local_execucao=EXCLUDED.local_execucao,
      tags=EXCLUDED.tags,
      observacao=EXCLUDED.observacao,
      tecnicos_ids=EXCLUDED.tecnicos_ids,
      tecnicos_nomes=EXCLUDED.tecnicos_nomes,
      veiculo_id=EXCLUDED.veiculo_id,
      veiculo_descricao=EXCLUDED.veiculo_descricao,
      status=EXCLUDED.status
    WHERE ciperprag_hub.agendamentos.tenant_id = EXCLUDED.tenant_id`,
    [
      id,
      tenantId,
      contractId,
      service.id,
      body.clienteId || null,
      body.clienteNome || customer.razao_social,
      body.clienteCnpj || customer.cnpj,
      service.nome,
      service.tipo,
      body.dataAgendada,
      body.localId || null,
      body.localExecucao,
      body.tags || null,
      body.observacao || null,
      body.tecnicosIds || [],
      body.tecnicosNomes || [],
      body.veiculoId || null,
      body.veiculoDescricao || null,
      desiredStatus,
    ],
  );
  assertTenantWrite(rowCount, "Agendamento");
  return id;
}

app.get("/api/health", async (_req, res) => {
  await query("SELECT 1");
  res.json({ ok: true });
});

app.get("/api/certificates/:hash", async (req, res) => {
  const certificate = await getCertificateByHash(req.params.hash);
  if (!certificate) return res.status(404).json({ error: "Certificado nao encontrado" });
  res.json({ ok: true, certificate, verifiedAt: new Date().toISOString() });
});

app.post("/api/auth/login", async (req, res) => {
  const result = await loginWithPassword({
    email: req.body.email,
    password: req.body.password,
    tenantSlug: req.body.tenantSlug,
    ip: getRequestIp(req),
    userAgent: req.headers["user-agent"],
  });
  res.json({ ok: true, ...result });
});

app.get("/api/public/tenant-context", async (req, res) => {
  const tenantSlug = getTenantSlugFromRequest(req);
  if (!tenantSlug) return res.json({ ok: true, tenant: null });

  const { rows } = await query(
    `SELECT
       t.slug,
       COALESCE(t.nome_fantasia, t.razao_social, t.slug) AS nome,
       ec.logo_url,
       ec.brand_icon_url,
       ec.logo_interface_url,
       ec.cor_primaria
     FROM ciperprag_hub.tenants t
     LEFT JOIN LATERAL (
       SELECT
         logo_url,
         certificado_config->>'brandIconUrl' AS brand_icon_url,
         COALESCE(certificado_config->>'sidebarLogoDarkUrl', certificado_config->>'logoInterfaceUrl') AS logo_interface_url,
         cor_primaria
       FROM ciperprag_hub.empresa_config
       WHERE tenant_id = t.id
       ORDER BY id
       LIMIT 1
     ) ec ON TRUE
     WHERE t.slug = $1
     LIMIT 1`,
    [tenantSlug],
  );

  const tenant = rows[0];
  if (!tenant) return res.json({ ok: true, tenant: null });
  return res.json({
    ok: true,
    tenant: {
      slug: tenant.slug,
      nome: tenant.nome,
      logoUrl: tenant.logo_url || null,
      brandIconUrl: tenant.brand_icon_url || null,
      logoInterfaceUrl: tenant.logo_interface_url || null,
      corPrimaria: tenant.cor_primaria || null,
    },
  });
});

app.use("/api", requireAuth);

app.get("/api/auth/me", async (req, res) => {
  res.json({ ok: true, user: req.auth.user });
});

app.post("/api/auth/logout", async (req, res) => {
  await logAuditEvent(null, req, {
    entityType: "usuario",
    entityId: req.auth.user.id,
    action: "logout",
    summary: "Logout realizado",
  });
  await revokeSession(req.auth.tokenHash);
  res.json({ ok: true });
});

app.post("/api/auth/change-password", async (req, res) => {
  const user = await changePassword({
    userId: req.auth.user.id,
    tenantId: req.auth.user.tenant.id,
    currentPassword: req.body.currentPassword,
    newPassword: req.body.newPassword,
    sessionTokenHash: req.auth.tokenHash,
    ip: getRequestIp(req),
    userAgent: req.headers["user-agent"],
  });
  res.json({ ok: true, user });
});

app.get("/api/bootstrap", async (_req, res) => {
  if (_req.auth?.user?.senhaTemporaria) return res.status(428).json({ error: "Troca de senha obrigatoria antes de continuar." });
  res.json(await getBootstrap(_req.auth.user.tenant.id, _req.auth.user.permissoes));
});

app.get("/api/audit-logs", requirePermission("auditoria.view"), async (req, res) => {
  const logs = await getAuditLogsForTenant(req.auth.user.tenant.id, {
    entityType: req.query.entityType,
    action: req.query.action,
    entityId: req.query.entityId,
    user: req.query.user,
    ip: req.query.ip,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
    search: req.query.search,
    limit: req.query.limit,
  });
  res.json({ ok: true, logs });
});

app.post("/api/audit-logs/evidence", requirePermission("auditoria.view"), async (req, res) => {
  const action = req.body.action === "copy" ? "audit_evidence_copied" : "audit_evidence_exported";
  await logAuditEvent(null, req, {
    entityType: "auditoria",
    entityId: req.body.auditLogId ? String(req.body.auditLogId) : null,
    action,
    summary: action === "audit_evidence_copied" ? "Evidencia de auditoria copiada" : "Evidencia de auditoria exportada",
    after: {
      origem: req.body.origin || null,
      formato: req.body.format || null,
      totalEventos: req.body.totalEventos || null,
      filtros: req.body.filters || null,
      justificativa: req.body.justification || null,
    },
  });
  res.json({ ok: true });
});

app.get("/api/attachments/:id/download", async (req, res) => {
  if (req.auth?.user?.senhaTemporaria) return res.status(428).json({ error: "Troca de senha obrigatoria antes de continuar." });
  const { rows } = await query("SELECT * FROM ciperprag_hub.evidencias_anexos WHERE id = $1 AND tenant_id = $2 LIMIT 1", [req.params.id, req.auth.user.tenant.id]);
  const attachment = rows[0];
  if (!attachment) return res.status(404).json({ error: "Anexo nao encontrado." });

  const requiredPermission = attachmentPermissionFor(attachment.entidade_tipo);
  const granted = new Set(req.auth?.user?.permissoes || []);
  if (!granted.has(requiredPermission)) return res.status(403).json({ error: "Usuario sem permissao para acessar este anexo." });
  const hasDatabaseContent = Boolean(attachment.conteudo_base64);
  const hasR2Content = attachment.storage_provider === "r2" && attachment.storage_bucket && attachment.storage_key;
  if (!hasDatabaseContent && !attachment.url && !hasR2Content) return res.status(404).json({ error: "Conteudo do anexo nao encontrado." });
  await logAuditEvent(null, req, {
    entityType: "anexo",
    entityId: attachment.id,
    action: req.query.download === "1" ? "attachment_download" : "attachment_view",
    summary: `${req.query.download === "1" ? "Download" : "Visualizacao"} do anexo ${attachment.nome_arquivo}`,
    after: {
      entidadeTipo: attachment.entidade_tipo,
      entidadeId: attachment.entidade_id,
      categoria: attachment.categoria,
      nomeArquivo: attachment.nome_arquivo,
      hashSha256: attachment.hash_sha256,
    },
  });
  if (attachment.url && !hasDatabaseContent && !hasR2Content) return res.redirect(attachment.url);

  const decoded = hasR2Content && !hasDatabaseContent
    ? await readAttachmentContentFromStorage({ bucket: attachment.storage_bucket, key: attachment.storage_key })
    : decodeStoredAttachmentContent(attachment.conteudo_base64);
  const mimeType = attachment.mime_type || decoded.mimeType || "application/octet-stream";
  const dispositionType = req.query.download === "1" ? "attachment" : "inline";
  const fileName = String(attachment.nome_arquivo || `${attachment.id}.bin`).replaceAll('"', "");

  res.setHeader("Content-Type", mimeType);
  res.setHeader("Content-Length", decoded.buffer.length);
  res.setHeader("Content-Disposition", `${dispositionType}; filename="${encodeURIComponent(fileName)}"`);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Storage-Provider", hasR2Content && !hasDatabaseContent ? "r2" : "database");
  if (attachment.hash_sha256) res.setHeader("X-Document-Hash-Sha256", attachment.hash_sha256);
  res.send(decoded.buffer);
});

app.get("/api/proposal-pdf-imports/:id/download", requirePermission("contratos.manage"), async (req, res) => {
  const tenantId = req.auth.user.tenant.id;
  const { rows } = await query(
    `SELECT id, nome_arquivo, mime_type, tamanho_bytes, conteudo_base64, hash_sha256
     FROM ciperprag_hub.proposta_pdf_importacoes
     WHERE id = $1 AND tenant_id = $2
     LIMIT 1`,
    [req.params.id, tenantId],
  );
  const original = rows[0];
  if (!original) return res.status(404).json({ error: "PDF original nao encontrado." });
  const decoded = decodeStoredAttachmentContent(original.conteudo_base64);
  await logAuditEvent(null, req, {
    entityType: "proposta_pdf_importacao",
    entityId: original.id,
    action: "proposal_source_pdf_download",
    summary: `PDF original da proposta consultado: ${original.nome_arquivo}`,
    after: { nomeArquivo: original.nome_arquivo, hashSha256: original.hash_sha256 },
  });
  res.setHeader("Content-Type", original.mime_type || decoded.mimeType || "application/pdf");
  res.setHeader("Content-Length", decoded.buffer.length);
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(String(original.nome_arquivo || `${original.id}.pdf`).replaceAll('"', ""))}"`);
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (original.hash_sha256) res.setHeader("X-Document-Hash-Sha256", original.hash_sha256);
  res.send(decoded.buffer);
});

app.get("/api/roles", requirePermission("usuarios.manage"), async (req, res) => {
  res.json({ ok: true, roles: await getRolesForTenant(req.auth.user.tenant.id) });
});

app.get("/api/users", requirePermission("usuarios.manage"), async (req, res) => {
  res.json({ ok: true, users: await getUsersForTenant(req.auth.user.tenant.id) });
});

app.post("/api/users", requirePermission("usuarios.manage"), async (req, res) => {
  const body = req.body;
  const tenantId = req.auth.user.tenant.id;
  const email = normalizeEmail(body.email);
  const status = body.status || "ativo";
  const roleCodes = Array.isArray(body.perfilCodigos) ? body.perfilCodigos : [];

  if (!String(body.nome || "").trim()) return res.status(400).json({ error: "Nome obrigatorio." });
  if (!email) return res.status(400).json({ error: "E-mail obrigatorio." });
  if (!["ativo", "convidado", "bloqueado", "inativo"].includes(status)) return res.status(400).json({ error: "Status invalido." });
  if (roleCodes.length === 0) return res.status(400).json({ error: "Selecione pelo menos um perfil." });
  if (body.id === req.auth.user.id && status !== "ativo") return res.status(400).json({ error: "Voce nao pode bloquear ou inativar seu proprio usuario." });

  const temporaryPassword = body.id ? null : createTemporaryPassword();
  const passwordHash = temporaryPassword ? await hashPassword(temporaryPassword) : null;

  const user = await withTransaction(async (client) => {
    const { rows: roleRows } = await client.query(
      `SELECT id, codigo
       FROM ciperprag_hub.perfis
       WHERE tenant_id = $1 AND codigo = ANY($2::text[])`,
      [tenantId, roleCodes],
    );
    if (roleRows.length !== roleCodes.length) {
      const error = new Error("Um ou mais perfis informados nao existem.");
      error.status = 400;
      throw error;
    }

    const { rows: beforeUserRows } = body.id
      ? await client.query(
          `SELECT id, nome, email, status
           FROM ciperprag_hub.usuarios
           WHERE id = $1 AND tenant_id = $2`,
          [body.id, tenantId],
        )
      : { rows: [] };
    const beforeUser = beforeUserRows[0] || null;

    const { rows } = body.id
      ? await client.query(
          `UPDATE ciperprag_hub.usuarios
           SET nome = $3,
               email = $4,
               status = $5,
               updated_at = NOW()
           WHERE id = $1 AND tenant_id = $2
           RETURNING id, nome, email, status`,
          [body.id, tenantId, String(body.nome).trim(), email, status],
        )
      : await client.query(
          `INSERT INTO ciperprag_hub.usuarios
           (tenant_id, nome, email, senha_hash, status, senha_alterada_em, senha_temporaria)
           VALUES ($1,$2,$3,$4,$5,NOW(),TRUE)
           RETURNING id, nome, email, status`,
          [tenantId, String(body.nome).trim(), email, passwordHash, status],
        );

    const savedUser = rows[0];
    if (!savedUser) {
      const error = new Error("Usuario nao encontrado.");
      error.status = 404;
      throw error;
    }

    await client.query("DELETE FROM ciperprag_hub.usuario_perfis WHERE usuario_id = $1", [savedUser.id]);
    for (const role of roleRows) {
      await client.query(
        `INSERT INTO ciperprag_hub.usuario_perfis (usuario_id, perfil_id)
         VALUES ($1,$2)
         ON CONFLICT DO NOTHING`,
        [savedUser.id, role.id],
      );
    }

    const auditAction =
      beforeUser && beforeUser.status !== savedUser.status && ["bloqueado", "inativo"].includes(savedUser.status)
        ? "user_inactivated"
        : body.id
          ? "user_updated"
          : "user_created";
    await logAuditEvent(client, req, {
      entityType: "usuario",
      entityId: savedUser.id,
      action: auditAction,
      summary:
        auditAction === "user_inactivated"
          ? `Usuario ${savedUser.email} inativado/bloqueado`
          : body.id
            ? `Usuario ${savedUser.email} atualizado`
            : `Usuario ${savedUser.email} criado`,
      before: beforeUser,
      after: { id: savedUser.id, nome: savedUser.nome, email: savedUser.email, status: savedUser.status, perfis: roleCodes },
    });

    return savedUser;
  });

  res.json({ ok: true, user, temporaryPassword });
});

app.post("/api/users/:id/reset-password", requirePermission("usuarios.manage"), async (req, res) => {
  const tenantId = req.auth.user.tenant.id;
  const userId = req.params.id;
  const temporaryPassword = createTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  const { rowCount } = await query(
    `UPDATE ciperprag_hub.usuarios
     SET senha_hash = $3,
         senha_temporaria = TRUE,
         senha_alterada_em = NOW(),
         tentativas_login = 0,
         bloqueado_ate = NULL,
         updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2`,
    [userId, tenantId, passwordHash],
  );
  if (!rowCount) return res.status(404).json({ error: "Usuario nao encontrado." });

  await query(
    `UPDATE ciperprag_hub.usuario_sessoes
     SET revoked_at = NOW()
     WHERE usuario_id = $1 AND revoked_at IS NULL`,
    [userId],
  );

  await query(
    `INSERT INTO ciperprag_hub.audit_logs
     (tenant_id, usuario_id, entidade_tipo, entidade_id, acao, resumo)
     VALUES ($1,$2,'usuario',$3,'password_reset','Senha temporaria gerada')`,
    [tenantId, req.auth.user.id, userId],
  );

  res.json({ ok: true, temporaryPassword });
});

app.post("/api/clients", requirePermission("clientes.manage"), async (req, res) => {
  const body = req.body;
  const id = body.id || `CLI-${String(Date.now()).slice(-6)}`;
  const tenantId = req.auth.user.tenant.id;
  await withTransaction(async (client) => {
    const { rows: beforeRows } = await client.query("SELECT * FROM ciperprag_hub.clientes WHERE id = $1 AND tenant_id = $2", [id, tenantId]);
    const before = beforeRows[0] || null;
    const { rowCount: clientRowCount } = await client.query(
      `INSERT INTO ciperprag_hub.clientes (id, tenant_id, razao_social, nome_fantasia, cnpj, inscricao_estadual, endereco, bairro, municipio, uf, cep, logo_url, ativo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO UPDATE SET
         razao_social = EXCLUDED.razao_social,
         nome_fantasia = EXCLUDED.nome_fantasia,
         cnpj = EXCLUDED.cnpj,
         inscricao_estadual = EXCLUDED.inscricao_estadual,
         endereco = EXCLUDED.endereco,
         bairro = EXCLUDED.bairro,
         municipio = EXCLUDED.municipio,
         uf = EXCLUDED.uf,
         cep = EXCLUDED.cep,
         logo_url = EXCLUDED.logo_url,
         ativo = EXCLUDED.ativo,
         atualizado_em = NOW()
      WHERE ciperprag_hub.clientes.tenant_id = EXCLUDED.tenant_id`,
      [id, tenantId, body.razaoSocial, body.nomeFantasia, body.cnpj, body.inscricaoEstadual, body.endereco, body.bairro, body.municipio, body.uf, body.cep, body.logoUrl || null, body.ativo],
    );
    assertTenantWrite(clientRowCount, "Cliente");
    await client.query("DELETE FROM ciperprag_hub.contatos_cliente WHERE cliente_id = $1 AND EXISTS (SELECT 1 FROM ciperprag_hub.clientes c WHERE c.id = contatos_cliente.cliente_id AND c.tenant_id = $2)", [id, tenantId]);
    for (const contato of body.contatos || []) {
      await client.query(
        `INSERT INTO ciperprag_hub.contatos_cliente (cliente_id, nome, cargo, funcao, telefone, email, principal, observacoes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id, contato.nome, contato.cargo, contato.funcao || "operacional", contato.telefone, contato.email, contato.principal, contato.observacoes || null],
      );
    }

    await client.query("DELETE FROM ciperprag_hub.cliente_equipamentos WHERE cliente_id = $1 AND tenant_id = $2", [id, tenantId]);
    await client.query("DELETE FROM ciperprag_hub.cliente_locais_execucao WHERE cliente_id = $1 AND tenant_id = $2", [id, tenantId]);

    const savedLocationIds = new Set();
    for (const local of body.locaisExecucao || []) {
      const localId = local.id || makeId("LOC");
      savedLocationIds.add(localId);
      await client.query(
        `INSERT INTO ciperprag_hub.cliente_locais_execucao
         (id, tenant_id, cliente_id, nome, endereco, bairro, municipio, uf, cep, observacoes, ativo)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [localId, tenantId, id, local.nome, local.endereco || null, local.bairro || null, local.municipio || null, local.uf || null, local.cep || null, local.observacoes || null, local.ativo ?? true],
      );
    }

    for (const equipamento of body.equipamentos || []) {
      const equipamentoId = equipamento.id || makeId("EQP");
      const localId = equipamento.localId && savedLocationIds.has(equipamento.localId) ? equipamento.localId : null;
      await client.query(
        `INSERT INTO ciperprag_hub.cliente_equipamentos
         (id, tenant_id, cliente_id, local_id, tag, descricao, tipo, setor, observacoes, ativo)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [equipamentoId, tenantId, id, localId, equipamento.tag, equipamento.descricao || null, equipamento.tipo || null, equipamento.setor || null, equipamento.observacoes || null, equipamento.ativo ?? true],
      );
    }
    const auditAction = before && before.ativo !== body.ativo && body.ativo === false ? "client_inactivated" : before ? "client_updated" : "client_created";
    await logAuditEvent(client, req, {
      entityType: "cliente",
      entityId: id,
      action: auditAction,
      summary: `${auditAction === "client_inactivated" ? "Cliente inativado" : before ? "Cliente atualizado" : "Cliente criado"}: ${body.razaoSocial || body.nomeFantasia || id}`,
      before,
      after: {
        id,
        razaoSocial: body.razaoSocial,
        nomeFantasia: body.nomeFantasia,
        cnpj: body.cnpj,
        ativo: body.ativo,
        contatos: (body.contatos || []).length,
        locaisExecucao: (body.locaisExecucao || []).length,
        equipamentos: (body.equipamentos || []).length,
      },
    });
  });
  res.json({ ok: true, id });
});

app.post("/api/services", requirePermission("servicos.manage"), async (req, res) => {
  const body = req.body;
  const id = body.id || `SRV-${String(Date.now()).slice(-6)}`;
  const tenantId = req.auth.user.tenant.id;
  await withTransaction(async (client) => {
    const { rows: beforeRows } = await client.query("SELECT * FROM ciperprag_hub.servicos_catalogo WHERE id = $1 AND tenant_id = $2", [id, tenantId]);
    const before = beforeRows[0] || null;
    const auditAction = before && before.ativo !== body.ativo && body.ativo === false ? "service_inactivated" : before ? "service_updated" : "service_created";
    const auditSummaryPrefix = auditAction === "service_inactivated" ? "Servico inativado" : before ? "Servico atualizado" : "Servico criado";
    const { rowCount: serviceRowCount } = await client.query(
      `INSERT INTO ciperprag_hub.servicos_catalogo (
        id, tenant_id, nome, tipo, descricao, unidade, recorrencia_dias, gera_certificado, validade_certificado_dias,
        produtos_quimicos, produtos_detalhados, epis, riscos, normas_aplicaveis, procedimentos, checklist_itens,
        exige_foto, exige_assinatura, permite_nao_execucao, pop_codigo, pop_titulo, pop_versao, ativo
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
      ON CONFLICT (id) DO UPDATE SET
        nome = EXCLUDED.nome,
        tipo = EXCLUDED.tipo,
        descricao = EXCLUDED.descricao,
        unidade = EXCLUDED.unidade,
        recorrencia_dias = EXCLUDED.recorrencia_dias,
        gera_certificado = EXCLUDED.gera_certificado,
        validade_certificado_dias = EXCLUDED.validade_certificado_dias,
        produtos_quimicos = EXCLUDED.produtos_quimicos,
        produtos_detalhados = EXCLUDED.produtos_detalhados,
        epis = EXCLUDED.epis,
        riscos = EXCLUDED.riscos,
        normas_aplicaveis = EXCLUDED.normas_aplicaveis,
        procedimentos = EXCLUDED.procedimentos,
        checklist_itens = EXCLUDED.checklist_itens,
        exige_foto = EXCLUDED.exige_foto,
        exige_assinatura = EXCLUDED.exige_assinatura,
        permite_nao_execucao = EXCLUDED.permite_nao_execucao,
        pop_codigo = EXCLUDED.pop_codigo,
        pop_titulo = EXCLUDED.pop_titulo,
        pop_versao = EXCLUDED.pop_versao,
        ativo = EXCLUDED.ativo,
        atualizado_em = NOW()
      WHERE ciperprag_hub.servicos_catalogo.tenant_id = EXCLUDED.tenant_id`,
      [
        id,
        tenantId,
        body.nome,
        body.tipo,
        body.descricao,
        body.unidade,
        body.recorrenciaDias,
        body.geraCertificado,
        body.validadeCertificadoDias,
        body.produtosQuimicos || [],
        JSON.stringify(normalizeJsonArray(body.produtosDetalhados)),
        body.epis || [],
        body.riscos || [],
        body.normasAplicaveis || [],
        body.procedimentos || [],
        body.checklistItens || [],
        body.exigeFoto ?? false,
        body.exigeAssinatura ?? true,
        body.permiteNaoExecucao ?? true,
        body.popCodigo || null,
        body.popTitulo || null,
        body.popVersao || null,
        body.ativo,
      ],
    );
    assertTenantWrite(serviceRowCount, "Servico");

    const estoqueProdutos = Array.isArray(body.produtosEstoque) ? body.produtosEstoque : [];
    await client.query("DELETE FROM ciperprag_hub.servicos_catalogo_produtos WHERE servico_id = $1 AND tenant_id = $2", [id, tenantId]);
    for (const item of estoqueProdutos) {
      const produtoId = String(item.produtoId || "").trim();
      const quantidadePrevista = Number(item.quantidadePrevista || 0);
      if (!produtoId || !Number.isFinite(quantidadePrevista) || quantidadePrevista <= 0) continue;
      const { rowCount: productCount } = await client.query("SELECT 1 FROM ciperprag_hub.produtos_estoque WHERE id = $1 AND tenant_id = $2", [produtoId, tenantId]);
      if (!productCount) {
        const error = new Error("Um dos produtos vinculados ao servico nao pertence a este tenant.");
        error.status = 400;
        throw error;
      }
      await client.query(
        `INSERT INTO ciperprag_hub.servicos_catalogo_produtos (tenant_id, servico_id, produto_id, quantidade_prevista, unidade)
         VALUES ($1,$2,$3,$4,$5)`,
        [tenantId, id, produtoId, quantidadePrevista, item.unidade || null],
      );
    }

    const hasPopData = Boolean(
      body.popCodigo ||
      body.popTitulo ||
      body.popObjetivo ||
      body.popAplicacao ||
      (body.popResponsabilidades || []).length ||
      (body.popMateriais || []).length ||
      (body.procedimentos || []).length ||
      (body.checklistItens || []).length,
    );

    if (!hasPopData) {
      await client.query("UPDATE ciperprag_hub.servicos_catalogo SET pop_ativo_id = NULL WHERE id = $1 AND tenant_id = $2", [id, tenantId]);
      await logAuditEvent(client, req, {
        entityType: "servico",
        entityId: id,
        action: auditAction,
        summary: `${auditSummaryPrefix}: ${body.nome || id}`,
        before,
        after: {
          id,
          nome: body.nome,
          tipo: body.tipo,
          geraCertificado: body.geraCertificado,
          recorrenciaDias: body.recorrenciaDias,
          popAtivoId: null,
          checklistItens: (body.checklistItens || []).length,
        },
      });
      return;
    }

    const popCodigo = body.popCodigo || `POP-${id}`;
    const popTitulo = body.popTitulo || body.nome;
    const popVersao = body.popVersao || "001";
    const { rows: popRows } = await client.query(
      `INSERT INTO ciperprag_hub.servico_pops (
        id, tenant_id, servico_id, codigo, titulo, versao, status, objetivo, aplicacao,
        responsabilidades, materiais, procedimentos, checklist_itens, aprovado_por, aprovado_em
      )
      VALUES ($1,$2,$3,$4,$5,$6,'ativo',$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (servico_id, codigo, versao) DO UPDATE SET
        titulo = EXCLUDED.titulo,
        status = 'ativo',
        objetivo = EXCLUDED.objetivo,
        aplicacao = EXCLUDED.aplicacao,
        responsabilidades = EXCLUDED.responsabilidades,
        materiais = EXCLUDED.materiais,
        procedimentos = EXCLUDED.procedimentos,
        checklist_itens = EXCLUDED.checklist_itens,
        aprovado_por = EXCLUDED.aprovado_por,
        aprovado_em = EXCLUDED.aprovado_em,
        atualizado_em = NOW()
      RETURNING id`,
      [
        makeId("POP"),
        tenantId,
        id,
        popCodigo,
        popTitulo,
        popVersao,
        body.popObjetivo || body.descricao || null,
        body.popAplicacao || null,
        body.popResponsabilidades || [],
        body.popMateriais || [],
        body.procedimentos || [],
        body.checklistItens || [],
        body.popAprovadoPor || null,
        body.popAprovadoEm || null,
      ],
    );
    const popId = popRows[0].id;
    await client.query(
      "UPDATE ciperprag_hub.servico_pops SET status = 'inativo', atualizado_em = NOW() WHERE servico_id = $1 AND id <> $2 AND status = 'ativo' AND tenant_id = $3",
      [id, popId, tenantId],
    );
    await client.query("UPDATE ciperprag_hub.servicos_catalogo SET pop_ativo_id = $2 WHERE id = $1 AND tenant_id = $3", [id, popId, tenantId]);
    await logAuditEvent(client, req, {
      entityType: "servico",
      entityId: id,
      action: auditAction,
      summary: `${auditSummaryPrefix}: ${body.nome || id}`,
      before,
      after: {
        id,
        nome: body.nome,
        tipo: body.tipo,
        geraCertificado: body.geraCertificado,
        recorrenciaDias: body.recorrenciaDias,
        popAtivoId: popId,
        popCodigo,
        popVersao,
        checklistItens: (body.checklistItens || []).length,
      },
    });
  });
  res.json({ ok: true, id });
});

app.post("/api/stock/products", requirePermission("estoque.manage"), async (req, res) => {
  const body = req.body || {};
  const tenantId = req.auth.user.tenant.id;
  const id = body.id || makeId("PROD");
  const codigo = String(body.codigo || "").trim();
  const nome = String(body.nome || "").trim();
  if (!codigo || !nome) return res.status(400).json({ error: "Codigo e nome do produto sao obrigatorios." });
  const quantidadeAtual = Number(body.quantidadeAtual ?? 0);
  const estoqueMinimo = Number(body.estoqueMinimo ?? 0);
  if (!Number.isFinite(quantidadeAtual) || quantidadeAtual < 0 || !Number.isFinite(estoqueMinimo) || estoqueMinimo < 0) {
    return res.status(400).json({ error: "Informe quantidades de estoque validas." });
  }

  await withTransaction(async (client) => {
    const { rows: beforeRows } = await client.query(
      "SELECT * FROM ciperprag_hub.produtos_estoque WHERE id = $1 AND tenant_id = $2 LIMIT 1",
      [id, tenantId],
    );
    const before = beforeRows[0] || null;
    if (before && body.quantidadeAtual !== undefined && Number(before.quantidade_atual) !== quantidadeAtual) {
      const error = new Error("Altere o saldo usando uma movimentacao de estoque.");
      error.status = 400;
      throw error;
    }
    const result = await client.query(
      `INSERT INTO ciperprag_hub.produtos_estoque
        (id, tenant_id, codigo, nome, descricao, unidade, quantidade_atual, estoque_minimo, ativo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET
         codigo = EXCLUDED.codigo,
         nome = EXCLUDED.nome,
         descricao = EXCLUDED.descricao,
         unidade = EXCLUDED.unidade,
         estoque_minimo = EXCLUDED.estoque_minimo,
         ativo = EXCLUDED.ativo,
         atualizado_em = NOW()
       WHERE ciperprag_hub.produtos_estoque.tenant_id = EXCLUDED.tenant_id`,
      [id, tenantId, codigo, nome, body.descricao || null, body.unidade || "un.", before ? before.quantidade_atual : quantidadeAtual, estoqueMinimo, body.ativo ?? true],
    );
    assertTenantWrite(result.rowCount, "Produto");
    await logAuditEvent(client, req, {
      entityType: "produto_estoque",
      entityId: id,
      action: before ? "stock_product_updated" : "stock_product_created",
      summary: `${before ? "Produto de estoque atualizado" : "Produto de estoque criado"}: ${nome}`,
      before,
      after: { id, codigo, nome, unidade: body.unidade || "un.", estoqueMinimo, ativo: body.ativo ?? true },
    });
  });
  res.json({ ok: true, id });
});

app.post("/api/stock/movements", requirePermission("estoque.manage", "os.close"), async (req, res) => {
  const body = req.body || {};
  const tenantId = req.auth.user.tenant.id;
  const type = String(body.tipo || "").trim().toLowerCase();
  const quantity = Number(body.quantidade);
  if (!["entrada", "saida", "ajuste", "devolucao", "perda"].includes(type) || !Number.isFinite(quantity) || quantity <= 0) {
    return res.status(400).json({ error: "Tipo e quantidade da movimentacao sao obrigatorios." });
  }

  const movement = await withTransaction(async (client) => {
    const { rows } = await client.query(
      "SELECT * FROM ciperprag_hub.produtos_estoque WHERE id = $1 AND tenant_id = $2 FOR UPDATE",
      [body.produtoId, tenantId],
    );
    const product = rows[0];
    if (!product) {
      const error = new Error("Produto de estoque nao encontrado.");
      error.status = 404;
      throw error;
    }
    const before = Number(product.quantidade_atual || 0);
    const after = type === "ajuste"
      ? quantity
      : before + (["entrada", "devolucao"].includes(type) ? quantity : -quantity);
    if (after < 0) {
      const error = new Error(`Saldo insuficiente de ${product.nome}. Disponivel: ${before} ${product.unidade}.`);
      error.status = 400;
      throw error;
    }
    if (body.osId) {
      const { rowCount } = await client.query("SELECT 1 FROM ciperprag_hub.ordens_servico WHERE id = $1 AND tenant_id = $2", [body.osId, tenantId]);
      if (!rowCount) {
        const error = new Error("OS vinculada ao movimento nao encontrada neste tenant.");
        error.status = 400;
        throw error;
      }
    }
    await client.query("UPDATE ciperprag_hub.produtos_estoque SET quantidade_atual = $2, atualizado_em = NOW() WHERE id = $1 AND tenant_id = $3", [product.id, after, tenantId]);
    const id = makeId("MOV");
    await client.query(
      `INSERT INTO ciperprag_hub.estoque_movimentacoes
       (id, tenant_id, produto_id, tipo, quantidade, saldo_anterior, saldo_posterior, os_id, servico_id, observacao, criado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [id, tenantId, product.id, type, quantity, before, after, body.osId || null, body.servicoId || null, body.observacao || null, req.auth.user.id],
    );
    await logAuditEvent(client, req, {
      entityType: "estoque_movimentacao",
      entityId: id,
      action: "stock_movement_created",
      summary: `Movimentacao ${type} de ${product.nome}`,
      after: { produtoId: product.id, tipo: type, quantidade: quantity, saldoAnterior: before, saldoPosterior: after, osId: body.osId || null },
    });
    return { id, produtoId: product.id, tipo: type, quantidade: quantity, saldoAnterior: before, saldoPosterior: after };
  });
  res.json({ ok: true, movement });
});

app.get("/api/stock/report", requirePermission("estoque.manage", "medicoes.manage"), async (req, res) => {
  const tenantId = req.auth.user.tenant.id;
  const dateFrom = String(req.query.dateFrom || "").trim() || null;
  const dateTo = String(req.query.dateTo || "").trim() || null;
  const productId = String(req.query.productId || "").trim() || null;
  const osId = String(req.query.osId || "").trim() || null;
  const { rows } = await query(
    `SELECT m.id, m.produto_id, p.codigo, p.nome AS produto_nome, p.unidade,
            m.tipo, m.quantidade, m.saldo_anterior, m.saldo_posterior,
            m.os_id, o.numero AS os_numero, m.servico_id, s.nome AS servico_nome,
            m.observacao, m.criado_em
     FROM ciperprag_hub.estoque_movimentacoes m
     JOIN ciperprag_hub.produtos_estoque p ON p.id = m.produto_id AND p.tenant_id = m.tenant_id
     LEFT JOIN ciperprag_hub.ordens_servico o ON o.id = m.os_id AND o.tenant_id = m.tenant_id
     LEFT JOIN ciperprag_hub.servicos_catalogo s ON s.id = m.servico_id AND s.tenant_id = m.tenant_id
     WHERE m.tenant_id = $1
       AND ($2::date IS NULL OR m.criado_em::date >= $2::date)
       AND ($3::date IS NULL OR m.criado_em::date <= $3::date)
       AND ($4::text IS NULL OR m.produto_id = $4)
       AND ($5::text IS NULL OR m.os_id = $5)
     ORDER BY m.criado_em DESC, m.id DESC
     LIMIT 1000`,
    [tenantId, dateFrom, dateTo, productId, osId],
  );
  const movements = rows.map((row) => ({
    id: row.id,
    produtoId: row.produto_id,
    codigo: row.codigo,
    produtoNome: row.produto_nome,
    unidade: row.unidade,
    tipo: row.tipo,
    quantidade: Number(row.quantidade),
    saldoAnterior: Number(row.saldo_anterior),
    saldoPosterior: Number(row.saldo_posterior),
    osId: row.os_id,
    osNumero: row.os_numero,
    servicoId: row.servico_id,
    servicoNome: row.servico_nome,
    observacao: row.observacao,
    criadoEm: row.criado_em?.toISOString?.() ?? row.criado_em,
  }));
  const summary = movements.reduce((acc, item) => {
    const key = item.produtoId;
    if (!acc[key]) acc[key] = { produtoId: key, produtoNome: item.produtoNome, unidade: item.unidade, entradas: 0, saidas: 0, ajustes: 0, perdas: 0, devolucoes: 0, movimentos: 0 };
    acc[key].movimentos += 1;
    if (item.tipo === "entrada") acc[key].entradas += item.quantidade;
    if (item.tipo === "saida") acc[key].saidas += item.quantidade;
    if (item.tipo === "ajuste") acc[key].ajustes += item.quantidade;
    if (item.tipo === "perda") acc[key].perdas += item.quantidade;
    if (item.tipo === "devolucao") acc[key].devolucoes += item.quantidade;
    return acc;
  }, {});
  res.json({ ok: true, filters: { dateFrom, dateTo, productId, osId }, movements, summary: Object.values(summary) });
});

app.post("/api/services/:id/pop-file", requirePermission("servicos.manage"), async (req, res) => {
  const tenantId = req.auth.user.tenant.id;
  const tenantSlug = req.auth.user.tenant.slug;
  const fileName = safeFileNamePart(req.body.fileName || "pop-aprovado");
  const mimeType = String(req.body.mimeType || "application/octet-stream").toLowerCase();
  const { rows: companyRows } = await query("SELECT certificado_config FROM ciperprag_hub.empresa_config WHERE tenant_id = $1 ORDER BY id LIMIT 1", [tenantId]);
  const uploadPolicy = resolveAttachmentPolicy("servico_pop.pop_aprovado", companyRows[0]?.certificado_config || {});
  let parsed;
  try {
    parsed = validateAttachmentPayload({
      contentBase64: req.body.contentBase64,
      declaredMimeType: mimeType,
      allowedMimeTypes: uploadPolicy.allowedMimeTypes,
      maxBytes: uploadPolicy.maxBytes,
      label: "arquivo do POP",
    });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }

  const hash = sha256Hex(parsed.buffer);
  const attachment = await withTransaction(async (client) => {
    const { rows: serviceRows } = await client.query(
      "SELECT id, nome, descricao, pop_ativo_id FROM ciperprag_hub.servicos_catalogo WHERE id = $1 AND tenant_id = $2 LIMIT 1",
      [req.params.id, tenantId],
    );
    const service = serviceRows[0];
    if (!service) {
      const error = new Error("Servico nao encontrado.");
      error.status = 404;
      throw error;
    }

    let popId = service.pop_ativo_id;
    let popVersion = "001";
    if (!popId) {
      popId = makeId("POP");
      await client.query(
        `INSERT INTO ciperprag_hub.servico_pops
         (id, tenant_id, servico_id, codigo, titulo, versao, status, objetivo, aprovado_em)
         VALUES ($1,$2,$3,$4,$5,$6,'ativo',$7,CURRENT_DATE)`,
        [popId, tenantId, service.id, `POP-${service.id}`, service.nome, "001", service.descricao || "Procedimento Operacional Padrao"],
      );
      await client.query("UPDATE ciperprag_hub.servicos_catalogo SET pop_ativo_id = $2 WHERE id = $1 AND tenant_id = $3", [service.id, popId, tenantId]);
    } else {
      const { rows: popRows } = await client.query(
        "SELECT versao FROM ciperprag_hub.servico_pops WHERE id = $1 AND tenant_id = $2 LIMIT 1",
        [popId, tenantId],
      );
      popVersion = popRows[0]?.versao || popVersion;
    }

    const id = makeId("POPFILE");
    const storageTarget = createAttachmentStoragePlan({ tenantSlug, entityType: "servico_pop", entityId: popId, category: "pop_aprovado", fileName, hashSha256: hash });
    const persisted = await persistAttachmentContent({
      storagePlan: storageTarget,
      buffer: parsed.buffer,
      contentBase64: parsed.dataUrl,
      mimeType,
      hashSha256: hash,
      fileName,
      metadata: {
        origem: "pop_pronto_anexado_ao_catalogo",
        servicoId: service.id,
        servicoNome: service.nome,
        popId,
        popVersion,
        hashSha256: hash,
        ...buildAttachmentSecurityMetadata(uploadPolicy),
      },
    });
    await client.query(
      `INSERT INTO ciperprag_hub.evidencias_anexos
       (id, tenant_id, entidade_tipo, entidade_id, categoria, nome_arquivo, mime_type, tamanho_bytes, conteudo_base64, metadados, hash_sha256, storage_provider, storage_bucket, storage_key, storage_etag, imutavel, criado_por)
       VALUES ($1,$2,'servico_pop',$3,'pop_aprovado',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,TRUE,$14)`,
      [id, tenantId, popId, fileName, mimeType, parsed.bytes, persisted.contentBase64, JSON.stringify(persisted.metadata), hash, persisted.provider, persisted.bucket, persisted.key, persisted.etag, req.auth.user.id],
    );
    await logAuditEvent(client, req, {
      entityType: "servico_pop",
      entityId: popId,
      action: "pop_file_uploaded",
      summary: `Arquivo de POP anexado ao servico ${service.nome || service.id}`,
      after: { attachmentId: id, serviceId: service.id, fileName, mimeType, bytes: parsed.bytes, hashSha256: hash },
    });
    return { id, fileName, mimeType, bytes: parsed.bytes, hashSha256: hash, popId };
  });
  res.json({ ok: true, attachment });
});

app.post("/api/technicians", requirePermission("equipes.manage"), async (req, res) => {
  const body = req.body;
  const id = body.id || `TEC-${String(Date.now()).slice(-6)}`;
  const tenantId = req.auth.user.tenant.id;
  const { rows: beforeRows } = await query("SELECT * FROM ciperprag_hub.tecnicos WHERE id = $1 AND tenant_id = $2", [id, tenantId]);
  const before = beforeRows[0] || null;
  const auditAction = before && before.ativo !== body.ativo && body.ativo === false ? "technician_inactivated" : before ? "technician_updated" : "technician_created";
  const { rowCount } = await query(
    `INSERT INTO ciperprag_hub.tecnicos (id, tenant_id, nome, cpf, cargo, data_admissao, telefone, ativo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (id) DO UPDATE SET nome=EXCLUDED.nome, cpf=EXCLUDED.cpf, cargo=EXCLUDED.cargo, data_admissao=EXCLUDED.data_admissao, telefone=EXCLUDED.telefone, ativo=EXCLUDED.ativo, atualizado_em = NOW()
     WHERE ciperprag_hub.tecnicos.tenant_id = EXCLUDED.tenant_id`,
    [id, tenantId, body.nome, body.cpf, body.cargo, body.dataAdmissao || null, body.telefone, body.ativo],
  );
  assertTenantWrite(rowCount, "Tecnico");
  await logAuditEvent(null, req, {
    entityType: "tecnico",
    entityId: id,
    action: auditAction,
    summary: `${auditAction === "technician_inactivated" ? "Tecnico inativado" : before ? "Tecnico atualizado" : "Tecnico criado"}: ${body.nome || id}`,
    before,
    after: { id, nome: body.nome, cpf: body.cpf, cargo: body.cargo, ativo: body.ativo },
  });
  res.json({ ok: true, id });
});

app.post("/api/vehicles", requirePermission("equipes.manage"), async (req, res) => {
  const body = req.body;
  const id = body.id || `VEI-${String(Date.now()).slice(-6)}`;
  const tenantId = req.auth.user.tenant.id;
  const { rows: beforeRows } = await query("SELECT * FROM ciperprag_hub.veiculos WHERE id = $1 AND tenant_id = $2", [id, tenantId]);
  const before = beforeRows[0] || null;
  const auditAction = before && before.ativo !== body.ativo && body.ativo === false ? "vehicle_inactivated" : before ? "vehicle_updated" : "vehicle_created";
  const { rowCount } = await query(
    `INSERT INTO ciperprag_hub.veiculos (id, tenant_id, placa, modelo, ano, ativo)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (id) DO UPDATE SET placa=EXCLUDED.placa, modelo=EXCLUDED.modelo, ano=EXCLUDED.ano, ativo=EXCLUDED.ativo, atualizado_em = NOW()
     WHERE ciperprag_hub.veiculos.tenant_id = EXCLUDED.tenant_id`,
    [id, tenantId, body.placa, body.modelo, body.ano, body.ativo],
  );
  assertTenantWrite(rowCount, "Veiculo");
  await logAuditEvent(null, req, {
    entityType: "veiculo",
    entityId: id,
    action: auditAction,
    summary: `${auditAction === "vehicle_inactivated" ? "Veiculo inativado" : before ? "Veiculo atualizado" : "Veiculo criado"}: ${body.placa || id}`,
    before,
    after: { id, placa: body.placa, modelo: body.modelo, ano: body.ano, ativo: body.ativo },
  });
  res.json({ ok: true, id });
});

app.post("/api/allocations", requirePermission("equipes.manage"), async (req, res) => {
  const body = req.body;
  const id = body.id || `AL-${String(Date.now()).slice(-6)}`;
  const tenantId = req.auth.user.tenant.id;
  const { rows: beforeRows } = await query("SELECT * FROM ciperprag_hub.alocacoes_semanais WHERE id = $1 AND tenant_id = $2", [id, tenantId]);
  const before = beforeRows[0] || null;
  const { rowCount } = await query(
    `INSERT INTO ciperprag_hub.alocacoes_semanais (id, tenant_id, tecnico_id, veiculo_id, dia_semana, cliente, servico, turno)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (id) DO UPDATE SET tecnico_id=EXCLUDED.tecnico_id, veiculo_id=EXCLUDED.veiculo_id, dia_semana=EXCLUDED.dia_semana, cliente=EXCLUDED.cliente, servico=EXCLUDED.servico, turno=EXCLUDED.turno
     WHERE ciperprag_hub.alocacoes_semanais.tenant_id = EXCLUDED.tenant_id`,
    [id, tenantId, body.tecnicoId, body.veiculoId || null, body.diaSemana, body.cliente, body.servico, body.turno],
  );
  assertTenantWrite(rowCount, "Alocacao");
  await logAuditEvent(null, req, {
    entityType: "alocacao",
    entityId: id,
    action: before ? "allocation_updated" : "allocation_created",
    summary: `${before ? "Alocacao atualizada" : "Alocacao criada"}: ${body.cliente || id}`,
    before,
    after: { id, tecnicoId: body.tecnicoId, veiculoId: body.veiculoId || null, diaSemana: body.diaSemana, cliente: body.cliente, servico: body.servico, turno: body.turno },
  });
  res.json({ ok: true, id });
});

app.patch("/api/company-config", requirePermission("configuracoes.manage"), async (req, res) => {
  const body = req.body;
  const tenantId = req.auth.user.tenant.id;
  const { rows: beforeRows } = await query("SELECT * FROM ciperprag_hub.empresa_config WHERE tenant_id = $1 ORDER BY id LIMIT 1", [tenantId]);
  const before = beforeRows[0] || null;
  const { rowCount } = await query(
    `UPDATE ciperprag_hub.empresa_config SET
      razao_social=$1, nome_fantasia=$2, cnpj=$3, endereco=$4, telefone=$5, email=$6, logo_url=$7,
      alvara=$8, cr02=$9, anvisa=$10, vigilancia_sanitaria=$11, responsavel_tecnico=$12, responsavel_execucao=$13, cargo_responsavel=$14,
      certificado_validade_padrao_dias=$15, certificado_texto_legal=$16, certificado_texto_fixacao=$17, telefone_emergencia=$18,
      medicao_forma_pagamento_padrao=$19, medicao_local_entrega_padrao=$20,
      cor_primaria=$21, cor_secundaria=$22, cor_destaque=$23, certificado_config=$24, commercial_config=$25, atualizado_em=NOW()
      WHERE id = (SELECT id FROM ciperprag_hub.empresa_config WHERE tenant_id = $26 ORDER BY id LIMIT 1)`,
    [
      body.razaoSocial,
      body.nomeFantasia,
      body.cnpj,
      body.endereco,
      body.telefone,
      body.email,
      body.logoUrl,
      body.alvara,
      body.cr02,
      body.anvisa,
      body.vigilanciaSanitaria,
      body.responsavelTecnico,
      body.responsavelExecucao,
      body.cargoResponsavel,
      body.certificadoValidadePadraoDias ?? 30,
      body.certificadoTextoLegal || null,
      body.certificadoTextoFixacao || null,
      body.telefoneEmergencia || null,
      body.medicaoFormaPagamentoPadrao || null,
      body.medicaoLocalEntregaPadrao || null,
      body.corPrimaria || null,
      body.corSecundaria || null,
      body.corDestaque || null,
      JSON.stringify(body.certificadoConfig || {}),
      JSON.stringify(normalizeCommercialConfig(body.commercialConfig, req.auth.user.tenant.slug)),
      tenantId,
    ],
  );
  assertTenantWrite(rowCount, "Configuracao da empresa");
  await logAuditEvent(null, req, {
    entityType: "configuracao",
    entityId: "empresa_config",
    action: "company_config_updated",
    summary: "Configuracoes da empresa atualizadas",
    before,
    after: {
      razaoSocial: body.razaoSocial,
      nomeFantasia: body.nomeFantasia,
      cnpj: body.cnpj,
      responsavelTecnico: body.responsavelTecnico,
      certificadoValidadePadraoDias: body.certificadoValidadePadraoDias ?? 30,
      medicaoFormaPagamentoPadrao: body.medicaoFormaPagamentoPadrao || null,
      corPrimaria: body.corPrimaria || null,
      commercialConfig: normalizeCommercialConfig(body.commercialConfig, req.auth.user.tenant.slug),
      certificadoConfig: body.certificadoConfig || {},
    },
  });
  res.json({ ok: true });
});

app.patch("/api/numbering-config", requirePermission("configuracoes.manage"), async (req, res) => {
  const body = req.body;
  const tenantId = req.auth.user.tenant.id;
  const { rows: beforeRows } = await query("SELECT * FROM ciperprag_hub.numeracao_config WHERE tenant_id = $1 ORDER BY id LIMIT 1", [tenantId]);
  const before = beforeRows[0] || null;
  const { rowCount } = await query(
    `UPDATE ciperprag_hub.numeracao_config SET
      proposta_formato=$1, proposta_ultimo=$2, contrato_formato=$3, contrato_ultimo=$4, os_formato=$5, os_ultimo=$6,
      certificado_formato=$7, certificado_ultimo=$8, medicao_formato=$9, medicao_ultimo=$10, atualizado_em = NOW()
      WHERE id = (SELECT id FROM ciperprag_hub.numeracao_config WHERE tenant_id = $11 ORDER BY id LIMIT 1)`,
    [
      body.propostaFormato,
      body.propostaUltimo,
      body.contratoFormato,
      body.contratoUltimo,
      body.osFormato,
      body.osUltimo,
      body.certificadoFormato,
      body.certificadoUltimo,
      body.medicaoFormato,
      body.medicaoUltimo,
      tenantId,
    ],
  );
  assertTenantWrite(rowCount, "Configuracao de numeracao");
  await logAuditEvent(null, req, {
    entityType: "configuracao",
    entityId: "numeracao_config",
    action: "numbering_config_updated",
    summary: "Configuracoes de numeracao atualizadas",
    before,
    after: body,
  });
  res.json({ ok: true });
});

app.post("/api/contract-templates", requirePermission("contratos.manage"), async (req, res) => {
  const body = req.body;
  const id = body.id || makeCompactId("TPL");
  const tenantId = req.auth.user.tenant.id;
  const tenantSlug = req.auth.user.tenant.slug;
  const commercialConfig = await getCommercialConfig(tenantId, tenantSlug);
  const { rows: existingTemplateRows } = body.id
    ? await query("SELECT tipo FROM ciperprag_hub.contratos_templates WHERE id = $1 AND tenant_id = $2 LIMIT 1", [body.id, tenantId])
    : { rows: [] };
  const existingType = existingTemplateRows[0]?.tipo;
  const changesToRestrictedType = ["contrato", "minuta"].includes(body.tipo) && existingType !== body.tipo;
  if (changesToRestrictedType && body.tipo === "contrato" && !commercialConfig.allowContractGeneration) {
    return res.status(403).json({ error: "A geração de contratos está desativada para esta empresa. Os registros históricos continuam disponíveis." });
  }
  if (changesToRestrictedType && body.tipo === "minuta" && !commercialConfig.allowMinutaGeneration) {
    return res.status(403).json({ error: "A geração de minutas está desativada para esta empresa. Os registros históricos continuam disponíveis." });
  }
  let operationalSync = null;
  const submittedServices = Array.isArray(body.servicos) ? body.servicos : [];
  const submittedServiceIds = submittedServices.map((item) => String(item?.servicoId || "").trim()).filter(Boolean);
  if (body.tipo === "proposta" && (!submittedServiceIds.length || submittedServiceIds.length !== submittedServices.length)) {
    return res.status(400).json({ error: "A proposta precisa ter ao menos um serviço válido do catálogo." });
  }
  if (body.tipo === "proposta" && submittedServiceIds.length) {
    const { rows: catalogRows } = await query(
      "SELECT id FROM ciperprag_hub.servicos_catalogo WHERE tenant_id = $1 AND ativo IS TRUE AND id = ANY($2::text[])",
      [tenantId, submittedServiceIds],
    );
    if (catalogRows.length !== new Set(submittedServiceIds).size) {
      return res.status(400).json({ error: "A proposta contém serviço que não pertence ao catálogo ativo deste tenant." });
    }
  }
  const locaisExecucao = Array.isArray(body.locaisExecucao)
    ? body.locaisExecucao.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  await withTransaction(async (client) => {
    const { rows: beforeRows } = await client.query("SELECT * FROM ciperprag_hub.contratos_templates WHERE id = $1 AND tenant_id = $2", [id, tenantId]);
    const before = beforeRows[0] || null;
    const { rowCount: templateRowCount } = await client.query(
      `INSERT INTO ciperprag_hub.contratos_templates (
         id, tenant_id, numero, cliente_id, tipo, vigencia_meses, forma_pagamento, prazo_pagamento_dias,
         status, data_criacao, observacoes, titulo, objeto, validade_dias, modalidade, locais_execucao,
         escopo_tecnico, condicoes_comerciais, source_pdf_import_id
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17,$18,$19)
       ON CONFLICT (id) DO UPDATE SET
         numero=EXCLUDED.numero,
         cliente_id=EXCLUDED.cliente_id,
         tipo=EXCLUDED.tipo,
         vigencia_meses=EXCLUDED.vigencia_meses,
         forma_pagamento=EXCLUDED.forma_pagamento,
         prazo_pagamento_dias=EXCLUDED.prazo_pagamento_dias,
         status=EXCLUDED.status,
         data_criacao=EXCLUDED.data_criacao,
         observacoes=EXCLUDED.observacoes,
         titulo=EXCLUDED.titulo,
         objeto=EXCLUDED.objeto,
         validade_dias=EXCLUDED.validade_dias,
         modalidade=EXCLUDED.modalidade,
         locais_execucao=EXCLUDED.locais_execucao,
         escopo_tecnico=EXCLUDED.escopo_tecnico,
         condicoes_comerciais=EXCLUDED.condicoes_comerciais,
         source_pdf_import_id=EXCLUDED.source_pdf_import_id
       WHERE ciperprag_hub.contratos_templates.tenant_id = EXCLUDED.tenant_id`,
      [
        id,
        tenantId,
        body.numero,
        body.clienteId,
        body.tipo,
        body.vigenciaMeses,
        body.formaPagamento,
        body.prazoPagamentoDias,
        body.status,
        body.dataCriacao,
        body.observacoes,
        body.titulo || null,
        body.objeto || null,
        Number(body.validadeDias || 30),
        body.modalidade || null,
        JSON.stringify(locaisExecucao),
        body.escopoTecnico || null,
        body.condicoesComerciais || null,
        body.sourcePdfImportId || null,
      ],
    );
    assertTenantWrite(templateRowCount, "Modelo comercial");
    if (body.sourcePdfImportId) {
      await client.query(
        `UPDATE ciperprag_hub.proposta_pdf_importacoes
         SET template_id = $1
         WHERE id = $2 AND tenant_id = $3`,
        [id, body.sourcePdfImportId, tenantId],
      );
    }
    await client.query(
      `DELETE FROM ciperprag_hub.contratos_templates_servicos s
       WHERE s.template_id = $1
         AND EXISTS (
           SELECT 1
           FROM ciperprag_hub.contratos_templates t
           WHERE t.id = s.template_id
             AND t.tenant_id = $2
         )`,
      [id, tenantId],
    );
    for (const servico of body.servicos || []) {
      await client.query(
        `INSERT INTO ciperprag_hub.contratos_templates_servicos (template_id, servico_id, quantidade, valor_unitario, frequencia, descricao_comercial, unidade_comercial, endereco_atividade, enderecos_atividade, locais_ids)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          id,
          servico.servicoId,
          servico.quantidade,
          servico.valorUnitario,
          servico.frequencia,
          servico.descricaoComercial || null,
          servico.unidadeComercial || null,
          servico.enderecoAtividade || null,
          JSON.stringify(Array.isArray(servico.enderecosAtividade) ? servico.enderecosAtividade.filter(Boolean) : (servico.enderecoAtividade ? [servico.enderecoAtividade] : [])),
          JSON.stringify(Array.isArray(servico.localIds) ? servico.localIds.filter(Boolean) : []),
        ],
      );
    }
    if (body.tipo === "contrato" && body.status === "vigente") {
      operationalSync = await syncOperationalContractsFromTemplate(client, id, tenantId);
    }
    await logAuditEvent(client, req, {
      entityType: "contrato_template",
      entityId: id,
      action: before ? "contract_template_updated" : "contract_template_created",
      summary: `${before ? "Modelo comercial atualizado" : "Modelo comercial criado"}: ${body.numero || id}`,
      before,
      after: {
        id,
        numero: body.numero,
        tipo: body.tipo,
        clienteId: body.clienteId,
        status: body.status,
        servicos: (body.servicos || []).length,
        vigenciaMeses: body.vigenciaMeses,
        validadeDias: body.validadeDias,
        modalidade: body.modalidade,
        operationalSync,
      },
    });
  });
  res.json({ ok: true, id, operationalSync });
});

app.post("/api/contract-templates/proposal-assist", requirePermission("contratos.manage"), async (req, res) => {
  if (String(process.env.OPENAI_PROPOSAL_ASSIST_ENABLED).toLowerCase() !== "true") {
    return res.status(503).json({ error: "A assistência por PDF ainda não está habilitada neste ambiente." });
  }
  const fileName = safeFileNamePart(req.body.fileName || "referencia-proposta.pdf");
  const declaredMimeType = String(req.body.mimeType || "application/pdf").toLowerCase();
  let parsed;
  try {
    parsed = validateAttachmentPayload({
      contentBase64: req.body.contentBase64,
      declaredMimeType,
      allowedMimeTypes: ["application/pdf"],
      maxBytes: 8 * 1024 * 1024,
      label: "PDF de referência da proposta",
    });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }

  const tenantId = req.auth.user.tenant.id;
  let deterministic;
  try {
    deterministic = await extractProposalPdfDeterministically(parsed.buffer);
  } catch (error) {
    deterministic = {
      paginasAnalisadas: null,
      textoExtraido: "",
      tabelasEncontradas: 0,
      itensExtraidos: 0,
      tabelas: [],
      linhasDeterministicas: [],
      metadadosPdf: {},
      erro: error instanceof Error ? error.message : "Falha na extração determinística",
    };
  }
  const sourceImportId = await withTransaction((client) => persistProposalPdfImport(client, {
    tenantId,
    userId: req.auth.user.id,
    fileName,
    parsed,
    deterministic,
  }));
  const [{ rows: clientRows }, { rows: serviceRows }] = await Promise.all([
    query(`SELECT id, razao_social, nome_fantasia, cnpj, endereco, municipio, uf
           FROM ciperprag_hub.clientes
           WHERE tenant_id = $1 AND ativo IS TRUE
           ORDER BY razao_social LIMIT 250`, [tenantId]),
    query(`SELECT id, nome, descricao, unidade, tipo, recorrencia_dias, gera_certificado
           FROM ciperprag_hub.servicos_catalogo
           WHERE tenant_id = $1 AND ativo IS TRUE
           ORDER BY nome LIMIT 250`, [tenantId]),
  ]);
  const clients = clientRows.map((row) => ({ id: row.id, razaoSocial: row.razao_social, nomeFantasia: row.nome_fantasia, cnpj: row.cnpj, endereco: row.endereco, municipio: row.municipio, uf: row.uf }));
  const services = serviceRows.map((row) => ({ id: row.id, nome: row.nome, descricao: row.descricao, unidade: row.unidade, tipo: row.tipo, recorrenciaDias: row.recorrencia_dias, geraCertificado: row.gera_certificado }));

  try {
    const rawDraft = await generateProposalAssistDraft({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      fileName,
      buffer: parsed.buffer,
      context: buildProposalCatalogContext({ clients, services }),
    });
    const coverage = buildProposalPdfCoverage(deterministic, rawDraft.coberturaDocumento);
    const draft = normalizeProposalAssistDraft({
      ...rawDraft,
      coberturaDocumento: coverage,
      sourceImportId,
      originalPdfHashSha256: sha256Hex(parsed.buffer),
    }, { clients, services });
    await withTransaction((client) => finalizeProposalPdfImport(client, { id: sourceImportId, coverage }));
    await logAuditEvent(pool, req, {
      entityType: "proposta",
      action: "proposal_ai_assist_requested",
      summary: `Rascunho de proposta extraído de PDF: ${fileName}`,
      after: { fileName, bytes: parsed.bytes, sourceImportId, originalPdfHashSha256: draft.originalPdfHashSha256, coberturaDocumento: coverage, model: process.env.OPENAI_MODEL || "gpt-4o-mini", clienteId: draft.clienteId || null, servicos: draft.servicos.length, camposPendentes: draft.camposPendentes },
    });
    return res.json({ ok: true, draft, meta: { fileName, bytes: parsed.bytes, sourceImportId, originalPdfHashSha256: draft.originalPdfHashSha256, deterministic: { paginasAnalisadas: deterministic.paginasAnalisadas, tabelasEncontradas: deterministic.tabelasEncontradas, itensExtraidos: deterministic.itensExtraidos }, model: process.env.OPENAI_MODEL || "gpt-4o-mini", arquivoTemporario: false } });
  } catch (error) {
    await withTransaction((client) => finalizeProposalPdfImport(client, { id: sourceImportId, status: "erro", coverage: { ...deterministic, erro: error instanceof Error ? error.message : "Falha na analise" } })).catch(() => undefined);
    return res.status(502).json({ error: error instanceof Error ? error.message : "Não foi possível analisar o PDF." });
  }
});

app.post("/api/contract-templates/:id/generate-minuta", requirePermission("contratos.manage"), async (req, res) => {
  const id = req.params.id;
  const tenantId = req.auth.user.tenant.id;
  const commercialConfig = await getCommercialConfig(tenantId, req.auth.user.tenant.slug);
  if (!commercialConfig.allowMinutaGeneration) {
    return res.status(403).json({ error: "A geração de minutas está desativada para esta empresa. Os registros históricos continuam disponíveis." });
  }
  const next = await nextSequential("contrato_ultimo", tenantId);
  const year = new Date().getFullYear();
  const number = `MIN-${next}/${year}`;
  const { rows } = await query("SELECT * FROM ciperprag_hub.contratos_templates WHERE id = $1 AND tenant_id = $2", [id, tenantId]);
  const item = rows[0];
  if (item && item.tipo !== "proposta") return res.status(400).json({ error: "A minuta deve ser gerada a partir de uma proposta aprovada." });
  if (item && item.status !== "aprovado") return res.status(400).json({ error: "A proposta precisa estar aprovada para gerar minuta." });
  if (!item) return res.status(404).json({ error: "Modelo não encontrado" });
  const newId = makeCompactId("TPL");
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO ciperprag_hub.contratos_templates (
         id, tenant_id, numero, cliente_id, tipo, vigencia_meses, forma_pagamento, prazo_pagamento_dias,
         status, data_criacao, observacoes, titulo, objeto, validade_dias, modalidade, locais_execucao,
         escopo_tecnico, condicoes_comerciais, source_pdf_import_id
       )
       VALUES ($1,$2,$3,$4,'minuta',$5,$6,$7,'rascunho',$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,$17)`,
      [
        newId,
        tenantId,
        number,
        item.cliente_id,
        item.vigencia_meses,
        item.forma_pagamento,
        item.prazo_pagamento_dias,
        new Date().toISOString().split("T")[0],
        `Minuta gerada a partir da proposta ${item.numero}. ${item.observacoes || ""}`,
        item.titulo,
        item.objeto,
        item.validade_dias,
        item.modalidade,
        JSON.stringify(Array.isArray(item.locais_execucao) ? item.locais_execucao : []),
        item.escopo_tecnico,
        item.condicoes_comerciais,
        item.source_pdf_import_id,
      ],
    );
    const { rows: services } = await client.query(
      `SELECT s.*
       FROM ciperprag_hub.contratos_templates_servicos s
       JOIN ciperprag_hub.contratos_templates t ON t.id = s.template_id
       WHERE s.template_id = $1
         AND t.tenant_id = $2`,
      [id, tenantId],
    );
    for (const service of services) {
      await client.query(
        `INSERT INTO ciperprag_hub.contratos_templates_servicos (template_id, servico_id, quantidade, valor_unitario, frequencia, descricao_comercial, unidade_comercial, endereco_atividade, enderecos_atividade, locais_ids)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          newId,
          service.servico_id,
          service.quantidade,
          service.valor_unitario,
          service.frequencia,
          service.descricao_comercial,
          service.unidade_comercial,
          service.endereco_atividade,
          JSON.stringify(Array.isArray(service.enderecos_atividade) ? service.enderecos_atividade : normalizeJsonArray(service.enderecos_atividade)),
          JSON.stringify(Array.isArray(service.locais_ids) ? service.locais_ids : normalizeJsonArray(service.locais_ids)),
        ],
      );
    }
    await logAuditEvent(client, req, {
      entityType: "contrato_template",
      entityId: newId,
      action: "minuta_generated_from_proposal",
      summary: `Minuta ${number} gerada a partir da proposta ${item.numero || id}`,
      before: { id, numero: item.numero, tipo: item.tipo, status: item.status },
      after: { id: newId, numero: number, tipo: "minuta", status: "rascunho", propostaOrigemId: id },
    });
  });
  res.json({ ok: true, id: newId, numero: number });
});

app.post("/api/contract-templates/:id/generate-contract", requirePermission("contratos.manage"), async (req, res) => {
  const id = req.params.id;
  const tenantId = req.auth.user.tenant.id;
  const commercialConfig = await getCommercialConfig(tenantId, req.auth.user.tenant.slug);
  if (!commercialConfig.allowContractGeneration) {
    return res.status(403).json({ error: "A geração de contratos está desativada para esta empresa. Os registros históricos continuam disponíveis." });
  }
  const next = await nextSequential("contrato_ultimo", tenantId);
  const year = new Date().getFullYear();
  const number = `CT-${next}/${year}`;
  const { rows } = await query("SELECT * FROM ciperprag_hub.contratos_templates WHERE id = $1 AND tenant_id = $2", [id, tenantId]);
  const item = rows[0];
  if (item && item.tipo !== "minuta") return res.status(400).json({ error: "O contrato final deve ser gerado a partir de uma minuta aprovada." });
  if (item && !["aprovado", "vigente"].includes(item.status)) return res.status(400).json({ error: "A minuta precisa estar aprovada para gerar contrato." });
  if (!item) return res.status(404).json({ error: "Modelo não encontrado" });
  const newId = makeCompactId("TPL");
  let operationalSync = null;
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO ciperprag_hub.contratos_templates (
         id, tenant_id, numero, cliente_id, tipo, vigencia_meses, forma_pagamento, prazo_pagamento_dias,
         status, data_criacao, observacoes, titulo, objeto, validade_dias, modalidade, locais_execucao,
         escopo_tecnico, condicoes_comerciais, source_pdf_import_id
       )
       VALUES ($1,$2,$3,$4,'contrato',$5,$6,$7,'vigente',$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,$17)`,
      [
        newId,
        tenantId,
        number,
        item.cliente_id,
        item.vigencia_meses,
        item.forma_pagamento,
        item.prazo_pagamento_dias,
        new Date().toISOString().split("T")[0],
        `Gerado a partir da minuta ${item.numero}. ${item.observacoes || ""}`,
        item.titulo,
        item.objeto,
        item.validade_dias,
        item.modalidade,
        JSON.stringify(Array.isArray(item.locais_execucao) ? item.locais_execucao : []),
        item.escopo_tecnico,
        item.condicoes_comerciais,
        item.source_pdf_import_id,
      ],
    );
    const { rows: services } = await client.query(
      `SELECT s.*
       FROM ciperprag_hub.contratos_templates_servicos s
       JOIN ciperprag_hub.contratos_templates t ON t.id = s.template_id
       WHERE s.template_id = $1
         AND t.tenant_id = $2`,
      [id, tenantId],
    );
    for (const service of services) {
      await client.query(
        `INSERT INTO ciperprag_hub.contratos_templates_servicos (template_id, servico_id, quantidade, valor_unitario, frequencia, descricao_comercial, unidade_comercial, endereco_atividade, enderecos_atividade, locais_ids)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          newId,
          service.servico_id,
          service.quantidade,
          service.valor_unitario,
          service.frequencia,
          service.descricao_comercial,
          service.unidade_comercial,
          service.endereco_atividade,
          JSON.stringify(Array.isArray(service.enderecos_atividade) ? service.enderecos_atividade : normalizeJsonArray(service.enderecos_atividade)),
          JSON.stringify(Array.isArray(service.locais_ids) ? service.locais_ids : normalizeJsonArray(service.locais_ids)),
        ],
      );
    }
    operationalSync = await syncOperationalContractsFromTemplate(client, newId, tenantId);
    await logAuditEvent(client, req, {
      entityType: "contrato_template",
      entityId: newId,
      action: "contract_generated_from_minuta",
      summary: `Contrato ${number} gerado a partir da minuta ${item.numero || id}`,
      before: { id, numero: item.numero, tipo: item.tipo, status: item.status },
      after: { id: newId, numero: number, tipo: "contrato", status: "vigente", propostaOrigemId: id, operationalSync },
    });
  });
  res.json({ ok: true, id: newId, numero: number, operationalSync });
});

app.post("/api/contract-templates/:id/issue-document", requirePermission("contratos.manage"), async (req, res) => {
  const tenantId = req.auth.user.tenant.id;
  const tenantSlug = req.auth.user.tenant.slug;
  const result = await withTransaction(async (client) => {
    const snapshot = await buildCommercialDocumentSnapshot(client, { tenantId, templateId: req.params.id });
    if (!snapshot) {
      const error = new Error("Documento comercial não encontrado.");
      error.status = 404;
      throw error;
    }
    const entityType = snapshot.documento.tipo;
    const template = COMMERCIAL_DOCUMENT_TEMPLATES[entityType];
    const fileName = `${entityType}-${safeFileNamePart(snapshot.documento.numero || snapshot.documento.id)}.pdf`;
    const html = buildCommercialDocumentHtml(snapshot);
    const attachment = await saveImmutableDocumentAttachment(client, {
      tenantId,
      tenantSlug,
      userId: req.auth.user.id,
      entityType,
      entityId: snapshot.documento.id,
      fileName,
      html,
      snapshot,
      template,
      metadata: {
        origem: "emissao_documento_comercial",
        numero: snapshot.documento.numero,
        tipo: snapshot.documento.tipo,
        status: snapshot.documento.status,
      },
    });
    await logAuditEvent(client, req, {
      entityType: "anexo",
      entityId: attachment.id,
      action: "commercial_document_issued",
      summary: `Snapshot histórico emitido: ${snapshot.documento.numero || snapshot.documento.id}`,
      after: {
        documentoId: snapshot.documento.id,
        documentoTipo: snapshot.documento.tipo,
        numero: snapshot.documento.numero,
        hashSha256: attachment.hashSha256,
        snapshotHashSha256: attachment.snapshotHashSha256,
        templateCodigo: attachment.templateCodigo,
        templateVersao: attachment.templateVersao,
        storageProvider: attachment.storageProvider,
      },
    });
    return { attachment, snapshotHashSha256: attachment.snapshotHashSha256 };
  });
  res.json({ ok: true, ...result });
});

app.post("/api/contract-templates/:id/source-file", requirePermission("contratos.manage"), async (req, res) => {
  const tenantId = req.auth.user.tenant.id;
  const tenantSlug = req.auth.user.tenant.slug;
  const fileName = safeFileNamePart(req.body.fileName || "minuta-cliente");
  const mimeType = String(req.body.mimeType || "application/octet-stream").toLowerCase();
  const { rows: companyRows } = await query("SELECT certificado_config FROM ciperprag_hub.empresa_config WHERE tenant_id = $1 ORDER BY id LIMIT 1", [tenantId]);
  const uploadPolicy = resolveAttachmentPolicy("minuta.documento", companyRows[0]?.certificado_config || {});
  let parsed;
  try {
    parsed = validateAttachmentPayload({
      contentBase64: req.body.contentBase64,
      declaredMimeType: mimeType,
      allowedMimeTypes: uploadPolicy.allowedMimeTypes,
      maxBytes: uploadPolicy.maxBytes,
      label: "arquivo da minuta",
    });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
  const hash = sha256Hex(parsed.buffer);
  const attachment = await withTransaction(async (client) => {
    const { rows: templates } = await client.query(
      "SELECT id, tipo, numero FROM ciperprag_hub.contratos_templates WHERE id = $1 AND tenant_id = $2 LIMIT 1",
      [req.params.id, tenantId],
    );
    const template = templates[0];
    if (!template) {
      const error = new Error("Proposta ou minuta não encontrada.");
      error.status = 404;
      throw error;
    }
    if (!['minuta', 'proposta'].includes(template.tipo)) {
      const error = new Error("O arquivo original deve ser vinculado a uma proposta ou minuta.");
      error.status = 400;
      throw error;
    }
    const id = makeId("SRC");
    const storageTarget = createAttachmentStoragePlan({
      tenantSlug,
      entityType: template.tipo,
      entityId: template.id,
      category: "documento",
      fileName,
      hashSha256: hash,
    });
    const persisted = await persistAttachmentContent({
      storagePlan: storageTarget,
      buffer: parsed.buffer,
      contentBase64: parsed.dataUrl,
      mimeType,
      hashSha256: hash,
      fileName,
      metadata: {
        origem: "arquivo_original_cliente",
        numero: template.numero,
        hashSha256: hash,
        ...buildAttachmentSecurityMetadata(uploadPolicy),
      },
    });
    await client.query(
      `INSERT INTO ciperprag_hub.evidencias_anexos
       (id, tenant_id, entidade_tipo, entidade_id, categoria, nome_arquivo, mime_type, tamanho_bytes, conteudo_base64, metadados, hash_sha256, storage_provider, storage_bucket, storage_key, storage_etag, imutavel, criado_por)
       VALUES ($1,$2,$3,$4,'documento',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,TRUE,$15)`,
      [
        id,
        tenantId,
        template.tipo,
        template.id,
        fileName,
        mimeType,
        parsed.bytes,
        persisted.contentBase64,
        JSON.stringify(persisted.metadata),
        hash,
        persisted.provider,
        persisted.bucket,
        persisted.key,
        persisted.etag,
        req.auth.user.id,
      ],
    );
    await logAuditEvent(client, req, {
      entityType: template.tipo,
      entityId: template.id,
      action: "source_file_uploaded",
      summary: `Arquivo original de ${template.tipo} anexado: ${template.numero || template.id}`,
      after: { attachmentId: id, fileName, mimeType, bytes: parsed.bytes, hashSha256: hash },
    });
    return { id, fileName, mimeType, bytes: parsed.bytes, hashSha256: hash };
  });
  res.json({ ok: true, attachment });
});

app.post("/api/measurements/generate", requirePermission("medicoes.manage"), async (req, res) => {
  const { clienteNome, dataInicio, dataFim } = req.body;
  if (!clienteNome || !dataInicio || !dataFim) return res.status(400).json({ error: "Cliente e periodo sao obrigatorios." });
  const tenantId = req.auth.user.tenant.id;

  let measurement;
  try {
    measurement = await withTransaction(async (client) => {
    const { rows: companyRows } = await client.query("SELECT * FROM ciperprag_hub.empresa_config WHERE tenant_id = $1 ORDER BY id LIMIT 1", [tenantId]);
    const company = companyRows[0];
    const timezone = company?.timezone || "America/Fortaleza";
    const issuedDate = currentTenantDate(timezone);
    const effectiveEnd = minIsoDate(dataFim, issuedDate);
    const classification = dataFim > issuedDate ? "parcial" : "definitiva";
    if (effectiveEnd < dataInicio) {
      const error = new Error("Nao e possivel gerar medicao: o periodo informado ainda nao possui dias encerrados.");
      error.status = 400;
      throw error;
    }
    const { rows: clientRows } = await client.query("SELECT * FROM ciperprag_hub.clientes WHERE tenant_id = $2 AND (razao_social = $1 OR nome_fantasia = $1) LIMIT 1", [clienteNome, tenantId]);
    const customer = clientRows[0];
    const { rows: numRows } = await client.query(
      `UPDATE ciperprag_hub.numeracao_config
       SET medicao_ultimo = medicao_ultimo + 1, atualizado_em = NOW()
       WHERE id = (SELECT id FROM ciperprag_hub.numeracao_config WHERE tenant_id = $1 ORDER BY id LIMIT 1)
       RETURNING medicao_formato, medicao_ultimo`,
      [tenantId],
    );
    const number = formatSequential(numRows[0]?.medicao_formato, numRows[0]?.medicao_ultimo || 1);

    const { rows: orderRows } = await client.query(
      `SELECT
         o.*,
         c.valor_unitario
       FROM ciperprag_hub.ordens_servico o
       LEFT JOIN ciperprag_hub.contratos c ON c.id = o.contrato_id AND c.tenant_id = $4
       WHERE o.status = 'encerrada'
         AND o.tenant_id = $4
         AND COALESCE(o.nao_executada, FALSE) = FALSE
         AND o.cliente = $1
         AND COALESCE(o.data_execucao, o.data_emissao) BETWEEN $2 AND $3
         AND NOT EXISTS (
           SELECT 1
           FROM ciperprag_hub.medicao_itens mi
           JOIN ciperprag_hub.medicoes m_exist ON m_exist.id = mi.medicao_id
           WHERE mi.os_id = o.id
             AND m_exist.tenant_id = $4
             AND m_exist.status <> 'cancelada'
             AND COALESCE(mi.medicao_ativa, TRUE) IS TRUE
         )
       ORDER BY COALESCE(o.data_execucao, o.data_emissao), o.numero`,
      [clienteNome, dataInicio, effectiveEnd, tenantId],
    );

    if (!orderRows.length) {
      const error = new Error("Nenhuma OS encerrada e ainda nao medida foi encontrada para o periodo.");
      error.status = 400;
      throw error;
    }

    const items = orderRows.map((order) => {
      const quantidade = Number(order.quantidade || 0);
      const valorUnitario = Number(order.valor_unitario || 0);
      const valorTotal = moneyLineTotal(quantidade, valorUnitario);
      return {
        osId: order.id,
        osNumero: order.numero,
        contratoId: order.contrato_id,
        servico: order.servico,
        dataExecucao: order.data_execucao?.toISOString?.().split("T")[0] ?? order.data_execucao ?? order.data_emissao?.toISOString?.().split("T")[0] ?? order.data_emissao,
        quantidade,
        unidade: order.unidade,
        valorUnitario,
        valorTotal,
      };
    });
    const total = Math.round(items.reduce((sum, item) => sum + Math.round(item.valorTotal * 100), 0)) / 100;
    const id = makeId("MED");
    const endereco = customer ? `${customer.endereco}, ${customer.bairro}, ${customer.municipio}-${customer.uf}` : null;
    const snapshot = {
      numero: number,
      classificacao: classification,
      parcialAte: classification === "parcial" ? effectiveEnd : null,
      emitidoEm: new Date().toISOString(),
      timezone,
      cliente: {
        id: customer?.id || null,
        nome: clienteNome,
        cnpj: customer?.cnpj || orderRows[0]?.cnpj || null,
        endereco,
      },
      periodo: { inicio: dataInicio, fim: dataFim, medidoAte: effectiveEnd },
      empresa: {
        razaoSocial: company?.razao_social || null,
        nomeFantasia: company?.nome_fantasia || null,
        cnpj: company?.cnpj || null,
        endereco: company?.endereco || null,
        logoUrl: company?.logo_url || null,
      },
      formaPagamento: company?.medicao_forma_pagamento_padrao || null,
      localEntrega: company?.medicao_local_entrega_padrao || null,
      itens: items,
      total,
    };

    await client.query(
      `INSERT INTO ciperprag_hub.medicoes
       (id, tenant_id, numero, cliente_id, cliente_nome, cliente_cnpj, cliente_endereco, periodo_inicio, periodo_fim, status, total, forma_pagamento, local_entrega, snapshot_dados)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'emitida',$10,$11,$12,$13)`,
      [id, tenantId, number, customer?.id || null, clienteNome, customer?.cnpj || orderRows[0]?.cnpj || null, endereco, dataInicio, dataFim, total, company?.medicao_forma_pagamento_padrao || null, company?.medicao_local_entrega_padrao || null, JSON.stringify(snapshot)],
    );

    for (const item of items) {
      await client.query(
        `INSERT INTO ciperprag_hub.medicao_itens
         (medicao_id, tenant_id, os_id, os_numero, contrato_id, servico, data_execucao, quantidade, unidade, valor_unitario, valor_total, medicao_ativa)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,TRUE)`,
        [id, tenantId, item.osId, item.osNumero, item.contratoId, item.servico, item.dataExecucao, item.quantidade, item.unidade, item.valorUnitario, item.valorTotal],
      );
    }
    await saveImmutableDocumentAttachment(client, {
      tenantId: req.auth.user.tenant.id,
      tenantSlug: req.auth.user.tenant.slug,
      userId: req.auth.user.id,
      entityType: "medicao",
      entityId: id,
      fileName: `medicao-${number.replaceAll("/", "-")}.pdf`,
      html: buildHistoricalMeasurementHtml(snapshot, { id, numero: number, cliente_nome: clienteNome, periodo_inicio: dataInicio, periodo_fim: dataFim, total }),
      metadata: { origem: "geracao_medicao", numero: number, periodo: { inicio: dataInicio, fim: dataFim } },
    });
    await logAuditEvent(client, req, {
      entityType: "medicao",
      entityId: id,
      action: "measurement_generated",
      summary: `Medicao ${number} gerada para ${clienteNome}`,
      after: { numero: number, clienteNome, periodoInicio: dataInicio, periodoFim: dataFim, total, itens: items.length },
    });

    return {
      id,
      numero: number,
      clienteId: customer?.id || null,
      clienteNome,
      clienteCnpj: customer?.cnpj || orderRows[0]?.cnpj || null,
      clienteEndereco: endereco,
      periodoInicio: dataInicio,
      periodoFim: dataFim,
      status: "emitida",
      financeiroStatus: "em_conferencia",
      nfNumero: null,
      nfEnviadaEm: null,
      pagamentoPrevistoEm: null,
      pagoNoErpEm: null,
      financeiroObservacao: null,
      financeiroAtualizadoEm: null,
      total,
      formaPagamento: company?.medicao_forma_pagamento_padrao || null,
      localEntrega: company?.medicao_local_entrega_padrao || null,
      snapshotDados: snapshot,
      criadoEm: new Date().toISOString(),
      itens: items,
    };
    });
  } catch (error) {
    if (error?.code === "23505" && String(error?.constraint || "").includes("ux_medicao_itens_tenant_os_ativa")) {
      return res.status(409).json({ error: "Uma ou mais OS ja estao vinculadas a uma medicao ativa. Cancele ou substitua formalmente a medicao anterior antes de medir novamente." });
    }
    throw error;
  }

  res.json({ ok: true, measurement });
});

app.patch("/api/measurements/:id/financial", requirePermission("medicoes.manage"), async (req, res) => {
  const tenantId = req.auth.user.tenant.id;
  const status = String(req.body.financeiroStatus || "").trim();
  if (!MEASUREMENT_FINANCIAL_STATUSES.has(status) || status === "cancelada") {
    return res.status(400).json({ error: "Status financeiro invalido." });
  }

  const nfNumero = normalizeOptionalText(req.body.nfNumero, 80);
  const nfEnviadaEm = normalizeOptionalDate(req.body.nfEnviadaEm);
  const pagamentoPrevistoEm = normalizeOptionalDate(req.body.pagamentoPrevistoEm);
  const pagoNoErpEm = normalizeOptionalDate(req.body.pagoNoErpEm);
  const financeiroObservacao = normalizeOptionalText(req.body.financeiroObservacao, 1200);

  const updated = await withTransaction(async (client) => {
    const { rows: beforeRows } = await client.query(
      `SELECT id, numero, status, financeiro_status, nf_numero, nf_enviada_em, pagamento_previsto_em, pago_no_erp_em, financeiro_observacao
       FROM ciperprag_hub.medicoes
       WHERE id = $1 AND tenant_id = $2
       LIMIT 1`,
      [req.params.id, tenantId],
    );
    const before = beforeRows[0];
    if (!before) {
      const error = new Error("Medicao nao encontrada.");
      error.status = 404;
      throw error;
    }
    if (before.status === "cancelada") {
      const error = new Error("Medicao cancelada nao pode ter acompanhamento financeiro alterado.");
      error.status = 400;
      throw error;
    }

    const { rows } = await client.query(
      `UPDATE ciperprag_hub.medicoes
       SET financeiro_status = $3,
           nf_numero = $4,
           nf_enviada_em = $5,
           pagamento_previsto_em = $6,
           pago_no_erp_em = $7,
           financeiro_observacao = $8,
           financeiro_atualizado_em = NOW(),
           atualizado_em = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [req.params.id, tenantId, status, nfNumero, nfEnviadaEm, pagamentoPrevistoEm, pagoNoErpEm, financeiroObservacao],
    );

    await logAuditEvent(client, req, {
      entityType: "medicao",
      entityId: req.params.id,
      action: "measurement_financial_updated",
      summary: `Acompanhamento financeiro da medicao ${before.numero || req.params.id} atualizado`,
      before,
      after: rows[0],
    });

    return rows[0];
  });

  res.json({ ok: true, financeiroStatus: updated.financeiro_status });
});

app.patch("/api/measurements/:id/cancel", requirePermission("medicoes.manage"), async (req, res) => {
  const rowCount = await withTransaction(async (client) => {
    const result = await client.query(
      "UPDATE ciperprag_hub.medicoes SET status = 'cancelada', financeiro_status = 'cancelada', financeiro_atualizado_em = NOW(), atualizado_em = NOW() WHERE id = $1 AND tenant_id = $2",
      [req.params.id, req.auth.user.tenant.id],
    );
    if (result.rowCount) {
      await client.query("UPDATE ciperprag_hub.medicao_itens SET medicao_ativa = FALSE WHERE medicao_id = $1", [req.params.id]);
      await logAuditEvent(client, req, {
        entityType: "medicao",
        entityId: req.params.id,
        action: "measurement_cancelled",
        summary: `Medicao ${req.params.id} cancelada`,
      });
    }
    return result.rowCount;
  });
  if (!rowCount) return res.status(404).json({ error: "Medicao nao encontrada." });
  res.json({ ok: true });
});

app.post("/api/agendamentos", requirePermission("agenda.manage"), async (req, res) => {
  const id = await upsertSchedule(req.body, req.auth.user.tenant.id);
  await logAuditEvent(null, req, {
    entityType: "agendamento",
    entityId: id,
    action: req.body.id ? "schedule_updated" : "schedule_created",
    summary: `${req.body.id ? "Agendamento atualizado" : "Agendamento criado"} para ${req.body.clienteNome || req.body.cliente || id}`,
    after: { ...req.body, id },
  });
  res.json({ ok: true, id });
});

app.patch("/api/agendamentos/:id", requirePermission("agenda.manage"), async (req, res) => {
  const current = (await getSchedules(req.auth.user.tenant.id)).find((item) => item.id === req.params.id);
  if (!current) return res.status(404).json({ error: "Agendamento não encontrado" });
  const id = await upsertSchedule({ ...current, ...req.body, id: req.params.id }, req.auth.user.tenant.id);
  await logAuditEvent(null, req, {
    entityType: "agendamento",
    entityId: id,
    action: "schedule_updated",
    summary: `Agendamento ${id} atualizado`,
    before: current,
    after: { ...current, ...req.body, id },
  });
  res.json({ ok: true, id });
});

app.post("/api/agendamentos/:id/gerar-os", requirePermission("os.manage"), async (req, res) => {
  const agendamentoId = req.params.id;
  const leaderName = req.body.tecnicoNome;
  const tenantId = req.auth.user.tenant.id;
  const result = await withTransaction(async (client) => {
    const { rows: agRows } = await client.query("SELECT * FROM ciperprag_hub.agendamentos WHERE id = $1 AND tenant_id = $2", [agendamentoId, tenantId]);
    const ag = agRows[0];
    if (!ag) throw new Error("Agendamento não encontrado");
    const { rows: contractRows } = ag.contrato_id
      ? await client.query(
        `SELECT c.*, t.tipo AS template_tipo, t.status AS template_status
         FROM ciperprag_hub.contratos c
         LEFT JOIN ciperprag_hub.contratos_templates t
           ON t.id = c.contrato_template_id
          AND t.tenant_id = c.tenant_id
         WHERE c.id = $1
           AND c.tenant_id = $2`,
        [ag.contrato_id, tenantId],
      )
      : { rows: [] };
    const contract = contractRows[0] || null;
    const balance = Number(contract?.contratado || 0) - Number(contract?.executado || 0);
    if (ag.contrato_id && (!contract || contract.status !== "ativo" || balance <= 0 || contract.template_tipo !== "contrato" || contract.template_status !== "vigente")) {
      const error = new Error("Nao e possivel gerar OS: o agendamento precisa estar vinculado a contrato final vigente e com saldo operacional.");
      error.status = 400;
      throw error;
    }
    const { rows: clientRows } = await client.query("SELECT * FROM ciperprag_hub.clientes WHERE id = $1 AND tenant_id = $2", [ag.cliente_id, tenantId]);
    const customer = clientRows[0];
    const { rows: techRows } = await client.query("SELECT * FROM ciperprag_hub.tecnicos WHERE nome = $1 AND tenant_id = $2", [leaderName || ag.tecnicos_nomes?.[0], tenantId]);
    const tech = techRows[0];
    const service = await getServiceForTenantSnapshot(client, ag.servico, tenantId, ag.servico_catalogo_id || contract?.servico_catalogo_id || null);
    const scheduleRule = validateScheduleOrigin({ contractId: ag.contrato_id, contract, service: service ? { ...service, ativo: true, id: service.id } : null });
    if (!scheduleRule.ok) {
      const error = new Error(scheduleRule.error);
      error.status = 400;
      throw error;
    }
    const { rows: companyRows } = await client.query("SELECT * FROM ciperprag_hub.empresa_config WHERE tenant_id = $1 ORDER BY id LIMIT 1", [tenantId]);
    const company = companyRows[0];
    const { rows: numRows } = await client.query(
      `UPDATE ciperprag_hub.numeracao_config SET os_ultimo = os_ultimo + 1, atualizado_em = NOW()
       WHERE id = (SELECT id FROM ciperprag_hub.numeracao_config WHERE tenant_id = $1 ORDER BY id LIMIT 1)
       RETURNING os_formato, os_ultimo`,
      [tenantId],
    );
    const number = formatSequential(numRows[0]?.os_formato || "OS-{SEQ}", numRows[0]?.os_ultimo || 1);
    const orderId = makeId("OSDB");
    await client.query(
      `INSERT INTO ciperprag_hub.ordens_servico
      (id, tenant_id, numero, agendamento_id, cliente_id, cliente, cnpj, cliente_endereco, cliente_logo_url, contrato_id, servico, tipo, tecnico, tecnico_cpf, tecnico_data_admissao, equipe_tecnicos_ids, equipe_tecnicos_nomes, veiculo_id, veiculo_descricao, local_id, local_execucao, tags, observacao, data_emissao, quantidade, unidade, servico_catalogo_id, status, fotos)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,CURRENT_DATE,1,$24,$25,'aberta',$26)`,
      [orderId, tenantId, number, agendamentoId, ag.cliente_id, ag.cliente, customer?.cnpj || ag.cliente_cnpj, customer ? `${customer.endereco}, ${customer.bairro}, ${customer.municipio}-${customer.uf}` : null, customer?.logo_url || null, ag.contrato_id, service?.nome || ag.servico, service?.tipo || ag.tipo, tech?.nome || leaderName || ag.tecnicos_nomes?.[0] || "", tech?.cpf || null, tech?.data_admissao || null, ag.tecnicos_ids || [], ag.tecnicos_nomes || [], ag.veiculo_id || null, ag.veiculo_descricao || null, ag.local_id || null, ag.local_execucao || null, ag.tags || null, ag.observacao || null, contract?.unidade || service?.unidade || null, service.id, []],
    );
    const { rows: insertedOrderRows } = await client.query("SELECT * FROM ciperprag_hub.ordens_servico WHERE id = $1 AND tenant_id = $2", [orderId, tenantId]);
    const snapshot = buildOrderOperationalSnapshot({
      order: insertedOrderRows[0],
      customer,
      contract,
      service,
      company,
      technician: tech,
      phase: "emissao",
    });
    await client.query(
      "UPDATE ciperprag_hub.ordens_servico SET snapshot_dados = $2, snapshot_emitido_em = NOW() WHERE id = $1 AND tenant_id = $3",
      [orderId, JSON.stringify(snapshot), tenantId],
    );
    await client.query("UPDATE ciperprag_hub.agendamentos SET status = 'os_gerada', os_id = $2 WHERE id = $1 AND tenant_id = $3", [agendamentoId, orderId, tenantId]);
    await logAuditEvent(client, req, {
      entityType: "os",
      entityId: orderId,
      action: "order_generated",
      summary: `OS ${number} gerada a partir do agendamento ${agendamentoId}`,
      after: { numero: number, agendamentoId, cliente: ag.cliente, servico: ag.servico, tecnico: tech?.nome || leaderName || ag.tecnicos_nomes?.[0] || "" },
    });
    return orderId;
  });
  res.json({ ok: true, id: result });
});

app.patch("/api/orders/:id", requirePermission("os.manage"), async (req, res) => {
  const current = (await getOrders(req.auth.user.tenant.id)).find((item) => item.id === req.params.id);
  if (!current) return res.status(404).json({ error: "OS não encontrada" });
  const body = { ...current, ...req.body };
  await query(
    `UPDATE ciperprag_hub.ordens_servico SET
      tecnico=$2, local_execucao=$3, observacao=$4, tags=$5, tag_equipamento_servico=$6, updated_at=NOW()
     WHERE id = $1 AND tenant_id = $7`,
    [req.params.id, body.tecnicoNome, body.localExecucao, body.observacao || null, body.tags || null, body.tagEquipamentoServico || null, req.auth.user.tenant.id],
  ).catch(async () => {
    await query(`UPDATE ciperprag_hub.ordens_servico SET tecnico=$2, local_execucao=$3, observacao=$4, tags=$5, tag_equipamento_servico=$6 WHERE id = $1 AND tenant_id = $7`, [req.params.id, body.tecnicoNome, body.localExecucao, body.observacao || null, body.tags || null, body.tagEquipamentoServico || null, req.auth.user.tenant.id]);
  });
  await logAuditEvent(null, req, {
    entityType: "os",
    entityId: req.params.id,
    action: "order_updated",
    summary: `OS ${current.numero || req.params.id} atualizada`,
    before: {
      tecnicoNome: current.tecnicoNome,
      localExecucao: current.localExecucao,
      observacao: current.observacao,
      tags: current.tags,
      tagEquipamentoServico: current.tagEquipamentoServico,
    },
    after: {
      tecnicoNome: body.tecnicoNome,
      localExecucao: body.localExecucao,
      observacao: body.observacao,
      tags: body.tags,
      tagEquipamentoServico: body.tagEquipamentoServico,
    },
  });
  res.json({ ok: true });
});

app.post("/api/orders/:id/encerrar", requirePermission("os.close"), async (req, res) => {
  const orderId = req.params.id;
  const { dataExecucao, quantidade, tagEquipamentoServico, fotos, checklistRespostas, naoExecutada, motivoNaoExecucao, produtosUtilizados } = req.body;
  const tenantId = req.auth.user.tenant.id;

  const response = await withTransaction(async (client) => {
    const { rows: orderRows } = await client.query("SELECT * FROM ciperprag_hub.ordens_servico WHERE id = $1 AND tenant_id = $2", [orderId, tenantId]);
    const order = orderRows[0];
    if (!order) throw new Error("OS não encontrada");

    const { rows: contractRows } = await client.query("SELECT * FROM ciperprag_hub.contratos WHERE id = $1 AND tenant_id = $2", [order.contrato_id, tenantId]);
    const contract = contractRows[0];
    const service = await getServiceForTenantSnapshot(client, order.servico, tenantId, order.servico_catalogo_id || contract?.servico_catalogo_id || null);
    const { rows: companyRows } = await client.query("SELECT * FROM ciperprag_hub.empresa_config WHERE tenant_id = $1 ORDER BY id LIMIT 1", [tenantId]);
    const company = companyRows[0];
    const { rows: customerRows } = await client.query("SELECT * FROM ciperprag_hub.clientes WHERE id = $1 AND tenant_id = $2", [order.cliente_id, tenantId]);
    const customer = customerRows[0];
    const { rows: techRows } = await client.query("SELECT * FROM ciperprag_hub.tecnicos WHERE nome = $1 AND tenant_id = $2", [order.tecnico, tenantId]);
    const technician = techRows[0];
    const qty = Number(quantidade || 1);
    const isNotExecuted = Boolean(naoExecutada);
    const uploadPolicy = resolveAttachmentPolicy("os.foto", company?.certificado_config || {});
    const rawFotos = Array.isArray(fotos) ? fotos : [];
    if (rawFotos.length > uploadPolicy.maxFiles) {
      const error = new Error(`Anexe no maximo ${uploadPolicy.maxFiles} fotos de evidencia.`);
      error.status = 400;
      throw error;
    }
    const validatedFotos = rawFotos.map((foto, index) => validateAttachmentPayload({
      contentBase64: foto,
      declaredMimeType: null,
      allowedMimeTypes: uploadPolicy.allowedMimeTypes,
      maxBytes: uploadPolicy.maxBytes,
      label: `foto ${index + 1}`,
    }));

    if (isNotExecuted && !String(motivoNaoExecucao || "").trim()) {
      const error = new Error("Informe o motivo da nao execucao.");
      error.status = 400;
      throw error;
    }

    if (!isNotExecuted && service?.exige_foto && validatedFotos.length === 0) {
      const error = new Error("Este servico exige ao menos uma foto de evidencia.");
      error.status = 400;
      throw error;
    }

    await client.query(
      `UPDATE ciperprag_hub.ordens_servico
       SET status = 'encerrada',
           data_execucao = $2,
           quantidade = $3,
           tag_equipamento_servico = $4,
           fotos = $5,
           checklist_respostas = $6,
           nao_executada = $7,
           motivo_nao_execucao = $8
       WHERE id = $1 AND tenant_id = $9`,
      [orderId, dataExecucao, isNotExecuted ? 0 : qty, tagEquipamentoServico || null, validatedFotos.map((foto) => foto.dataUrl), JSON.stringify(checklistRespostas || []), isNotExecuted, motivoNaoExecucao || null, tenantId],
    );

    await client.query("DELETE FROM ciperprag_hub.evidencias_anexos WHERE entidade_tipo = 'os' AND entidade_id = $1 AND categoria = 'foto' AND tenant_id = $2", [orderId, tenantId]);
    for (const [index, parsed] of validatedFotos.entries()) {
      const fotoHash = sha256Hex(parsed.buffer);
      const extension = parsed.mimeType === "image/png" ? "png" : "jpg";
      const fotoFileName = `evidencia-${String(index + 1).padStart(2, "0")}.${extension}`;
      const storageTarget = createAttachmentStoragePlan({
        tenantSlug: req.auth.user.tenant.slug,
        entityType: "os",
        entityId: orderId,
        category: "foto",
        fileName: fotoFileName,
        hashSha256: fotoHash,
      });
      const persisted = await persistAttachmentContent({
        storagePlan: storageTarget,
        buffer: parsed.buffer,
        contentBase64: parsed.dataUrl,
        mimeType: parsed.mimeType,
        hashSha256: fotoHash,
        fileName: fotoFileName,
        metadata: {
          origem: "encerramento_os",
          posicao: index + 1,
          dataExecucao,
          hashSha256: fotoHash,
          ...buildAttachmentSecurityMetadata(uploadPolicy),
        },
      });
      await client.query(
        `INSERT INTO ciperprag_hub.evidencias_anexos
         (id, tenant_id, entidade_tipo, entidade_id, categoria, nome_arquivo, mime_type, tamanho_bytes, conteudo_base64, metadados, hash_sha256, storage_provider, storage_bucket, storage_key, storage_etag, criado_por)
         VALUES ($1,$2,'os',$3,'foto',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          `${makeId("EV")}-${index + 1}`,
          tenantId,
          orderId,
          fotoFileName,
          parsed.mimeType,
          parsed.bytes,
          persisted.contentBase64,
          JSON.stringify(persisted.metadata),
          fotoHash,
          persisted.provider,
          persisted.bucket,
          persisted.key,
          persisted.etag,
          req.auth.user.id,
        ],
      );
    }
    const { rows: updatedOrderRows } = await client.query("SELECT * FROM ciperprag_hub.ordens_servico WHERE id = $1 AND tenant_id = $2", [orderId, tenantId]);
    const { rows: evidenceRows } = await client.query("SELECT * FROM ciperprag_hub.evidencias_anexos WHERE entidade_tipo = 'os' AND entidade_id = $1 AND tenant_id = $2 ORDER BY criado_em, id", [orderId, tenantId]);
    const snapshot = buildOrderOperationalSnapshot({
      order: updatedOrderRows[0],
      customer,
      contract,
      service,
      company,
      technician,
      evidences: evidenceRows,
      checklistRespostas: checklistRespostas || [],
      phase: "encerramento",
      existing: order.snapshot_dados || {},
    });
    await client.query(
      "UPDATE ciperprag_hub.ordens_servico SET snapshot_dados = $2, snapshot_encerrado_em = NOW() WHERE id = $1 AND tenant_id = $3",
      [orderId, JSON.stringify(snapshot), tenantId],
    );

    const stockUsage = Array.isArray(produtosUtilizados) ? produtosUtilizados : [];
    if (!isNotExecuted && stockUsage.length) {
      const { rows: existingMovements } = await client.query(
        "SELECT produto_id FROM ciperprag_hub.estoque_movimentacoes WHERE tenant_id = $1 AND os_id = $2 AND tipo = 'saida' LIMIT 1",
        [tenantId, orderId],
      );
      if (existingMovements.length === 0) {
        for (const usage of stockUsage) {
          const usageQuantity = Number(usage.quantidade || 0);
          if (!usage.produtoId || !Number.isFinite(usageQuantity) || usageQuantity <= 0) continue;
          const { rows: productRows } = await client.query(
            "SELECT id, nome, quantidade_atual, unidade FROM ciperprag_hub.produtos_estoque WHERE id = $1 AND tenant_id = $2 FOR UPDATE",
            [usage.produtoId, tenantId],
          );
          const product = productRows[0];
          if (!product) {
            const error = new Error("Produto utilizado nao pertence a este tenant.");
            error.status = 400;
            throw error;
          }
          const beforeStock = Number(product.quantidade_atual || 0);
          const afterStock = beforeStock - usageQuantity;
          if (afterStock < 0) {
            const error = new Error(`Saldo insuficiente de ${product.nome}. Disponivel: ${beforeStock} ${product.unidade}.`);
            error.status = 400;
            throw error;
          }
          await client.query("UPDATE ciperprag_hub.produtos_estoque SET quantidade_atual = $2, atualizado_em = NOW() WHERE id = $1 AND tenant_id = $3", [product.id, afterStock, tenantId]);
          await client.query(
            `INSERT INTO ciperprag_hub.estoque_movimentacoes
             (id, tenant_id, produto_id, tipo, quantidade, saldo_anterior, saldo_posterior, os_id, servico_id, observacao, criado_por)
             VALUES ($1,$2,$3,'saida',$4,$5,$6,$7,$8,$9,$10)`,
            [makeId("MOV"), tenantId, product.id, usageQuantity, beforeStock, afterStock, orderId, order.servico_catalogo_id || contract?.servico_catalogo_id || service?.id || null, "Baixa automatica no encerramento da OS", req.auth.user.id],
          );
        }
      }
    }
    await saveImmutableDocumentAttachment(client, {
      tenantId,
      tenantSlug: req.auth.user.tenant.slug,
      userId: req.auth.user.id,
      entityType: "os",
      entityId: orderId,
      fileName: `os-${updatedOrderRows[0].numero || orderId}-final.pdf`,
      html: buildHistoricalOrderHtml(snapshot, updatedOrderRows[0]),
      metadata: { origem: "encerramento_os", osNumero: updatedOrderRows[0].numero, dataExecucao },
    });

    if (!isNotExecuted) {
      await client.query(
        `UPDATE ciperprag_hub.contratos
         SET executado = COALESCE(executado, 0) + $2,
             ultima_execucao = $3,
             status = CASE WHEN COALESCE(executado, 0) + $2 >= contratado THEN 'vencido' ELSE 'ativo' END,
             atualizado_em = NOW()
         WHERE id = $1 AND tenant_id = $4`,
        [order.contrato_id, qty, dataExecucao, tenantId],
      ).catch(async () => {
        await client.query(
          `UPDATE ciperprag_hub.contratos
           SET executado = COALESCE(executado, 0) + $2,
               ultima_execucao = $3,
               status = CASE WHEN COALESCE(executado, 0) + $2 >= contratado THEN 'vencido' ELSE 'ativo' END
           WHERE id = $1 AND tenant_id = $4`,
          [order.contrato_id, qty, dataExecucao, tenantId],
        );
      });
    }

    if (order.agendamento_id) {
      await client.query("UPDATE ciperprag_hub.agendamentos SET status = 'encerrado' WHERE id = $1 AND tenant_id = $2", [order.agendamento_id, tenantId]);
    }

    let certificateHash = null;
    let certificateHashes = [];
    if (!isNotExecuted && (service?.gera_certificado || order.tipo === "sanitario")) {
      const certificateResult = await issueCertificateForOrder(
        client,
        { ...order, tenant_id: tenantId, data_execucao: dataExecucao, quantidade: isNotExecuted ? 0 : qty, tag_equipamento_servico: tagEquipamentoServico || order.tag_equipamento_servico, fotos: validatedFotos.map((foto) => foto.dataUrl) },
        { dataExecucao, tenantId, tenantSlug: req.auth.user.tenant.slug, userId: req.auth.user.id, publicBaseUrl: getPublicBaseUrl(req) },
      );
      certificateHash = certificateResult.primaryHash;
      certificateHashes = certificateResult.hashes;
      await logAuditEvent(client, req, {
        entityType: "certificado",
        entityId: certificateHash,
        action: "certificate_generated",
        summary: `Certificado ${certificateHash} gerado automaticamente no encerramento da OS ${order.numero || orderId}`,
        after: { hash: certificateHash, hashes: certificateHashes, osId: orderId, osNumero: order.numero, cliente: order.cliente, servico: order.servico },
      });
    }

    const recorrenciaDias = Number(service?.recorrencia_dias || contract?.validade_dias || 0);
    if (!isNotExecuted && recorrenciaDias > 0) {
      await client.query(
        `INSERT INTO ciperprag_hub.recorrencia_sugestoes
         (id, tenant_id, cliente_id, cliente_nome, cliente_cnpj, contrato_id, servico_catalogo_id, servico, tipo, local_id, local_execucao, tags, observacao, tecnicos_ids, tecnicos_nomes, veiculo_id, veiculo_descricao, suggested_date, source_agendamento_id, source_os_id, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,'pendente')`,
        [makeId("RC"), tenantId, order.cliente_id, order.cliente, order.cnpj, order.contrato_id, service?.id || null, order.servico, order.tipo, order.local_id || null, order.local_execucao, order.tags || null, order.observacao || null, order.equipe_tecnicos_ids || [], order.equipe_tecnicos_nomes || [], order.veiculo_id || null, order.veiculo_descricao || null, addDays(dataExecucao, recorrenciaDias), order.agendamento_id || null, orderId],
      );
    }
    await logAuditEvent(client, req, {
      entityType: "os",
      entityId: orderId,
      action: "order_closed",
      summary: `OS ${order.numero || orderId} encerrada${isNotExecuted ? " como nao executada" : ""}`,
      before: { status: order.status, quantidade: order.quantidade, dataExecucao: order.data_execucao },
      after: {
        status: "encerrada",
        dataExecucao,
        quantidade: isNotExecuted ? 0 : qty,
        naoExecutada: isNotExecuted,
        fotos: validatedFotos.length,
        certificateHash,
      },
    });

    return { certificateHash, certificateHashes };
  });

  res.json({ ok: true, ...response });
});

app.post("/api/orders/:id/certificado", requirePermission("certificados.manage"), async (req, res) => {
  const orderId = req.params.id;
  const tenantId = req.auth.user.tenant.id;
  const { rows: orderRows } = await query("SELECT * FROM ciperprag_hub.ordens_servico WHERE id = $1 AND tenant_id = $2", [orderId, tenantId]);
  const order = orderRows[0];
  if (!order) return res.status(404).json({ error: "OS nao encontrada" });
  if (order.nao_executada) return res.status(400).json({ error: "Nao e possivel gerar certificado para OS nao executada." });
  const certificateResponse = await withTransaction(async (client) => {
    const certificateResult = await issueCertificateForOrder(client, order, { tenantId, tenantSlug: req.auth.user.tenant.slug, userId: req.auth.user.id, publicBaseUrl: getPublicBaseUrl(req) });
    const certificateHash = certificateResult.primaryHash;
    await logAuditEvent(client, req, {
      entityType: "certificado",
      entityId: certificateHash,
      action: "certificate_generated",
      summary: `Certificado ${certificateHash} gerado para OS ${order.numero || orderId}`,
      after: { hash: certificateHash, hashes: certificateResult.hashes, osId: orderId, osNumero: order.numero, cliente: order.cliente, servico: order.servico },
    });
    return { hash: certificateHash, hashes: certificateResult.hashes };
  });
  res.json({ ok: true, hash: certificateResponse.hash, hashes: certificateResponse.hashes });
});

app.patch("/api/certificates/:id/revoke", requirePermission("certificados.manage"), async (req, res) => {
  const certificateId = String(req.params.id || "").trim();
  const reason = String(req.body.motivo || "").trim();
  if (!reason || reason.length < 5) return res.status(400).json({ error: "Informe um motivo com pelo menos 5 caracteres para revogar o certificado." });
  const tenantId = req.auth.user.tenant.id;
  const { rows } = await query(
    "SELECT id, hash, numero, status, os_id, os_numero, cliente_nome, servico FROM ciperprag_hub.certificados WHERE id = $1 AND tenant_id = $2 LIMIT 1",
    [certificateId, tenantId],
  );
  const certificate = rows[0];
  if (!certificate) return res.status(404).json({ error: "Certificado nao encontrado." });
  if (certificate.status === "revogado") return res.status(409).json({ error: "Este certificado ja esta revogado." });

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE ciperprag_hub.certificados
       SET status = 'revogado', revogado_em = NOW(), motivo_revogacao = $1
       WHERE id = $2 AND tenant_id = $3 AND status = 'emitido'`,
      [reason, certificateId, tenantId],
    );
    await logAuditEvent(client, req, {
      entityType: "certificado",
      entityId: certificateId,
      action: "certificate_revoked",
      summary: `Certificado ${certificate.numero || certificate.hash} revogado`,
      before: { status: certificate.status },
      after: { status: "revogado", motivo: reason, hash: certificate.hash, osId: certificate.os_id },
    });
  });
  res.json({ ok: true, id: certificateId, status: "revogado" });
});

app.post("/api/certificates/:id/reissue", requirePermission("certificados.manage"), async (req, res) => {
  const certificateId = String(req.params.id || "").trim();
  const reason = String(req.body.motivo || "").trim();
  if (!reason || reason.length < 5) return res.status(400).json({ error: "Informe um motivo com pelo menos 5 caracteres para reemitir o certificado." });
  const tenantId = req.auth.user.tenant.id;

  const result = await withTransaction(async (client) => {
    const { rows: certificateRows } = await client.query(
      "SELECT * FROM ciperprag_hub.certificados WHERE id = $1 AND tenant_id = $2 LIMIT 1",
      [certificateId, tenantId],
    );
    const certificate = certificateRows[0];
    if (!certificate) {
      const error = new Error("Certificado nao encontrado.");
      error.status = 404;
      throw error;
    }

    if (certificate.status === "revogado") {
      const error = new Error("Este certificado ja esta revogado e nao pode ser reemitido novamente.");
      error.status = 409;
      throw error;
    }

    const { rows: orderRows } = await client.query(
      "SELECT * FROM ciperprag_hub.ordens_servico WHERE id = $1 AND tenant_id = $2 LIMIT 1",
      [certificate.os_id, tenantId],
    );
    const order = orderRows[0];
    if (!order) {
      const error = new Error("A OS de origem do certificado nao foi encontrada.");
      error.status = 409;
      throw error;
    }

    const originalPrimaryCertificateHash = order.certificado_hash;
    const replacementOrder = {
      ...order,
      certificado_hash: null,
      tag_equipamento_servico: certificate.tag_equipamento_servico || null,
      tags: certificate.tag_equipamento_servico || null,
    };
    const issued = await issueCertificateForOrder(client, replacementOrder, {
      tenantId,
      tenantSlug: req.auth.user.tenant.slug,
      userId: req.auth.user.id,
      publicBaseUrl: getPublicBaseUrl(req),
    });
    if (originalPrimaryCertificateHash !== certificate.hash) {
      await client.query(
        "UPDATE ciperprag_hub.ordens_servico SET certificado_hash = $2 WHERE id = $1 AND tenant_id = $3",
        [order.id, originalPrimaryCertificateHash, tenantId],
      );
    }
    const { rows: replacementRows } = await client.query(
      "SELECT id, numero, hash FROM ciperprag_hub.certificados WHERE tenant_id = $1 AND hash = ANY($2::text[]) ORDER BY emitido_em DESC",
      [tenantId, issued.hashes],
    );
    const replacement = replacementRows[0];
    if (!replacement) {
      const error = new Error("Nao foi possivel localizar o certificado reemitido.");
      error.status = 500;
      throw error;
    }

    await client.query(
      `UPDATE ciperprag_hub.certificados
       SET status = 'revogado', revogado_em = NOW(), motivo_revogacao = $1, substituido_por_id = $2
       WHERE id = $3 AND tenant_id = $4`,
      [`${reason} Substituido por ${replacement.numero || replacement.hash}.`, replacement.id, certificateId, tenantId],
    );
    await client.query(
      `UPDATE ciperprag_hub.certificados
       SET substitui_certificado_id = $1
       WHERE tenant_id = $2 AND hash = ANY($3::text[])`,
      [certificateId, tenantId, issued.hashes],
    );
    await logAuditEvent(client, req, {
      entityType: "certificado",
      entityId: certificateId,
      action: "certificate_reissued",
      summary: `Certificado ${certificate.numero || certificate.hash} substituido por ${replacement.numero || replacement.hash}`,
      before: { status: certificate.status, hash: certificate.hash },
      after: { status: "revogado", replacementId: replacement.id, replacementHashes: issued.hashes, motivo: reason },
    });
    return { oldId: certificateId, replacementId: replacement.id, hash: issued.primaryHash, hashes: issued.hashes };
  });
  res.json({ ok: true, ...result });
});

app.patch("/api/recurrence-suggestions/:id", requirePermission("agenda.manage"), async (req, res) => {
  const id = req.params.id;
  const action = req.body.action;
  const tenantId = req.auth.user.tenant.id;
  const { rows } = await query("SELECT * FROM ciperprag_hub.recorrencia_sugestoes WHERE id = $1 AND tenant_id = $2", [id, tenantId]);
  const suggestion = rows[0];
  if (!suggestion) return res.status(404).json({ error: "Sugestão não encontrada" });

  if (action === "confirm") {
    await withTransaction(async (client) => {
      const newId = makeId("AG");
      const { rows: contractRows } = suggestion.contrato_id
        ? await client.query(
          `SELECT c.*, t.tipo AS template_tipo, t.status AS template_status
           FROM ciperprag_hub.contratos c
           LEFT JOIN ciperprag_hub.contratos_templates t
             ON t.id = c.contrato_template_id
            AND t.tenant_id = c.tenant_id
           WHERE c.id = $1
             AND c.tenant_id = $2
           LIMIT 1`,
          [suggestion.contrato_id, tenantId],
        )
        : { rows: [] };
      const contract = contractRows[0] || null;
      const balance = Number(contract?.contratado || 0) - Number(contract?.executado || 0);
      if (suggestion.contrato_id && (!contract || contract.status !== "ativo" || balance <= 0 || contract.template_tipo !== "contrato" || contract.template_status !== "vigente")) {
        const error = new Error("Nao e possivel confirmar recorrencia: contrato final sem saldo operacional disponivel.");
        error.status = 400;
        throw error;
      }
      await client.query(
        `INSERT INTO ciperprag_hub.agendamentos
         (id, tenant_id, contrato_id, servico_catalogo_id, cliente_id, cliente, cliente_cnpj, servico, tipo, data_agendada, local_id, local_execucao, tags, observacao, tecnicos_ids, tecnicos_nomes, veiculo_id, veiculo_descricao, status, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'agendado',NOW())`,
        [newId, tenantId, suggestion.contrato_id, suggestion.servico_catalogo_id || null, suggestion.cliente_id, suggestion.cliente_nome, suggestion.cliente_cnpj, suggestion.servico, suggestion.tipo, suggestion.suggested_date, suggestion.local_id || null, suggestion.local_execucao, suggestion.tags, suggestion.observacao, suggestion.tecnicos_ids || [], suggestion.tecnicos_nomes || [], suggestion.veiculo_id, suggestion.veiculo_descricao],
      );
      await client.query("UPDATE ciperprag_hub.recorrencia_sugestoes SET status = 'confirmada' WHERE id = $1 AND tenant_id = $2", [id, tenantId]);
      await logAuditEvent(client, req, {
        entityType: "recorrencia",
        entityId: id,
        action: "recurrence_confirmed",
        summary: `Recorrencia ${id} confirmada e novo agendamento ${newId} criado`,
        after: { agendamentoId: newId, suggestedDate: suggestion.suggested_date, cliente: suggestion.cliente_nome, servico: suggestion.servico },
      });
    });
  } else {
    await query("UPDATE ciperprag_hub.recorrencia_sugestoes SET status = 'dispensada' WHERE id = $1 AND tenant_id = $2", [id, tenantId]);
    await logAuditEvent(null, req, {
      entityType: "recorrencia",
      entityId: id,
      action: "recurrence_dismissed",
      summary: `Recorrencia ${id} dispensada`,
      after: { suggestedDate: suggestion.suggested_date, cliente: suggestion.cliente_nome, servico: suggestion.servico },
    });
  }
  res.json({ ok: true });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({ error: error.message || "Erro interno no servidor" });
});

if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(__dirname, "../dist");
  app.use(express.static(distPath));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

async function start() {
  await ensureDatabaseShape();
  await query("SELECT 1");
  app.listen(PORT, () => {
    console.log(`API Atenza FieldOps ouvindo em http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error("Falha ao iniciar API:", error.message);
  process.exit(1);
});
