import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(rootDir, "docs/evidencias/p0-propostas");
const appUrl = process.env.FIELDOPS_PREVIEW_URL || "http://127.0.0.1:4173";

async function dataUri(assetPath, mime = "image/png") {
  const bytes = await fs.readFile(path.join(rootDir, assetPath));
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

function json(body) {
  return {
    status: 200,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(body),
  };
}

const logoUrl = await dataUri("src/assets/logo_ciperprag.png");

const companyConfig = {
  razaoSocial: "CIPERPRAG CONTROLE DE PRAGAS E SERVIÇOS LTDA",
  nomeFantasia: "Ciperprag Serviços",
  cnpj: "15.722.292/0003-05",
  endereco: "Av. Serra Arqueada S/N, QD QNC 205 - Parauapebas-PA",
  telefone: "(94) 99999-0000",
  email: "operacional@ciperprag.com.br",
  logoUrl,
  corPrimaria: "#0f7f5c",
  corSecundaria: "#475569",
  responsavelTecnico: "Aline Vieira",
  responsavelExecucao: "Aline Vieira",
  cargoResponsavel: "Responsável técnica",
};

const client = {
  id: "CLI-GMAIA",
  razaoSocial: "Construtora G-Maia S.A.",
  nomeFantasia: "G-Maia",
  cnpj: "44.555.666/0009-77",
  inscricaoEstadual: "",
  endereco: "Rua 80 S/N, Quadra 28, Lotes 12-14",
  bairro: "Jardim Canadá",
  municipio: "Parauapebas",
  uf: "PA",
  cep: "68.515-000",
  ativo: true,
  contatos: [],
  locaisExecucao: [],
  equipamentos: [],
};

const services = [
  {
    id: "SVC-CIP",
    nome: "Controle Integrado de Pragas (CIP)",
    tipo: "sanitario",
    descricao: "Programa de manejo efetivo de insetos rasteiros, roedores e vetores urbanos.",
    unidade: "visitas",
    recorrenciaDias: 30,
    geraCertificado: true,
    validadeCertificadoDias: 30,
    produtosQuimicos: [],
    epis: ["Máscara PFF2", "Luva nitrílica", "Bota de segurança"],
    riscos: [],
    normasAplicaveis: ["RDC ANVISA nº 18/2000", "Lei nº 5.882/1994"],
    procedimentos: [],
    checklistItens: [],
    exigeFoto: true,
    exigeAssinatura: true,
    permiteNaoExecucao: true,
    ativo: true,
  },
  {
    id: "SVC-CAIXA",
    nome: "Higienização de Caixas D'Água",
    tipo: "sanitario",
    descricao: "Esvaziamento, limpeza mecânica, desinfecção e emissão de certificado.",
    unidade: "limpezas",
    recorrenciaDias: 180,
    geraCertificado: true,
    validadeCertificadoDias: 180,
    produtosQuimicos: [],
    epis: [],
    riscos: [],
    normasAplicaveis: [],
    procedimentos: [],
    checklistItens: [],
    exigeFoto: true,
    exigeAssinatura: true,
    permiteNaoExecucao: true,
    ativo: true,
  },
  {
    id: "SVC-BEB",
    nome: "Coleta e Análise de Bebedouros",
    tipo: "sanitario",
    descricao: "Higienização, desinfecção e coleta de amostras de água para análise laboratorial.",
    unidade: "itens",
    recorrenciaDias: 30,
    geraCertificado: true,
    validadeCertificadoDias: 30,
    produtosQuimicos: [],
    epis: [],
    riscos: [],
    normasAplicaveis: [],
    procedimentos: [],
    checklistItens: [],
    exigeFoto: true,
    exigeAssinatura: true,
    permiteNaoExecucao: true,
    ativo: true,
  },
  {
    id: "SVC-ROCO",
    nome: "Roçagem e Limpeza de Área",
    tipo: "manutencao",
    descricao: "Roçagem mecanizada e limpeza manual de áreas externas.",
    unidade: "m²",
    recorrenciaDias: 30,
    geraCertificado: false,
    validadeCertificadoDias: 0,
    produtosQuimicos: [],
    epis: [],
    riscos: [],
    normasAplicaveis: [],
    procedimentos: [],
    checklistItens: [],
    exigeFoto: true,
    exigeAssinatura: true,
    permiteNaoExecucao: true,
    ativo: true,
  },
];

const proposal = {
  id: "TPL-PROP-GMAIA",
  numero: "PC-58/2026",
  clienteId: client.id,
  tipo: "proposta",
  servicos: [
    { servicoId: "SVC-CIP", quantidade: 12, valorUnitario: 480, frequencia: "Mensal" },
    { servicoId: "SVC-CAIXA", quantidade: 4, valorUnitario: 747.9, frequencia: "Semestral" },
    { servicoId: "SVC-BEB", quantidade: 14, valorUnitario: 355, frequencia: "Mensal" },
    { servicoId: "SVC-ROCO", quantidade: 24, valorUnitario: 150, frequencia: "Mensal" },
  ],
  vigenciaMeses: 12,
  formaPagamento: "Medição mensal, NF/Boleto e vencimento em 30 dias após emissão.",
  prazoPagamentoDias: 30,
  status: "enviado",
  dataCriacao: "2026-03-03",
  observacoes: "Proposta válida para a Construtora G-Maia conforme escopo, unidades e periodicidades indicadas.",
  titulo: "PROPOSTA TÉCNICA E COMERCIAL",
  objeto: "Serviços continuados de saúde ambiental e higienização predial.",
  validadeDias: 30,
  modalidade: "Serviços continuados",
  locaisExecucao: [
    "Rua 80 S/N, Quadra 28, Lotes 12-14, Jardim Canadá, Parauapebas-PA, 68.515-000",
  ],
  escopoTecnico: [
    "Controle integrado de pragas com inspeção, monitoramento e aplicação técnica em pontos definidos.",
    "Higienização de reservatórios com limpeza, desinfecção e emissão de certificado.",
    "Coleta e análise de água em bebedouros, conforme pontos indicados pelo cliente.",
    "Roçagem e limpeza de áreas externas, com acabamento operacional e retirada de resíduos ordinários.",
  ].join("; "),
  condicoesComerciais: [
    "Pagamento a negociar conforme aceite comercial.",
    "Prazo de pagamento: 30 dias após medição e faturamento.",
    "Validade da proposta: 30 dias corridos.",
  ].join("\n"),
};

const session = {
  token: "evidence-token",
  expiresAt: "2026-12-31T23:59:59.000Z",
  user: {
    id: "USR-ADMIN",
    nome: "Administrador Local",
    email: "admin@atenza.local",
    status: "ativo",
    senhaTemporaria: false,
    tenant: { id: "TENANT-CIP", slug: "ciperprag", nome: "Ciperprag", logoUrl },
    perfis: [{ codigo: "admin", nome: "Administrador" }],
    permissoes: [
      "dashboard.view",
      "clientes.manage",
      "servicos.manage",
      "contratos.manage",
      "configuracoes.manage",
      "agenda.manage",
      "os.manage",
      "os.close",
      "certificados.manage",
      "medicoes.manage",
      "equipes.manage",
      "usuarios.manage",
      "auditoria.view",
    ],
  },
};

const bootstrap = {
  companyConfig,
  numberingConfig: {
    osUltimo: 2677,
    osFormato: "OS-{SEQ}",
    certificadoUltimo: 58,
    certificadoFormato: "CERT-{SEQ}/{ANO}",
    contratoUltimo: 125,
    contratoFormato: "CT-{SEQ}/{ANO}",
    propostaUltimo: 58,
    propostaFormato: "PC-{SEQ}/{ANO}",
  },
  clients: [client],
  services,
  contracts: [],
  schedules: [],
  orders: [],
  certificates: [],
  technicians: [],
  vehicles: [],
  allocations: [],
  contractTemplates: [proposal],
  recurrenceSuggestions: [],
  measurements: [],
  attachments: [],
};

await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
await page.addInitScript((token) => {
  localStorage.setItem("atenza_fieldops_auth_token", token);
}, session.token);

await page.route("**/api/auth/login", async (route) => {
  await route.fulfill(json(session));
});
await page.route("**/api/auth/me", async (route) => {
  await route.fulfill(json({ ok: true, user: session.user }));
});
await page.route("**/api/public/tenant-context", async (route) => {
  await route.fulfill(json({ ok: true, tenant: { slug: "ciperprag", nome: "Ciperprag", logoUrl, corPrimaria: "#0f7f5c" } }));
});
await page.route("**/api/bootstrap", async (route) => {
  await route.fulfill(json(bootstrap));
});
await page.route("**/api/contract-templates/*/issue-document", async (route) => {
  await route.fulfill(json({
    attachment: {
      id: "ATT-PROP-001",
      entidadeTipo: "proposta",
      entidadeId: proposal.id,
      categoria: "pdf_historico",
      nomeArquivo: "proposta-pc-58-2026.pdf",
      mimeType: "application/pdf",
      hashSha256: "a".repeat(64),
      snapshotHashSha256: "b".repeat(64),
      templateCodigo: "CIPERPRAG-PROPOSTA",
      templateVersao: "1",
      imutavel: true,
      criadoEm: "2026-03-03T12:00:00.000Z",
    },
  }));
});

await page.goto(`${appUrl}/comercial/contratos`, { waitUntil: "networkidle" });
try {
  await page.waitForSelector('button[title="Imprimir"]', { timeout: 15000 });
} catch (error) {
  await page.screenshot({ path: path.join(outDir, "debug-proposta-v5-final-fail.png"), fullPage: true });
  throw error;
}
await page.click('button[title="Imprimir"]');
await page.waitForSelector(".document-print-root", { state: "attached", timeout: 15000 });
await page.locator(".document-print-root img").first().waitFor({ state: "attached", timeout: 10000 });
await page.emulateMedia({ media: "print" });
await page.evaluate(() => document.fonts?.ready);
await page.evaluate(() => {
  document.documentElement.lang = "pt-BR";
});
await page.waitForTimeout(800);

const signatureCells = page.locator('[data-testid="proposal-signature-cell"]');
if (await signatureCells.count() !== 2) {
  throw new Error("A proposta precisa renderizar exatamente duas colunas de assinatura.");
}
const signatureGeometry = await signatureCells.evaluateAll((cells) => cells.map((cell) => {
  const line = cell.firstElementChild?.getBoundingClientRect();
  const box = cell.getBoundingClientRect();
  return { lineTop: line?.top ?? null, lineWidth: line?.width ?? null, top: box.top, height: box.height };
}));
const [leftSignature, rightSignature] = signatureGeometry;
if (
  leftSignature.lineTop === null ||
  rightSignature.lineTop === null ||
  Math.abs(leftSignature.lineTop - rightSignature.lineTop) > 0.5 ||
  Math.abs(leftSignature.top - rightSignature.top) > 0.5 ||
  Math.abs(leftSignature.height - rightSignature.height) > 0.5
) {
  throw new Error(`Bloco de assinaturas desalinhado: ${JSON.stringify(signatureGeometry)}`);
}

const pdfPath = path.join(outDir, "proposta-ciperprag-padrao-v5-ritmo.pdf");
const page1Path = path.join(outDir, "proposta-ciperprag-padrao-v5-ritmo-page-1.png");
const page2Path = path.join(outDir, "proposta-ciperprag-padrao-v5-ritmo-page-2.png");
const page3Path = path.join(outDir, "proposta-ciperprag-padrao-v5-ritmo-page-3.png");
const page4Path = path.join(outDir, "proposta-ciperprag-padrao-v5-ritmo-page-4.png");
const fullPath = path.join(outDir, "proposta-ciperprag-padrao-v5-ritmo-full.png");
const pages = page.locator(".document-print-root > div > section");

await page.locator(".document-print-root").screenshot({ path: fullPath, animations: "disabled" });
await pages.nth(0).screenshot({ path: page1Path, animations: "disabled" });
await pages.nth(1).screenshot({ path: page2Path, animations: "disabled" });
await pages.nth(2).screenshot({ path: page3Path, animations: "disabled" });
await pages.nth(3).screenshot({ path: page4Path, animations: "disabled" });
await page.evaluate(() => {
  document.title = "Proposta PC-58/2026";
});
await page.pdf({
  path: pdfPath,
  format: "A4",
  printBackground: true,
  tagged: true,
  outline: true,
  margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
});

await browser.close();
console.log(JSON.stringify({ pdfPath, page1Path, page2Path, page3Path, page4Path, fullPath }, null, 2));
