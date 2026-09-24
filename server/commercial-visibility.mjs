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

function withoutNestedValues(value) {
  if (Array.isArray(value)) return value.map(withoutNestedValues);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !['valorUnitario', 'valorTotal', 'total'].includes(key))
    .map(([key, child]) => [key, withoutNestedValues(child)]));
}

export function sanitizeOrders(orders, permissions = []) {
  return canViewCommercialValues(permissions) || canViewMeasurementValues(permissions) ? orders : withoutNestedValues(orders);
}

export function sanitizeContracts(contracts, permissions = []) {
  if (canViewCommercialValues(permissions)) return contracts;
  return withoutNestedValues(contracts);
}

export function sanitizeContractTemplates(templates, permissions = []) {
  if (canViewCommercialValues(permissions)) return templates;
  return withoutNestedValues(templates);
}

export function sanitizeMeasurements(measurements, permissions = []) {
  if (canViewMeasurementValues(permissions)) return measurements;
  return withoutNestedValues(measurements);
}
