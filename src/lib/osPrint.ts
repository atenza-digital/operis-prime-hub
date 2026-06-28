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
  const seq = numero.replace(/^OS-?/i, "");
  const year = (dataEmissao || new Date().toISOString().slice(0, 10)).slice(0, 4);
  return `${seq} / ${year}`;
}

function joinList(items: string[] | undefined, fallback: string) {
  return items && items.length ? items.join(", ") : fallback;
}

function renderBulletList(items: string[]) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function inferActivityLine(os: OSApp, contract?: Contrato, service?: ServicoCatalogo) {
  const labels = [os.servico, ...(contract?.tags ?? [])].filter(Boolean);
  if (!labels.length) return "( X ) EXECUCAO DE SERVICO CONFORME CONTRATO";
  return labels
    .map((item, index) => `${index === 0 ? "( X ) " : ", ( X ) "}${String(item).toUpperCase()}`)
    .join("");
}

function inferRiskLines(service?: ServicoCatalogo, contract?: Contrato) {
  const riskList = service?.riscos?.length ? service.riscos : contract?.riscos ?? [];
  const descriptions = new Map<string, string>([
    ["Risco de Acidente", "Queda, batida ou tropeço durante a atividade."],
    ["Risco Fisico", "Ruido, calor e exposicao ao ambiente operacional."],
    ["Risco Quimico", "Contato com nevoa, vapores, poeiras e agentes quimicos."],
    ["Risco Ergonomico", "Esforco repetitivo e postura inadequada."],
    ["Risco Biologico", "Contato indireto com agentes contaminantes do ambiente."],
    ["Risco de Queda", "Diferenca de nivel e acesso a pontos elevados."],
    ["Risco Eletrico", "Contato acidental com circuitos e equipamentos energizados."],
  ]);

  const normalized = riskList.length
    ? riskList.map((item) => {
        if (/qu[ií]mico/i.test(item)) return "Risco Quimico";
        if (/biol/i.test(item)) return "Risco Biologico";
        if (/ergon/i.test(item)) return "Risco Ergonomico";
        if (/acidente/i.test(item)) return "Risco de Acidente";
        if (/queda/i.test(item)) return "Risco de Queda";
        if (/el[ée]tric/i.test(item)) return "Risco Eletrico";
        return "Risco Fisico";
      })
    : ["Risco de Acidente", "Risco Fisico", "Risco Quimico", "Risco Ergonomico", "Risco Biologico"];

  const labels = ["Risco de Acidente", "Risco Fisico", "Risco Quimico", "Risco Ergonomico", "Risco Biologico", "Risco de Queda", "Risco Eletrico"];
  return labels
    .filter((label) => normalized.includes(label))
    .map((label) => `<div><strong>${escapeHtml(label)}:</strong> ${escapeHtml(descriptions.get(label) || "Conforme analise preliminar da atividade.")}</div>`)
    .join("");
}

function inferProcedures(service?: ServicoCatalogo) {
  if (service?.procedimentos?.length) return service.procedimentos;
  return [
    "Treinamento operacional para uso e higienizacao dos EPIs.",
    "Avaliar a area antes do inicio do servico e manter isolamento quando necessario.",
    "Executar a atividade somente por profissional treinado e identificado.",
    "Em caso de duvidas, interromper a atividade e acionar o responsavel tecnico.",
  ];
}

function inferChecklist(service?: ServicoCatalogo, os?: OSApp) {
  if (os?.checklistRespostas?.length) return os.checklistRespostas.map((item) => `${item.concluido ? "( X )" : "(   )"} ${item.item}`);
  if (service?.checklistItens?.length) return service.checklistItens.map((item) => `(   ) ${item}`);
  return [];
}

function inferPreventiveMeasures(service?: ServicoCatalogo) {
  const items = [
    "O transporte manual de peso deve respeitar a capacidade fisica do colaborador, evitando sobrecarga e lombalgias.",
    "A movimentacao de materiais deve manter maos e pes fora de pontos de prensagem e queda de objetos.",
    "Manter o local limpo, organizado e sinalizado durante toda a execucao do servico.",
  ];
  if (service?.tipo === "manutencao") {
    items.push("Avaliar riscos de energia, altura e ferramentas antes da liberacao do servico.");
  } else {
    items.push("Seguir as orientacoes da FISPQ e evitar contato indevido com produtos quimicos.");
  }
  return items;
}

function inferEmployeeDuties() {
  return [
    "Cumprir as disposicoes legais e regulamentares sobre seguranca e medicina do trabalho.",
    "Usar os EPIs fornecidos pelo empregador e zelar por sua conservacao.",
    "Submeter-se aos exames medicos previstos nas Normas Regulamentadoras.",
    "Comunicar imediatamente qualquer irregularidade, incidente ou condicao insegura.",
    "Nao executar atividade para a qual nao tenha sido orientado e autorizado.",
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
  const contract = bootstrap?.contracts.find((item) => item.id === os.contratoId);
  const service = bootstrap?.services.find((item) => item.nome === os.servico);
  const leadTech = bootstrap?.technicians.find((item) => item.nome === os.tecnicoNome);
  const procedimentos = inferProcedures(service);
  const checklist = inferChecklist(service, os);
  const medidas = inferPreventiveMeasures(service);
  const obrigacoes = inferEmployeeDuties();
  const epiList = service?.epis?.length ? service.epis : contract?.epis ?? [];
  const epcList =
    service?.tipo === "manutencao"
      ? ["Cones e correntes", "Sinalizacao de area", "Bloqueio e etiquetagem quando aplicavel"]
      : ["Cones e correntes", "Sinalizacao de area", "Kit de emergencia e lavagem quando aplicavel"];

  const logoSrc = options.logoSrc ?? logoCiperprag;
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
    * { box-sizing: border-box; }
    @page { size: A4; margin: 6mm; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; background: #fff; }
    .page { width: 100%; height: 284mm; border: 1.2px solid #222; page-break-after: always; position: relative; display: flex; flex-direction: column; overflow: hidden; }
    .page:last-child { page-break-after: auto; }
    .top-brand { display: grid; grid-template-columns: 1fr auto; align-items: start; min-height: 92px; }
    .brand-center { text-align: center; padding-top: 6px; }
    .brand-center img { width: 330px; max-width: 100%; height: auto; }
    .os-meta { padding: 16px 18px 0 0; font-size: 20px; font-weight: 700; white-space: nowrap; }
    .title { text-align: center; font-size: 22px; font-weight: 700; padding: 6px 0 10px; border-bottom: 1.2px solid #222; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    td, th { border: 1px solid #222; padding: 4px 6px; vertical-align: top; font-size: 13px; }
    .label { font-weight: 700; background: #fafafa; }
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
      <div class="brand-center"><img src="${escapeHtml(logoSrc)}" alt="Ciperprag" /></div>
      <div class="os-meta">OS N&nbsp;${escapeHtml(osNumeroLegivel(os.numero, os.dataEmissao))}</div>
    </div>
    <div class="title">REGISTRO DE ORDEM DE SERVICO</div>

    <table class="compact">
      <colgroup>
        <col style="width: 13%">
        <col style="width: 53%">
        <col style="width: 14%">
        <col style="width: 20%">
      </colgroup>
      <tr><td class="label">SETOR:</td><td>OPERACIONAL</td><td class="label"></td><td></td></tr>
      <tr><td class="label">FUNCAO:</td><td>${escapeHtml(leadTech?.cargo || (service?.tipo === "manutencao" ? "Tecnico de Manutencao" : "Tecnico Sanitario"))}</td><td class="label">Data de Admissao</td><td>${escapeHtml(fmtDate(os.tecnicoDataAdmissao))}</td></tr>
      <tr><td class="label">COLABORADOR:</td><td>${escapeHtml(os.tecnicoNome)}</td><td class="label">CPF</td><td>${escapeHtml(os.tecnicoCpf || "")}</td></tr>
      <tr><td class="label">CLIENTE:</td><td>${escapeHtml(os.clienteNome)}</td><td class="label">CNPJ</td><td><strong>${escapeHtml(os.clienteCnpj)}</strong></td></tr>
      <tr><td class="label">Local de execucao:</td><td>${escapeHtml(os.localExecucao)}</td><td class="label">Contrato</td><td>${escapeHtml(os.contratoId)}</td></tr>
    </table>

    <div class="section-title">Descricao das Atividades:</div>
    <div class="box tall-box">
      ${escapeHtml(inferActivityLine(os, contract, service))}
      ${service?.popCodigo || service?.popTitulo ? `<div style="margin-top:8px;"><strong>POP:</strong> ${escapeHtml([service.popCodigo, service.popTitulo, service.popVersao ? `versao ${service.popVersao}` : ""].filter(Boolean).join(" - "))}</div>` : ""}
    </div>

    <div class="section-title">Observacao</div>
    <div class="box large-box">
      <div>${escapeHtml(os.observacao || service?.descricao || os.servico)}</div>
      <div style="margin-top: 10px;">${escapeHtml(os.localExecucao || "")}</div>
      <table style="margin-top: 6px;">
        <colgroup><col style="width: 11%"><col style="width: 89%"></colgroup>
        <tr><td style="border:0;padding:0;">Quantidade</td><td style="border:0;padding:0 0 0 10px;">Descricao/servicos</td></tr>
        <tr><td style="border:0;padding:0;">${escapeHtml(os.quantidade)}</td><td style="border:0;padding:0 0 0 10px;">${escapeHtml(os.servico)}</td></tr>
      </table>
      <div style="margin-top: 4px;">TAGs: ${escapeHtml(os.tagEquipamentoServico || os.tags || "")}<span style="display:inline-block;border-bottom:1px solid #222;min-width:180px;height:12px;"></span></div>
      ${os.naoExecutada ? `<div style="margin-top:8px;"><strong>NAO EXECUTADA:</strong> ${escapeHtml(os.motivoNaoExecucao || "")}</div>` : ""}
    </div>

    <div class="section-title">Riscos da Atividade:</div>
    <div class="box mid-box risk-box">${inferRiskLines(service, contract)}</div>

    <table class="compact">
      <colgroup><col style="width: 20%"><col style="width: 80%"></colgroup>
      <tr><td class="label">Relacao de EPIs:</td><td>${escapeHtml(joinList(epiList, "Conforme analise preliminar da atividade."))}</td></tr>
      <tr><td class="label">EPC / Protecao Coletiva:</td><td>${escapeHtml(joinList(epcList, "Sinalizacao e isolamento da area."))}</td></tr>
    </table>

    <div class="section-title">Procedimentos Especificos:</div>
    <div class="box">
      <ul class="bullets">${renderBulletList(procedimentos)}</ul>
    </div>

    ${checklist.length > 0 ? `<div class="section-title">Checklist Operacional:</div><div class="box"><ul class="bullets">${renderBulletList(checklist)}</ul></div>` : ""}

    <div class="section-title">Em caso de emergencia:</div>
    <div class="box small">Caso o alarme de emergencia seja acionado, os profissionais deverao evacuar a area seguindo a rota de fuga ao ponto de encontro mais proximo.</div>

    <div class="footer-wrap">
      <div class="footer-line"></div>
      <div class="footer">
        <div><strong>${escapeHtml(company?.razaoSocial || "CIPERPRAG SERVICOS LTDA")}</strong> - CNPJ ${escapeHtml(company?.cnpj || "15.722.292/0001-43")}</div>
        <div>${escapeHtml(companyLine)}</div>
      </div>
    </div>
  </div>

  <div class="page">
    <div class="section-title">Medidas Preventivas:</div>
    <div class="box" style="min-height: 270px;">
      <div style="font-size: 15px; font-weight: 700; margin: 4px 0 6px;">Ergonomia:</div>
      <ul class="bullets">${renderBulletList(medidas)}</ul>
      <div style="font-size: 15px; font-weight: 700; margin: 10px 0 6px;">Disposicoes Gerais:</div>
      <ul class="bullets">
        <li>O local deve permanecer limpo e organizado, eliminando causadores de acidentes como agua, oleos ou graxas.</li>
        <li>Os colaboradores devem utilizar uniforme adequado, oculos de seguranca e ingerir liquidos durante a jornada.</li>
        <li>Somente o pessoal envolvido na atividade deve permanecer na frente de servico, respeitando o isolamento da area.</li>
      </ul>
    </div>

    <div class="section-title">Obrigacoes dos Empregados:</div>
    <div class="box" style="min-height: 138px;">
      <div style="font-size: 15px; font-weight: 700; margin: 4px 0 6px;">Cabe ao empregado:</div>
      <ul class="bullets">${renderBulletList(obrigacoes)}</ul>
    </div>

    <div class="box" style="min-height: 150px;">
      <p class="small" style="margin-top: 0;"><strong>Constitui ato faltoso</strong> a recusa injustificada ao cumprimento desta Ordem de Servico e demais determinacoes do empregador.</p>
      <ul class="bullets">
        <li>Todo acidente no local de trabalho ou no trajeto deve ser comunicado imediatamente ao superior responsavel.</li>
        <li>Caso alguma irregularidade ou risco seja constatado, a atividade deve ser suspensa e comunicada ao responsavel do servico.</li>
        <li>E proibido executar qualquer trabalho para o qual o colaborador nao tenha sido orientado e autorizado.</li>
      </ul>
      <p class="small" style="margin-top: 10px;">Recebi da empresa ${escapeHtml(company?.nomeFantasia || "Ciperprag")} o treinamento de seguranca, saude e meio ambiente para o desenvolvimento da minha atividade, juntamente com a copia desta Ordem de Servico, comprometendo-me a cumprir as acoes preventivas aqui descritas.</p>
    </div>

    <div class="sign-grid">
      <p><strong>Assinatura do Colaborador:</strong> <span class="sign-line"></span></p>
      <p><strong>Assinatura do Colaborador:</strong> <span class="sign-line"></span></p>
      <p><strong>Assinatura do Colaborador:</strong> <span class="sign-line"></span></p>
    </div>

    <div class="bottom-grid">
      <div class="responsavel-bloco">
        <div style="font-size: 15px; font-weight: 700;">Data de Emissao: ${escapeHtml(emissao || execucao)}</div>
        <div style="margin-top: 10px;"><strong>${escapeHtml(company?.responsavelExecucao || company?.responsavelTecnico || "Responsavel tecnica")}</strong></div>
        <div>CRT02: ${escapeHtml(company?.cr02 || "")}</div>
      </div>
      <div class="guarita-bloco">
        <p style="font-size: 15px; font-weight: 700;">Guarita: <span class="inline-line" style="min-width: 260px;"></span></p>
        <p style="font-size: 15px;">Acompanhante <span class="inline-line" style="min-width: 190px;"></span></p>
        <p style="font-size: 15px;">Matricula: <span class="inline-line" style="min-width: 190px;"></span></p>
      </div>
    </div>

    <div class="footer-wrap">
      <div class="footer-line"></div>
      <div class="footer">
        <div><strong>${escapeHtml(company?.razaoSocial || "CIPERPRAG SERVICOS LTDA")}</strong> - CNPJ ${escapeHtml(company?.cnpj || "15.722.292/0001-43")}</div>
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
