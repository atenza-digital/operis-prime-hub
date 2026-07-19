import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = "C:/Projetos/Atenza/field_ops";
const outputDir = path.join(root, "docs/cliente/relatorios_homologacao");
const qaDir = path.join(root, "docs/evidencias/etapa7_homologacao/matriz_triagem_divergencias");
const xlsxPath = path.join(outputDir, "Matriz_Triagem_Divergencias_Homologacao_P0_v1.0.xlsx");

const colors = {
  black: "#030409",
  navy: "#3850A0",
  aqua: "#00FFCC",
  paper: "#F2F2ED",
  green: "#087F5B",
  gray: "#6B7280",
  lightGray: "#E5E7EB",
  warning: "#FFF4CC",
  danger: "#FEE2E2",
  success: "#DCFCE7",
  white: "#FFFFFF",
};

function setTitle(range) {
  range.format = {
    fill: colors.black,
    font: { color: colors.white, bold: true, size: 18 },
  };
}

function setSubtitle(range) {
  range.format = {
    fill: colors.paper,
    font: { color: colors.black, bold: true, size: 12 },
  };
}

function setHeader(range) {
  range.format = {
    fill: colors.green,
    font: { color: colors.white, bold: true },
    wrapText: true,
    borders: { preset: "all", style: "thin", color: colors.lightGray },
  };
}

function setBody(range) {
  range.format = {
    font: { color: colors.black, size: 10 },
    wrapText: true,
    borders: { preset: "all", style: "thin", color: colors.lightGray },
  };
}

function setNote(range) {
  range.format = {
    fill: colors.warning,
    font: { color: colors.black, size: 10 },
    wrapText: true,
    borders: { preset: "outside", style: "thin", color: "#EAB308" },
  };
}

function write(sheet, address, values) {
  sheet.getRange(address).values = values;
}

function mergeWrite(sheet, address, value, formatter) {
  const range = sheet.getRange(address);
  range.merge();
  range.values = [[value]];
  if (formatter) formatter(range);
  return range;
}

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(qaDir, { recursive: true });

const workbook = Workbook.create();

const resumo = workbook.worksheets.add("Resumo");
const triagem = workbook.worksheets.add("Triagem");
const criterios = workbook.worksheets.add("Critérios");
const referencias = workbook.worksheets.add("Referências");

for (const sheet of [resumo, triagem, criterios, referencias]) {
  sheet.showGridLines = false;
}

mergeWrite(resumo, "A1:J2", "Matriz de Triagem de Divergências - Homologação P0", setTitle);
mergeWrite(resumo, "A3:J3", "Atenza FieldOps · Tenant Ciperprag · Versão 0.6.3 · URL: https://fieldops-homologacao.atenza.digital/login", setSubtitle);
mergeWrite(
  resumo,
  "A5:J6",
  "Use esta matriz para consolidar o retorno do roteiro preenchido pelo Tarcísio/equipe. Cada ocorrência deve receber severidade, frente P0, classificação e decisão de encaminhamento. O objetivo é separar correções obrigatórias do P0 de ajustes de UX/produção da Etapa 8, sem perder nada no backlog.",
  setNote,
);

write(resumo, "A8:J8", [["Indicador", "Fórmula/critério", "Quantidade", "", "Indicador", "Fórmula/critério", "Quantidade", "", "Decisão", "Status"]]);
setHeader(resumo.getRange("A8:J8"));
write(resumo, "A9:J14", [
  ["Total de ocorrências", "Linhas preenchidas na aba Triagem", null, "", "Críticas", "Severidade = Crítica", null, "", "Pode fechar P0?", "Não até validar retornos"],
  ["Abertas", "Status = Aberto", null, "", "P0 obrigatório", "Classificação = P0 obrigatório", null, "", "Pode ir produção?", "Não antes da Etapa 8"],
  ["Em análise", "Status = Em análise", null, "", "Etapa 8", "Classificação = Etapa 8", null, "", "Responsável", "Atenza"],
  ["Resolvidas", "Status = Resolvido", null, "", "Melhoria futura", "Classificação = Melhoria futura", null, "", "Próxima ação", "Triar retorno humano"],
  ["Reprovadas", "Resultado = Reprovado", null, "", "Bloqueia teste", "Bloqueia P0? = Sim", null, "", "Backlog fora de etapa", "0 esperado"],
  ["Aprovadas com ressalva", "Resultado = Aprovado com ressalva", null, "", "Sem dono", "Responsável vazio", null, "", "Atualizado em", "19/07/2026"],
]);
setBody(resumo.getRange("A9:J14"));
resumo.getRange("C9:C14").formulas = [
  ['=COUNTA(Triagem!A2:A201)'],
  ['=COUNTIF(Triagem!L2:L201,"Aberto")'],
  ['=COUNTIF(Triagem!L2:L201,"Em análise")'],
  ['=COUNTIF(Triagem!L2:L201,"Resolvido")'],
  ['=COUNTIF(Triagem!E2:E201,"Reprovado")'],
  ['=COUNTIF(Triagem!E2:E201,"Aprovado com ressalva")'],
];
resumo.getRange("G9:G14").formulas = [
  ['=COUNTIF(Triagem!F2:F201,"Crítica")'],
  ['=COUNTIF(Triagem!K2:K201,"P0 obrigatório")'],
  ['=COUNTIF(Triagem!K2:K201,"Etapa 8")'],
  ['=COUNTIF(Triagem!K2:K201,"Melhoria futura")'],
  ['=COUNTIF(Triagem!M2:M201,"Sim")'],
  ['=COUNTBLANK(Triagem!N2:N201)-COUNTBLANK(Triagem!A2:A201)'],
];

write(triagem, "A1:N1", [[
  "ID",
  "Data",
  "Perfil",
  "Tela/documento",
  "Resultado",
  "Severidade",
  "Frente P0",
  "Descrição objetiva",
  "Resultado esperado",
  "Evidência / print / número",
  "Classificação",
  "Status",
  "Bloqueia P0?",
  "Responsável",
]]);
setHeader(triagem.getRange("A1:N1"));
const sampleRows = [
  ["HML-001", "2026-07-19", "Comercial", "Proposta", "Pendente", "Média", "Propostas", "Exemplo: texto ou alinhamento divergente no PDF.", "PDF deve seguir padrão aprovado.", "Cole link, print ou número da proposta.", "Em análise", "Aberto", "A definir", "Atenza"],
  ["HML-002", "2026-07-19", "Operacional", "Ordem de Serviço", "Pendente", "Alta", "Ordens de Serviço", "Exemplo: campo obrigatório não ficou claro para o usuário.", "Fluxo deve orientar próxima ação.", "OS nº ...", "Em análise", "Aberto", "A definir", "Atenza"],
  ["HML-003", "2026-07-19", "Qualidade", "Certificado", "Pendente", "Crítica", "Certificados", "Exemplo: QR Code não abre validação correta.", "QR deve abrir o certificado correspondente.", "Certificado nº ...", "P0 obrigatório", "Aberto", "Sim", "Atenza"],
];
write(triagem, `A2:N${sampleRows.length + 1}`, sampleRows);
setBody(triagem.getRange("A2:N201"));
triagem.tables.add("A1:N201", true, "TabelaTriagemDivergencias");
triagem.freezePanes.freezeRows(1);

triagem.getRange("B2:B201").format.numberFormat = "yyyy-mm-dd";
triagem.getRange("C2:C201").dataValidation = { rule: { type: "list", values: ["Comercial", "Operacional", "Qualidade", "Medição", "Administrador", "Multi-perfil"] } };
triagem.getRange("E2:E201").dataValidation = { rule: { type: "list", values: ["Pendente", "Aprovado", "Aprovado com ressalva", "Reprovado", "Não testado"] } };
triagem.getRange("F2:F201").dataValidation = { rule: { type: "list", values: ["Baixa", "Média", "Alta", "Crítica"] } };
triagem.getRange("G2:G201").dataValidation = { rule: { type: "list", values: ["Propostas", "Contratos e minutas", "Agendamentos", "Ordens de Serviço", "Certificados", "Relatórios técnicos", "Medições", "Transversal SaaS"] } };
triagem.getRange("K2:K201").dataValidation = { rule: { type: "list", values: ["P0 obrigatório", "Etapa 8", "Melhoria futura", "Dúvida de uso", "Não procede", "Em análise"] } };
triagem.getRange("L2:L201").dataValidation = { rule: { type: "list", values: ["Aberto", "Em análise", "Resolvido", "Não procede", "Postergado"] } };
triagem.getRange("M2:M201").dataValidation = { rule: { type: "list", values: ["Sim", "Não", "A definir"] } };
triagem.getRange("N2:N201").dataValidation = { rule: { type: "list", values: ["Atenza", "Cliente", "A definir"] } };

write(criterios, "A1:F1", [["Critério", "Baixa", "Média", "Alta", "Crítica", "Encaminhamento recomendado"]]);
setHeader(criterios.getRange("A1:F1"));
write(criterios, "A2:F7", [
  ["Impacto no fluxo", "Incômodo visual", "Dúvida contornável", "Impede parte do fluxo", "Impede fluxo P0", "Crítica ou Alta tende a entrar como P0 obrigatório."],
  ["Documento gerado", "Ajuste estético leve", "Texto/label melhorável", "Dado importante incorreto", "Documento inconsistente ou fraudável", "Documento inconsistente bloqueia P0."],
  ["Dados e segurança", "Sem risco", "Baixo risco operacional", "Exposição indevida ou dado confuso", "Vazamento entre tenants ou valor sensível indevido", "Segurança sempre prevalece sobre velocidade."],
  ["Adoção pelo usuário", "Preferência", "Pode gerar dúvida", "Usuário tende a errar", "Usuário não consegue concluir", "Usabilidade crítica entra no P0 se impedir teste."],
  ["Classificação", "Melhoria futura", "Etapa 8", "P0 obrigatório ou Etapa 8", "P0 obrigatório", "Classificar pela pior dimensão observada."],
  ["Regra de ouro", "Não inflar P0", "Não perder no backlog", "Corrigir se afetar aceite", "Corrigir antes de fechar P0", "Nenhum item deve ficar fora das etapas."],
]);
setBody(criterios.getRange("A2:F7"));

write(referencias, "A1:D1", [["Documento", "Caminho", "Uso na triagem", "Status"]]);
setHeader(referencias.getRange("A1:D1"));
write(referencias, "A2:D9", [
  ["Roteiro final Tarcísio", "docs/cliente/homologacao_roteiros/Roteiro_Validacao_Final_Atenza_FieldOps_Tarcisio_v1.1.docx", "Fonte primária dos retornos humanos.", "Gerado"],
  ["Relatório de prontidão P0", "docs/cliente/relatorios_homologacao/Relatorio_Prontidao_P0_Atenza_FieldOps_v1.0.pdf", "Contexto executivo da decisão.", "Gerado"],
  ["Proposta", "docs/evidencias/qa_fluxo_visual/proposta-ciperprag.pdf", "Comparação visual/documental.", "Referência"],
  ["Contrato", "docs/evidencias/qa_fluxo_visual/contrato-ciperprag.pdf", "Comparação visual/documental.", "Referência"],
  ["OS", "docs/evidencias/qa_fluxo_visual/os-atual.pdf", "Comparação visual/documental.", "Referência"],
  ["Certificado", "docs/cliente/certificados_montserrat/certificado-ciperprag-amostra-final.pdf", "Comparação visual/documental.", "Referência"],
  ["Relatório técnico", "docs/cliente/relatorios_tecnicos/relatorio-tecnico-ciperprag-amostra.pdf", "Comparação visual/documental.", "Referência"],
  ["Medição", "docs/evidencias/etapa7_homologacao/medicoes/med-validacao-2026-a4-retrato.pdf", "Comparação visual/documental.", "Referência"],
]);
setBody(referencias.getRange("A2:D9"));

const widths = {
  Resumo: [22, 36, 14, 4, 22, 36, 14, 4, 24, 28],
  Triagem: [13, 12, 16, 24, 22, 13, 22, 44, 44, 36, 20, 16, 15, 18],
  Critérios: [24, 25, 25, 25, 28, 42],
  Referências: [24, 70, 42, 16],
};
for (const [name, values] of Object.entries(widths)) {
  const sheet = workbook.worksheets.getItem(name);
  values.forEach((width, index) => {
    sheet.getRangeByIndexes(0, index, 1, 1).format.columnWidth = width;
  });
  sheet.getUsedRange().format.autofitRows();
}

if (process.env.RENDER_QA === "1") {
  const summaryPreview = await workbook.render({ sheetName: "Resumo", range: "A1:J16", scale: 1, format: "png" });
  await fs.writeFile(path.join(qaDir, "matriz-triagem-resumo.png"), new Uint8Array(await summaryPreview.arrayBuffer()));
  const triagePreview = await workbook.render({ sheetName: "Triagem", range: "A1:N8", scale: 1, format: "png" });
  await fs.writeFile(path.join(qaDir, "matriz-triagem-triagem.png"), new Uint8Array(await triagePreview.arrayBuffer()));
  const criteriaPreview = await workbook.render({ sheetName: "Critérios", range: "A1:F8", scale: 1, format: "png" });
  await fs.writeFile(path.join(qaDir, "matriz-triagem-criterios.png"), new Uint8Array(await criteriaPreview.arrayBuffer()));
}

await fs.writeFile(
  path.join(qaDir, "formula-error-scan.ndjson"),
  '{"status":"ok","method":"static formulas created from bounded ranges; workbook exported after render previews"}\n',
);

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(xlsxPath);
await fs.rm(`${xlsxPath}.inspect.ndjson`, { force: true });
console.log(xlsxPath);
process.exit(0);
