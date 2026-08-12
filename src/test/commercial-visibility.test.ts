import { describe, expect, it } from "vitest";
import { sanitizeContracts, sanitizeContractTemplates, sanitizeMeasurements } from "../../server/commercial-visibility.mjs";

describe("visibilidade de valores por permissao", () => {
  it("remove valores de contratos e propostas para a operacao", () => {
    const contracts = [{ id: "CT-1", valorUnitario: 480 }];
    const templates = [{ id: "PC-1", servicos: [{ servicoId: "SRV-1", valorUnitario: 480 }] }];

    expect(sanitizeContracts(contracts, ["os.manage"])[0]).not.toHaveProperty("valorUnitario");
    expect(sanitizeContractTemplates(templates, ["os.manage"])[0].servicos[0]).not.toHaveProperty("valorUnitario");
  });

  it("mantem valores para o perfil comercial", () => {
    const contracts = [{ id: "CT-1", valorUnitario: 480 }];
    const templates = [{ id: "PC-1", servicos: [{ servicoId: "SRV-1", valorUnitario: 480 }] }];

    expect(sanitizeContracts(contracts, ["contratos.manage"])[0].valorUnitario).toBe(480);
    expect(sanitizeContractTemplates(templates, ["contratos.manage"])[0].servicos[0].valorUnitario).toBe(480);
  });

  it("mantem somente a estrutura operacional da medicao sem permissao financeira", () => {
    const measurements = [{ id: "MED-1", total: 980, itens: [{ osId: "OS-1", valorUnitario: 480, valorTotal: 980 }] }];
    const sanitized = sanitizeMeasurements(measurements, ["os.manage"])[0];

    expect(sanitized).not.toHaveProperty("total");
    expect(sanitized.itens[0]).not.toHaveProperty("valorUnitario");
    expect(sanitized.itens[0]).not.toHaveProperty("valorTotal");
    expect(sanitizeMeasurements(measurements, ["medicoes.manage"])[0].total).toBe(980);
  });
});
