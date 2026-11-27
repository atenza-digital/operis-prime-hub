import { repairMojibake } from "@/lib/repairMojibake";
import type { BootstrapData, Contrato, OSApp, ServicoCatalogo } from "@/lib/api";
import { documentTypographyCss } from "@/lib/documentFontFaces";

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fmtDate(date?: string) {
  if (!date) return "";
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
}

function osNumeroLegivel(numero: string, dataEmissao?: string) {
  const seq = numero
    .replace(/^OS[-\s]*/i, "")
    .replace(/\s*\/\s*/g, " / ");
  const year = (dataEmissao || new Date().toISOString().slice(0, 10)).slice(0, 4);
  if (seq.includes("/")) return seq;
  return `${seq} / ${year}`;
}

function joinList(items: string[] | undefined, fallback: string) {
  return items && items.length ? items.join(", ") : fallback;
}

function renderBulletList(items: string[]) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function snapshotPhase(os: OSApp) {
  const snapshot = (os.snapshotDados ?? {}) as Record<string, unknown>;
  return (snapshot.encerramento ?? snapshot.emissao ?? null) as Record<string, unknown> | null;
}

function snapshotSection<T extends Record<string, unknown>>(os: OSApp, section: string): T | null {
  const phase = snapshotPhase(os);
  const value = phase?.[section];
  return value && typeof value === "object" ? (value as T) : null;
}

function snapshotString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function snapshotNumber(value: unknown) {
  return typeof value === "number" ? value : undefined;
}

function snapshotStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function documentLogoFromCompany(company: BootstrapData["companyConfig"] | null | undefined) {
  const config = company?.certificadoConfig ?? {};
  return config.documentLogoLightUrl || config.logoPrincipalUrl || company?.logoUrl || "";
}

function renderDocumentLogo(logoSrc: string, companyName: string) {
  if (logoSrc) return `<img src="${escapeHtml(logoSrc)}" alt="${escapeHtml(companyName || "Empresa emissora")}" />`;
  return `<div class="logo-fallback">${escapeHtml(companyName || "Empresa emissora")}</div>`;
}

function serviceFromSnapshot(os: OSApp, fallback?: ServicoCatalogo): ServicoCatalogo | undefined {
  const service = snapshotSection<Record<string, unknown>>(os, "servico");
  if (!service) return fallback;
  const pop = service.pop && typeof service.pop === "object" ? (service.pop as Record<string, unknown>) : {};
  return {
    ...(fallback ?? {}),
    id: snapshotString(service.id) ?? fallback?.id ?? "",
    nome: snapshotString(service.nome) ?? fallback?.nome ?? os.servico,
    tipo: (snapshotString(service.tipo) as ServicoCatalogo["tipo"]) ?? fallback?.tipo ?? os.tipo,
    descricao: snapshotString(service.descricao) ?? fallback?.descricao ?? "",
    unidade: snapshotString(service.unidade) ?? fallback?.unidade ?? os.unidade,
    recorrenciaDias: snapshotNumber(service.recorrenciaDias) ?? fallback?.recorrenciaDias ?? 0,
    geraCertificado: typeof service.geraCertificado === "boolean" ? service.geraCertificado : fallback?.geraCertificado ?? true,
    validadeCertificadoDias: snapshotNumber(service.validadeCertificadoDias) ?? fallback?.validadeCertificadoDias ?? 0,
    produtosQuimicos: snapshotStringArray(service.produtosQuimicos).length ? snapshotStringArray(service.produtosQuimicos) : fallback?.produtosQuimicos ?? [],
    epis: snapshotStringArray(service.epis).length ? snapshotStringArray(service.epis) : fallback?.epis ?? [],
    riscos: snapshotStringArray(service.riscos).length ? snapshotStringArray(service.riscos) : fallback?.riscos ?? [],
    normasAplicaveis: snapshotStringArray(service.normasAplicaveis).length ? snapshotStringArray(service.normasAplicaveis) : fallback?.normasAplicaveis ?? [],
    procedimentos: snapshotStringArray(service.procedimentos).length ? snapshotStringArray(service.procedimentos) : fallback?.procedimentos ?? [],
    checklistItens: snapshotStringArray(service.checklistItens).length ? snapshotStringArray(service.checklistItens) : fallback?.checklistItens ?? [],
    exigeFoto: typeof service.exigeFoto === "boolean" ? service.exigeFoto : fallback?.exigeFoto ?? false,
    exigeAssinatura: typeof service.exigeAssinatura === "boolean" ? service.exigeAssinatura : fallback?.exigeAssinatura ?? true,
    permiteNaoExecucao: typeof service.permiteNaoExecucao === "boolean" ? service.permiteNaoExecucao : fallback?.permiteNaoExecucao ?? true,
    popCodigo: snapshotString(pop.codigo) ?? fallback?.popCodigo,
    popTitulo: snapshotString(pop.titulo) ?? fallback?.popTitulo,
    popVersao: snapshotString(pop.versao) ?? fallback?.popVersao,
    popObjetivo: snapshotString(pop.objetivo) ?? fallback?.popObjetivo,
    popAplicacao: snapshotString(pop.aplicacao) ?? fallback?.popAplicacao,
    popResponsabilidades: snapshotStringArray(pop.responsabilidades).length ? snapshotStringArray(pop.responsabilidades) : fallback?.popResponsabilidades ?? [],
    popMateriais: snapshotStringArray(pop.materiais).length ? snapshotStringArray(pop.materiais) : fallback?.popMateriais ?? [],
    ativo: fallback?.ativo ?? true,
  };
}

function inferActivityLine(labels: string[]) {
  const names = labels.filter(Boolean);
  if (!names.length) return "( X ) EXECUÇÃO DE SERVIÇO CONFORME CONTRATO";
  return names.map((item) => `( X ) ${String(item).toUpperCase()}`).join(", ");
}

function inferRiskLines(service?: ServicoCatalogo, contract?: Contrato) {
  const riskList = service?.riscos?.length ? service.riscos : contract?.riscos ?? [];
  const descriptions = new Map<string, string>([
    ["Risco de Acidente", "Queda ou tropeço"],
    ["Risco Físico", "Ruído, calor"],
    ["Risco Químico", "Emissão de névoa, poeiras, vapores organicos."],
    ["Risco Ergonômico", "Esforço físico repetitivo, postura inadequada."],
    ["Risco Biológico", "Não se aplica."],
    ["Risco de Queda", "Diferença de nível e acesso a pontos elevados."],
    ["Risco Elétrico", "Contato acidental com circuitos e equipamentos energizados."],
  ]);

  const normalized = riskList.length
    ? riskList.map((item) => {
        if (/qu[ií]mico/i.test(item)) return "Risco Químico";
        if (/biol/i.test(item)) return "Risco Biológico";
        if (/ergon/i.test(item)) return "Risco Ergonômico";
        if (/acidente/i.test(item)) return "Risco de Acidente";
        if (/queda/i.test(item)) return "Risco de Queda";
        if (/el[ée]tric/i.test(item)) return "Risco Elétrico";
        return "Risco Físico";
      })
    : ["Risco de Acidente", "Risco Físico", "Risco Químico", "Risco Ergonômico", "Risco Biológico"];

  const labels = ["Risco de Acidente", "Risco Físico", "Risco Químico", "Risco Ergonômico", "Risco Biológico", "Risco de Queda", "Risco Elétrico"];
  return labels
    .filter((label) => normalized.includes(label))
    .map((label) => `<div><strong>${escapeHtml(label)}:</strong> ${escapeHtml(descriptions.get(label) || "Conforme análise preliminar da atividade.")}</div>`)
    .join("");
}

// Textos do modelo original de OS aprovado pela cliente (os-modelo-1/2.png).
const TRAINING_BULLETS = [
  "Treinamento operacional para uso e higienização dos EPIS;",
  "Treinamento em altura (NR35)",
  "Treinamento em espaço confinado (NR33)",
  "Treinamento maquinas e equipamentos (NR12)",
  "Os trabalhos que envolvam manipulação de produtos químicos só poderão ser executados por profissionais devidamente treinados e identificados.",
  "Os trabalhos que envolvam manipulação de produtos químicos só poderão ser executados com a FISPQ - Ficha de Informação de Segurança de Produtos Químicos.",
  "Em caso de dúvidas procure o Técnico de Segurança da sua Área.",
];

const ERGONOMIA_BULLETS = [
  "Para cargas superiores a 23 kg por pessoa a atividade deverá ser realizada por dois colaboradores ou mais conforme a necessidade. Caso necessário deverá ser utilizado equipamento de guindar ou carrinhos mão ou similares.",
  "O transporte manual deverá ser realizado de forma a não tencionar a coluna vertebral, concentrando o peso nas musculaturas das pernas e braços prevenindo lombalgias.",
];

const MOVIMENTACAO_BULLETS = [
  "Durante a movimentação dos materiais diversos manualmente os envolvidos deverão posicionar-se de forma a não expor mãos e pés sob os mesmos evitando prensagens em, sob ou entre os mesmos.",
  "Durante a movimentação de materiais diversos de forma mecanizada os envolvidos deverão utilizar cordas guias de forma a posicionar-se de forma segura. Não sendo permitido permanecer sob cargas suspensas nem guiar manualmente peças em níveis acima do solo.",
  "Os acessórios de cargas, ou seja, cabos de aço, cintas e manilhas deverão ser inspecionados diariamente por profissional qualificado de forma a identificar possíveis danos que acrescente risco de queda de materiais.",
  "No local da atividade deverá permanecer no local apenas o pessoal envolvido na atividade respeitando-se o isolamento de área a sinalização de segurança.",
  "Durante as movimentações de cargas deverá ser avaliada a existência de redes elétricas no raio de ação da lança do equipamento, evitando assim indução elétrica ou impactos acidentais.",
];

const DISPOSICOES_BULLETS = [
  "O local deverá permanecer limpo e organizado, eliminando causadores de acidentes tais como: poças d´agua, óleos ou graxas.",
];

const DISPOSICOES_TEXTO = "Os colaboradores devem utilizar camisas de manga longa e óculos de segurança. Os envolvidos deverão ingerir bastante líquidos evitando a desidratação. Nas frentes de serviços deverão dispor de áreas cobertas para realização de refeições. Os profissionais deverão utilizar o transporte fornecido pela empresa para realização do percurso casa - trabalho - casa.";

const OBRIGACOES_BULLETS = [
  "Cumprir as disposições legais e regulamentares sobre segurança e medicina do trabalho, inclusive as Ordens de Serviços expedidas pelo empregador;",
  "Usar o EPI fornecido pelo empregador;",
  "Submeter-se aos exames médicos previstos nas Normas Regulamentadoras - NR;",
  "Colaborar com a empresa na aplicação das Normas Regulamentadoras - NR.",
];

const ATO_FALTOSO_TEXTO = "Constitui ato faltoso e, portanto passível de punição, a recusa injustificada do empregado ao cumprimento do disposto no item anterior, bem como as demais determinações desta Ordem de Serviços.";

const ATO_FALTOSO_BULLETS = [
  "Não executar qualquer trabalho para o qual não tenha sido orientado e autorizado.",
  "Todos os acidentes ocorridos no local de trabalho ou fora desde que a serviço da empresa, ou ainda acidente de trajeto de casa para o trabalho e vice-versa, por mais leve que possa parecer, deve ser comunicado o mais rápido possível ao Supervisor do Setor onde trabalha, ou ao Setor de Segurança do Trabalho.",
  "Caso alguma irregularidade ou risco de acidente seja constatado, antes do início ou ainda no transcorrer dos trabalhos, a atividade deve ser suspensa e imediatamente comunicado ao responsável pelo serviço ou à Segurança do Trabalho.",
  "É terminantemente proibido qualquer tipo de trabalho envolvendo manutenção e instalações em eletricidade. Estes serviços somente podem ser realizados por pessoas qualificadas e autorizadas pela Segurança do Trabalho. Não execute trabalhos de movimentação de materiais nem permaneça próximo de redes elétricas aéreas ou subterrâneas.",
];

function uniqueItems(lists: Array<string[] | undefined>) {
  return [...new Set(lists.flatMap((list) => list ?? []))];
}

function renderObservationServices(items: Array<{ os: OSApp; service?: ServicoCatalogo }>) {
  return items
    .map(({ os: item, service: svc }) => {
      const tags = item.tagEquipamentoServico || item.tags || "";
      const altura = /caixa/i.test(item.servico) ? `<span style="margin-left:18px;">Altura SIM( ) NÃO( )</span>` : "";
      return `<div style="margin-top: 8px;">
        <div>${escapeHtml(item.servico)}</div>
        <table style="margin-top: 2px;">
          <colgroup><col style="width: 11%"><col style="width: 89%"></colgroup>
          <tr><td style="border:0;padding:0;">Quantidade</td><td style="border:0;padding:0 0 0 10px;">Descrição/serviços</td></tr>
          <tr><td style="border:0;padding:0;"><span style="display:inline-block;border-bottom:1px solid #222;min-width:48px;height:12px;"></span></td><td style="border:0;padding:0 0 0 10px;">${escapeHtml(svc?.descricao || item.servico)}</td></tr>
        </table>
        <div style="margin-top: 4px;">TAGs: ${escapeHtml(tags)}<span style="display:inline-block;border-bottom:1px solid #222;min-width:180px;height:12px;"></span>${altura}</div>
      </div>`;
    })
    .join("");
}

export function buildOsPrintHtml(
  os: OSApp,
  options: {
    bootstrap: BootstrapData | null;
    logoSrc?: string;
    groupOrders?: OSApp[];
  },
) {
  const bootstrap = options.bootstrap;
  const company = bootstrap?.companyConfig ?? null;
  const customer = bootstrap?.clients.find((item) => item.id === os.clienteId);
  const contract = bootstrap?.contracts.find((item) => item.id === os.contratoId);
  const service = serviceFromSnapshot(os, bootstrap?.services.find((item) => item.nome === os.servico));
  const grupo = options.groupOrders && options.groupOrders.length > 1
    ? [...options.groupOrders].sort((x, y) => x.numero.localeCompare(y.numero, "pt-BR", { numeric: true }))
    : [os];
  const grupoServicos = grupo.map((item) => ({
    os: item,
    service: item.id === os.id ? service : serviceFromSnapshot(item, bootstrap?.services.find((svc) => svc.nome === item.servico)),
  }));
  const servicoCombinado: ServicoCatalogo | undefined = service
    ? { ...service, riscos: uniqueItems(grupoServicos.map((item) => item.service?.riscos)), epis: uniqueItems(grupoServicos.map((item) => item.service?.epis)) }
    : undefined;
  const osPrincipal = grupo[0];
  const outrasOs = grupo.slice(1).map((item) => osNumeroLegivel(item.numero, item.dataEmissao));
  const epiList = servicoCombinado?.epis?.length ? servicoCombinado.epis : contract?.epis ?? [];
  const epcList =
    service?.tipo === "manutencao"
      ? ["Cones e correntes", "Sinalização de área", "Bloqueio e etiquetagem quando aplicável"]
      : ["Cones e correntes", "Sinalização de área", "Kit de emergência e lavagem quando aplicável"];

  const logoSrc = options.logoSrc ?? documentLogoFromCompany(company);
  const clienteNome = customer?.razaoSocial || os.clienteNome || contract?.cliente || "";
  const clienteCnpj = customer?.cnpj || os.clienteCnpj || contract?.cnpj || "";
  const clienteEndereco = customer
    ? [customer.endereco, customer.bairro, `${customer.municipio}-${customer.uf}`].filter(Boolean).join(", ")
    : os.clienteEndereco || "";
  const emissao = fmtDate(os.dataEmissao);
  const execucao = fmtDate(os.dataExecucao || os.dataEmissao);
  const companyIdLine = [
    company?.razaoSocial ? `<strong>${escapeHtml(company.razaoSocial)}</strong>` : "",
    ...[company?.cnpj, company?.cnpjSecundario].filter(Boolean).map((cnpj) => `CNPJ ${escapeHtml(cnpj)}`),
  ]
    .filter(Boolean)
    .join(" - ");
  const assinaturaConfig = (company?.certificadoConfig ?? {}) as Record<string, unknown>;
  const assinaturaModo = String((assinaturaConfig.assinaturaDocumentos as Record<string, unknown> | undefined)?.os ?? assinaturaConfig.assinaturaModo ?? "imagem");
  const assinaturaUrl = assinaturaModo === "imagem" && typeof assinaturaConfig.assinaturaUrl === "string" ? assinaturaConfig.assinaturaUrl : "";
  const companyLine = [company?.endereco, company?.telefone ? `Tel.: ${company.telefone}` : "", company?.email ? `e-mail: ${company.email}` : ""]
    .filter(Boolean)
    .join(", ");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(os.numero)}</title>
  <style>
    ${documentTypographyCss}
    * { box-sizing: border-box; }
    @page { size: A4; margin: 6mm; }
    body { margin: 0; color: #111; background: #fff; }
    .page { width: 100%; height: 284mm; border: 1.2px solid #222; page-break-after: always; position: relative; display: flex; flex-direction: column; overflow: hidden; }
    .page:last-child { page-break-after: auto; }
    .top-brand { display: grid; grid-template-columns: 1fr auto; align-items: start; min-height: 92px; }
    .brand-center { text-align: center; padding-top: 6px; }
    .brand-center img { width: 330px; max-width: 100%; height: auto; }
    .logo-fallback { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; max-width: 330px; padding: 8px 18px; border: 1px solid #d1d5db; border-radius: 10px; color: #111827; font-size: 18px; font-weight: 800; text-transform: uppercase; }
    .os-meta { padding: 16px 18px 0 0; font-size: 20px; font-weight: 700; white-space: nowrap; }
    .title { text-align: center; font-size: 22px; font-weight: 700; padding: 6px 0 10px; border-bottom: 1.2px solid #222; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    td, th { border: 1px solid #222; padding: 4px 6px; vertical-align: top; font-size: 13px; overflow-wrap: anywhere; word-break: normal; hyphens: auto; line-height: 1.18; }
    .label { font-weight: 800; background: #fafafa; font-size: 12px; line-height: 1.1; }
    .compact td { padding: 3px 6px; }
    .section-title { font-size: 15px; font-weight: 700; padding: 4px 7px; border-left: 1px solid #222; border-right: 1px solid #222; border-bottom: 1px solid #222; }
    .box { border-left: 1px solid #222; border-right: 1px solid #222; border-bottom: 1px solid #222; padding: 6px 8px; font-size: 13px; }
    .tall-box { min-height: 74px; }
    .mid-box { min-height: 58px; }
    .large-box { min-height: 122px; }
    .risk-box div { margin-bottom: 2px; }
    .small { font-size: 12px; }
    .dense .box, .dense p, .dense li { font-size: 11px; line-height: 1.2; }
    .dense .bullets li { margin: 0; }
    .bullets { margin: 0; padding: 0 0 0 20px; }
    .bullets li { margin: 1px 0; line-height: 1.22; }
    .footer-wrap { margin-top: auto; padding-top: 8px; }
    .footer-line { border-top: 2px solid #0b9e6d; margin: 0 12px 6px; }
    .footer { text-align: center; font-size: 11px; line-height: 1.2; padding: 0 8px 6px; }
    .sign-grid { padding: 10px 12px 12px; border-left: 1px solid #222; border-right: 1px solid #222; border-bottom: 1px solid #222; min-height: 108px; }
    .sign-grid p { margin: 0 0 8px; font-size: 13px; }
    .sign-line { display: inline-block; border-bottom: 1px solid #222; min-width: 220px; height: 14px; vertical-align: middle; }
    .bottom-grid { display: grid; grid-template-columns: 1fr 1.15fr; gap: 18px; padding: 12px; border-left: 1px solid #222; border-right: 1px solid #222; border-bottom: 1px solid #222; min-height: 110px; }
    .responsavel-bloco { display: flex; flex-direction: column; justify-content: flex-end; gap: 10px; }
    .guarita-bloco p { margin: 0 0 8px; }
    .inline-line { display: inline-block; min-width: 210px; border-bottom: 1px solid #222; height: 14px; vertical-align: middle; }
  </style>
</head>
<body>
  <div class="page">
    <div class="top-brand">
      <div class="brand-center">${renderDocumentLogo(logoSrc, company?.nomeFantasia || company?.razaoSocial || "Empresa emissora")}</div>
      <div class="os-meta">OS N&nbsp;${escapeHtml(osNumeroLegivel(osPrincipal.numero, osPrincipal.dataEmissao))}${outrasOs.length ? `<div style="font-size:11px;font-weight:600;white-space:normal;max-width:150px;">Inclui: ${escapeHtml(outrasOs.join(", "))}</div>` : ""}</div>
    </div>
    <div class="title">REGISTRO DE ORDEM DE SERVIÇO</div>

    <table class="compact">
      <colgroup>
        <col style="width: 16%">
        <col style="width: 48%">
        <col style="width: 16%">
        <col style="width: 20%">
      </colgroup>
      <tr><td class="label">SETOR:</td><td>OPERACIONAL</td><td class="label"></td><td></td></tr>
      <tr><td class="label">CLIENTE:</td><td>${escapeHtml(clienteNome)}</td><td class="label">CNPJ</td><td><strong>${escapeHtml(clienteCnpj)}</strong></td></tr>
      <tr><td class="label">Local de execução:</td><td>${escapeHtml(os.localExecucao)}</td><td class="label">Origem</td><td>${escapeHtml(os.contratoId || "Atendimento avulso")}</td></tr>
    </table>

    <div class="section-title">Descrição das Atividades:</div>
    <div class="box tall-box">
      ${escapeHtml(inferActivityLine([...grupo.map((item) => item.servico), ...(contract?.tags ?? [])]))}
    </div>

    <div class="section-title">Observação</div>
    <div class="box large-box">
      ${os.observacao ? `<div>${escapeHtml(os.observacao)}</div>` : ""}
      ${renderObservationServices(grupoServicos)}
      ${os.naoExecutada ? `<div style="margin-top:8px;"><strong>NÃO EXECUTADA:</strong> ${escapeHtml(os.motivoNaoExecucao || "")}</div>` : ""}
    </div>

    <div class="section-title">Procedimentos Específicos:</div>
    <div class="box mid-box risk-box">${inferRiskLines(servicoCombinado, contract)}</div>

    <table class="compact">
      <colgroup><col style="width: 20%"><col style="width: 80%"></colgroup>
      <tr><td class="label">Relação de EPI´s:</td><td>${escapeHtml(joinList(epiList, "Conforme análise preliminar da atividade."))}</td></tr>
      <tr><td class="label">Equipamentos de Proteção Coletiva:</td><td>${escapeHtml(joinList(epcList, "Sinalização e isolamento da área."))}</td></tr>
    </table>

    <div class="section-title">Procedimentos Específicos:</div>
    <div class="box">
      <ul class="bullets">${renderBulletList(TRAINING_BULLETS)}</ul>
    </div>

    <div class="section-title">Em caso de emergência:</div>
    <div class="box small">Caso o alarme de emergência seja acionado os profissionais deverão evacuar a área seguindo as rotas de fuga ao ponto de encontro mais próximo.</div>

    <div class="footer-wrap">
      <div class="footer-line"></div>
      <div class="footer">
        <div>${companyIdLine}</div>
        <div>${escapeHtml(companyLine)}</div>
      </div>
    </div>
  </div>

  <div class="page dense">
    <div class="section-title">Medidas Preventivas:</div>
    <div class="box">
      <p style="margin:2px 0 4px;"><strong>Ergonomia:</strong> O transporte manual de peso deverá ser realizado conforme a capacidade física de cada um não ultrapassando a carga ergonomicamente correta de 23 kg por colaborador.</p>
      <ul class="bullets">${renderBulletList(ERGONOMIA_BULLETS)}</ul>
      <div style="font-weight:700;margin:4px 0 2px;">Movimentação de cargas:</div>
      <ul class="bullets">${renderBulletList(MOVIMENTACAO_BULLETS)}</ul>
      <div style="font-weight:700;margin:4px 0 2px;">Disposições Gerais:</div>
      <ul class="bullets">${renderBulletList(DISPOSICOES_BULLETS)}</ul>
      <p style="margin:4px 0 2px;">${escapeHtml(DISPOSICOES_TEXTO)}</p>
    </div>

    <div class="section-title">Obrigações dos Empregados:</div>
    <div class="box">
      <div style="font-weight:700;margin:2px 0;">Cabe ao empregado:</div>
      <ul class="bullets">${renderBulletList(OBRIGACOES_BULLETS)}</ul>
    </div>

    <div class="box">
      <p style="margin:0 0 4px;">${escapeHtml(ATO_FALTOSO_TEXTO)}</p>
      <ul class="bullets">${renderBulletList(ATO_FALTOSO_BULLETS)}</ul>
    </div>

    <div class="box">
      <p style="margin:0;">Recebi da empresa ${escapeHtml(company?.razaoSocial || company?.nomeFantasia || "Ciperprag")}, o treinamento de segurança, saúde e meio ambiente para o desenvolvimento de minha atividade, juntamente com a cópia desta Ordem de Serviço, tomando conhecimento das ações preventivas que devo tomar para evitar acidentes de trabalho, doenças ocupacionais e impactos ambientais, as quais me comprometo seguir e cumprir.</p>
    </div>

    <div class="sign-grid">
      <p><strong>Assinatura do Colaborador:</strong> <span class="sign-line"></span></p>
      <p><strong>Assinatura do Colaborador:</strong> <span class="sign-line"></span></p>
      <p><strong>Assinatura do Colaborador:</strong> <span class="sign-line"></span></p>
    </div>

    <div class="bottom-grid">
      <div class="responsavel-bloco">
        <div style="font-size: 15px; font-weight: 700;">Data de Emissão: ${escapeHtml(emissao || execucao)}</div>
        ${assinaturaUrl ? `<img src="${escapeHtml(assinaturaUrl)}" alt="Assinatura do responsável técnico" style="display:block;max-height:46px;max-width:220px;margin-top:6px;object-fit:contain;" />` : ""}
        <div style="margin-top: 10px;"><strong>${escapeHtml(company?.responsavelExecucao || company?.responsavelTecnico || "Responsável técnico")}</strong></div>
        <div>CRT02: ${escapeHtml(company?.cr02 || "")}</div>
      </div>
      <div class="guarita-bloco">
        <p style="font-size: 15px; font-weight: 700;">Guarita: <span class="inline-line" style="min-width: 260px;"></span></p>
        <p style="font-size: 15px;">Acompanhante <span class="inline-line" style="min-width: 190px;"></span></p>
        <p style="font-size: 15px;">Matrícula: <span class="inline-line" style="min-width: 190px;"></span></p>
      </div>
    </div>

    <div class="footer-wrap">
      <div class="footer-line"></div>
      <div class="footer">
        <div>${companyIdLine}</div>
        <div>${escapeHtml(companyLine)}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
  return repairMojibake(html);
}

export function printOsDocument(os: OSApp, bootstrap: BootstrapData | null) {
  const printWindow = window.open("", "_blank", "width=1024,height=900");
  if (!printWindow) return;
  const groupOrders = os.grupoId ? bootstrap?.orders.filter((item) => item.grupoId === os.grupoId) : undefined;
  printWindow.document.write(`${buildOsPrintHtml(os, { bootstrap, groupOrders })}<script>window.onload=function(){window.print();}</script>`);
  printWindow.document.close();
}
