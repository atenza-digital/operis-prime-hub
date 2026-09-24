import crypto from 'node:crypto';

export function operationError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

export function assertExecutionDate(value) {
  const date = new Date(`${value}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw operationError('Informe uma data de execução válida.');
  }
}

export function legacyActivities(order) {
  if (Array.isArray(order.atividades) && order.atividades.length) return order.atividades;
  const tags = [...new Set(String(order.tag_equipamento_servico || order.tags || '').split(/[,;|\n]+/).map(v => v.trim()).filter(Boolean))];
  // Never redistribute shared historical photos among different equipment.
  if (tags.length > 1 && order.fotos?.length) throw operationError('Associe as fotos individualmente às atividades/equipamentos antes de emitir certificados.', 409);
  return (tags.length ? tags : ['']).map((tag, index) => ({
    id: `principal-${index + 1}`, servicoId: order.servico_catalogo_id,
    servicoNome: order.servico, quantidade: tags.length > 1 ? 1 : Number(order.quantidade ?? 1),
    unidade: order.unidade, localExecucao: order.local_execucao || '', tagEquipamento: tag,
    fotos: tags.length > 1 ? [] : order.fotos || [], produtosUtilizados: [],
    contratoId: order.contrato_id || null, naoExecutada: Boolean(order.nao_executada),
    motivoNaoExecucao: order.motivo_nao_execucao || '', checklistRespostas: order.checklist_respostas || [],
  }));
}

export function normalizeActivities(input, { closing = false } = {}) {
  if (!Array.isArray(input) || !input.length || input.length > 100) throw operationError('Informe entre 1 e 100 atividades na OS.');
  const ids = new Set();
  const evidenceOwners = new Map();
  return input.map((raw, index) => {
    if (!raw || typeof raw !== 'object') throw operationError('Atividade inválida.');
    const id = String(raw.id || crypto.randomUUID());
    if (!/^[\w-]{1,64}$/.test(id) || ids.has(id)) throw operationError('Cada atividade precisa de uma identificação única.');
    ids.add(id);
    const quantity = Number(raw.quantidade);
    if (!Number.isFinite(quantity) || quantity <= 0) throw operationError(`Informe quantidade maior que zero na atividade ${index + 1}.`);
    const tag = String(raw.tagEquipamento || '').trim();
    if (/[,;|\n]/.test(tag)) throw operationError('Informe um equipamento por atividade. Use Adicionar atividade para outros equipamentos.');
    const serviceId = String(raw.servicoId || '').trim();
    const location = String(raw.localExecucao || '').trim();
    if (!serviceId || !location) throw operationError(`Selecione serviço e local da atividade ${index + 1}.`);
    const photos = raw.fotos ?? [];
    if (!Array.isArray(photos) || photos.length > 3 || photos.some(p => typeof p !== 'string')) throw operationError('Cada atividade aceita até três fotos.');
    if (closing) for (const photo of photos) {
      const content = /^data:[^,]+;base64,/.test(photo) ? Buffer.from(photo.slice(photo.indexOf(',')+1), 'base64') : photo;
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      if (evidenceOwners.has(hash) && evidenceOwners.get(hash) !== id) throw operationError('A mesma foto foi associada a mais de uma atividade. Confira as evidências de cada equipamento.');
      evidenceOwners.set(hash, id);
    }
    const products = raw.produtosUtilizados ?? [];
    if (!Array.isArray(products)) throw operationError('Produtos utilizados inválidos.');
    const productIds = new Set();
    const usages = products.map(p => {
      const quantity = Number(p?.quantidade);
      if (!p?.produtoId || !Number.isFinite(quantity) || quantity < 0 || productIds.has(p.produtoId)) throw operationError('Informe produtos únicos e quantidades válidas por atividade.');
      productIds.add(p.produtoId);
      return { produtoId: String(p.produtoId), quantidade: quantity };
    }).filter(p => p.quantidade > 0);
    const notExecuted = raw.naoExecutada === true;
    const reason = String(raw.motivoNaoExecucao || '').trim();
    if (closing && notExecuted && !reason) throw operationError('Informe o motivo de cada atividade não executada.');
    if (closing && notExecuted && usages.length) throw operationError('Atividade não executada não pode registrar consumo de produtos.');
    return { id, servicoId: serviceId, quantidade: quantity, localExecucao: location, tagEquipamento: tag,
      fotos: photos, produtosUtilizados: usages, naoExecutada: notExecuted, motivoNaoExecucao: reason,
      contratoId: raw.contratoId || null, checklistRespostas: Array.isArray(raw.checklistRespostas) ? raw.checklistRespostas : [] };
  });
}
