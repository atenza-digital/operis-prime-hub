const policies = {
  'Propostas aprovadas sem minuta gerada identificada': {
    columns: 'p.id, p.numero, p.status', flag: 'allowMinutaGeneration',
    action: 'Conferir necessidade de minuta; vinculo por texto nao prova ausencia documental.',
    disabled: 'Minutas desativadas para o tenant. Preservar propostas; nao gerar documentos apenas para zerar indicador.',
  },
  'Minutas aprovadas sem contrato final gerado identificado': {
    columns: 'm.id, m.numero, m.status', flag: 'allowContractGeneration',
    action: 'Conferir necessidade de contrato; vinculo por texto nao prova ausencia documental.',
    disabled: 'Contratos desativados para o tenant. Preservar historico; nao gerar contratos automaticamente.',
  },
  'Contratos vigentes sem item operacional sincronizado': {
    columns: 't.id, t.numero, t.status', integrity: true,
    action: 'Conferir itens e sincronizacao do contrato antes de novos atendimentos contratuais.',
  },
  'Agendamentos em aberto sem OS gerada': {
    columns: 'id, status, data_agendada',
    action: 'Pode representar planejamento normal. Conferir data e situacao com a equipe; nao cancelar nem gerar OS automaticamente.',
  },
  'OS encerradas sem snapshot de encerramento': {
    columns: 'id, numero, status', integrity: true,
    action: 'Conferir legado e evidencias; nao fabricar execucao nem sobrescrever documento emitido.',
  },
  'OS encerradas sem medicao vinculada': {
    columns: 'o.id, o.numero, o.status, o.data_execucao, o.nao_executada',
    action: 'Separar atividades faturaveis de nao executadas e avulsas. Conferir periodo e valores; nao gerar medicao apenas para zerar indicador.',
  },
  'Certificados emitidos sem documento historico imutavel': {
    columns: 'c.id, c.numero, c.status', integrity: true,
    action: 'Conferir arquivo historico e eventual reemissao formal; nao substituir silenciosamente o PDF.',
  },
};

export function operationalAuditPolicy(title, total, commercial) {
  const policy = policies[title];
  if (!policy) throw new Error(`Verificacao de auditoria sem politica: ${title}`);
  const applicable = !policy.flag || commercial[policy.flag] !== false;
  return {
    columns: policy.columns,
    classification: policy.integrity ? 'integridade_documental' : 'etapa_operacional',
    status: !total ? 'OK' : !applicable ? 'Nao aplicavel' : policy.integrity ? 'Revisar integridade' : 'Conferir fluxo',
    action: applicable ? policy.action : policy.disabled,
  };
}
