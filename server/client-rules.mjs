export function normalizeCnpj(value) {
  return String(value || "").replace(/\D/g, "");
}

export function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Retorna { field: "cnpj" | "nome", client } quando `candidate` repete o CNPJ
// ou a razao social de outro cliente da lista (ja filtrada pelo tenant).
// Em edicao (`before`), so valida o campo que mudou, para nao travar quem ja
// esta duplicado na base.
export function findDuplicateClient(existing, candidate, { ignoreId = null, before = null } = {}) {
  const cnpj = normalizeCnpj(candidate.cnpj);
  const nome = normalizeName(candidate.razaoSocial);
  const checkCnpj = Boolean(cnpj) && (!before || normalizeCnpj(before.cnpj) !== cnpj);
  const checkNome = Boolean(nome) && (!before || normalizeName(before.razaoSocial ?? before.razao_social) !== nome);
  for (const client of existing) {
    if (ignoreId && client.id === ignoreId) continue;
    if (checkCnpj && normalizeCnpj(client.cnpj) === cnpj) return { field: "cnpj", client };
    if (checkNome && normalizeName(client.razaoSocial ?? client.razao_social) === nome) return { field: "nome", client };
  }
  return null;
}
