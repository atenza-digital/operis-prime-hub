import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outputDir = path.join(root, "docs", "auditorias");
const outputFile = path.join(outputDir, "auditoria-assets-documentais.md");

const activeRenderers = [
  {
    type: "Propostas",
    file: "src/pages/comercial/Contratos.tsx",
    renderer: "ProposalReferencePrint / ProposalDocumentPrint",
    configField: "companyConfig.certificadoConfig.documentLogoLightUrl | logoPrincipalUrl | logoUrl",
    fallback: "SVG textual com iniciais/nome da empresa emissora",
    status: "parcialmente parametrizado",
    pending: "Persistir snapshot imutavel dos assets e executar matriz tri-tenant completa.",
  },
  {
    type: "Contratos e minutas",
    file: "src/pages/comercial/Contratos.tsx",
    renderer: "ContractReferencePrint",
    configField: "companyConfig.certificadoConfig.documentLogoLightUrl | logoPrincipalUrl | logoUrl",
    fallback: "SVG textual com iniciais/nome da empresa emissora",
    status: "parcialmente parametrizado",
    pending: "Parametrizar clausulas, condicoes comerciais e snapshot de assets por revisao.",
  },
  {
    type: "Ordens de Servico",
    file: "src/lib/osPrint.ts",
    renderer: "buildOsPrintHtml",
    configField: "companyConfig.certificadoConfig.documentLogoLightUrl | logoPrincipalUrl | logoUrl",
    fallback: "Bloco textual com nome da empresa emissora",
    status: "hardcoded e corrigido",
    pending: "Salvar versao/hash do asset documental usado na emissao da OS.",
  },
  {
    type: "Certificados",
    file: "src/components/CertificadoImpressao.tsx",
    renderer: "imprimirCertificado",
    configField: "certificadoConfig + snapshot: documentLogoLightUrl, brandIconUrl, seloInstitucionalUrl, assinaturaUrl, cores",
    fallback: "Marca textual do emissor; blocos condicionais sem espaco vazio quando desabilitados",
    status: "hardcoded e corrigido",
    pending: "Persistir PDF/hash server-side e validar QR impresso em multiplos aparelhos.",
  },
  {
    type: "Medicoes",
    file: "src/pages/Medicao.tsx",
    renderer: "MeasurementPrintSaas",
    configField: "companyConfig.certificadoConfig.documentLogoLightUrl | logoPrincipalUrl | logoUrl; snapshot issueCity/issueState/issuedAt/timezone/revisao",
    fallback: "Iniciais da empresa emissora",
    status: "hardcoded e corrigido",
    pending: "Persistir snapshot completo de asset, hash do arquivo e storage R2.",
  },
  {
    type: "Relatorios tecnicos",
    file: "src/lib/technicalReportPrint.ts",
    renderer: "buildTechnicalReportHtml",
    configField: "companyConfig.certificadoConfig.documentLogoLightUrl | logoPrincipalUrl | logoUrl",
    fallback: "Bloco textual com nome da empresa emissora",
    status: "hardcoded e corrigido",
    pending: "Persistir snapshot de asset, assinatura e selos por relatorio.",
  },
  {
    type: "Laudos",
    file: "nao implementado",
    renderer: "pendente",
    configField: "previsto: identidade documental do tenant",
    fallback: "previsto: textual sem imagem quebrada",
    status: "pendente",
    pending: "Criar familia documental de laudos quando entrar no escopo funcional.",
  },
  {
    type: "Documentos historicos",
    file: "src/template_certificado_preenchido.html",
    renderer: "referencia estatica preenchida",
    configField: "nao aplicavel ao fluxo ativo",
    fallback: "nao aplicavel",
    status: "parcialmente parametrizado",
    pending: "Mover referencias estaticas para pasta de fixtures/documentacao ou substituir por snapshots versionados.",
  },
];

const forbiddenPatterns = [
  { label: "import fixo de logo Ciperprag", regex: /import\s+.*logo_ciperprag/i },
  { label: "asset fixo logo_ciperprag", regex: /logo_ciperprag/i },
  { label: "asset fixo assinatura_certificado", regex: /assinatura_certificado/i },
  { label: "asset fixo icone_lateral_certificado", regex: /icone_lateral_certificado/i },
  { label: "asset fixo brasao_prefeitura", regex: /brasao_prefeitura/i },
  { label: "rodape proibido Atenza FieldOps", regex: /Gerado pelo Atenza FieldOps/i },
];

async function readMaybe(relativePath) {
  try {
    return await fs.readFile(path.join(root, relativePath), "utf8");
  } catch {
    return "";
  }
}

function findForbidden(content) {
  const hits = [];
  for (const pattern of forbiddenPatterns) {
    if (pattern.regex.test(content)) hits.push(pattern.label);
  }
  return hits;
}

function markdownTable(rows) {
  const header = [
    "Tipo de documento",
    "Template/renderizador",
    "Logo usada",
    "Campo de configuracao",
    "Origem do arquivo",
    "Fallback",
    "Isolamento por tenant",
    "Snapshot",
    "Teste executado",
    "Resultado",
    "Pendencia",
  ];
  const lines = [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
  ];
  for (const row of rows) {
    lines.push(
      `| ${[
        row.type,
        row.renderer,
        row.logo,
        row.configField,
        row.origin,
        row.fallback,
        row.isolation,
        row.snapshot,
        row.test,
        row.result,
        row.pending,
      ].map((value) => String(value).replaceAll("\n", " ").replaceAll("|", "\\|")).join(" | ")} |`,
    );
  }
  return lines.join("\n");
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  const rows = [];
  const activeIssues = [];
  for (const item of activeRenderers) {
    const content = item.file === "nao implementado" ? "" : await readMaybe(item.file);
    const hits = item.file === "src/template_certificado_preenchido.html" ? findForbidden(content).map((hit) => `referencia historica: ${hit}`) : findForbidden(content);
    if (hits.length && item.file !== "src/template_certificado_preenchido.html") {
      activeIssues.push({ file: item.file, hits });
    }
    rows.push({
      ...item,
      logo: item.file === "nao implementado" ? "pendente" : hits.length && item.file !== "src/template_certificado_preenchido.html" ? "verificar hardcode" : "documental do tenant ou fallback textual",
      origin: item.file,
      isolation: item.status === "pendente" ? "pendente" : "sem fallback de outro tenant nos renderizadores ativos",
      snapshot: item.type === "Medicoes" ? "snapshot inclui cidade, UF, data, timezone e revisao; assets completos pendentes" : item.status === "pendente" ? "pendente" : "parcial; snapshot de asset completo pendente",
      test: hits.length ? `inspecao estatica: ${hits.join(", ")}` : "inspecao estatica sem padroes proibidos no renderizador ativo",
      result: item.status,
    });
  }

  const report = `# Auditoria de assets documentais

Atualizado em: 2026-07-19

## Escopo

Esta auditoria verifica a origem de logos, icones, brasoes, selos, assinaturas e cores usados nos documentos emitidos pelo Atenza FieldOps. A regra de produto e que documentos do tenant usem somente ativos documentais do proprio tenant, vindos de configuracao ou snapshot documental, sem fallback fixo da Ciperprag, de outro cliente ou da Atenza.

## Resultado automatico

- Renderizadores ativos com padroes proibidos: ${activeIssues.length ? "sim" : "nao"}.
- Arquivo estatico com marcas Ciperprag classificado como referencia historica: \`src/template_certificado_preenchido.html\`.
- A geracao tri-tenant completa ainda fica pendente para a etapa de hardening SaaS/R2, porque depende de seeds isoladas e armazenamento versionado de arquivos.

## Matriz documental

${markdownTable(rows)}

## Separacao esperada de ativos

- Favicon global da plataforma: Atenza.
- Marca da plataforma: Atenza FieldOps.
- Topo do menu expandido: logo de interface do tenant.
- Menu recolhido: icone do tenant ou favicon da plataforma como fallback neutro.
- Documentos emitidos: logo documental do tenant.
- Brasoes e selos: ativos auxiliares parametrizados por tenant, documento, servico/categoria e validade opcional.
- Assinatura: configuracao do responsavel documental, separada de logo.
- Cor primaria documental: configuracao do tenant aplicada apenas quando a familia documental permitir.

## Arquivos alterados nesta rodada

- \`src/pages/Medicao.tsx\`
- \`scripts/render-measurement-evidence.mjs\`
- \`src/components/CertificadoImpressao.tsx\`
- \`src/lib/osPrint.ts\`
- \`src/lib/technicalReportPrint.ts\`
- \`src/pages/comercial/Contratos.tsx\`
- \`src/pages/comercial/Configuracoes.tsx\`
- \`src/components/AppLayout.tsx\`
- \`src/components/ComercialLayout.tsx\`
- \`src/pages/AlterarSenha.tsx\`
- \`scripts/audit-document-assets.mjs\`

## Pendencias controladas

- Implementar storage R2 com buckets/prefixos por ambiente e tenant, MIME type, limite de tamanho, nomes nao previsiveis, hash e versao de arquivo.
- Persistir em snapshot documental: tenant emissor, logo documental usada, cores, selos, assinatura, versao/hash dos assets e configuracoes aplicadas.
- Gerar matriz tri-tenant completa: Ciperprag, Empresa demonstracao e tenant sem identidade visual.
- Mover o certificado preenchido estatico para fixtures/referencias para evitar confusao com renderizador ativo.
- Criar familia de laudos quando o escopo funcional entrar em execucao.
`;

  await fs.writeFile(outputFile, report, "utf8");

  if (activeIssues.length) {
    console.error(JSON.stringify(activeIssues, null, 2));
    process.exit(1);
  }

  console.log(`Auditoria gerada em ${path.relative(root, outputFile)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
