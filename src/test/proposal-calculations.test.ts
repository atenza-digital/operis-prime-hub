import { describe, expect, it } from "vitest";
import { calculateProposalContractEstimate, calculateProposalMonthlyTotal } from "@/lib/proposalCalculations";

describe("cálculo comercial da proposta", () => {
  const services = [
    { quantidade: 2, valorUnitario: 180 },
    { quantidade: 1, valorUnitario: 620 },
  ];

  it("calcula o valor mensal a partir dos itens do catálogo", () => {
    expect(calculateProposalMonthlyTotal(services)).toBe(980);
  });

  it("calcula o valor total estimado pela vigência em meses", () => {
    expect(calculateProposalContractEstimate(services, 12)).toBe(11760);
  });

  it("não gera estimativa negativa quando a vigência está vazia ou inválida", () => {
    expect(calculateProposalContractEstimate(services, 0)).toBe(0);
    expect(calculateProposalContractEstimate(services, -3)).toBe(0);
  });
});
