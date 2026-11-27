export function parseValidityOverride(value) {
  if (value === undefined || value === null || value === "") return null;
  const days = Number(value);
  if (!Number.isInteger(days) || days < 0 || days > 3650) {
    const error = new Error("Validade do certificado deve ser um numero inteiro de dias entre 0 e 3650.");
    error.status = 400;
    throw error;
  }
  return days;
}

export function resolveValidityDays(override, serviceDays, defaultDays) {
  if (override !== null && override !== undefined) return override;
  return Number(serviceDays || defaultDays || 0);
}
