const COMMERCIAL_VALUE_PERMISSION = "contratos.manage";
const MEASUREMENT_VALUE_PERMISSION = "medicoes.manage";

export function canViewCommercialValues(permissions = []) {
  return permissions.includes(COMMERCIAL_VALUE_PERMISSION);
}

export function canViewMeasurementValues(permissions = []) {
  return permissions.includes(MEASUREMENT_VALUE_PERMISSION);
}

function withoutKeys(value, keys) {
  if (!value || typeof value !== "object") return value;
  const copy = { ...value };
  for (const key of keys) delete copy[key];
  return copy;
}

export function sanitizeContracts(contracts, permissions = []) {
  if (canViewCommercialValues(permissions)) return contracts;
  return contracts.map((contract) => withoutKeys(contract, ["valorUnitario"]));
}

export function sanitizeContractTemplates(templates, permissions = []) {
  if (canViewCommercialValues(permissions)) return templates;
  return templates.map((template) => ({
    ...template,
    servicos: (template.servicos || []).map((service) => withoutKeys(service, ["valorUnitario"])),
  }));
}

export function sanitizeMeasurements(measurements, permissions = []) {
  if (canViewMeasurementValues(permissions)) return measurements;
  return measurements.map((measurement) => withoutKeys({
    ...measurement,
    itens: (measurement.itens || []).map((item) => withoutKeys(item, ["valorUnitario", "valorTotal"])),
  }, ["total"]));
}
