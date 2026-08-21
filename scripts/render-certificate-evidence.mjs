import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import { chromium } from "playwright";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(rootDir, "docs/evidencias/certificado_saas");
const publicOutDir = path.join(rootDir, "docs/cliente/certificados_montserrat");
const templatePath = path.join(rootDir, "src/template_certificado_dinamico.html");

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function dataUri(assetPath) {
  if (!assetPath) return "";
  if (assetPath.startsWith("data:")) return assetPath;
  const bytes = await fs.readFile(path.join(rootDir, assetPath));
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

function svgDataUri(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

async function embeddedMontserratCss() {
  const fonts = [
    [400, "normal", "Montserrat-Regular.ttf"],
    [500, "normal", "Montserrat-Medium.ttf"],
    [600, "normal", "Montserrat-SemiBold.ttf"],
    [700, "normal", "Montserrat-Bold.ttf"],
    [800, "normal", "Montserrat-Bold.ttf"],
    [900, "normal", "Montserrat-Bold.ttf"],
    [700, "italic", "Montserrat-Bold.ttf"],
    [800, "italic", "Montserrat-Bold.ttf"],
    [900, "italic", "Montserrat-Bold.ttf"],
  ];
  const faces = await Promise.all(
    fonts.map(async ([weight, style, fileName]) => {
      const fontPath = path.join(rootDir, "src/assets/fonts/documentos/montserrat", fileName);
      const contents = await fs.readFile(fontPath);
      return `@font-face{font-family:"Montserrat";src:url(data:font/truetype;base64,${contents.toString("base64")}) format("truetype");font-style:${style};font-weight:${weight};}`;
    }),
  );
  return faces.join("\n");
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function shaFingerprint(hash) {
  const clean = String(hash || "").replace(/[^a-fA-F0-9]/g, "").toUpperCase();
  return clean.length >= 20 ? `SHA-256: ${clean.slice(0, 12)}…${clean.slice(-8)}` : clean;
}

function normalizeCertificateNumber(value) {
  return String(value || "")
    .replace(/^\s*(certificado|cert\.?|cert)\s*(n[ºo.]*)?\s*[-.:]?\s*/i, "")
    .replace(/^\s*(certificado|cert\.?|cert)\s*(n[ºo.]*)?\s*[-.:]?\s*/i, "")
    .trim();
}

function normalizeOsNumber(value) {
  return String(value || "")
    .replace(/^\s*os\s*(n[ºo.]*)?\s*[-.:]?\s*/i, "")
    .replace(/^\s*os\s*(n[ºo.]*)?\s*[-.:]?\s*/i, "")
    .trim();
}

function renderCertificateReference(value) {
  const normalized = normalizeCertificateNumber(value);
  return normalized ? `Certificado nº ${normalized}` : "";
}

function renderOsReference(value) {
  const normalized = normalizeOsNumber(value);
  return normalized ? `OS nº ${normalized}` : "";
}

function buildShortPublicCode(hash) {
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

function formatDateBr(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
}

function addDays(date, days) {
  const parsed = new Date(`${date}T12:00:00`);
  parsed.setDate(parsed.getDate() + Number(days || 0));
  return parsed.toISOString().slice(0, 10);
}

function brandLogo(name, color = "#0f766e") {
  return svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="150" viewBox="0 0 420 150" role="img" aria-label="${escapeHtml(name)}"><rect width="420" height="150" rx="28" fill="#ffffff"/><circle cx="82" cy="75" r="43" fill="${color}"/><path d="M59 96 82 43l23 53h-15l-4-11H78l-4 11H59Zm22-24h10l-5-14-5 14Z" fill="#ffffff"/><rect x="145" y="47" width="210" height="17" rx="8.5" fill="${color}"/><rect x="145" y="76" width="150" height="11" rx="5.5" fill="#111827" opacity=".72"/><rect x="145" y="99" width="185" height="8" rx="4" fill="#64748b" opacity=".45"/></svg>`);
}

function evidencePhoto({ label, width = 520, height = 300, color = "#0f766e" }) {
  return svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(label)}"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="#0f172a"/></linearGradient></defs><rect width="${width}" height="${height}" fill="url(#g)"/><circle cx="${Math.round(width * 0.18)}" cy="${Math.round(height * 0.22)}" r="${Math.round(Math.min(width, height) * 0.11)}" fill="rgba(255,255,255,.25)"/><rect x="${Math.round(width * 0.1)}" y="${Math.round(height * 0.5)}" width="${Math.round(width * 0.78)}" height="${Math.round(height * 0.24)}" rx="16" fill="rgba(255,255,255,.76)"/><rect x="${Math.round(width * 0.14)}" y="${Math.round(height * 0.58)}" width="${Math.round(width * 0.36)}" height="14" rx="7" fill="rgba(15,23,42,.42)"/><rect x="${Math.round(width * 0.14)}" y="${Math.round(height * 0.66)}" width="${Math.round(width * 0.25)}" height="10" rx="5" fill="rgba(15,23,42,.22)"/></svg>`);
}

function renderIssuerBrand(logo, emitter) {
  if (logo) return `<img class="logo-principal" src="${logo}" alt="${escapeHtml(emitter)}" />`;
  return emitter ? `<div class="marca-textual">${escapeHtml(emitter)}</div>` : "";
}

function renderValidityBox(validityText, showValidity) {
  if (!showValidity) return "";
  return `<div class="validade-box"><div class="label">Período de validade</div><div class="value">${escapeHtml(validityText)}</div></div>`;
}

function renderTraceability(text) {
  return text ? `<div class="trace-card" aria-label="Rastreabilidade do certificado">${escapeHtml(text)}</div>` : "";
}

function productRows(products = [], showProducts = true) {
  if (!showProducts || !products.length) return "";
  const rows = products
    .map(
      (item) => `<tr><td>${escapeHtml(item.nome)}</td><td>${escapeHtml(item.grupo)}</td><td>${escapeHtml(item.qt)}</td><td>${escapeHtml(item.diluente)}</td><td>${escapeHtml(item.volume)}</td><td>${escapeHtml(item.combate)}</td><td>${escapeHtml(item.antidoto)}</td></tr>`,
    )
    .join("");

  return `<h2 class="section-title">Produtos Químicos Utilizados no Serviço</h2><div class="table-wrap"><table><thead><tr><th class="w1">Nome</th><th class="w2">Grupo Químico</th><th class="w3">Qt. Uso</th><th class="w4">Diluente</th><th class="w5">Vol. Aplicado</th><th class="w6">Combate</th><th class="w7">Antídoto</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function licensesHtml(items = []) {
  const validItems = items.filter((item) => item.titulo && item.valor);
  if (!validItems.length) return "";
  return `<div class="licenca-card"><div class="licenca-top">Esta empresa encontra-se devidamente licenciada nos seguintes órgãos</div><div class="licenca-grid" style="--license-count: ${Math.min(Math.max(validItems.length, 1), 8)}">${validItems.map((item) => `<div class="licenca-item"><span class="licenca-label">${escapeHtml(item.titulo)}</span><span class="licenca-value">${escapeHtml(item.valor)}</span></div>`).join("")}</div></div>`;
}

function photosHtml(photos = [], fit = "cover") {
  const validPhotos = photos.slice(0, 3);
  if (!validPhotos.length) return "";
  const fitClass = fit === "contain" ? "fit-contain" : "fit-cover";
  return `<div class="gallery gallery-${validPhotos.length}">${validPhotos.map((photo, index) => `<figure class="gallery-item ${fitClass}"><img src="${photo.src || photo}" alt="${escapeHtml(photo.caption || `Evidência ${index + 1}`)}" />${photo.caption ? `<figcaption>${escapeHtml(photo.caption)}</figcaption>` : ""}</figure>`).join("")}</div>`;
}

function footerBranding({ seloUrl = "", logoUrl = "", assinaturaUrl = "", responsavel = "", cargo = "", registro = "", assinaturaModo = "imagem", institutionalLogos = [] }) {
  const columns = [];
  const logos = institutionalLogos.filter((item) => item?.url);
  if (seloUrl) columns.push(`<img class="brasao" src="${seloUrl}" alt="Selo institucional" />`);
  if (logoUrl) columns.push(`<img class="mini-logo" src="${logoUrl}" alt="Logo da empresa emissora" />`);
  if (logos.length) {
    columns.push(`<div class="institutional-logos">${logos.map((item) => `<div class="institutional-logo"><img src="${item.url}" alt="${escapeHtml(item.nome || "Logo institucional")}" /><span>${escapeHtml(item.nome || "")}</span></div>`).join("")}</div>`);
  }

  const shouldShowSignature = assinaturaModo !== "ocultar" && (assinaturaUrl || responsavel || cargo || registro || assinaturaModo === "linha");
  if (shouldShowSignature) {
    const image = assinaturaUrl && assinaturaModo !== "linha" ? `<img class="assinatura-img" src="${assinaturaUrl}" alt="Assinatura do responsável técnico" />` : "";
    columns.push(`<div class="assinatura-box">${image}<div class="linha-assinatura"></div>${responsavel ? `<div class="assinatura-nome">${escapeHtml(responsavel)}</div>` : ""}${cargo ? `<div class="assinatura-reg">${escapeHtml(cargo)}</div>` : ""}${registro ? `<div class="assinatura-reg">${escapeHtml(registro)}</div>` : ""}</div>`);
  }

  return columns.length ? `<div class="footer-grid">${columns.map((html) => `<div class="footer-col">${html}</div>`).join("")}</div>` : "";
}

function footerHtml({ lines = [], cit = "" }) {
  const [main, ...rest] = lines.filter(Boolean);
  return `<div class="footer-center">${main ? `<div class="empresa">${escapeHtml(main)}</div>` : ""}${rest.length ? `<div class="footer-addresses">${rest.map((line) => `<span class="addr"><span class="addr-icon">•</span><span>${escapeHtml(line)}</span></span>`).join('<span class="divider">|</span>')}</div>` : ""}${cit ? `<div class="cit-bottom">${escapeHtml(cit)}</div>` : ""}</div>`;
}

function declaration({ client, service, textLegal }) {
  return `Certificamos para os devidos fins que a empresa <strong>${escapeHtml(client)}</strong> recebeu a execução do serviço de <strong>${escapeHtml(service)}</strong>, ${escapeHtml(textLegal)}.`;
}

async function renderScenario(browser, template, scenario) {
  const snapshotSha256 = scenario.snapshotSha256 || sha256Hex(JSON.stringify({
    tenantId: scenario.tenantId,
    osId: scenario.osId,
    certificateNumber: scenario.number,
    client: scenario.client,
    cnpj: scenario.cnpj,
    service: scenario.service,
    executionDate: scenario.executionDate,
  }));
  const hash = scenario.hash || `HSH-${scenario.year || "2026"}-${scenario.slug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8).padEnd(8, "X")}`;
  const publicCode = scenario.publicCode || buildShortPublicCode(hash);
  const validationUrl = `${scenario.publicBaseUrl.replace(/\/+$/, "")}/validar-certificado/${encodeURIComponent(publicCode)}`;
  const qr = scenario.showQr === false ? "" : await QRCode.toDataURL(validationUrl, { width: 104, margin: 1 });
  const snapshotFingerprint = shaFingerprint(snapshotSha256);
  const qrHtml = qr
    ? `<div class="auth-box-top"><img src="${qr}" alt="QR Code de validação" /><div class="qr-info"><div class="qr-title">Autenticidade</div><div class="qr-hash">${escapeHtml(publicCode)}</div><div class="qr-fingerprint">${escapeHtml(snapshotFingerprint)}</div><div class="qr-link">${escapeHtml(validationUrl)}</div></div></div>`
    : "";
  const executionDateBr = formatDateBr(scenario.executionDate);
  const validityText = scenario.validityDays > 0 ? `${executionDateBr} a ${formatDateBr(addDays(scenario.executionDate, scenario.validityDays))}` : "";
  const traceability = renderTraceability(
    [renderCertificateReference(scenario.number), renderOsReference(scenario.osNumber), `Execução: ${executionDateBr}`].filter(Boolean).join(" • "),
  );
  const pdfTitle = [scenario.title, renderCertificateReference(scenario.number)].filter(Boolean).join(" - ");

  const html = template
    .replaceAll("{{pdf_title}}", escapeHtml(pdfTitle))
    .replaceAll("{{pdf_author}}", escapeHtml(scenario.emitter))
    .replaceAll("{{pdf_subject}}", escapeHtml(`${scenario.service} - ${scenario.client}`))
    .replaceAll("{{pdf_keywords}}", escapeHtml(`certificado, validação, ${scenario.service}, pt-BR`))
    .replaceAll("{{cor_primaria}}", scenario.primary)
    .replaceAll("{{cor_primaria_escura}}", scenario.dark)
    .replaceAll("{{cor_secundaria}}", scenario.secondary)
    .replaceAll("{{cor_destaque}}", scenario.accent)
    .replaceAll("{{arte_fundo_html}}", scenario.art ? `<div class="left-art"><img src="${scenario.art}" alt="Marca d'água" /></div>` : "")
    .replaceAll("{{emissor_marca_html}}", renderIssuerBrand(scenario.logo, scenario.emitter))
    .replaceAll("{{validade_box_html}}", renderValidityBox(validityText, scenario.validityDays > 0))
    .replaceAll("{{qr_code_html}}", qrHtml)
    .replaceAll("{{certificado_titulo}}", escapeHtml(scenario.title))
    .replaceAll("{{certificado_subtitulo_html}}", scenario.subtitle ? `<div class="cert-subtitle">${escapeHtml(scenario.subtitle)}</div>` : "")
    .replaceAll("{{logo_cliente_html}}", scenario.clientLogo ? `<img class="logo-cliente" src="${scenario.clientLogo}" alt="Logo do cliente" />` : "")
    .replaceAll("{{cliente_nome}}", escapeHtml(scenario.client))
    .replaceAll("{{cliente_cnpj}}", escapeHtml(scenario.cnpj))
    .replaceAll("{{cliente_endereco}}", escapeHtml(scenario.address))
    .replaceAll("{{local_execucao}}", escapeHtml(scenario.location))
    .replaceAll("{{rastreabilidade_html}}", traceability)
    .replaceAll("{{galeria_html}}", photosHtml(scenario.photos || [], scenario.photoFit || "cover"))
    .replaceAll("{{produtos_section_html}}", productRows(scenario.products || [], scenario.showProducts !== false))
    .replaceAll("{{texto_fixacao}}", scenario.showFixText === false ? "" : escapeHtml(scenario.fixText))
    .replaceAll("{{licencas_section_html}}", licensesHtml(scenario.licenses || []))
    .replaceAll("{{texto_certificado}}", declaration(scenario))
    .replaceAll("{{selos_assinatura_html}}", footerBranding(scenario))
    .replaceAll("{{rodape_html}}", footerHtml({ lines: scenario.footerLines, cit: scenario.cit }));

  const page = await browser.newPage({ viewport: { width: 1754, height: 1240 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map((image) => image.complete ? image.decode().catch(() => {}) : new Promise((resolve) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    })));
  });
  const pdfPath = path.join(outDir, `${scenario.slug}.pdf`);
  const pngPath = path.join(outDir, `${scenario.slug}.png`);
  await page.pdf({
    path: pdfPath,
    format: "A4",
    landscape: true,
    tagged: true,
    outline: true,
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  const pageBox = await page.locator(".page").boundingBox();
  if (!pageBox) throw new Error(`Página do certificado não encontrada para ${scenario.slug}.`);
  await page.screenshot({
    path: pngPath,
    clip: { x: pageBox.x, y: pageBox.y, width: pageBox.width, height: pageBox.height },
  });
  await page.close();
  return {
    slug: scenario.slug,
    pdfPath,
    pngPath,
    title: scenario.title,
    tenantId: scenario.tenantId,
    osId: scenario.osId,
    osNumber: scenario.osNumber,
    number: scenario.number,
    client: scenario.client,
    cnpj: scenario.cnpj,
    address: scenario.address,
    service: scenario.service,
    executionDate: scenario.executionDate,
    executionDateBr,
    validityText,
    publicCode,
    validationUrl,
    hash,
    snapshotSha256,
    snapshotFingerprint,
    traceabilityText: [renderCertificateReference(scenario.number), renderOsReference(scenario.osNumber), `Execução: ${executionDateBr}`].filter(Boolean).join(" • "),
    hasProducts: scenario.showProducts !== false && Boolean(scenario.products?.length),
    hasLicenses: Boolean(scenario.licenses?.length),
    hasPhotos: Boolean(scenario.photos?.length),
    hasSignature: scenario.assinaturaModo !== "ocultar" && Boolean(scenario.responsavel || scenario.assinaturaUrl),
    hasValidity: scenario.validityDays > 0,
  };
}

await fs.mkdir(outDir, { recursive: true });
await fs.mkdir(publicOutDir, { recursive: true });

const template = await fs.readFile(templatePath, "utf8");
const ciperLogo = await dataUri("src/assets/logo_ciperprag_certificado.png");
const ciperArt = await dataUri("src/assets/icone_lateral_certificado.png");
const ciperSeal = await dataUri("src/assets/brasao_prefeitura_parauapebas.png");
const ciperSignature = await dataUri("src/assets/assinatura_certificado.png");
const ciperAnvisa = await dataUri("scripts/seed-assets/ciperprag/logo-anvisa.png");
const demoLogo = brandLogo("Empresa Demonstração", "#0f766e");
const clientLogo = brandLogo("Komatsu", "#334155");
const photos = [
  { src: evidencePhoto({ label: "Antes do serviço", width: 700, height: 420, color: "#0f766e" }), caption: "Antes da execução" },
  { src: evidencePhoto({ label: "Durante", width: 420, height: 700, color: "#1d4ed8" }), caption: "Execução técnica" },
  { src: evidencePhoto({ label: "Após", width: 640, height: 360, color: "#b45309" }), caption: "Após conclusão" },
];
const products = [
  { nome: "Gel Inseticida Maxforce", grupo: "Neonicotinoide", qt: "Conforme infestação", diluente: "Não aplicável", volume: "Iscagem pontual", combate: "Baratas e insetos rasteiros", antidoto: "Tratamento sintomático" },
  { nome: "Cipermetrina 25% CE", grupo: "Piretroide", qt: "Conforme rótulo", diluente: "Água", volume: "Conforme área tratada", combate: "Insetos rasteiros e voadores", antidoto: "Tratamento sintomático" },
  { nome: "Raticida Brodifacoum 0,005%", grupo: "Anticoagulante", qt: "Conforme mapeamento", diluente: "Não aplicável", volume: "Porta-iscas", combate: "Roedores", antidoto: "Vitamina K1" },
];
const ciperLicenses = [
  { titulo: "CERTIFICADO", valor: "7303/2026" },
  { titulo: "MTRR", valor: "151012245873" },
  { titulo: "MEIO AMBIENTE", valor: "Nº 102/2024" },
  { titulo: "C.R.02", valor: "1611984/2025" },
  { titulo: "CTR02", valor: "1657521/2024" },
  { titulo: "ALVARÁ", valor: "00060/2025" },
  { titulo: "VIG. SANITÁRIA", valor: "VSP-2025-4432" },
];
const ciperFooter = [
  "CIPERPRAG SERVIÇOS LTDA CNPJ: 15.722.292/0001-43",
  "Rua Topázio Qd 11 Lote 03, Vale dos Carajás, Parauapebas - PA",
  "Rua Tiradentes, nº 190 - Centro, Rondon do Pará - PA",
];

const baseCiper = {
  tenantId: "tenant-ciperprag-homologacao",
  primary: "#169556",
  dark: "#0c6c41",
  secondary: "#6f9dd3",
  accent: "#df2027",
  publicBaseUrl: "https://fieldops-homologacao.atenza.digital",
  year: "2026",
  emitter: "CIPERPRAG SERVIÇOS LTDA",
  logo: ciperLogo,
  art: ciperArt,
  seloUrl: ciperSeal,
  logoUrl: ciperLogo,
  assinaturaUrl: ciperSignature,
  institutionalLogos: [{ nome: "ANVISA", url: ciperAnvisa }],
  assinaturaModo: "imagem",
  responsavel: "Aline Costa Vieira",
  cargo: "Diretora / Responsável técnica",
  registro: "CRT02-87963930253",
  title: "Certificado de Garantia",
  subtitle: "",
  number: "CERT-7303/2026",
  osId: "OS-2677",
  osNumber: "OS-2677",
  client: "Komatsu Brasil International LTDA",
  cnpj: "02.336.124/0009-25",
  address: "Av. Serra Arqueada S/N, QD QNC 205, Nova Carajás, Parauapebas-PA",
  location: "Galpão Norte",
  executionDate: "2026-06-22",
  validityDays: 30,
  service: "Controle Integrado de Pragas - ARM-99",
  textLegal: "conforme os procedimentos técnicos aplicáveis e em conformidade com as exigências sanitárias vigentes, inclusive a RDC 652/2022 quando cabível",
  fixText: "FIXAR OBRIGATORIAMENTE EM LOCAL VISÍVEL",
  licenses: ciperLicenses,
  products,
  footerLines: ciperFooter,
  cit: "CIT - CENTRO DE INFORMAÇÕES TOXICOLÓGICAS DE BELÉM: 0800-7226001",
  version: "1",
};

const scenarios = [
  { ...baseCiper, slug: "01-ciperprag-com-produtos", clientLogo },
  { ...baseCiper, slug: "02-ciperprag-sem-produtos", title: "Certificado de Execução", number: "CERT-7304/2026", osId: "OS-2678", osNumber: "OS-2678", showProducts: false, products: [], service: "Coleta de água em bebedouro - TAG 05", client: "República Administrativa", cnpj: "11.222.333/0001-44", location: "Área administrativa", validityDays: 30 },
  { ...baseCiper, slug: "03-ciperprag-tres-fotos", title: "Certificado de Higienização", number: "CERT-7305/2026", osId: "OS-2679", osNumber: "OS-2679", service: "Higienização de bebedouro - TAG 02", location: "Bebedouro TAG 02", photos },
  { ...baseCiper, slug: "04-ciperprag-titulo-personalizado", title: "Certificado Técnico de Saúde Ambiental", number: "CERT-7306/2026", osId: "OS-2680", osNumber: "OS-2680", service: "Controle integrado de pragas em área crítica - TAG ARM-ALMOX-000987654321", client: "Companhia Brasileira de Operações Industriais, Logística, Manutenção e Serviços Técnicos Integrados LTDA", address: "Rodovia Estadual PA-160, Complexo Operacional Norte, Bloco Administrativo Central, Sala de Controle Técnico, Parauapebas-PA", location: "Setor de armazenamento químico, corredor técnico norte" },
  {
    ...baseCiper,
    slug: "05-outro-tenant-com-logo",
    tenantId: "tenant-demonstracao-logo",
    primary: "#0f766e",
    dark: "#115e59",
    secondary: "#2563eb",
    accent: "#f97316",
    publicBaseUrl: "https://validar.atenza.digital",
    title: "Certificado de Execução",
    number: "CERT-DEMO-001/2026",
    osId: "OS-DEMO-001",
    osNumber: "OS-DEMO-001",
    emitter: "Empresa Demonstração de Serviços Técnicos LTDA",
    logo: demoLogo,
    art: "",
    seloUrl: "",
    logoUrl: "",
    assinaturaUrl: "",
    assinaturaModo: "linha",
    responsavel: "Marina Torres",
    cargo: "Responsável técnica",
    registro: "CRT-000123",
    client: "Cliente Demonstração Norte LTDA",
    cnpj: "11.222.333/0001-44",
    address: "Av. das Empresas, 1000 - Belém-PA",
    location: "Unidade de demonstração",
    service: "Sanitização técnica de ambiente administrativo",
    licenses: [{ titulo: "ALVARÁ", valor: "ALV-2026-001" }, { titulo: "VIG. SANITÁRIA", valor: "VS-2026-900" }],
    footerLines: ["EMPRESA DEMONSTRAÇÃO DE SERVIÇOS TÉCNICOS LTDA CNPJ: 11.222.333/0001-44", "Av. das Empresas, 1000 - Belém-PA", "contato@empresademonstracao.com.br | (94) 99999-0000"],
    cit: "Emergência técnica: (94) 99999-0000",
    textLegal: "conforme os parâmetros documentais configurados para a empresa emissora",
    products: [],
    showProducts: false,
  },
  {
    ...baseCiper,
    slug: "06-outro-tenant-sem-logo",
    tenantId: "tenant-demonstracao-sem-logo",
    primary: "#334155",
    dark: "#1e293b",
    secondary: "#64748b",
    accent: "#dc2626",
    publicBaseUrl: "https://validar.atenza.digital",
    title: "Certificado de Serviço",
    number: "CERT-DEMO-002/2026",
    osId: "OS-DEMO-002",
    osNumber: "OS-DEMO-002",
    emitter: "Empresa Demonstração de Serviços Técnicos LTDA",
    logo: "",
    art: "",
    seloUrl: "",
    logoUrl: "",
    assinaturaUrl: "",
    assinaturaModo: "ocultar",
    responsavel: "",
    cargo: "",
    registro: "",
    client: "Cliente Sem Identidade Visual LTDA",
    cnpj: "33.444.555/0001-66",
    address: "Endereço demonstrativo - Brasil",
    location: "Unidade sem logo",
    service: "Vistoria técnica documental",
    footerLines: ["EMPRESA DEMONSTRAÇÃO DE SERVIÇOS TÉCNICOS LTDA CNPJ: 11.222.333/0001-44", "Tel.: (94) 99999-0000 | contato@empresademonstracao.com.br"],
    cit: "",
    licenses: [],
    products: [],
    showProducts: false,
    showFixText: false,
    validityDays: 0,
    textLegal: "conforme os parâmetros documentais informados pela empresa emissora",
  },
  { ...baseCiper, slug: "07-ciperprag-assinatura-imagem", number: "CERT-7307/2026", osId: "OS-2681", osNumber: "OS-2681", assinaturaModo: "imagem", assinaturaUrl: ciperSignature },
  { ...baseCiper, slug: "08-ciperprag-assinatura-linha", number: "CERT-7308/2026", osId: "OS-2682", osNumber: "OS-2682", assinaturaUrl: "", assinaturaModo: "linha" },
  { ...baseCiper, slug: "09-ciperprag-sem-assinatura", number: "CERT-7309/2026", osId: "OS-2683", osNumber: "OS-2683", assinaturaUrl: "", assinaturaModo: "ocultar", responsavel: "", cargo: "", registro: "" },
  { ...baseCiper, slug: "10-ciperprag-com-licencas", number: "CERT-7310/2026", osId: "OS-2684", osNumber: "OS-2684", licenses: ciperLicenses },
  { ...baseCiper, slug: "11-ciperprag-sem-licencas", number: "CERT-7311/2026", osId: "OS-2685", osNumber: "OS-2685", licenses: [] },
  { ...baseCiper, slug: "12-ciperprag-com-validade", number: "CERT-7312/2026", osId: "OS-2686", osNumber: "OS-2686", validityDays: 180 },
  { ...baseCiper, slug: "13-ciperprag-sem-validade", number: "CERT-7313/2026", osId: "OS-2687", osNumber: "OS-2687", validityDays: 0, service: "Relatório técnico sem validade periódica", showProducts: false, products: [] },
];

const blockedScenarios = [
  {
    slug: "bloqueado-assinatura-obrigatoria",
    reason: "Emissão bloqueada quando a política exige assinatura por imagem e nenhuma assinatura foi configurada.",
  },
  {
    slug: "bloqueado-responsavel-obrigatorio",
    reason: "Emissão bloqueada quando o responsável técnico é obrigatório e nenhum responsável foi configurado.",
  },
];

const browser = await chromium.launch({ headless: true });
const results = [];
const fontFaces = await embeddedMontserratCss();
const templateWithFonts = template.replaceAll("{{document_font_faces}}", fontFaces);
for (const scenario of scenarios) {
  results.push(await renderScenario(browser, templateWithFonts, scenario));
}
await browser.close();

const manifest = {
  generatedAt: new Date().toISOString(),
  visualStandard: "Sistema Visual de Documentos - Versão 1",
  results,
  blockedScenarios,
};

const report = [
  "# Relatório de evidências - Certificados",
  "",
  "## Cenários gerados",
  ...results.map((item) => `- ${item.slug}: ${item.title}; certificado ${item.number}; OS ${item.osNumber}; código público ${item.publicCode}; SHA-256 ${item.snapshotFingerprint}; validação ${item.validationUrl}`),
  "",
  "## Cenários bloqueados por regra de emissão",
  ...blockedScenarios.map((item) => `- ${item.slug}: ${item.reason}`),
  "",
  "## Observações técnicas",
  "- O template usa Montserrat incorporada por @font-face.",
  "- O QR Code aponta para a URL pública com código curto de autenticação.",
  "- A rastreabilidade exibe número do certificado, OS, data de execução, validade quando aplicável, código curto e impressão digital SHA-256 abreviada.",
  "- O hash HSH permanece apenas como identificador legado interno; a impressão digital SHA-256 vem do snapshot transacional.",
  "- Blocos de produtos, licenças, fotos, assinatura e validade são condicionais.",
  "- Os PDFs individuais são gerados com `tagged: true` no Playwright/Chromium; o PDF consolidado de conferência visual pode perder a marcação estrutural ao ser mesclado por pypdf.",
];

await fs.writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await fs.writeFile(path.join(outDir, "relatorio-certificados.md"), `${report.join("\n")}\n`, "utf8");
console.log(JSON.stringify({ ok: true, count: results.length, blocked: blockedScenarios.length, outDir, publicOutDir }, null, 2));
