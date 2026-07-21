import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as esbuild from "esbuild";
import { chromium } from "playwright";
import { pool, query } from "../server/db.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(rootDir, "docs/evidencias/qa_fluxo_visual");
const tmpDir = path.join(rootDir, "tmp");

async function embeddedMontserratCss() {
  const weights = [
    [400, "Montserrat-Regular.ttf"],
    [500, "Montserrat-Medium.ttf"],
    [600, "Montserrat-SemiBold.ttf"],
    [700, "Montserrat-Bold.ttf"],
    [800, "Montserrat-Bold.ttf"],
    [900, "Montserrat-Bold.ttf"],
  ];
  const faces = await Promise.all(weights.map(async ([weight, fileName]) => {
    const fontPath = path.join(rootDir, "src/assets/fonts/documentos/montserrat", fileName);
    const contents = await fs.readFile(fontPath);
    return `@font-face{font-family:"Montserrat";src:url(data:font/truetype;base64,${contents.toString("base64")}) format("truetype");font-style:normal;font-weight:${weight};font-display:block;}`;
  }));
  return faces.join("\n");
}

const montserratFontFaces = await embeddedMontserratCss();

async function resolveSourceAlias(importPath) {
  const candidate = path.join(rootDir, "src", importPath.slice(2));
  const paths = [candidate, `${candidate}.ts`, `${candidate}.tsx`, `${candidate}.js`, `${candidate}.jsx`];
  for (const filePath of paths) {
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      // Try the next extension supported by the local source tree.
    }
  }
  return candidate;
}

function escapeHtml(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function brDate(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" });
}

function isoDate(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataUriFromFile(assetPath, mime = "image/png") {
  return fs.readFile(path.join(rootDir, assetPath)).then((bytes) => `data:${mime};base64,${bytes.toString("base64")}`);
}

async function loadOsPrintBuilder() {
  await fs.mkdir(tmpDir, { recursive: true });
  const result = await esbuild.build({
    entryPoints: [path.join(rootDir, "src/lib/osPrint.ts")],
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
  const bundlePath = path.join(tmpDir, "evidence-osprint.bundle.mjs");
  await fs.writeFile(bundlePath, result.outputFiles[0].text, "utf8");
  const module = await import(`${pathToFileURL(bundlePath).href}?v=${Date.now()}`);
  return module.buildOsPrintHtml;
}

async function fetchBootstrapLikeData() {
  const [companyResult, clientsResult, contractsResult, servicesResult, techniciansResult] = await Promise.all([
    query("select * from ciperprag_hub.empresa_config order by id limit 1"),
    query("select * from ciperprag_hub.clientes order by razao_social"),
    query("select * from ciperprag_hub.contratos order by criado_em desc limit 200"),
    query("select * from ciperprag_hub.servicos_catalogo order by nome"),
    query("select * from ciperprag_hub.funcionarios order by nome").catch(() => ({ rows: [] })),
  ]);

  return {
    companyConfig: mapCompany(companyResult.rows[0]),
    clients: clientsResult.rows.map(mapClient),
    contracts: contractsResult.rows.map(mapContract),
    services: servicesResult.rows.map(mapService),
    technicians: techniciansResult.rows.map(mapTechnician),
  };
}

async function fetchOsForEvidence() {
  const { rows } = await query(`
    select *
      from ciperprag_hub.ordens_servico
     order by
       case when numero = 'OS-2677' then 0 else 1 end,
       coalesce(data_execucao, data_emissao, criado_em::date) desc,
       numero desc
     limit 1
  `);
  if (!rows[0]) throw new Error("Nenhuma OS encontrada na base de homologacao.");
  return mapOs(rows[0]);
}

async function fetchContractTemplateForEvidenceByType(type) {
  const { rows } = await query(`
    select
      ct.*,
      c.razao_social,
      c.cnpj,
      c.endereco,
      c.bairro,
      c.municipio,
      c.uf,
      c.cep,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'servicoId', cts.servico_id,
            'quantidade', cts.quantidade,
            'valorUnitario', cts.valor_unitario,
            'frequencia', cts.frequencia
          )
          order by cts.id
        ) filter (where cts.id is not null),
        '[]'::jsonb
      ) as servicos
    from ciperprag_hub.contratos_templates ct
    left join ciperprag_hub.clientes c on c.id = ct.cliente_id
    left join ciperprag_hub.contratos_templates_servicos cts on cts.template_id = ct.id
    where ct.tipo = $1
    group by ct.id, c.razao_social, c.cnpj, c.endereco, c.bairro, c.municipio, c.uf, c.cep
    order by ct.criado_em desc
    limit 1
  `, [type]);
  return rows[0] || null;
}

function mapCompany(row = {}) {
  return {
    razaoSocial: row.razao_social,
    nomeFantasia: row.nome_fantasia,
    cnpj: row.cnpj,
    endereco: row.endereco,
    telefone: row.telefone,
    email: row.email,
    logoUrl: row.logo_url,
    corPrimaria: row.cor_primaria,
    corSecundaria: row.cor_secundaria,
    responsavelTecnico: row.responsavel_tecnico,
    responsavelExecucao: row.responsavel_execucao,
    cargoResponsavel: row.cargo_responsavel,
  };
}

function mapClient(row) {
  return {
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
    ativo: Boolean(row.ativo),
    contatos: [],
    locaisExecucao: [],
    equipamentos: [],
  };
}

function mapContract(row) {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    cliente: row.cliente,
    cnpj: row.cnpj,
    servico: row.servico,
    tipo: row.tipo,
    contratado: Number(row.contratado || 0),
    executado: Number(row.executado || 0),
    unidade: row.unidade,
    status: row.status,
    ultimaExecucao: isoDate(row.ultima_execucao),
    validadeDias: Number(row.validade_dias || 0),
    valorUnitario: Number(row.valor_unitario || 0),
    tags: row.tags || [],
    produtosQuimicos: row.produtos_quimicos || [],
    epis: row.epis || [],
    riscos: row.riscos || [],
  };
}

function mapService(row) {
  return {
    id: row.id,
    nome: row.nome,
    tipo: row.tipo,
    descricao: row.descricao,
    unidade: row.unidade,
    recorrenciaDias: Number(row.recorrencia_dias || 0),
    geraCertificado: Boolean(row.gera_certificado),
    validadeCertificadoDias: Number(row.validade_certificado_dias || 0),
    produtosQuimicos: row.produtos_quimicos || [],
    epis: row.epis || [],
    riscos: row.riscos || [],
    normasAplicaveis: row.normas_aplicaveis || [],
    procedimentos: row.procedimentos || [],
    checklistItens: row.checklist_itens || [],
    exigeFoto: Boolean(row.exige_foto),
    exigeAssinatura: row.exige_assinatura !== false,
    permiteNaoExecucao: row.permite_nao_execucao !== false,
    popCodigo: row.pop_codigo,
    popTitulo: row.pop_titulo,
    popVersao: row.pop_versao,
    ativo: Boolean(row.ativo),
  };
}

function mapTechnician(row) {
  return {
    id: row.id,
    nome: row.nome,
    cpf: row.cpf,
    dataAdmissao: isoDate(row.data_admissao),
  };
}

function mapOs(row) {
  return {
    id: row.id,
    numero: row.numero,
    agendamentoId: row.agendamento_id,
    cliente: row.cliente,
    clienteId: row.cliente_id,
    clienteCnpj: row.cliente_cnpj,
    contratoId: row.contrato_id,
    servico: row.servico,
    tipo: row.tipo,
    tecnico: row.tecnico,
    tecnicoCpf: row.tecnico_cpf,
    tecnicoDataAdmissao: isoDate(row.tecnico_data_admissao),
    equipeTecnicosIds: row.equipe_tecnicos_ids || [],
    equipeTecnicosNomes: row.equipe_tecnicos_nomes || [],
    veiculoId: row.veiculo_id,
    veiculoDescricao: row.veiculo_descricao,
    localExecucao: row.local_execucao,
    tags: row.tags,
    tagEquipamentoServico: row.tag_equipamento_servico,
    observacao: row.observacao,
    dataEmissao: isoDate(row.data_emissao || row.criado_em),
    dataExecucao: isoDate(row.data_execucao),
    fotos: row.fotos || [],
    quantidade: Number(row.quantidade || 0),
    unidade: row.unidade,
    certificadoHash: row.certificado_hash,
    status: row.status,
    checklistRespostas: row.checklist_respostas || [],
    naoExecutada: Boolean(row.nao_executada),
    motivoNaoExecucao: row.motivo_nao_execucao,
    snapshotDados: row.snapshot_dados || {},
  };
}

function makeManyServices(sourceServices, count = 10) {
  const active = sourceServices.length ? sourceServices : [{ id: "SERV-DEMO", nome: "Serviço técnico demonstrativo", unidade: "un." }];
  return Array.from({ length: count }, (_, index) => {
    const service = active[index % active.length];
    return {
      servicoId: service.id,
      quantidade: (index % 4) + 1,
      valorUnitario: 180 + index * 45,
      frequencia: ["Mensal", "Bimestral", "Trimestral", "Semestral"][index % 4],
    };
  });
}

function cloneDocument(item, overrides = {}) {
  return {
    ...item,
    servicos: item.servicos.map((service) => ({ ...service })),
    ...overrides,
    servicos: overrides.servicos || item.servicos.map((service) => ({ ...service })),
  };
}

function genericCompany() {
  return {
    razaoSocial: "Empresa Demonstração de Serviços Técnicos LTDA",
    nomeFantasia: "Empresa Demonstração",
    cnpj: "11.222.333/0001-44",
    endereco: "Av. Exemplo, 1000 - Centro - Cidade Modelo/PA",
    telefone: "(94) 99999-0000",
    email: "contato@empresademonstracao.com.br",
    logoUrl: "",
    corPrimaria: "#1f4f5f",
    corSecundaria: "#475569",
    responsavelExecucao: "Mariana Lopes",
    responsavelTecnico: "Mariana Lopes",
    cargoResponsavel: "Diretora Operacional",
  };
}

function commercialEvidenceHtml({ item, services, company, logoSrc }) {
  const primary = company?.corPrimaria || "#0f7f5c";
  const secondary = company?.corSecundaria || "#475569";
  const total = item.servicos.reduce((sum, service) => sum + Number(service.quantidade || 0) * Number(service.valorUnitario || 0), 0);
  const isContract = item.tipo === "contrato";
  const title = isContract ? "Contrato de Prestação de Serviços" : "Proposta Técnica Comercial";
  const emissionDate = brDate(item.data_criacao || item.criado_em || new Date());
  const address = [item.endereco, item.bairro, `${item.municipio || ""}-${item.uf || ""}`, item.cep].filter((part) => part && part !== "-").join(", ");
  const frequencies = [...new Set(item.servicos.map((service) => service.frequencia).filter(Boolean))].join(", ");
  const representativeName = company?.responsavelExecucao || company?.responsavelTecnico || "Responsável autorizado";
  const representativeRole = company?.cargoResponsavel || (isContract ? "Representante da contratada" : "Responsável pela proposta");
  const companyContact = [company?.telefone, company?.email].filter(Boolean).join(" | ");
  const companyLine = [company?.endereco, companyContact].filter(Boolean).join(" | ");
  const brand = logoSrc
    ? `<div class="logo-box"><img src="${escapeHtml(logoSrc)}" alt="${escapeHtml(company?.nomeFantasia || "Logo")}" /></div>`
    : `<div class="logo-box text-brand">${escapeHtml(company?.nomeFantasia || company?.razaoSocial || "Empresa")}</div>`;
  const natureRows = item.servicos.map((service, index) => {
    const catalog = services.find((entry) => entry.id === service.servicoId);
    return `<div class="service-line"><strong>${String(index + 1).padStart(2, "0")} - ${escapeHtml(catalog?.nome || "Serviço não informado")}</strong><span>${escapeHtml(catalog?.descricao || `Frequência: ${service.frequencia || "-"}`)}</span></div>`;
  }).join("");
  const executionRows = item.servicos.map((service) => {
    const catalog = services.find((entry) => entry.id === service.servicoId);
    const procedures = Array.isArray(catalog?.procedimentos) && catalog.procedimentos.length
      ? catalog.procedimentos.slice(0, 4).join(" ")
      : "Execução conforme procedimento operacional, boas práticas técnicas, requisitos do contrato e orientações do responsável técnico.";
    return `<div class="execution-line"><strong>${escapeHtml(catalog?.nome || "Serviço")}</strong><p>${escapeHtml(procedures)}</p>${catalog?.epis?.length ? `<small>EPIs previstos: ${escapeHtml(catalog.epis.join(", "))}.</small>` : ""}</div>`;
  }).join("");
  const rows = item.servicos.map((service, index) => {
    const catalog = services.find((entry) => entry.id === service.servicoId);
    const lineTotal = Number(service.quantidade || 0) * Number(service.valorUnitario || 0);
    return `<tr>
      <td>${String(index + 1).padStart(2, "0")}</td>
      <td><strong>${escapeHtml(catalog?.nome || "Serviço não informado")}</strong><small>${catalog?.unidade ? `Unidade: ${escapeHtml(catalog.unidade)}` : "Origem: catálogo de serviços/produtos"}</small></td>
      <td class="center">${escapeHtml(service.quantidade)}</td>
      <td class="center">${escapeHtml(service.frequencia || "-")}</td>
      <td class="right">${money(service.valorUnitario)}</td>
      <td class="right strong">${money(lineTotal)}</td>
    </tr>`;
  }).join("");
  const longDocumentClass = item.servicos.length > 8 ? " long-document" : "";
  const documentTypeClass = isContract ? " contract-document" : " proposal-document";

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} ${escapeHtml(item.numero)}</title>
  <style>
    ${montserratFontFaces}
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body, *, *::before, *::after { font-family: "Montserrat", sans-serif; font-variant-numeric: tabular-nums lining-nums; }
    body { margin: 0; background: #fff; color: #0f172a; }
    .doc { min-height: 297mm; width: 210mm; background: #fff; padding: 9mm 14mm; display: flex; flex-direction: column; }
    .header { border-bottom: 2px solid ${primary}; padding-bottom: 8px; }
    .header-inner { display: flex; align-items: flex-start; justify-content: space-between; gap: 32px; }
    .brand { display: flex; align-items: center; gap: 16px; }
    .logo-box { width: 150px; height: 48px; border: 1px solid #d7dde5; display: flex; align-items: center; justify-content: flex-start; padding: 7px 10px; background: #fff; }
    .logo-box img { max-width: 100%; max-height: 34px; object-fit: contain; }
    .text-brand { font-size: 12px; font-weight: 900; text-transform: uppercase; color: ${primary}; line-height: 1.05; }
    h1 { margin: 0; font-size: 19px; line-height: 1.1; text-transform: uppercase; font-weight: 900; }
    .number { margin-top: 4px; font-size: 11px; color: ${secondary}; font-weight: 800; }
    .company { max-width: 285px; text-align: right; color: #475569; font-size: 9px; }
    .company strong { display: block; color: #0f172a; text-transform: uppercase; line-height: 1.15; }
    section { margin-top: 8px; break-inside: avoid; }
    h2 { margin: 0; font-size: 20px; line-height: 1.1; }
    h3 { margin: 0 0 5px; font-size: 12px; text-transform: uppercase; font-weight: 900; color: ${primary}; }
    p { margin: 0; font-size: 9.2px; line-height: 1.28; color: #334155; }
    .section-title { border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; }
    .client-strip { margin-top: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 7px; }
    .client-strip .meta { margin-top: 4px; font-size: 9.5px; color: #475569; }
    table { width: 100%; border-collapse: collapse; font-size: 9px; }
    th, td { border: 1px solid #cbd5e1; padding: 4px 7px; vertical-align: top; }
    th { background: #f1f5f9; text-align: left; color: #1e293b; text-transform: uppercase; font-size: 8.5px; }
    .label-cell { background: #f8fafc; color: #475569; font-weight: 800; text-transform: uppercase; width: 18%; }
    .center { text-align: center; }
    .right { text-align: right; }
    .strong { font-weight: 900; }
    td small { display: block; color: #64748b; font-size: 8px; margin-top: 1px; }
    .two-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .long-document .closing-start { break-before: page; padding-top: 10mm; }
    .closing-heading { display: none; }
    .long-document .closing-heading { display: block; grid-column: 1 / -1; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; }
    .closing-heading strong { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: .16em; color: ${primary}; }
    .closing-heading span { display: block; margin-top: 3px; font-size: 8.8px; color: #64748b; }
    .service-list { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
    .service-line { border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .service-line strong { display: block; font-size: 9.5px; }
    .service-line span { display: block; margin-top: 1px; font-size: 8.7px; color: #475569; line-height: 1.25; }
    .execution-line { border-left: 2px solid ${primary}; padding-left: 8px; margin-bottom: 4px; }
    .execution-line strong { display: block; font-size: 9.5px; }
    .execution-line small { display: block; margin-top: 1px; color: #64748b; font-size: 8px; }
    .clause { margin-top: 7px; }
    .signature-wrap { margin-top: 7px; border-top: 1px solid #cbd5e1; padding-top: 5px; break-inside: auto; page-break-inside: auto; }
    .contract-document .signature-wrap { margin-top: auto; }
    .signature-note { margin-bottom: 9px; text-align: center; color: #64748b; font-size: 8.3px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 54px; text-align: center; font-size: 9px; }
    .signature { border-top: 1px solid #0f172a; padding-top: 5px; }
  </style>
</head>
<body>
  <main class="doc${longDocumentClass}${documentTypeClass}">
    <header class="header">
      <div class="header-inner">
        <div class="brand">${brand}<div><h1>${escapeHtml(title)}</h1><div class="number">Nº ${escapeHtml(item.numero)} · Emissão ${escapeHtml(emissionDate)}</div></div></div>
        <div class="company"><strong>${escapeHtml(company?.razaoSocial || company?.nomeFantasia || "Empresa emissora")}</strong>${company?.cnpj ? `<div>CNPJ ${escapeHtml(company.cnpj)}</div>` : ""}${companyLine ? `<div>${escapeHtml(companyLine)}</div>` : ""}</div>
      </div>
    </header>
    ${isContract ? `
    <section>
      <h3>Partes Contratantes</h3>
      <table><tbody>
        <tr><td class="label-cell">Contratada</td><td><strong>${escapeHtml(company?.razaoSocial || company?.nomeFantasia || "Empresa emissora")}</strong>${company?.cnpj ? ` · CNPJ ${escapeHtml(company.cnpj)}` : ""}${company?.endereco ? ` · ${escapeHtml(company.endereco)}` : ""} · Representante: ${escapeHtml(representativeName)}</td></tr>
        <tr><td class="label-cell">Contratante</td><td><strong>${escapeHtml(item.razao_social || "Cliente não informado")}</strong>${item.cnpj ? ` · CNPJ/CPF ${escapeHtml(item.cnpj)}` : ""}${address ? ` · ${escapeHtml(address)}` : ""}</td></tr>
      </tbody></table>
    </section>` : `
    <div class="client-strip"><div style="font-size:11px;font-weight:900;text-transform:uppercase;color:${primary};letter-spacing:.18em;">Cliente / Contratante</div><h2>${escapeHtml(item.razao_social || "Cliente não informado")}</h2><div class="meta">CNPJ/CPF ${escapeHtml(item.cnpj || "-")} · ${escapeHtml([item.municipio, item.uf].filter(Boolean).join("/") || "-")} · ${escapeHtml(address || "Endereço não informado")}</div></div>`}
    <section>
      <table><tbody>
        <tr><td class="label-cell">Emissão</td><td>${escapeHtml(emissionDate)}</td><td class="label-cell">${isContract ? "Vigência" : "Validade"}</td><td>${escapeHtml(item.vigencia_meses)} meses</td></tr>
        <tr><td class="label-cell">Valor total</td><td class="strong" style="color:${primary}">${money(total)}</td><td class="label-cell">Pagamento</td><td>${escapeHtml(item.forma_pagamento || "-")}</td></tr>
        <tr><td class="label-cell">Local</td><td>${escapeHtml(address || "Conforme cadastro do cliente/contrato.")}</td><td class="label-cell">Periodicidade</td><td>${escapeHtml(frequencies || "Conforme itens contratados.")}</td></tr>
      </tbody></table>
    </section>
    ${isContract ? `
      <section class="clause"><h3>Cláusula 1ª - Objeto do contrato</h3><p>O presente instrumento estabelece as condições para prestação dos serviços técnicos listados neste documento, incluindo escopo, frequência, valores, vigência e responsabilidades operacionais vinculadas ao contrato.</p></section>
      <section class="clause"><h3>Cláusula 2ª - Escopo técnico</h3><p>Os serviços serão executados conforme catálogo técnico, POPs, checklist aplicável, requisitos do cliente e registros de OS. Cada item contratado poderá alimentar agendamentos, ordens de serviço, certificados e medições.</p></section>
      <section class="clause"><h3>Cláusula 3ª - Responsabilidades das partes</h3><p><strong>Contratada:</strong> executar os serviços, registrar evidências, emitir documentos aplicáveis e manter rastreabilidade operacional.</p><p><strong>Contratante:</strong> disponibilizar acesso aos locais, acompanhar a execução quando necessário e validar medições conforme contrato.</p></section>
    ` : `
      <section><h3 class="section-title">1. Apresentação</h3><p>Apresentamos nossa proposta técnica e comercial para execução dos serviços abaixo caracterizados, com escopo, frequência, valores e condições definidos a partir do cadastro comercial e do catálogo de serviços.</p></section>
      <section><h3 class="section-title">2. Credenciamento / capacidade técnica</h3><p>A contratada declara possuir estrutura técnica, equipe qualificada e registros aplicáveis conforme parametrização do tenant.</p></section>
      <section><h3 class="section-title">3. Natureza dos serviços</h3><div class="service-list">${natureRows}</div></section>
      <section><h3 class="section-title">4. Forma de execução / tratamento</h3>${executionRows}</section>
    `}
    <section>
      <h3 class="section-title">${isContract ? "Cláusula 4ª - Serviços contratados" : "5. Valor do serviço"}</h3>
      <table><thead><tr><th>Item</th><th>Serviço/produto</th><th class="center">Qtd.</th><th class="center">Frequência</th><th class="right">Unit.</th><th class="right">Total</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="5" class="right strong">Total geral</td><td class="right strong" style="color:${primary}">${money(total)}</td></tr></tfoot></table>
    </section>
    <section class="two-cols closing-start">
      <div class="closing-heading"><strong>Fechamento comercial e assinaturas</strong><span>Condições finais do documento, observações e campos de assinatura.</span></div>
      <div><h3 class="section-title">${isContract ? "Cláusula 5ª - Condições comerciais" : "6. Condições comerciais"}</h3><p><strong>Pagamento:</strong> ${escapeHtml(item.forma_pagamento || "-")}</p><p><strong>Prazo:</strong> ${escapeHtml(item.prazo_pagamento_dias)} dias após medição/aceite.</p><p><strong>${isContract ? "Vigência" : "Validade da proposta"}:</strong> ${escapeHtml(item.vigencia_meses)} meses.</p></div>
      <div><h3 class="section-title">${isContract ? "Cláusula 6ª - Local e periodicidade" : "7. Local e periodicidade"}</h3><p><strong>Local:</strong> ${escapeHtml(address || "Locais definidos no cadastro do cliente/contrato.")}</p><p><strong>Periodicidade:</strong> ${escapeHtml(frequencies || "Conforme contrato.")}</p></div>
    </section>
    ${isContract ? `<section class="clause"><h3>Cláusula 7ª - Reajuste</h3><p>Os valores poderão ser reajustados conforme índice e regra comercial definidos no contrato, aditivo ou parametrização vigente do tenant.</p></section><section class="clause"><h3>Cláusula 8ª - Rescisão e disposições gerais</h3><p>A rescisão, substituição de escopo, aceite de medições e demais disposições seguirão as condições pactuadas entre as partes e os registros operacionais do sistema.</p></section>` : ""}
    ${item.observacoes ? `<section><h3 class="section-title">${isContract ? "Observações contratuais" : "8. Observações"}</h3><p>${escapeHtml(item.observacoes)}</p></section>` : ""}
    <section class="signature-wrap">
      <p class="signature-note">${isContract ? "E, por estarem de acordo, as partes assinam o presente instrumento." : "Aceite da proposta e autorização para continuidade do fluxo comercial."}</p>
      <div class="signatures">
        <div class="signature"><strong>${escapeHtml(company?.razaoSocial || "Contratada")}</strong><br>${escapeHtml(representativeName)}<br>${escapeHtml(representativeRole)}</div>
        <div class="signature"><strong>${escapeHtml(item.razao_social || "Contratante")}</strong><br>Nome / cargo / assinatura<br>${escapeHtml([item.municipio, item.uf].filter(Boolean).join("/") || "Local")}, ____/____/______</div>
      </div>
    </section>
  </main>
</body>
</html>`;
}

async function renderPdfAndPng(browser, html, baseName, pdfOptions = {}) {
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
    throw new Error(`Montserrat nao carregada em ${baseName}: ${missingFonts.map((item) => item.weight).join(", ")}`);
  }
  const pdfPath = path.join(outDir, `${baseName}.pdf`);
  const pngPath = path.join(outDir, `${baseName}.png`);
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    ...pdfOptions,
  });
  await page.screenshot({ path: pngPath, fullPage: true });
  await page.close();
  return { pdfPath, pngPath };
}

async function renderPdfPagesToPng(pdfPath, baseName) {
  const pdftoppm = "C:\\Users\\herto\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\native\\poppler\\Library\\bin\\pdftoppm.exe";
  const prefix = path.join(outDir, baseName);
  const { spawnSync } = await import("node:child_process");
  const existingPages = await fs.readdir(outDir);
  await Promise.all(
    existingPages
      .filter((fileName) => fileName.startsWith(`${baseName}-`) && fileName.endsWith(".png"))
      .map((fileName) => fs.rm(path.join(outDir, fileName), { force: true })),
  );
  const result = spawnSync(pdftoppm, ["-png", "-r", "150", pdfPath, prefix], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`Falha ao renderizar paginas do PDF: ${result.stderr || result.stdout}`);
  }
}

await fs.mkdir(outDir, { recursive: true });
const ciperpragLogoSrc = await dataUriFromFile("src/assets/logo_ciperprag.png");
const buildOsPrintHtml = await loadOsPrintBuilder();
const bootstrap = await fetchBootstrapLikeData();
const os = await fetchOsForEvidence();
const proposalItem = await fetchContractTemplateForEvidenceByType("proposta");
const contractItem = await fetchContractTemplateForEvidenceByType("contrato");

if (!proposalItem || !contractItem) {
  throw new Error("A base precisa ter pelo menos uma proposta e um contrato para gerar as evidencias.");
}

const longClient = {
  razao_social: "Consorcio Internacional de Infraestrutura, Saneamento, Operacoes Ambientais e Manutencao Predial da Amazonia S.A.",
  cnpj: "88.777.666/0001-55",
  endereco: "Rodovia Estadual PA-275, Km 128, Complexo Operacional Integrado, Bloco Administrativo Central",
  bairro: "Distrito Industrial Avancado",
  municipio: "Parauapebas",
  uf: "PA",
  cep: "68.515-000",
  observacoes: "Cenario de homologacao com nomes extensos para validar quebras de linha, assinatura e distribuicao documental.",
};

const generic = genericCompany();
const manyProposal = cloneDocument(proposalItem, { numero: "PROP-MULTI-2026", servicos: makeManyServices(bootstrap.services, 11), observacoes: "Proposta com multiplos itens para validar tabela e pagina final de aceite." });
const manyContract = cloneDocument(contractItem, { numero: "CT-MULTI-2026", servicos: makeManyServices(bootstrap.services, 11), observacoes: "Contrato com multiplos itens para validar clausulas, tabela e pagina de assinatura." });

const browser = await chromium.launch({ headless: true });
const osHtml = buildOsPrintHtml(os, { bootstrap, logoSrc: ciperpragLogoSrc });
const osRendered = await renderPdfAndPng(browser, osHtml, "os-atual");
await renderPdfPagesToPng(osRendered.pdfPath, "os-atual-page");

const scenarios = [
  { baseName: "proposta-ciperprag", item: proposalItem, company: bootstrap.companyConfig, logoSrc: ciperpragLogoSrc },
  { baseName: "contrato-ciperprag", item: contractItem, company: bootstrap.companyConfig, logoSrc: ciperpragLogoSrc },
  { baseName: "proposta-generica", item: cloneDocument(proposalItem, { numero: "PROP-DEMO-2026" }), company: generic, logoSrc: null },
  { baseName: "contrato-generico", item: cloneDocument(contractItem, { numero: "CT-DEMO-2026" }), company: generic, logoSrc: null },
  { baseName: "proposta-nomes-longos", item: cloneDocument(proposalItem, { numero: "PROP-LONG-2026", ...longClient }), company: bootstrap.companyConfig, logoSrc: ciperpragLogoSrc },
  { baseName: "contrato-nomes-longos", item: cloneDocument(contractItem, { numero: "CT-LONG-2026", ...longClient }), company: bootstrap.companyConfig, logoSrc: ciperpragLogoSrc },
  { baseName: "proposta-muitos-servicos", item: manyProposal, company: bootstrap.companyConfig, logoSrc: ciperpragLogoSrc },
  { baseName: "contrato-muitos-servicos", item: manyContract, company: bootstrap.companyConfig, logoSrc: ciperpragLogoSrc },
];

const commercialDocuments = [];
for (const scenario of scenarios) {
  const html = commercialEvidenceHtml({
    item: scenario.item,
    services: bootstrap.services,
    company: scenario.company,
    logoSrc: scenario.logoSrc,
  });
  const rendered = await renderPdfAndPng(browser, html, scenario.baseName);
  await renderPdfPagesToPng(rendered.pdfPath, `${scenario.baseName}-page`);
  commercialDocuments.push({
    baseName: scenario.baseName,
    numero: scenario.item.numero,
    tipo: scenario.item.tipo,
    cliente: scenario.item.razao_social,
    pdf: rendered.pdfPath,
    png: rendered.pngPath,
  });
}

await browser.close();
await pool.end();

await fs.writeFile(
  path.join(outDir, "manifest-os-contrato.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      os: { numero: os.numero, cliente: os.cliente, pdf: osRendered.pdfPath, png: osRendered.pngPath },
      documentosComerciais: commercialDocuments,
    },
    null,
    2,
  ),
  "utf8",
);

console.log(
  JSON.stringify(
    {
      ok: true,
      outDir,
      os: os.numero,
      documentosComerciais: commercialDocuments.map((document) => document.baseName),
    },
    null,
    2,
  ),
);
