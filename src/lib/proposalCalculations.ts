import type { ContratoServico } from "@/lib/api";

export function frequencyToDays(frequency: string | null | undefined) {
  const value = String(frequency || "").trim().toLocaleLowerCase("pt-BR");
  const numberMatch = value.match(/(\d+(?:[.,]\d+)?)\s*(?:dias?|d)/i);
  if (numberMatch) return Math.max(1, Number(numberMatch[1].replace(",", ".")));
  if (value.includes("diar")) return 1;
  if (value.includes("seman")) return 7;
  if (value.includes("quinzen")) return 15;
  if (value.includes("bimestr")) return 60;
  if (value.includes("trimestr")) return 90;
  if (value.includes("semestr")) return 180;
  if (value.includes("anual") || value.includes("ano")) return 365;
  if (value.includes("mensal") || value.includes("mês") || value.includes("mes")) return 30;
  return null;
}

export function frequencyOccurrences(frequency: string | null | undefined, validityMonths: number) {
  const months = Math.max(Number(validityMonths) || 0, 0);
  if (!months) return 0;
  const days = frequencyToDays(frequency);
  if (!days) return 1;
  return Math.max(1, Math.ceil((months * 30) / days));
}

export function calculateProposalMonthlyTotal(servicos: Pick<ContratoServico, "quantidade" | "valorUnitario">[]) {
  return servicos.reduce(
    (total, item) => total + Number(item.quantidade || 0) * Number(item.valorUnitario || 0),
    0,
  );
}

export function calculateProposalContractEstimate(
  servicos: Pick<ContratoServico, "quantidade" | "valorUnitario" | "frequencia">[],
  vigenciaMeses: number,
) {
  return servicos.reduce(
    (total, item) => total + Number(item.quantidade || 0) * Number(item.valorUnitario || 0) * frequencyOccurrences(item.frequencia, vigenciaMeses),
    0,
  );
}
