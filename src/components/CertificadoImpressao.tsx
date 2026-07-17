import { addDays, getBootstrap, type BootstrapData, type CertificadoApp, type EmpresaConfig } from "@/lib/api";
import logoCiperprag from "@/assets/logo_ciperprag_certificado.png";
import brasaoPrefeitura from "@/assets/brasao_prefeitura_parauapebas.png";
import assinaturaCiperprag from "@/assets/assinatura_certificado.png";
import iconeLateralCiperprag from "@/assets/icone_lateral_certificado.png";
import templateCertificado from "@/template_certificado_dinamico.html?raw";
import QRCode from "qrcode";

type RecordLike = Record<string, unknown>;
type LicenseItem = { titulo?: string; valor?: string };

const CIPERPRAG_CNPJ = "15.722.292/0001-43";
const CIPERPRAG_PUBLIC_BASE_URL = "http://89.116.214.65:3010";

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

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function isCiperpragTenant(company: EmpresaConfig | null, snapshotEmpresa: RecordLike) {
  const slug = firstText(company?.tenantSlug, snapshotEmpresa.tenantSlug);
  const cnpj = firstText(snapshotEmpresa.cnpj, company?.cnpj);
  const name = firstText(snapshotEmpresa.razaoSocial, company?.razaoSocial, company?.nomeFantasia);
  return slug === "ciperprag" || cnpj === CIPERPRAG_CNPJ || normalizeText(name).includes("ciperprag");
}

function buildInitialsLogo(name: string, primaryColor: string) {
  const initials = (name || "Empresa")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "EM";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="140" viewBox="0 0 360 140"><rect width="360" height="140" rx="24" fill="#ffffff"/><circle cx="78" cy="70" r="42" fill="${primaryColor}"/><text x="78" y="84" text-anchor="middle" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#ffffff">${initials}</text><text x="140" y="62" font-family="Arial, sans-serif" font-size="28" font-weight="800" fill="#111827">${escapeHtml(name || "Empresa")}</text><text x="140" y="92" font-family="Arial, sans-serif" font-size="16" fill="#475569">Certificado técnico</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function isValidEvidenceImage(foto: unknown) {
  if (typeof foto !== "string") return false;
  const value = foto.trim();
  if (!value || value.endsWith(",")) return false;
  if (value.startsWith("data:image") && value.split(",")[1]?.trim().length < 20) return false;
  return true;
}

function buildVerificationUrl(hash: string, publicBaseUrl: string) {
  const cleanBase = publicBaseUrl.replace(/\/+$/, "");
  return `${cleanBase}/validar-certificado/${encodeURIComponent(hash)}`;
}

function resolvePublicBaseUrl(config: RecordLike, snapshotCertificado: RecordLike, isCiperprag: boolean) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const safeOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(origin) ? "" : origin;
  return firstText(config.publicBaseUrl, snapshotCertificado.publicBaseUrl, safeOrigin, isCiperprag ? CIPERPRAG_PUBLIC_BASE_URL : "");
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

function renderGaleria(fotos: unknown[], limiteFotos: number, exibirFotos: boolean) {
  if (!exibirFotos) return "";
  const validFotos = fotos.filter(isValidEvidenceImage).slice(0, Math.max(0, limiteFotos));
  if (!validFotos.length) return "";
  return `
    <div class="gallery gallery-${validFotos.length}">
      ${validFotos
        .map(
          (foto, index) =>
            `<div class="gallery-item"><img src="${escapeHtml(String(foto))}" alt="Evidência ${index + 1}" onerror="this.closest('.gallery-item')?.remove()" /></div>`,
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
    : `<tr><td colspan="7" class="empty-row">Não aplicável para este serviço.</td></tr>`;

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
  if (!licencas.length) return "";
  return `
    <div class="licenca-card">
      <div class="licenca-top">Esta empresa encontra-se devidamente licenciada nos seguintes órgãos</div>
      <div class="licenca-grid" style="--license-count: ${Math.min(Math.max(licencas.length, 1), 8)}">
        ${licencas.map((item) => `<div><strong>${escapeHtml(item.titulo || "-")}</strong><br>${escapeHtml(item.valor || "Não informado")}</div>`).join("")}
      </div>
    </div>
  `;
}

function renderAuthBox(qrCodeUrl: string, hash: string, validationUrl: string, showQr: boolean) {
  if (!showQr || !qrCodeUrl || !validationUrl) return "";
  return `
    <div class="auth-box-top">
      <img src="${escapeHtml(qrCodeUrl)}" alt="QR Code de validação" />
      <div class="qr-info">
        <div class="qr-title">Autenticidade</div>
        <div class="qr-hash">${escapeHtml(hash)}</div>
        <div class="qr-link">${escapeHtml(validationUrl)}</div>
      </div>
    </div>
  `;
}

function renderFooterBranding({ seloUrl, miniLogoUrl, assinaturaUrl, responsavel, cargo, registro }: Record<string, string>) {
  const seloHtml = seloUrl ? `<img class="brasao" src="${escapeHtml(seloUrl)}" alt="Selo institucional" />` : "";
  const miniLogoHtml = miniLogoUrl ? `<img class="mini-logo" src="${escapeHtml(miniLogoUrl)}" alt="Logo da empresa emissora" />` : "";
  const assinaturaImg = assinaturaUrl ? `<img class="assinatura-img" src="${escapeHtml(assinaturaUrl)}" alt="Assinatura do responsável técnico" />` : "";
  return `
    <div class="footer-grid">
      <div class="footer-col">${seloHtml}</div>
      <div class="footer-col">${miniLogoHtml}</div>
      <div class="footer-col">
        <div class="assinatura-box">
          ${assinaturaImg}
          <div class="linha-assinatura"></div>
          <div class="assinatura-nome">${escapeHtml(responsavel || "Responsável técnico não configurado")}</div>
          ${cargo ? `<div class="assinatura-reg">${escapeHtml(cargo)}</div>` : ""}
          ${registro ? `<div class="assinatura-reg">${escapeHtml(registro)}</div>` : ""}
        </div>
      </div>
    </div>
  `;
}

function renderRodape(linhas: string[], cit: string, hash: string, templateVersao: string) {
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
      <div class="microtext">Código ${escapeHtml(hash)} · Template ${escapeHtml(templateVersao || "saas-tenant-v1")}</div>
    </div>
  `;
}

function buildValidityText(dataExecucao: string, validadeDias: number) {
  const start = fmtDate(dataExecucao);
  if (!dataExecucao) return "Validade indeterminada";
  if (validadeDias > 0) return `${start} a ${fmtDate(addDays(dataExecucao, validadeDias))}`;
  return `A partir de ${start}`;
}

function buildLicenses(cert: CertificadoApp, company: EmpresaConfig | null, snapshotEmpresa: RecordLike, config: RecordLike, isCiperprag: boolean) {
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

  if (fromFields.length > 1) return fromFields;
  if (!isCiperprag) return fromFields;

  return [
    { titulo: "CERTIFICADO", valor: cert.numero },
    { titulo: "MTRR", valor: "151012245873" },
    { titulo: "MEIO AMBIENTE", valor: "Nº102/2024" },
    { titulo: "C.R.02", valor: "1611984/2025" },
    { titulo: "CTR02", valor: "1657521/2024" },
    { titulo: "ALVARÁ", valor: "00060/2025" },
    { titulo: "VIG. SANITÁRIA", valor: "VSP-2025-4432" },
  ];
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
  const isCiperprag = isCiperpragTenant(company, snapshotEmpresa);

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
  const empresaNome = firstText(snapshotEmpresa.razaoSocial, company?.razaoSocial, company?.nomeFantasia, isCiperprag ? "CIPERPRAG SERVIÇOS LTDA" : "");
  const primaryColor = firstText(config.corPrimaria, company?.corPrimaria, isCiperprag ? "#169556" : "#0f766e");
  const secondaryColor = firstText(config.corSecundaria, company?.corSecundaria, "#6f9dd3");
  const accentColor = firstText(config.corDestaque, company?.corDestaque, "#df2027");
  const publicBaseUrl = resolvePublicBaseUrl(config, snapshotCertificado, isCiperprag);
  const verificationUrl = publicBaseUrl ? buildVerificationUrl(cert.hash, publicBaseUrl) : "";
  const showQr = firstBool(true, config.exibirQrCode);
  const qrDataUrl = showQr && verificationUrl ? await QRCode.toDataURL(verificationUrl, { width: 104, margin: 1 }) : "";
  const limiteFotos = firstNumber(3, config.limiteFotos);
  const fotos = asStringArray(snapshotOs.fotos).length ? asStringArray(snapshotOs.fotos) : os?.fotos ?? cert.fotos ?? [];
  const exibirFotos = firstBool(true, config.exibirFotos);
  const exibirProdutos = firstBool(true, config.exibirProdutosQuimicos);
  const licencas = buildLicenses(cert, company, snapshotEmpresa, config, isCiperprag);
  const validadeTexto = buildValidityText(cert.dataExecucao, Number(cert.validadeDias || 0));
  const titulo = firstText(config.titulo, "Certificado de Garantia");
  const subtitulo = firstText(config.subtitulo, config.tipo);
  const templateVersao = firstText(snapshotCertificado.templateVersao, config.templateVersao, "saas-tenant-v1");
  const textoLegal = firstText(
    asRecord(config.textoTecnicoPorServico)[servicoNome],
    config.textoLegalPadrao,
    snapshotEmpresa.certificadoTextoLegal,
    company?.certificadoTextoLegal,
    "conforme os procedimentos técnicos aplicáveis e em conformidade com as exigências sanitárias vigentes, inclusive a RDC 652/2022 quando cabível",
  );
  const textoCertificado = `Certificamos para os devidos fins que a empresa <strong>${escapeHtml(clienteNome)}</strong> recebeu a execução do serviço de <strong>${escapeHtml(servicoTexto)}</strong>, ${escapeHtml(textoLegal)}.`;

  const logoPrincipalUrl = firstText(config.logoPrincipalUrl, snapshotEmpresa.logoUrl, company?.logoUrl, isCiperprag ? logoCiperprag : "");
  const logoSrc = await toBase64Img(logoPrincipalUrl || buildInitialsLogo(empresaNome || "Empresa", primaryColor));
  const arteFundoUrl = firstText(config.arteFundoUrl, isCiperprag ? iconeLateralCiperprag : "");
  const arteFundoSrc = await toBase64Img(arteFundoUrl);
  const seloUrl = firstText(config.seloInstitucionalUrl, isCiperprag ? brasaoPrefeitura : "");
  const seloSrc = await toBase64Img(seloUrl);
  const assinaturaUrl = firstText(config.assinaturaUrl, isCiperprag ? assinaturaCiperprag : "");
  const assinaturaSrc = await toBase64Img(assinaturaUrl);
  const responsavel = firstText(config.responsavelTecnico, snapshotEmpresa.responsavelTecnico, company?.responsavelTecnico, company?.responsavelExecucao, isCiperprag ? "Aline Costa Vieira" : "");
  const cargo = firstText(config.cargoResponsavel, snapshotEmpresa.cargoResponsavel, company?.cargoResponsavel, isCiperprag ? "Diretora / Resp. Técnico" : "");
  const registro = firstText(config.registroProfissional, snapshotEmpresa.registroProfissional, isCiperprag ? "CRT02-87963930253" : "");
  const cit = firstText(config.cit, snapshotEmpresa.telefoneEmergencia, company?.telefoneEmergencia, isCiperprag ? "CIT - CENTRO DE INFORMAÇÕES TOXICOLÓGICAS DE BELÉM: 0800-7226001" : "");
  const rodapeLinhas = asStringArray(config.rodapeLinhas);
  const defaultRodape = [
    empresaNome && company?.cnpj ? `${empresaNome} CNPJ: ${company.cnpj}` : empresaNome,
    firstText(snapshotEmpresa.endereco, company?.endereco),
    [company?.telefone, company?.email].filter(Boolean).join(" | "),
  ].filter(Boolean);
  const ciperpragRodape = [
    "CIPERPRAG SERVIÇOS LTDA CNPJ: 15.722.292/0001-43",
    "Rua Topázio Qd 11 Lote 03, Vale dos Carajás, Parauapebas - PA",
    "Rua Tiradentes, nº 190 - Centro, Rondon do Pará - PA",
  ];
  const footerLines = rodapeLinhas.length ? rodapeLinhas : isCiperprag ? ciperpragRodape : defaultRodape;

  const html = templateCertificado
    .replaceAll("{{cor_primaria}}", escapeHtml(primaryColor))
    .replaceAll("{{cor_primaria_escura}}", escapeHtml(firstText(config.corPrimariaEscura, "#0c6c41")))
    .replaceAll("{{cor_secundaria}}", escapeHtml(secondaryColor))
    .replaceAll("{{cor_destaque}}", escapeHtml(accentColor))
    .replaceAll("{{arte_fundo_html}}", arteFundoSrc ? `<div class="left-art"><img src="${escapeHtml(arteFundoSrc)}" alt="Marca d'água do certificado" /></div>` : "")
    .replaceAll("{{logo_principal}}", logoSrc)
    .replaceAll("{{logo_principal_alt}}", escapeHtml(empresaNome || "Empresa emissora"))
    .replaceAll("{{validade_texto}}", escapeHtml(validadeTexto))
    .replaceAll("{{qr_code_html}}", renderAuthBox(qrDataUrl, cert.hash, verificationUrl, showQr))
    .replaceAll("{{certificado_titulo}}", escapeHtml(titulo))
    .replaceAll("{{certificado_subtitulo_html}}", subtitulo ? `<div class="cert-subtitle">${escapeHtml(subtitulo)}</div>` : "")
    .replaceAll("{{logo_cliente_html}}", clienteLogoUrl ? `<img class="logo-cliente" src="${escapeHtml(clienteLogoUrl)}" alt="Logo do cliente" />` : "")
    .replaceAll("{{cliente_nome}}", escapeHtml(clienteNome))
    .replaceAll("{{cliente_cnpj}}", escapeHtml(clienteCnpj))
    .replaceAll("{{cliente_endereco}}", escapeHtml(clienteEndereco))
    .replaceAll("{{local_execucao}}", escapeHtml(localExecucao))
    .replaceAll("{{galeria_html}}", renderGaleria(fotos, limiteFotos, exibirFotos))
    .replaceAll("{{produtos_section_html}}", renderProdutos(cert, exibirProdutos))
    .replaceAll("{{texto_fixacao}}", escapeHtml(firstText(config.textoFixacao, snapshotEmpresa.certificadoTextoFixacao, company?.certificadoTextoFixacao, "FIXAR OBRIGATORIAMENTE EM LOCAL VISÍVEL")))
    .replaceAll("{{licencas_section_html}}", renderLicencas(licencas))
    .replaceAll("{{texto_certificado}}", textoCertificado)
    .replaceAll("{{selos_assinatura_html}}", renderFooterBranding({ seloUrl: seloSrc, miniLogoUrl: logoSrc, assinaturaUrl: assinaturaSrc, responsavel, cargo, registro }))
    .replaceAll("{{rodape_html}}", renderRodape(footerLines, cit, cert.hash, templateVersao));

  const printWindow = window.open("", "_blank", "width=1100,height=800");
  if (!printWindow) return;
  printWindow.document.write(`${html}<script>window.onload = function(){ window.print(); }</script>`);
  printWindow.document.close();
}
