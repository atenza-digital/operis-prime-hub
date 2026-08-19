import { describe, expect, it } from "vitest";
import { calculateProposalContractEstimate, calculateProposalMonthlyTotal } from "@/lib/proposalCalculations";

describe("cálculo comercial da proposta", () => {
  const services = [
    { quantidade: 2, valorUnitario: 180, frequencia: "Mensal" },
    { quantidade: 1, valorUnitario: 620, frequencia: "Mensal" },
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

  it("calcula frequencia manual sem multiplicar automaticamente por 12", () => {
    expect(calculateProposalContractEstimate([{ quantidade: 1, valorUnitario: 120, frequencia: "120 dias" }], 12)).toBe(360);
  });

  it("usa as ocorrencias de cada item quando as frequencias sao diferentes", () => {
    expect(calculateProposalContractEstimate([
      { quantidade: 1, valorUnitario: 100, frequencia: "Mensal" },
      { quantidade: 1, valorUnitario: 200, frequencia: "Trimestral" },
    ], 12)).toBe(2000);
  });
});
