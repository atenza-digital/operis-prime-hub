import { describe, expect, it } from "vitest";
import { normalizeCommercialConfig } from "../../server/commercial-config.mjs";

describe("configuração comercial por tenant", () => {
  it("desativa novos contratos, minutas e valor mensal por padrão para Ciperprag", () => {
    expect(normalizeCommercialConfig({}, "ciperprag")).toEqual({
      allowContractGeneration: false,
      allowMinutaGeneration: false,
      showMonthlyContractValue: false,
    });
  });

  it("mantém os recursos ativos por padrão para outros tenants", () => {
    expect(normalizeCommercialConfig({}, "outro-tenant")).toEqual({
      allowContractGeneration: true,
      allowMinutaGeneration: true,
      showMonthlyContractValue: true,
    });
  });

  it("preserva uma configuração explícita do administrador", () => {
    expect(normalizeCommercialConfig({ allowContractGeneration: true, showMonthlyContractValue: true }, "ciperprag")).toEqual({
      allowContractGeneration: true,
      allowMinutaGeneration: false,
      showMonthlyContractValue: true,
    });
  });
});
