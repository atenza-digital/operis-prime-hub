import { addDays, getBootstrap, type BootstrapData, type CertificadoApp, type EmpresaConfig } from "@/lib/api";
import templateCertificado from "@/template_certificado_dinamico.html?raw";
import { documentTypographyCss } from "@/lib/documentFontFaces";
import QRCode from "qrcode";

type RecordLike = Record<string, unknown>;
type LicenseItem = { titulo?: string; valor?: string };
type EvidencePhoto = { src: string; legenda?: string };

function fmtDate(date: string) {
  if (!date) return "-";
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function firstBool(fallback: boolean, ...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "boolean") return value;
  }
  return fallback;
}

function firstNumber(fallback: number, ...values: unknown[]) {
  for (const value of values) {
    const numberValue = Number(value);
    if (Number.isFinite(numberValue) && numberValue >= 0) return numberValue;
  }
  return fallback;
}

function asRecord(value: unknown): RecordLike {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RecordLike) : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function asLicenses(value: unknown): LicenseItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asRecord(item))
    .map((item) => ({ titulo: firstText(item.titulo, item.label, item.nome), valor: firstText(item.valor, item.value, item.numero) }))
    .filter((item) => item.titulo || item.valor);
}

function snapshotSection(cert: CertificadoApp, section: string) {
  return asRecord(cert.snapshotDados?.[section]);
}

function buildShortPublicCode(hash: string) {
  const clean = hash.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
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

async function sha256Hex(value: string) {
  if (!globalThis.crypto?.subtle) return "";
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fingerprintSha256(hash: string) {
  const clean = hash.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
  if (clean.length < 20) return hash;
  return `SHA-256: ${clean.slice(0, 12)}…${clean.slice(-8)}`;
}

function normalizeCertificateNumber(value: string) {
  return value
    .replace(/^\s*(certificado|cert\.?|cert)\s*(n[ºo.]*)?\s*[-.:]?\s*/i, "")
    .replace(/^\s*(certificado|cert\.?|cert)\s*(n[ºo.]*)?\s*[-.:]?\s*/i, "")
    .trim();
}

function normalizeOsNumber(value: string) {
  return value
    .replace(/^\s*os\s*(n[ºo.]*)?\s*[-.:]?\s*/i, "")
    .replace(/^\s*os\s*(n[ºo.]*)?\s*[-.:]?\s*/i, "")
    .trim();
}

function renderCertificateReference(value: string) {
  const normalized = normalizeCertificateNumber(value);
  return normalized ? `Certificado nº ${normalized}` : "";
}

function renderOsReference(value: string) {
  const normalized = normalizeOsNumber(value);
  return normalized ? `OS nº ${normalized}` : "";
}

function renderIssuerBrand(logoSrc: string, empresaNome: string) {
  if (logoSrc) return `<img class="logo-principal" src="${escapeHtml(logoSrc)}" alt="${escapeHtml(empresaNome || "Empresa emissora")}" />`;
  if (!empresaNome) return "";
  return `<div class="marca-textual">${escapeHtml(empresaNome)}</div>`;
}

export function resolveCertificateWatermarkUrl(config: RecordLike, snapshotEmpresa: RecordLike) {
  // A marca-d'agua usa somente o icone do tenant. A logo documental nao deve
  // ocupar este papel, pois altera o modelo aprovado e pode exibir texto no fundo.
  return firstText(config.brandIconUrl, snapshotEmpresa.brandIconUrl);
}

function isValidEvidenceImage(foto: unknown) {
  if (typeof foto !== "string") return false;
  const value = foto.trim();
  if (!value || value.endsWith(",")) return false;
  if (value.startsWith("data:image") && value.split(",")[1]?.trim().length < 20) return false;
  return true;
}

function buildVerificationUrl(publicCode: string, publicBaseUrl: string) {
  const cleanBase = publicBaseUrl.replace(/\/+$/, "");
  return `${cleanBase}/validar-certificado/${encodeURIComponent(publicCode)}`;
}

function resolvePublicBaseUrl(config: RecordLike, snapshotCertificado: RecordLike) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const safeOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(origin) ? "" : origin;
  // When printing from the tenant's public URL, prefer that origin over an
  // older snapshot so QR codes remain valid after a deployment or domain move.
  return firstText(safeOrigin, config.publicBaseUrl, snapshotCertificado.publicBaseUrl);
}

function toBase64Img(url: string): Promise<string> {
  if (!url) return Promise.resolve("");
  if (url.startsWith("data:")) return Promise.resolve(url);
  return new Promise((resolve) => {
    fetch(url)
      .then((response) => response.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(String(event.target?.result || url));
        reader.readAsDataURL(blob);
      })
      .catch(() => resolve(url));
  });
}

function renderGaleria(fotos: EvidencePhoto[], limiteFotos: number, exibirFotos: boolean, fotoObjectFit: string) {
  if (!exibirFotos) return "";
  const validFotos = fotos.filter((foto) => isValidEvidenceImage(foto.src)).slice(0, Math.max(0, limiteFotos));
  if (!validFotos.length) return "";
  const fitClass = fotoObjectFit === "contain" ? "fit-contain" : "fit-cover";
  return `
    <div class="gallery gallery-${validFotos.length}">
      ${validFotos
        .map(
          (foto, index) => `
            <figure class="gallery-item ${fitClass}">
              <img src="${escapeHtml(foto.src)}" alt="Evidência ${index + 1}" onerror="this.closest('.gallery-item')?.remove()" />
              ${foto.legenda ? `<figcaption>${escapeHtml(foto.legenda)}</figcaption>` : ""}
            </figure>`,
        )
        .join("")}
    </div>
  `;
}

function renderProdutos(cert: CertificadoApp, exibirProdutos: boolean) {
  if (!exibirProdutos) return "";
  const produtos = (cert.produtosDetalhados ?? []).length
    ? cert.produtosDetalhados!
    : (cert.produtosQuimicos ?? []).map((nome) => ({
        nome,
        grupoQuimico: "-",
        qtUso: "Conf. necessidade",
        diluente: "Água",
        volAplicado: "Conf. área",
        combate: "Aplicação direta",
        antidoto: "Anti-histamínico",
      }));

  if (!produtos.length) return "";

  const rows = produtos.length
    ? produtos
        .map(
          (produto) => `
            <tr>
              <td>${escapeHtml(produto.nome)}</td>
              <td>${escapeHtml(produto.grupoQuimico ?? "-")}</td>
              <td>${escapeHtml(produto.qtUso ?? "Conf. necessidade")}</td>
              <td>${escapeHtml(produto.diluente ?? "Água")}</td>
              <td>${escapeHtml(produto.volAplicado ?? "Conf. área")}</td>
              <td>${escapeHtml(produto.combate ?? "Aplicação direta")}</td>
              <td>${escapeHtml(produto.antidoto ?? "Não aplicável")}</td>
            </tr>`,
        )
        .join("")
    : "";

  return `
    <h2 class="section-title">Produtos Químicos Utilizados no Serviço</h2>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="w1">Nome</th>
            <th class="w2">Grupo Químico</th>
            <th class="w3">Qt. Uso</th>
            <th class="w4">Diluente</th>
            <th class="w5">Vol. Aplicado</th>
            <th class="w6">Combate</th>
            <th class="w7">Antídoto</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderLicencas(licencas: LicenseItem[]) {
  const validLicenses = licencas.filter((item) => item.titulo && item.valor);
  if (!validLicenses.length) return "";
  return `
    <div class="licenca-card">
      <div class="licenca-top">Esta empresa encontra-se devidamente licenciada nos seguintes órgãos</div>
      <div class="licenca-grid" style="--license-count: ${Math.min(Math.max(validLicenses.length, 1), 8)}">
        ${validLicenses
          .map(
            (item) =>
              `<div class="licenca-item"><span class="licenca-label">${escapeHtml(item.titulo || "")}</span><span class="licenca-value">${escapeHtml(item.valor || "")}</span></div>`,
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderAuthBox(qrCodeUrl: string, publicCode: string, validationUrl: string, showQr: boolean, shaFingerprint: string) {
  if (!showQr || !qrCodeUrl || !validationUrl) return "";
  return `
    <div class="auth-box-top">
      <img src="${escapeHtml(qrCodeUrl)}" alt="QR Code de validação" />
      <div class="qr-info">
        <div class="qr-title">Autenticidade</div>
        <div class="qr-hash">${escapeHtml(publicCode)}</div>
        ${shaFingerprint ? `<div class="qr-fingerprint">${escapeHtml(shaFingerprint)}</div>` : ""}
        <div class="qr-link">${escapeHtml(validationUrl)}</div>
      </div>
    </div>
  `;
}

function renderValidityBox(validadeTexto: string, showValidity: boolean) {
  if (!showValidity) return "";
  return `
    <div class="validade-box">
      <div class="label">Período de validade</div>
      <div class="value">${escapeHtml(validadeTexto)}</div>
    </div>
  `;
}

function renderTraceability(text: string) {
  if (!text) return "";
  return `
    <div class="trace-card" aria-label="Rastreabilidade do certificado">${escapeHtml(text)}</div>
  `;
}

function renderFooterBranding({ seloUrl, miniLogoUrl, assinaturaUrl, responsavel, cargo, registro, assinaturaModo }: Record<string, string>) {
  const seloHtml = seloUrl ? `<img class="brasao" src="${escapeHtml(seloUrl)}" alt="Selo institucional" />` : "";
  const miniLogoHtml = miniLogoUrl ? `<img class="mini-logo" src="${escapeHtml(miniLogoUrl)}" alt="Logo da empresa emissora" />` : "";
  const showSignature = assinaturaModo !== "ocultar" && (assinaturaUrl || responsavel || cargo || registro || assinaturaModo === "linha");
  const assinaturaImg = assinaturaUrl && assinaturaModo !== "linha" ? `<img class="assinatura-img" src="${escapeHtml(assinaturaUrl)}" alt="Assinatura do responsável técnico" />` : "";
  const assinaturaHtml = showSignature
    ? `<div class="assinatura-box">
        ${assinaturaImg}
        <div class="linha-assinatura"></div>
        ${responsavel ? `<div class="assinatura-nome">${escapeHtml(responsavel)}</div>` : ""}
        ${cargo ? `<div class="assinatura-reg">${escapeHtml(cargo)}</div>` : ""}
        ${registro ? `<div class="assinatura-reg">${escapeHtml(registro)}</div>` : ""}
      </div>`
    : "";
  const columns = [seloHtml, miniLogoHtml, assinaturaHtml].filter(Boolean);
  if (!columns.length) return "";
  return `<div class="footer-grid">${columns.map((html) => `<div class="footer-col">${html}</div>`).join("")}</div>`;
}

function renderRodape(linhas: string[], cit: string) {
  const validLines = linhas.filter(Boolean);
  if (!validLines.length && !cit) return "";
  const main = validLines[0] ? `<div class="empresa">${escapeHtml(validLines[0])}</div>` : "";
  const addresses = validLines
    .slice(1)
    .map((line) => `<span class="addr"><span class="addr-icon">•</span><span>${escapeHtml(line)}</span></span>`)
    .join('<span class="divider">|</span>');
  return `
    <div class="footer-center">
      ${main}
      ${addresses ? `<div class="footer-addresses">${addresses}</div>` : ""}
      ${cit ? `<div class="cit-bottom">${escapeHtml(cit)}</div>` : ""}
    </div>
  `;
}

function buildValidityText(dataExecucao: string, validadeDias: number) {
  const start = fmtDate(dataExecucao);
  if (!dataExecucao) return "Validade indeterminada";
  if (validadeDias > 0) return `${start} a ${fmtDate(addDays(dataExecucao, validadeDias))}`;
  return `A partir de ${start}`;
}

function normalizePhotos(fotos: string[], legends: string[]): EvidencePhoto[] {
  return fotos.map((src, index) => ({ src, legenda: firstText(legends[index]) })).filter((foto) => isValidEvidenceImage(foto.src));
}

function buildLicenses(cert: CertificadoApp, company: EmpresaConfig | null, snapshotEmpresa: RecordLike, config: RecordLike) {
  const configured = asLicenses(config.licencas);
  if (configured.length) return configured;
  const snapshotLicenses = asLicenses(snapshotEmpresa.licencas);
  if (snapshotLicenses.length) return snapshotLicenses;

  const fromFields: LicenseItem[] = [
    { titulo: "CERTIFICADO", valor: cert.numero },
    { titulo: "MTRR", valor: firstText(snapshotEmpresa.mtrr, config.mtrr) },
    { titulo: "MEIO AMBIENTE", valor: firstText(snapshotEmpresa.meioAmbiente, config.meioAmbiente) },
    { titulo: "C.R.02", valor: firstText(snapshotEmpresa.cr02, company?.cr02) },
    { titulo: "CTR02", valor: firstText(snapshotEmpresa.ctr02, config.ctr02) },
    { titulo: "ALVARÁ", valor: firstText(snapshotEmpresa.alvara, company?.alvara) },
    { titulo: "VIG. SANITÁRIA", valor: firstText(snapshotEmpresa.vigilanciaSanitaria, company?.vigilanciaSanitaria) },
  ].filter((item) => item.valor);

  return fromFields;
}

export async function imprimirCertificado(cert: CertificadoApp) {
  const bootstrap = await getBootstrap();
  const company = bootstrap.companyConfig;
  const os = bootstrap.orders.find((item) => item.id === cert.osId);
  const snapshotCertificado = snapshotSection(cert, "certificado");
  const snapshotOs = snapshotSection(cert, "os");
  const snapshotEmpresa = snapshotSection(cert, "empresa");
  const snapshotCliente = snapshotSection(cert, "cliente");
  const snapshotServico = snapshotSection(cert, "servico");
  const currentConfig = asRecord(company?.certificadoConfig);
  const snapshotConfig = asRecord(snapshotEmpresa.certificadoConfig);
  const config = { ...currentConfig, ...snapshotConfig };

  const customer = bootstrap.clients.find(
    (item) =>
      item.id === cert.clienteId ||
      item.razaoSocial === cert.clienteNome ||
      item.nomeFantasia === cert.clienteNome,
  );
  const customerAddress = customer ? [customer.endereco, customer.bairro, `${customer.municipio}-${customer.uf}`].filter(Boolean).join(", ") : "";
  const clienteNome = firstText(snapshotCliente.nome, customer?.razaoSocial, cert.clienteNome, os?.clienteNome);
  const clienteCnpj = firstText(snapshotCliente.cnpj, customer?.cnpj, os?.clienteCnpj, cert.clienteCnpj);
  const clienteEndereco = firstText(snapshotCliente.endereco, customerAddress, os?.clienteEndereco, cert.clienteEndereco);
  const clienteLogoUrl = firstText(snapshotCliente.logoUrl, customer?.logoUrl, cert.clienteLogoUrl, os?.clienteLogoUrl);
  const localExecucao = firstText(snapshotOs.localExecucao, cert.localExecucao, os?.localExecucao);
  const tagTexto = firstText(snapshotOs.tagEquipamentoServico, os?.tagEquipamentoServico);
  const servicoNome = firstText(snapshotServico.nome, cert.servico);
  const servicoTexto = tagTexto ? `${servicoNome} - ${tagTexto}` : servicoNome;
  const empresaNome = firstText(snapshotEmpresa.razaoSocial, company?.razaoSocial, company?.nomeFantasia);
  const primaryColor = firstText(config.corPrimaria, company?.corPrimaria, "#0f766e");
  const secondaryColor = firstText(config.corSecundaria, company?.corSecundaria, "#6f9dd3");
  const accentColor = firstText(config.corDestaque, company?.corDestaque, "#df2027");
  const publicBaseUrl = resolvePublicBaseUrl(config, snapshotCertificado);
  const certificateDocument = asRecord((cert as CertificadoApp & { documento?: RecordLike }).documento);
  const persistedSha256 = firstText(
    snapshotCertificado.hashSha256,
    snapshotCertificado.snapshotHashSha256,
    certificateDocument.hashSha256,
    certificateDocument.snapshotHashSha256,
  );
  const computedSnapshotHash = persistedSha256
    ? ""
    : await sha256Hex(
        JSON.stringify({
          tenant: firstText(snapshotEmpresa.tenantId, snapshotEmpresa.tenantSlug, company?.tenantSlug),
          certificado: { numero: cert.numero, hash: cert.hash },
          os: { id: cert.osId, numero: cert.osNumero || os?.numero, dataExecucao: cert.dataExecucao },
          cliente: { nome: clienteNome, cnpj: clienteCnpj, endereco: clienteEndereco },
          servico: { nome: servicoNome, tag: tagTexto },
        }),
      );
  const sha256Rastreabilidade = firstText(persistedSha256, computedSnapshotHash);
  const shaFingerprint = fingerprintSha256(sha256Rastreabilidade);
  const codigoPublico = firstText(snapshotCertificado.codigoPublico, snapshotCertificado.publicCode, config.codigoPublico, buildShortPublicCode(cert.hash));
  const verificationUrl = publicBaseUrl ? buildVerificationUrl(codigoPublico, publicBaseUrl) : "";
  const showQr = firstBool(true, config.exibirQrCode);
  const qrDataUrl = showQr && verificationUrl ? await QRCode.toDataURL(verificationUrl, { width: 104, margin: 1 }) : "";
  const limiteFotos = firstNumber(3, config.limiteFotos);
  const fotos = asStringArray(snapshotOs.fotos).length ? asStringArray(snapshotOs.fotos) : os?.fotos ?? cert.fotos ?? [];
  const fotoLegendas = asStringArray(snapshotOs.fotosLegendas);
  const fotoObjectFit = firstText(config.fotoObjectFit, config.fotoObjectFitCertificado, "cover") === "contain" ? "contain" : "cover";
  const evidencias = normalizePhotos(fotos, fotoLegendas);
  const exibirFotos = firstBool(true, config.exibirFotos);
  const exibirProdutos = firstBool(true, config.exibirProdutosQuimicos);
  const licencas = buildLicenses(cert, company, snapshotEmpresa, config);
  const validadeDias = Number(cert.validadeDias || 0);
  const exibirValidade = validadeDias > 0 && firstBool(true, config.exibirValidade, config.exibirPeriodoValidade);
  const validadeTexto = buildValidityText(cert.dataExecucao, validadeDias);
  const titulo = firstText(config.titulo, snapshotServico.tituloCertificado, snapshotServico.certificadoTitulo, "Certificado de Garantia");
  const subtitulo = firstText(config.subtitulo, config.tipo);
  const textoLegal = firstText(
    asRecord(config.textoTecnicoPorServico)[servicoNome],
    config.textoLegalPadrao,
    snapshotEmpresa.certificadoTextoLegal,
    company?.certificadoTextoLegal,
    "conforme os procedimentos técnicos aplicáveis e em conformidade com as exigências sanitárias vigentes, inclusive a RDC 652/2022 quando cabível",
  );
  const textoCertificado = `Certificamos para os devidos fins que a empresa <strong>${escapeHtml(clienteNome)}</strong> recebeu a execução do serviço de <strong>${escapeHtml(servicoTexto)}</strong>, ${escapeHtml(textoLegal)}.`;

  const logoPrincipalUrl = firstText(
    config.documentLogoLightUrl,
    config.logoPrincipalUrl,
    snapshotEmpresa.documentLogoLightUrl,
    snapshotEmpresa.logoPrincipalUrl,
    snapshotEmpresa.logoUrl,
    company?.logoUrl,
  );
  const logoSrc = await toBase64Img(logoPrincipalUrl);
  const arteFundoUrl = resolveCertificateWatermarkUrl(config, snapshotEmpresa);
  const arteFundoSrc = await toBase64Img(arteFundoUrl);
  const seloUrl = firstText(config.seloInstitucionalUrl, snapshotEmpresa.seloInstitucionalUrl);
  const seloSrc = await toBase64Img(seloUrl);
  const assinaturaUrl = firstText(config.assinaturaUrl, snapshotEmpresa.assinaturaUrl, snapshotCertificado.assinaturaUrl);
  const assinaturaSrc = await toBase64Img(assinaturaUrl);
  const assinaturaDocumentos = asRecord(config.assinaturaDocumentos);
  const assinaturaModo = firstText(assinaturaDocumentos.certificado, config.assinaturaModo, assinaturaSrc ? "imagem" : "linha");
  const responsavelObrigatorio = firstBool(true, config.responsavelTecnicoObrigatorio);
  const responsavel = firstText(config.responsavelTecnico, snapshotEmpresa.responsavelTecnico, company?.responsavelTecnico, company?.responsavelExecucao);
  const cargo = firstText(config.cargoResponsavel, snapshotEmpresa.cargoResponsavel, company?.cargoResponsavel);
  const registro = firstText(config.registroProfissional, snapshotEmpresa.registroProfissional);
  if (responsavelObrigatorio && !responsavel) {
    window.alert("Este certificado exige responsável técnico configurado antes da emissão.");
    return;
  }
  if (assinaturaModo === "obrigatoria" && !assinaturaSrc) {
    window.alert("Este certificado exige assinatura configurada antes da emissão.");
    return;
  }
  const cit = firstText(config.cit, snapshotEmpresa.telefoneEmergencia, company?.telefoneEmergencia);
  const rodapeLinhas = asStringArray(config.rodapeLinhas);
  const defaultRodape = [
    empresaNome && company?.cnpj ? `${empresaNome} CNPJ: ${company.cnpj}` : empresaNome,
    firstText(snapshotEmpresa.endereco, company?.endereco),
    [company?.telefone, company?.email].filter(Boolean).join(" | "),
  ].filter(Boolean);
  const footerLines = rodapeLinhas.length ? rodapeLinhas : defaultRodape;
  const certificadoReferencia = renderCertificateReference(cert.numero);
  const osReferencia = renderOsReference(firstText(cert.osNumero, os?.numero, snapshotOs.numero));
  const traceabilityText = [certificadoReferencia, osReferencia, `Execução: ${fmtDate(cert.dataExecucao)}`].filter(Boolean).join(" • ");
  const pdfTitle = [titulo, certificadoReferencia].filter(Boolean).join(" - ");

  const html = templateCertificado
    .replaceAll("{{document_font_faces}}", documentTypographyCss)
    .replaceAll("{{pdf_title}}", escapeHtml(pdfTitle))
    .replaceAll("{{pdf_author}}", escapeHtml(empresaNome))
    .replaceAll("{{pdf_subject}}", escapeHtml(servicoTexto))
    .replaceAll("{{pdf_keywords}}", escapeHtml(`certificado, validação, ${servicoNome}, pt-BR`))
    .replaceAll("{{cor_primaria}}", escapeHtml(primaryColor))
    .replaceAll("{{cor_primaria_escura}}", escapeHtml(firstText(config.corPrimariaEscura, "#0c6c41")))
    .replaceAll("{{cor_secundaria}}", escapeHtml(secondaryColor))
    .replaceAll("{{cor_destaque}}", escapeHtml(accentColor))
    .replaceAll("{{arte_fundo_html}}", arteFundoSrc ? `<div class="left-art"><img src="${escapeHtml(arteFundoSrc)}" alt="Marca d'água do certificado" /></div>` : "")
    .replaceAll("{{emissor_marca_html}}", renderIssuerBrand(logoSrc, empresaNome))
    .replaceAll("{{validade_box_html}}", renderValidityBox(validadeTexto, exibirValidade))
    .replaceAll("{{qr_code_html}}", renderAuthBox(qrDataUrl, codigoPublico, verificationUrl, showQr, shaFingerprint))
    .replaceAll("{{certificado_titulo}}", escapeHtml(titulo))
    .replaceAll("{{certificado_subtitulo_html}}", subtitulo ? `<div class="cert-subtitle">${escapeHtml(subtitulo)}</div>` : "")
    .replaceAll("{{logo_cliente_html}}", clienteLogoUrl ? `<img class="logo-cliente" src="${escapeHtml(clienteLogoUrl)}" alt="Logo do cliente" />` : "")
    .replaceAll("{{cliente_nome}}", escapeHtml(clienteNome))
    .replaceAll("{{cliente_cnpj}}", escapeHtml(clienteCnpj))
    .replaceAll("{{cliente_endereco}}", escapeHtml(clienteEndereco))
    .replaceAll("{{local_execucao}}", escapeHtml(localExecucao))
    .replaceAll(
      "{{rastreabilidade_html}}",
      renderTraceability(traceabilityText),
    )
    .replaceAll("{{galeria_html}}", renderGaleria(evidencias, limiteFotos, exibirFotos, fotoObjectFit))
    .replaceAll("{{produtos_section_html}}", renderProdutos(cert, exibirProdutos))
    .replaceAll("{{texto_fixacao}}", escapeHtml(firstText(config.textoFixacao, snapshotEmpresa.certificadoTextoFixacao, company?.certificadoTextoFixacao, "FIXAR OBRIGATORIAMENTE EM LOCAL VISÍVEL")))
    .replaceAll("{{licencas_section_html}}", renderLicencas(licencas))
    .replaceAll("{{texto_certificado}}", textoCertificado)
    .replaceAll("{{selos_assinatura_html}}", renderFooterBranding({ seloUrl: seloSrc, miniLogoUrl: logoSrc, assinaturaUrl: assinaturaSrc, responsavel, cargo, registro, assinaturaModo }))
    .replaceAll("{{rodape_html}}", renderRodape(footerLines, cit));

  const printWindow = window.open("", "_blank", "width=1100,height=800");
  if (!printWindow) return;
  printWindow.document.write(`${html}<script>window.onload = function(){ window.print(); }</script>`);
  printWindow.document.close();
}

