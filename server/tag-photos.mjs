// Fotos por equipamento (TAG): cada certificado leva somente as fotos da sua TAG.
export function normalizeTagKey(tag) {
  return String(tag || "").trim().toLocaleUpperCase("pt-BR");
}

const MAX_TAGS = 30;

// Converte o payload `fotosPorTag` ({ "TAG-01": [base64, ...] }) em grupos
// validados por quantidade. Retorna null quando o payload nao foi enviado
// (fluxo antigo: fotos unicas para a OS).
export function parseTagPhotoGroups(fotosPorTag, maxPerTag) {
  if (fotosPorTag === undefined || fotosPorTag === null) return null;
  if (typeof fotosPorTag !== "object" || Array.isArray(fotosPorTag)) {
    const error = new Error("Formato de fotos por equipamento invalido.");
    error.status = 400;
    throw error;
  }
  const groups = new Map();
  for (const [rawTag, value] of Object.entries(fotosPorTag)) {
    const key = normalizeTagKey(rawTag);
    if (!key) continue;
    const fotos = Array.isArray(value) ? value : [];
    const current = groups.get(key) || { tag: key, fotos: [] };
    current.fotos.push(...fotos);
    groups.set(key, current);
  }
  if (groups.size > MAX_TAGS) {
    const error = new Error(`Informe fotos para no maximo ${MAX_TAGS} equipamentos por OS.`);
    error.status = 400;
    throw error;
  }
  for (const group of groups.values()) {
    if (group.fotos.length > maxPerTag) {
      const error = new Error(`Anexe no maximo ${maxPerTag} fotos por equipamento (${group.tag}).`);
      error.status = 400;
      throw error;
    }
  }
  return [...groups.values()];
}

export function photosForTag(fotosByTag, tag) {
  if (!fotosByTag) return null;
  return fotosByTag[normalizeTagKey(tag)] || [];
}
