export function normalizeTenantSlug(value) {
  const slug = String(value || "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(slug)) return null;
  return slug;
}

export function normalizeCommercialConfig(value, tenantSlug) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const isCiperprag = normalizeTenantSlug(tenantSlug) === "ciperprag";
  return {
    allowContractGeneration: typeof source.allowContractGeneration === "boolean" ? source.allowContractGeneration : !isCiperprag,
    allowMinutaGeneration: typeof source.allowMinutaGeneration === "boolean" ? source.allowMinutaGeneration : !isCiperprag,
    showMonthlyContractValue: typeof source.showMonthlyContractValue === "boolean" ? source.showMonthlyContractValue : !isCiperprag,
  };
}
