import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as esbuild from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "docs", "cliente", "relatorios_tecnicos");
const outPdf = path.join(outDir, "relatorio-tecnico-ciperprag-amostra.pdf");
const outPng = path.join(outDir, "relatorio-tecnico-ciperprag-amostra.png");
const tmpDir = path.join(root, "tmp");

async function resolveSourceAlias(importPath) {
  const candidate = path.join(root, "src", importPath.slice(2));
  const paths = [candidate, `${candidate}.ts`, `${candidate}.tsx`, `${candidate}.js`, `${candidate}.jsx`];
  for (const filePath of paths) {
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      // Try next extension.
    }
  }
  return candidate;
}

async function loadTechnicalReportBuilder() {
  await fs.mkdir(tmpDir, { recursive: true });
  const result = await esbuild.build({
    entryPoints: [path.join(root, "src/lib/technicalReportPrint.ts")],
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    loader: { ".png": "dataurl", ".jpg": "dataurl", ".jpeg": "dataurl", ".ttf": "dataurl", ".woff": "dataurl", ".woff2": "dataurl" },
    plugins: [{
      name: "local-at-alias",
      setup(build) {
        build.onResolve({ filter: /^@\// }, async (args) => ({ path: await resolveSourceAlias(args.path) }));
      },
    }],
  });
  const bundlePath = path.join(tmpDir, "evidence-technical-report.bundle.mjs");
  await fs.writeFile(bundlePath, result.outputFiles[0].text, "utf8");
  const module = await import(`${pathToFileURL(bundlePath).href}?v=${Date.now()}`);
  return module.buildTechnicalReportHtml;
}

async function dataUriFromFile(assetPath, mime = "image/png") {
  const bytes = await fs.readFile(path.join(root, assetPath));
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

function svgPhoto(label, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">
    <rect width="900" height="600" fill="${color}"/>
    <circle cx="720" cy="115" r="70" fill="rgba(255,255,255,0.24)"/>
    <path d="M95 440 C240 320 305 390 405 305 C520 206 652 276 808 172 L808 520 L95 520 Z" fill="rgba(255,255,255,0.35)"/>
    <rect x="64" y="72" width="420" height="32" rx="16" fill="rgba(255,255,255,0.18)"/>
    <rect x="64" y="124" width="300" height="22" rx="11" fill="rgba(255,255,255,0.16)"/>
    <title>${label}</title>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const sampleBootstrap = {
  companyConfig: {
    tenantSlug: "ciperprag",
    tenantNome: "Ciperprag",
    razaoSocial: "CIPERPRAG Controle de Pragas e Serviços LTDA",
    nomeFantasia: "Ciperprag Serviços",
    cnpj: "15.722.292/0001-43",
    endereco: "Av. Serra Arqueada S/N, QD QNC 205 - Parauapebas-PA",
    telefone: "(94) 99999-0000",
    email: "operacional@ciperprag.com.br",
    logoUrl: "/src/assets/logo_ciperprag.png",
    corPrimaria: "#087f5b",
    alvara: "88623",
    cr02: "023346",
    anvisa: "RDC ANVISA nº 18/2000",
    vigilanciaSanitaria: "122/2018",
    responsavelTecnico: "Aline Vieira",
    responsavelExecucao: "Aline Vieira",
    cargoResponsavel: "Responsável técnica",
    certificadoValidadePadraoDias: 30,
    certificadoConfig: {
      corPrimaria: "#087f5b",
      documentLogoLightUrl: "/src/assets/logo_ciperprag.png",
      responsavelTecnico: "Aline Vieira",
      cargoResponsavel: "Responsável técnica",
    },
  },
  services: [
    {
      id: "SRV-BEB-001",
      nome: "Coleta e Análise de Bebedouros",
      tipo: "sanitario",
      descricao:
        "Realizada coleta técnica em bebedouro, verificação visual do ponto de consumo, higienização superficial da área de coleta e registro das condições encontradas.",
      unidade: "itens",
      recorrenciaDias: 30,
      geraCertificado: true,
      validadeCertificadoDias: 30,
      produtosQuimicos: ["Álcool 70%", "Solução sanitizante neutra"],
      epis: ["Máscara PFF2", "Luva nitrílica", "Bota de segurança"],
      riscos: ["Risco biológico", "Risco químico"],
      normasAplicaveis: ["RDC ANVISA nº 18/2000", "Lei nº 5.882/1994"],
      procedimentos: ["Conferir identificação do ponto", "Higienizar área de coleta", "Registrar evidências"],
      checklistItens: ["Local identificado", "Coleta realizada", "Fotos anexadas", "Cliente orientado"],
      exigeFoto: true,
      exigeAssinatura: true,
      permiteNaoExecucao: true,
      ativo: true,
    },
  ],
  clients: [],
  contracts: [],
  schedules: [],
  orders: [],
  certificates: [],
  technicians: [],
  vehicles: [],
  allocations: [],
  contractTemplates: [],
  recurrenceSuggestions: [],
  measurements: [],
  attachments: [],
};

const sampleOs = {
  id: "OS-2677",
  numero: "OS-2677",
  clienteId: "CLI-001",
  clienteNome: "Komatsu Brasil International LTDA",
  clienteCnpj: "02.336.124/0009-25",
  clienteEndereco: "Av. Serra Arqueada S/N, QD QNC 205 - Parauapebas-PA",
  contratoId: "CT-004",
  servico: "Coleta e Análise de Bebedouros",
  tipo: "sanitario",
  tecnicoNome: "João Silva",
  equipeTecnicosNomes: ["João Silva", "Pedro Oliveira"],
  veiculoDescricao: "QRA-1234 - Fiat Fiorino",
  localExecucao: "Área administrativa",
  tags: "TAG 05",
  tagEquipamentoServico: "TAG 05",
  observacao: "Ponto higienizado e amostra coletada conforme procedimento. Cliente acompanhou a execução.",
  dataEmissao: "2026-07-01",
  dataExecucao: "2026-07-06",
  quantidade: 1,
  unidade: "item",
  status: "encerrada",
  fotos: [svgPhoto("Bebedouro - antes", "#087f5b"), svgPhoto("Coleta técnica", "#0f766e"), svgPhoto("Ponto finalizado", "#14532d")],
  checklistRespostas: [
    { item: "Local identificado", concluido: true, observacao: "TAG 05 confirmada." },
    { item: "Coleta realizada", concluido: true, observacao: "Amostra coletada e acondicionada." },
    { item: "Fotos anexadas", concluido: true, observacao: "Três fotos registradas." },
    { item: "Cliente orientado", concluido: true, observacao: "Orientações repassadas ao responsável local." },
  ],
};

await fs.mkdir(outDir, { recursive: true });

const logoDataUri = await dataUriFromFile("src/assets/logo_ciperprag.png");
sampleBootstrap.companyConfig.logoUrl = logoDataUri;
sampleBootstrap.companyConfig.certificadoConfig.documentLogoLightUrl = logoDataUri;

const buildTechnicalReportHtml = await loadTechnicalReportBuilder();
const html = buildTechnicalReportHtml(sampleOs, sampleBootstrap);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1240, height: 1754 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "networkidle" });
  const fontChecks = await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([400, 500, 600, 700].map((weight) => document.fonts.load(`${weight} 16px Montserrat`)));
    await document.fonts.ready;
    return [400, 500, 600, 700].map((weight) => ({ weight, loaded: document.fonts.check(`${weight} 16px Montserrat`) }));
  });
  const missingFonts = fontChecks.filter((item) => !item.loaded);
  if (missingFonts.length) {
    throw new Error(`Montserrat nao carregada no relatorio tecnico: ${missingFonts.map((item) => item.weight).join(", ")}`);
  }
  await page.pdf({
    path: outPdf,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    tagged: true,
    displayHeaderFooter: false,
  });
  await page.screenshot({ path: outPng, fullPage: true });
  await page.close();
} finally {
  await browser.close();
}

console.log(JSON.stringify({ pdf: outPdf, png: outPng }, null, 2));
