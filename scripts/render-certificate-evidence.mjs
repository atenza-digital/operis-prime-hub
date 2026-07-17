import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import { chromium } from "playwright";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(rootDir, "docs/evidencias/certificado_saas");
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

function initialsLogo(name, color = "#0f766e") {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "EM";
  return svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="360" height="140" viewBox="0 0 360 140"><rect width="360" height="140" rx="24" fill="#ffffff"/><circle cx="78" cy="70" r="42" fill="${color}"/><text x="78" y="84" text-anchor="middle" font-family="Arial" font-size="38" font-weight="700" fill="#fff">${initials}</text><text x="140" y="62" font-family="Arial" font-size="28" font-weight="800" fill="#111827">${escapeHtml(name)}</text><text x="140" y="92" font-family="Arial" font-size="16" fill="#475569">Certificado técnico</text></svg>`);
}

function evidencePhoto(label, color) {
  return svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="520" height="300" viewBox="0 0 520 300"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="#0f172a"/></linearGradient></defs><rect width="520" height="300" fill="url(#g)"/><circle cx="96" cy="82" r="34" fill="rgba(255,255,255,.25)"/><rect x="54" y="145" width="412" height="72" rx="16" fill="rgba(255,255,255,.86)"/><text x="260" y="188" text-anchor="middle" font-family="Arial" font-size="30" font-weight="800" fill="#0f172a">${escapeHtml(label)}</text><text x="260" y="230" text-anchor="middle" font-family="Arial" font-size="18" fill="#e2e8f0">Evidência dinâmica da OS</text></svg>`);
}

function productRows(products) {
  const rows = products.length
    ? products
        .map(
          (item) => `<tr><td>${escapeHtml(item.nome)}</td><td>${escapeHtml(item.grupo)}</td><td>${escapeHtml(item.qt)}</td><td>${escapeHtml(item.diluente)}</td><td>${escapeHtml(item.volume)}</td><td>${escapeHtml(item.combate)}</td><td>${escapeHtml(item.antidoto)}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="7" class="empty-row">Não aplicável para este serviço.</td></tr>`;

  return `<h2 class="section-title">Produtos Químicos Utilizados no Serviço</h2><div class="table-wrap"><table><thead><tr><th class="w1">Nome</th><th class="w2">Grupo Químico</th><th class="w3">Qt. Uso</th><th class="w4">Diluente</th><th class="w5">Vol. Aplicado</th><th class="w6">Combate</th><th class="w7">Antídoto</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function licensesHtml(items) {
  if (!items.length) return "";
  return `<div class="licenca-card"><div class="licenca-top">Esta empresa encontra-se devidamente licenciada nos seguintes órgãos</div><div class="licenca-grid" style="--license-count: ${Math.min(Math.max(items.length, 1), 8)}">${items.map((item) => `<div><strong>${escapeHtml(item.titulo)}</strong><br>${escapeHtml(item.valor || "Não informado")}</div>`).join("")}</div></div>`;
}

function photosHtml(photos) {
  if (!photos.length) return "";
  return `<div class="gallery gallery-${photos.length}">${photos.slice(0, 3).map((photo, index) => `<div class="gallery-item"><img src="${photo}" alt="Evidência ${index + 1}" /></div>`).join("")}</div>`;
}

function footerBranding({ seloUrl = "", logoUrl = "", assinaturaUrl = "", responsavel = "", cargo = "", registro = "" }) {
  return `<div class="footer-grid"><div class="footer-col">${seloUrl ? `<img class="brasao" src="${seloUrl}" alt="Selo institucional" />` : ""}</div><div class="footer-col">${logoUrl ? `<img class="mini-logo" src="${logoUrl}" alt="Logo" />` : ""}</div><div class="footer-col"><div class="assinatura-box">${assinaturaUrl ? `<img class="assinatura-img" src="${assinaturaUrl}" alt="Assinatura" />` : ""}<div class="linha-assinatura"></div><div class="assinatura-nome">${escapeHtml(responsavel || "Responsável técnico não configurado")}</div>${cargo ? `<div class="assinatura-reg">${escapeHtml(cargo)}</div>` : ""}${registro ? `<div class="assinatura-reg">${escapeHtml(registro)}</div>` : ""}</div></div></div>`;
}

function footerHtml({ lines, cit, hash, version }) {
  const [main, ...rest] = lines.filter(Boolean);
  return `<div class="footer-center">${main ? `<div class="empresa">${escapeHtml(main)}</div>` : ""}${rest.length ? `<div class="footer-addresses">${rest.map((line) => `<span class="addr"><span class="addr-icon">•</span><span>${escapeHtml(line)}</span></span>`).join('<span class="divider">|</span>')}</div>` : ""}${cit ? `<div class="cit-bottom">${escapeHtml(cit)}</div>` : ""}<div class="microtext">Código ${escapeHtml(hash)} · Template ${escapeHtml(version)}</div></div>`;
}

async function renderScenario(browser, template, scenario) {
  const hash = scenario.hash || `HSH-2026-${scenario.slug.toUpperCase()}`;
  const validationUrl = `${scenario.publicBaseUrl.replace(/\/+$/, "")}/validar-certificado/${hash}`;
  const qr = scenario.showQr === false ? "" : await QRCode.toDataURL(validationUrl, { width: 104, margin: 1 });
  const qrHtml = qr
    ? `<div class="auth-box-top"><img src="${qr}" alt="QR Code de validação" /><div class="qr-info"><div class="qr-title">Autenticidade</div><div class="qr-hash">${hash}</div><div class="qr-link">${validationUrl}</div></div></div>`
    : "";

  const html = template
    .replaceAll("{{cor_primaria}}", scenario.primary)
    .replaceAll("{{cor_primaria_escura}}", scenario.dark)
    .replaceAll("{{cor_secundaria}}", scenario.secondary)
    .replaceAll("{{cor_destaque}}", scenario.accent)
    .replaceAll("{{arte_fundo_html}}", scenario.art ? `<div class="left-art"><img src="${scenario.art}" alt="Marca d'água" /></div>` : "")
    .replaceAll("{{logo_principal}}", scenario.logo)
    .replaceAll("{{logo_principal_alt}}", escapeHtml(scenario.emitter))
    .replaceAll("{{validade_texto}}", escapeHtml(scenario.validity))
    .replaceAll("{{qr_code_html}}", qrHtml)
    .replaceAll("{{certificado_titulo}}", escapeHtml(scenario.title))
    .replaceAll("{{certificado_subtitulo_html}}", scenario.subtitle ? `<div class="cert-subtitle">${escapeHtml(scenario.subtitle)}</div>` : "")
    .replaceAll("{{logo_cliente_html}}", scenario.clientLogo ? `<img class="logo-cliente" src="${scenario.clientLogo}" alt="Logo do cliente" />` : "")
    .replaceAll("{{cliente_nome}}", escapeHtml(scenario.client))
    .replaceAll("{{cliente_cnpj}}", escapeHtml(scenario.cnpj))
    .replaceAll("{{cliente_endereco}}", escapeHtml(scenario.address))
    .replaceAll("{{local_execucao}}", escapeHtml(scenario.location))
    .replaceAll("{{galeria_html}}", photosHtml(scenario.photos || []))
    .replaceAll("{{produtos_section_html}}", productRows(scenario.products || []))
    .replaceAll("{{texto_fixacao}}", escapeHtml(scenario.fixText))
    .replaceAll("{{licencas_section_html}}", licensesHtml(scenario.licenses || []))
    .replaceAll("{{texto_certificado}}", scenario.text)
    .replaceAll("{{selos_assinatura_html}}", footerBranding(scenario))
    .replaceAll("{{rodape_html}}", footerHtml({ lines: scenario.footerLines, cit: scenario.cit, hash, version: scenario.version }));

  const page = await browser.newPage({ viewport: { width: 1754, height: 1240 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "networkidle" });
  const pdfPath = path.join(outDir, `${scenario.slug}.pdf`);
  const pngPath = path.join(outDir, `${scenario.slug}.png`);
  await page.pdf({ path: pdfPath, format: "A4", landscape: true, printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await page.screenshot({ path: pngPath, fullPage: true });
  await page.close();
  return { pdfPath, pngPath, validationUrl };
}

await fs.mkdir(outDir, { recursive: true });
const template = await fs.readFile(templatePath, "utf8");
const ciperLogo = await dataUri("src/assets/logo_ciperprag_certificado.png");
const ciperArt = await dataUri("src/assets/icone_lateral_certificado.png");
const ciperSeal = await dataUri("src/assets/brasao_prefeitura_parauapebas.png");
const ciperSignature = await dataUri("src/assets/assinatura_certificado.png");
const demoLogo = initialsLogo("Empresa Alfa Serviços", "#0f766e");
const clientLogo = initialsLogo("Komatsu", "#334155");
const photos = [evidencePhoto("Foto 1", "#0f766e"), evidencePhoto("Foto 2", "#1d4ed8"), evidencePhoto("Foto 3", "#b45309")];
const products = [
  { nome: "Gel Inseticida Maxforce", grupo: "Neonicotinoide", qt: "Conforme infestação", diluente: "Não aplicável", volume: "Iscagem pontual", combate: "Baratas e insetos rasteiros", antidoto: "Tratamento sintomático" },
  { nome: "Cipermetrina 25% CE", grupo: "Piretroide", qt: "Conforme rótulo", diluente: "Água", volume: "Conforme área tratada", combate: "Insetos rasteiros e voadores", antidoto: "Tratamento sintomático" },
  { nome: "Raticida Brodifacoum 0,005%", grupo: "Anticoagulante", qt: "Conforme mapeamento", diluente: "Não aplicável", volume: "Porta-iscas", combate: "Roedores", antidoto: "Vitamina K1" },
];

const baseCiper = {
  primary: "#169556",
  dark: "#0c6c41",
  secondary: "#6f9dd3",
  accent: "#df2027",
  publicBaseUrl: "http://89.116.214.65:3010",
  title: "Certificado de Garantia",
  subtitle: "",
  emitter: "CIPERPRAG SERVIÇOS LTDA",
  logo: ciperLogo,
  art: ciperArt,
  seloUrl: ciperSeal,
  assinaturaUrl: ciperSignature,
  responsavel: "Aline Costa Vieira",
  cargo: "Diretora / Resp. Técnico",
  registro: "CRT02-87963930253",
  client: "Komatsu Brasil International LTDA",
  cnpj: "02.336.124/0009-25",
  address: "Av. Serra Arqueada S/N, QD QNC 205, Nova Carajás, Parauapebas-PA",
  location: "Galpão Norte",
  validity: "22/06/2026 a 22/07/2026",
  fixText: "FIXAR OBRIGATORIAMENTE EM LOCAL VISÍVEL",
  licenses: [
    { titulo: "CERTIFICADO", valor: "7303/2026" },
    { titulo: "MTRR", valor: "151012245873" },
    { titulo: "MEIO AMBIENTE", valor: "Nº102/2024" },
    { titulo: "C.R.02", valor: "1611984/2025" },
    { titulo: "CTR02", valor: "1657521/2024" },
    { titulo: "ALVARÁ", valor: "00060/2025" },
    { titulo: "VIG. SANITÁRIA", valor: "VSP-2025-4432" },
  ],
  text: "Certificamos para os devidos fins que a empresa <strong>Komatsu Brasil International LTDA</strong> recebeu a execução do serviço de <strong>Controle Integrado de Pragas - ARM-99</strong>, conforme os procedimentos técnicos aplicáveis e em conformidade com as exigências sanitárias vigentes, inclusive a RDC 652/2022 quando cabível.",
  footerLines: [
    "CIPERPRAG SERVIÇOS LTDA CNPJ: 15.722.292/0001-43",
    "Rua Topázio Qd 11 Lote 03, Vale dos Carajás, Parauapebas - PA",
    "Rua Tiradentes, nº 190 - Centro, Rondon do Pará - PA",
  ],
  cit: "CIT - CENTRO DE INFORMAÇÕES TOXICOLÓGICAS DE BELÉM: 0800-7226001",
  version: "saas-tenant-v1",
};

const scenarios = [
  { ...baseCiper, slug: "01-ciperprag-produtos", products, photos: [], clientLogo },
  { ...baseCiper, slug: "02-ciperprag-sem-produtos", products: [], photos: [], client: "República Administrativa", cnpj: "11.222.333/0001-44", location: "Área administrativa", text: "Certificamos para os devidos fins que a empresa <strong>República Administrativa</strong> recebeu a execução do serviço de <strong>Coleta de água em bebedouro - TAG 05</strong>, conforme os procedimentos técnicos aplicáveis." },
  { ...baseCiper, slug: "03-ciperprag-tres-fotos", products, photos },
  { ...baseCiper, slug: "04-ciperprag-sem-fotos", products, photos: [] },
  { ...baseCiper, slug: "05-ciperprag-nomes-longos", products, photos: [], client: "Companhia Brasileira de Operações Industriais, Logística, Manutenção e Serviços Técnicos Integrados LTDA", address: "Rodovia Estadual PA-160, Complexo Operacional Norte, Bloco Administrativo Central, Sala de Controle Técnico, Parauapebas-PA", location: "Setor de armazenamento químico, corredor técnico norte, plataforma elevada de acesso restrito" },
  {
    ...baseCiper,
    slug: "06-outro-tenant-com-logo",
    primary: "#0f766e",
    dark: "#115e59",
    secondary: "#2563eb",
    accent: "#f97316",
    publicBaseUrl: "https://validar.atenza.digital",
    emitter: "Empresa Alfa Serviços Técnicos LTDA",
    logo: demoLogo,
    art: "",
    seloUrl: "",
    assinaturaUrl: "",
    responsavel: "Marina Torres",
    cargo: "Responsável Técnica",
    registro: "CRT-000123",
    client: "Cliente Demonstração Norte LTDA",
    cnpj: "11.222.333/0001-44",
    address: "Av. das Empresas, 1000 - Belém-PA",
    location: "Unidade de demonstração",
    licenses: [{ titulo: "ALVARÁ", valor: "ALV-2026-001" }, { titulo: "VIG. SANITÁRIA", valor: "VS-2026-900" }],
    footerLines: ["EMPRESA ALFA SERVIÇOS TÉCNICOS LTDA CNPJ: 11.222.333/0001-44", "Av. das Empresas, 1000 - Belém-PA", "contato@empresaalfa.com.br | (91) 99999-0000"],
    cit: "Emergência técnica: (91) 99999-0000",
    text: "Certificamos que o cliente recebeu a execução do serviço técnico descrito, conforme os parâmetros configurados para este tenant.",
  },
  {
    ...baseCiper,
    slug: "07-outro-tenant-sem-logo",
    logo: initialsLogo("Empresa Sem Logo", "#334155"),
    art: "",
    seloUrl: "",
    assinaturaUrl: "",
    responsavel: "",
    cargo: "",
    registro: "",
    emitter: "Empresa Sem Logo LTDA",
    publicBaseUrl: "https://validar.atenza.digital",
    client: "Cliente Sem Identidade Visual LTDA",
    cnpj: "33.444.555/0001-66",
    address: "Endereço demonstrativo - Brasil",
    location: "Unidade sem logo",
    footerLines: ["EMPRESA SEM LOGO LTDA CNPJ: 22.333.444/0001-55", "Endereço demonstrativo - Brasil"],
    cit: "",
    licenses: [],
    products: [],
    photos: [],
    text: "Certificamos que o cliente recebeu a execução do serviço técnico descrito, usando fallback neutro de identidade visual.",
  },
  {
    ...baseCiper,
    slug: "08-outro-tenant-sem-assinatura",
    logo: demoLogo,
    art: "",
    seloUrl: "",
    assinaturaUrl: "",
    responsavel: "Responsável técnico não configurado",
    cargo: "",
    registro: "",
    publicBaseUrl: "https://validar.atenza.digital",
    client: "Cliente Demonstração Norte LTDA",
    cnpj: "11.222.333/0001-44",
    address: "Av. das Empresas, 1000 - Belém-PA",
    location: "Unidade de demonstração",
    footerLines: ["EMPRESA ALFA SERVIÇOS TÉCNICOS LTDA CNPJ: 11.222.333/0001-44", "Av. das Empresas, 1000 - Belém-PA"],
    cit: "",
    products,
    photos: [],
    text: "Certificamos que o cliente recebeu a execução do serviço técnico descrito, com linha de assinatura por ausência de imagem configurada.",
  },
  { ...baseCiper, slug: "09-qrcode-url-publica", products, photos: [], publicBaseUrl: "https://validar.atenza.digital" },
];

const browser = await chromium.launch({ headless: true });
const results = [];
for (const scenario of scenarios) {
  results.push(await renderScenario(browser, template, scenario));
}
await browser.close();

await fs.writeFile(path.join(outDir, "manifest.json"), JSON.stringify(results, null, 2), "utf8");
console.log(JSON.stringify({ ok: true, count: results.length, outDir }, null, 2));
