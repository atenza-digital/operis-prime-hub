import type { ContratoServico } from "@/lib/api";

export function calculateProposalMonthlyTotal(servicos: Pick<ContratoServico, "quantidade" | "valorUnitario">[]) {
  return servicos.reduce(
    (total, item) => total + Number(item.quantidade || 0) * Number(item.valorUnitario || 0),
    0,
  );
}

export function calculateProposalContractEstimate(
  servicos: Pick<ContratoServico, "quantidade" | "valorUnitario">[],
  vigenciaMeses: number,
) {
  const months = Math.max(Number(vigenciaMeses) || 0, 0);
  return calculateProposalMonthlyTotal(servicos) * months;
}
