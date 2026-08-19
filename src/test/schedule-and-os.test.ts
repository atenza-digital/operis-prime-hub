import { describe, expect, it } from "vitest";
import { buildScheduleInsertValues, validateScheduleOrigin } from "../../server/schedule-rules.mjs";
import { buildOsPrintHtml } from "@/lib/osPrint";

const service = { id: "SRV-001", nome: "Coleta de água em bebedouro", tipo: "sanitario", unidade: "pontos", ativo: true };

describe("origem do agendamento", () => {
  it("aceita serviço ativo sem contrato e marca a origem como avulsa", () => {
    expect(validateScheduleOrigin({ contractId: null, contract: null, service })).toEqual({
      ok: true,
      avulso: true,
      serviceId: "SRV-001",
    });
  });

  it("mantém a exigência de contrato vigente e saldo para o fluxo contratual", () => {
    const result = validateScheduleOrigin({
      contractId: "CT-001",
      contract: { id: "CT-001", status: "ativo", contratado: 4, executado: 1, template_tipo: "contrato", template_status: "vigente", servico_catalogo_id: "SRV-001" },
      service,
    });

    expect(result).toEqual({ ok: true, avulso: false, serviceId: "SRV-001" });
  });

  it("bloqueia contrato sem saldo", () => {
    const result = validateScheduleOrigin({
      contractId: "CT-001",
      contract: { status: "ativo", contratado: 1, executado: 1, template_tipo: "contrato", template_status: "vigente" },
      service,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("saldo");
  });

  it("mantém local livre e os 19 parâmetros do INSERT alinhados às colunas", () => {
    const values = buildScheduleInsertValues({
      id: "AG-001",
      tenantId: "TEN-001",
      serviceId: "SRV-001",
      customerId: "CLI-001",
      customerName: "MIP Gelado",
      customerCnpj: "11.222.333/0001-44",
      serviceName: "Roço e manutenção",
      serviceType: "manutencao",
      scheduledDate: "2026-08-20",
      locationName: "Canteiro C2",
    });

    expect(values).toHaveLength(19);
    expect(values[10]).toBeNull();
    expect(values[11]).toBe("Canteiro C2");
    expect(values[18]).toBe("agendado");
  });
});

describe("template da OS", () => {
  it("nao repete colaborador nem data de admissao no cabecalho", () => {
    const html = buildOsPrintHtml({
      id: "OSDB-001",
      numero: "OS-100/2026",
      clienteNome: "Cliente de teste",
      clienteCnpj: "11.222.333/0001-44",
      contratoId: null,
      servico: service.nome,
      tipo: "sanitario",
      tecnicoNome: "Tarcísio Lucas",
      tecnicoCpf: "000.000.000-00",
      tecnicoDataAdmissao: "2020-01-02",
      localExecucao: "Área administrativa",
      dataEmissao: "2026-08-19",
      quantidade: 1,
      unidade: "ponto",
      status: "aberta",
      fotos: [],
    }, { bootstrap: { companyConfig: null, contracts: [], clients: [], services: [service], technicians: [], vehicles: [] } } as never);

    expect(html).toContain("Atendimento avulso");
    expect(html).not.toContain("COLABORADOR:");
    expect(html).not.toContain("Data de Admissão");
    expect(html).toContain("Data de Emissão:");
  });
});
