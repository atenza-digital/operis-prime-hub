import logoCiperprag from "@/assets/logo_ciperprag.png";
import type { BootstrapData, Contrato, OSApp, ServicoCatalogo } from "@/lib/api";

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

function renderPopDetails(service?: ServicoCatalogo) {
  if (!service) return "";
  const details = [
    service.popObjetivo ? `<div><strong>Objetivo:</strong> ${escapeHtml(service.popObjetivo)}</div>` : "",
    service.popAplicacao ? `<div><strong>Aplicação:</strong> ${escapeHtml(service.popAplicacao)}</div>` : "",
    service.popMateriais?.length ? `<div><strong>Materiais/registros:</strong> ${escapeHtml(service.popMateriais.join(", "))}</div>` : "",
    service.popResponsabilidades?.length ? `<div><strong>Responsabilidades:</strong> ${escapeHtml(service.popResponsabilidades.join(", "))}</div>` : "",
  ].filter(Boolean);
  if (!details.length) return "";
  return `<div style="margin-top:8px;">${details.join("")}</div>`;
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

function inferActivityLine(os: OSApp, contract?: Contrato, service?: ServicoCatalogo) {
  const labels = [os.servico, ...(contract?.tags ?? [])].filter(Boolean);
  if (!labels.length) return "( X ) EXECUÇÃO DE SERVIÇO CONFORME CONTRATO";
  return labels
    .map((item, index) => `${index === 0 ? "( X ) " : ", ( X ) "}${String(item).toUpperCase()}`)
    .join("");
}

function inferRiskLines(service?: ServicoCatalogo, contract?: Contrato) {
  const riskList = service?.riscos?.length ? service.riscos : contract?.riscos ?? [];
  const descriptions = new Map<string, string>([
    ["Risco de Acidente", "Queda, batida ou tropeço durante a atividade."],
    ["Risco Físico", "Ruído, calor e exposição ao ambiente operacional."],
    ["Risco Químico", "Contato com névoa, vapores, poeiras e agentes químicos."],
    ["Risco Ergonômico", "Esforço repetitivo e postura inadequada."],
    ["Risco Biológico", "Contato indireto com agentes contaminantes do ambiente."],
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

function inferProcedures(service?: ServicoCatalogo) {
  if (service?.procedimentos?.length) return service.procedimentos;
  return [
    "Treinamento operacional para uso e higienização dos EPIs.",
    "Avaliar a área antes do início do serviço e manter isolamento quando necessário.",
    "Executar a atividade somente por profissional treinado e identificado.",
    "Em caso de dúvidas, interromper a atividade e acionar o responsável técnico.",
  ];
}

function inferChecklist(service?: ServicoCatalogo, os?: OSApp) {
  if (os?.checklistRespostas?.length) return os.checklistRespostas.map((item) => `${item.concluido ? "( X )" : "(   )"} ${item.item}`);
  if (service?.checklistItens?.length) return service.checklistItens.map((item) => `(   ) ${item}`);
  return [];
}

function inferPreventiveMeasures(service?: ServicoCatalogo) {
  const items = [
    "O transporte manual de peso deve respeitar a capacidade física do colaborador, evitando sobrecarga e lombalgias.",
    "A movimentação de materiais deve manter mãos e pés fora de pontos de prensagem e queda de objetos.",
    "Manter o local limpo, organizado e sinalizado durante toda a execução do serviço.",
  ];
  if (service?.tipo === "manutencao") {
    items.push("Avaliar riscos de energia, altura e ferramentas antes da liberação do serviço.");
  } else {
    items.push("Seguir as orientações da FISPQ e evitar contato indevido com produtos químicos.");
  }
  return items;
}

function inferEmployeeDuties() {
  return [
    "Cumprir as disposições legais e regulamentares sobre segurança e medicina do trabalho.",
    "Usar os EPIs fornecidos pelo empregador e zelar por sua conservação.",
    "Submeter-se aos exames médicos previstos nas Normas Regulamentadoras.",
    "Comunicar imediatamente qualquer irregularidade, incidente ou condição insegura.",
    "Não executar atividade para a qual não tenha sido orientado e autorizado.",
  ];
}

export function buildOsPrintHtml(
  os: OSApp,
  options: {
    bootstrap: BootstrapData | null;
    logoSrc?: string;
  },
) {
  const bootstrap = options.bootstrap;
  const company = bootstrap?.companyConfig ?? null;
  const customer = bootstrap?.clients.find((item) => item.id === os.clienteId);
  const contract = bootstrap?.contracts.find((item) => item.id === os.contratoId);
  const service = serviceFromSnapshot(os, bootstrap?.services.find((item) => item.nome === os.servico));
  const leadTech = bootstrap?.technicians.find((item) => item.nome === os.tecnicoNome);
  const procedimentos = inferProcedures(service);
  const checklist = inferChecklist(service, os);
  const medidas = inferPreventiveMeasures(service);
  const obrigacoes = inferEmployeeDuties();
  const epiList = service?.epis?.length ? service.epis : contract?.epis ?? [];
  const epcList =
    service?.tipo === "manutencao"
      ? ["Cones e correntes", "Sinalização de área", "Bloqueio e etiquetagem quando aplicável"]
      : ["Cones e correntes", "Sinalização de área", "Kit de emergência e lavagem quando aplicável"];

  const logoSrc = options.logoSrc ?? logoCiperprag;
  const clienteNome = customer?.razaoSocial || os.clienteNome || contract?.cliente || "";
  const clienteCnpj = customer?.cnpj || os.clienteCnpj || contract?.cnpj || "";
  const clienteEndereco = customer
    ? [customer.endereco, customer.bairro, `${customer.municipio}-${customer.uf}`].filter(Boolean).join(", ")
    : os.clienteEndereco || "";
  const emissao = fmtDate(os.dataEmissao);
  const execucao = fmtDate(os.dataExecucao || os.dataEmissao);
  const companyLine = [company?.endereco, company?.telefone ? `Tel.: ${company.telefone}` : "", company?.email ? `e-mail: ${company.email}` : ""]
    .filter(Boolean)
    .join(", ");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(os.numero)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    * { box-sizing: border-box; }
    @page { size: A4; margin: 6mm; }
    body { margin: 0; font-family: Inter, Arial, Helvetica, sans-serif; color: #111; background: #fff; }
    .page { width: 100%; height: 284mm; border: 1.2px solid #222; page-break-after: always; position: relative; display: flex; flex-direction: column; overflow: hidden; }
    .page:last-child { page-break-after: auto; }
    .top-brand { display: grid; grid-template-columns: 1fr auto; align-items: start; min-height: 92px; }
    .brand-center { text-align: center; padding-top: 6px; }
    .brand-center img { width: 330px; max-width: 100%; height: auto; }
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
      <div class="brand-center"><img src="${escapeHtml(logoSrc)}" alt="${escapeHtml(company?.nomeFantasia || company?.razaoSocial || "Logo")}" /></div>
      <div class="os-meta">OS N&nbsp;${escapeHtml(osNumeroLegivel(os.numero, os.dataEmissao))}</div>
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
      <tr><td class="label">FUNÇÃO:</td><td>${escapeHtml(leadTech?.cargo || (service?.tipo === "manutencao" ? "Técnico de Manutenção" : "Técnico Sanitário"))}</td><td class="label">Data de Admissão</td><td>${escapeHtml(fmtDate(os.tecnicoDataAdmissao))}</td></tr>
      <tr><td class="label">COLABORADOR:</td><td>${escapeHtml(os.tecnicoNome)}</td><td class="label">CPF</td><td>${escapeHtml(os.tecnicoCpf || "")}</td></tr>
      <tr><td class="label">CLIENTE:</td><td>${escapeHtml(clienteNome)}</td><td class="label">CNPJ</td><td><strong>${escapeHtml(clienteCnpj)}</strong></td></tr>
      <tr><td class="label">Local de execução:</td><td>${escapeHtml(os.localExecucao)}</td><td class="label">Contrato</td><td>${escapeHtml(os.contratoId)}</td></tr>
    </table>

    <div class="section-title">Descrição das Atividades:</div>
    <div class="box tall-box">
      ${escapeHtml(inferActivityLine(os, contract, service))}
      ${service?.popCodigo || service?.popTitulo ? `<div style="margin-top:8px;"><strong>POP:</strong> ${escapeHtml([service.popCodigo, service.popTitulo, service.popVersao ? `versão ${service.popVersao}` : ""].filter(Boolean).join(" - "))}</div>` : ""}
      ${renderPopDetails(service)}
    </div>

    <div class="section-title">Observação</div>
    <div class="box large-box">
      <div>${escapeHtml(os.observacao || service?.descricao || os.servico)}</div>
      <div style="margin-top: 10px;">${escapeHtml(os.localExecucao || clienteEndereco || "")}</div>
      <table style="margin-top: 6px;">
        <colgroup><col style="width: 11%"><col style="width: 89%"></colgroup>
        <tr><td style="border:0;padding:0;">Quantidade</td><td style="border:0;padding:0 0 0 10px;">Descrição/serviços</td></tr>
        <tr><td style="border:0;padding:0;">${escapeHtml(os.quantidade)}</td><td style="border:0;padding:0 0 0 10px;">${escapeHtml(os.servico)}</td></tr>
      </table>
      <div style="margin-top: 4px;">TAGs: ${escapeHtml(os.tagEquipamentoServico || os.tags || "")}<span style="display:inline-block;border-bottom:1px solid #222;min-width:180px;height:12px;"></span></div>
      ${os.naoExecutada ? `<div style="margin-top:8px;"><strong>NÃO EXECUTADA:</strong> ${escapeHtml(os.motivoNaoExecucao || "")}</div>` : ""}
    </div>

    <div class="section-title">Riscos da Atividade:</div>
    <div class="box mid-box risk-box">${inferRiskLines(service, contract)}</div>

    <table class="compact">
      <colgroup><col style="width: 20%"><col style="width: 80%"></colgroup>
      <tr><td class="label">Relação de EPIs:</td><td>${escapeHtml(joinList(epiList, "Conforme análise preliminar da atividade."))}</td></tr>
      <tr><td class="label">EPC / Proteção Coletiva:</td><td>${escapeHtml(joinList(epcList, "Sinalização e isolamento da área."))}</td></tr>
    </table>

    <div class="section-title">Procedimentos Específicos:</div>
    <div class="box">
      <ul class="bullets">${renderBulletList(procedimentos)}</ul>
    </div>

    ${checklist.length > 0 ? `<div class="section-title">Checklist Operacional:</div><div class="box"><ul class="bullets">${renderBulletList(checklist)}</ul></div>` : ""}

    <div class="section-title">Em caso de emergência:</div>
    <div class="box small">Caso o alarme de emergência seja acionado, os profissionais deverão evacuar a área seguindo a rota de fuga ao ponto de encontro mais próximo.</div>

    <div class="footer-wrap">
      <div class="footer-line"></div>
      <div class="footer">
        <div><strong>${escapeHtml(company?.razaoSocial || "CIPERPRAG SERVIÇOS LTDA")}</strong> - CNPJ ${escapeHtml(company?.cnpj || "15.722.292/0001-43")}</div>
        <div>${escapeHtml(companyLine)}</div>
      </div>
    </div>
  </div>

  <div class="page">
    <div class="section-title">Medidas Preventivas:</div>
    <div class="box" style="min-height: 270px;">
      <div style="font-size: 15px; font-weight: 700; margin: 4px 0 6px;">Ergonomia:</div>
      <ul class="bullets">${renderBulletList(medidas)}</ul>
      <div style="font-size: 15px; font-weight: 700; margin: 10px 0 6px;">Disposições Gerais:</div>
      <ul class="bullets">
        <li>O local deve permanecer limpo e organizado, eliminando causadores de acidentes como água, óleos ou graxas.</li>
        <li>Os colaboradores devem utilizar uniforme adequado, óculos de segurança e ingerir líquidos durante a jornada.</li>
        <li>Somente o pessoal envolvido na atividade deve permanecer na frente de serviço, respeitando o isolamento da área.</li>
      </ul>
    </div>

    <div class="section-title">Obrigações dos Empregados:</div>
    <div class="box" style="min-height: 138px;">
      <div style="font-size: 15px; font-weight: 700; margin: 4px 0 6px;">Cabe ao empregado:</div>
      <ul class="bullets">${renderBulletList(obrigacoes)}</ul>
    </div>

    <div class="box" style="min-height: 150px;">
      <p class="small" style="margin-top: 0;"><strong>Constitui ato faltoso</strong> a recusa injustificada ao cumprimento desta Ordem de Serviço e demais determinações do empregador.</p>
      <ul class="bullets">
        <li>Todo acidente no local de trabalho ou no trajeto deve ser comunicado imediatamente ao superior responsável.</li>
        <li>Caso alguma irregularidade ou risco seja constatado, a atividade deve ser suspensa e comunicada ao responsável do serviço.</li>
        <li>É proibido executar qualquer trabalho para o qual o colaborador não tenha sido orientado e autorizado.</li>
      </ul>
      <p class="small" style="margin-top: 10px;">Recebi da empresa ${escapeHtml(company?.nomeFantasia || "Ciperprag")} o treinamento de segurança, saúde e meio ambiente para o desenvolvimento da minha atividade, juntamente com a cópia desta Ordem de Serviço, comprometendo-me a cumprir as ações preventivas aqui descritas.</p>
    </div>

    <div class="sign-grid">
      <p><strong>Assinatura do Colaborador:</strong> <span class="sign-line"></span></p>
      <p><strong>Assinatura do Colaborador:</strong> <span class="sign-line"></span></p>
      <p><strong>Assinatura do Colaborador:</strong> <span class="sign-line"></span></p>
    </div>

    <div class="bottom-grid">
      <div class="responsavel-bloco">
        <div style="font-size: 15px; font-weight: 700;">Data de Emissão: ${escapeHtml(emissao || execucao)}</div>
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
        <div><strong>${escapeHtml(company?.razaoSocial || "CIPERPRAG SERVIÇOS LTDA")}</strong> - CNPJ ${escapeHtml(company?.cnpj || "15.722.292/0001-43")}</div>
        <div>${escapeHtml(companyLine)}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function printOsDocument(os: OSApp, bootstrap: BootstrapData | null) {
  const printWindow = window.open("", "_blank", "width=1024,height=900");
  if (!printWindow) return;
  printWindow.document.write(`${buildOsPrintHtml(os, { bootstrap })}<script>window.onload=function(){window.print();}</script>`);
  printWindow.document.close();
}
