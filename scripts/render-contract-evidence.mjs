import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(rootDir, "docs/evidencias/p0-contratos");
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
  razaoSocial: "CIPERPRAG CONTROLE DE PRAGAS E SERVICOS LTDA",
  nomeFantasia: "Ciperprag Servicos",
  cnpj: "15.722.292/0003-05",
  endereco: "Av. Serra Arqueada S/N, QD QNC 205 - Parauapebas-PA",
  telefone: "(94) 99999-0000",
  email: "operacional@ciperprag.com.br",
  logoUrl,
  corPrimaria: "#0f7f5c",
  corSecundaria: "#475569",
  responsavelTecnico: "Aline Vieira",
  responsavelExecucao: "Aline Vieira",
  cargoResponsavel: "Responsavel tecnica",
};

const client = {
  id: "CLI-TECNO",
  razaoSocial: "Tecnosonda S.A.",
  nomeFantasia: "Tecnosonda",
  cnpj: "68.765.432/0001-99",
  inscricaoEstadual: "",
  endereco: "Av. Industrial, 1200",
  bairro: "Polo Industrial",
  municipio: "Parauapebas",
  uf: "PA",
  cep: "68.515-300",
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
    descricao: "Controle de insetos rasteiros, roedores e vetores urbanos.",
    unidade: "visitas",
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
    id: "SVC-CAIXA",
    nome: "Higienizacao de Caixas D'Agua",
    tipo: "sanitario",
    descricao: "Limpeza, desinfeccao e emissao de certificado.",
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
    nome: "Coleta e Analise de Bebedouros",
    tipo: "sanitario",
    descricao: "Coleta e analise de amostras de agua para analise laboratorial.",
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
    id: "SVC-PMOC",
    nome: "Manutencao de Ar-Condicionado (PMOC)",
    tipo: "manutencao",
    descricao: "Plano de manutencao, operacao e controle.",
    unidade: "equipamentos",
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

const contract = {
  id: "TPL-CT-TECNOSONDA",
  numero: "CT-125/2026",
  clienteId: client.id,
  tipo: "contrato",
  servicos: [
    { servicoId: "SVC-CIP", quantidade: 12, valorUnitario: 480, frequencia: "Mensal" },
    { servicoId: "SVC-CAIXA", quantidade: 4, valorUnitario: 747.9, frequencia: "Semestral" },
    { servicoId: "SVC-BEB", quantidade: 14, valorUnitario: 355, frequencia: "Mensal" },
    { servicoId: "SVC-PMOC", quantidade: 12, valorUnitario: 150, frequencia: "Mensal" },
  ],
  vigenciaMeses: 12,
  formaPagamento: "Medicao mensal, NF/Boleto e vencimento em 30 dias apos emissao.",
  prazoPagamentoDias: 30,
  status: "vigente",
  dataCriacao: "2026-06-15",
  observacoes: "Contrato com clausula de reajuste anual pelo IPCA.",
  titulo: "Contrato de prestacao de servicos continuados",
  objeto: "Saude ambiental, controle de pragas e servicos tecnicos.",
  validadeDias: 30,
  modalidade: "Contrato continuado",
  locaisExecucao: ["Av. Industrial, 1200, Polo Industrial, Parauapebas-PA, 68.515-300"],
  escopoTecnico: "",
  condicoesComerciais: "",
};

const session = {
  token: "contract-evidence-token",
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
  contractTemplates: [contract],
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

await page.route("**/api/auth/login", async (route) => route.fulfill(json(session)));
await page.route("**/api/auth/me", async (route) => route.fulfill(json({ ok: true, user: session.user })));
await page.route("**/api/public/tenant-context", async (route) => {
  await route.fulfill(json({ ok: true, tenant: { slug: "ciperprag", nome: "Ciperprag", logoUrl, corPrimaria: "#0f7f5c" } }));
});
await page.route("**/api/bootstrap", async (route) => route.fulfill(json(bootstrap)));
await page.route("**/api/contract-templates/*/issue-document", async (route) => {
  await route.fulfill(json({ attachment: { id: "ATT-CT-001", entidadeTipo: "contrato", entidadeId: contract.id } }));
});

await page.goto(`${appUrl}/comercial/contratos`, { waitUntil: "networkidle" });
await page.waitForSelector('button[title="Imprimir"]', { timeout: 15000 });
await page.click('button[title="Imprimir"]');
await page.waitForSelector(".document-print-root", { state: "attached", timeout: 15000 });
await page.locator(".document-print-root img").first().waitFor({ state: "attached", timeout: 10000 });
await page.emulateMedia({ media: "print" });
await page.evaluate(() => document.fonts?.ready);
await page.waitForTimeout(800);

const pdfPath = path.join(outDir, "contrato-ciperprag-padrao-v1.pdf");
const fullPath = path.join(outDir, "contrato-ciperprag-padrao-v1-full.png");
const pages = page.locator(".document-print-root > div > section");
const pageCount = await pages.count();

await page.locator(".document-print-root").screenshot({ path: fullPath, animations: "disabled" });
for (let index = 0; index < pageCount; index += 1) {
  await pages.nth(index).screenshot({
    path: path.join(outDir, `contrato-ciperprag-padrao-v1-page-${index + 1}.png`),
    animations: "disabled",
  });
}

await page.evaluate(() => {
  document.title = "Contrato CT-125/2026";
  document.documentElement.lang = "pt-BR";
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
console.log(JSON.stringify({ pdfPath, fullPath, pageCount }, null, 2));
