const BRAZIL_LOCALE = "pt-BR";
const BRAZIL_TIME_ZONE = "America/Fortaleza";

export function formatDateBr(date?: string | null) {
  if (!date) return "—";
  const normalized = date.includes("T") ? date : `${date}T12:00:00`;
  return new Date(normalized).toLocaleDateString(BRAZIL_LOCALE, {
    timeZone: BRAZIL_TIME_ZONE,
  });
}

export function formatTimeBr(date?: string | null) {
  if (!date) return "";
  return new Date(date).toLocaleTimeString(BRAZIL_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: BRAZIL_TIME_ZONE,
  });
}

export function todayInputDateBr() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: BRAZIL_TIME_ZONE,
    year: "numeric",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
