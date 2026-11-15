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

describe("OS no modelo original", () => {
  const baseOs = {
    id: "OSDB-001",
    numero: "OS-100/2026",
    clienteNome: "Cliente de teste",
    clienteCnpj: "11.222.333/0001-44",
    contratoId: null,
    servico: service.nome,
    tipo: "sanitario" as const,
    tecnicoNome: "Tarcísio Lucas",
    tecnicoCpf: "000.000.000-00",
    localExecucao: "Área administrativa",
    dataEmissao: "2026-08-19",
    quantidade: 1,
    unidade: "ponto",
    status: "aberta" as const,
    fotos: [],
  };
  const bootstrap = { companyConfig: null, contracts: [], clients: [], services: [service], technicians: [], vehicles: [], orders: [] } as never;

  it("imprime a quantidade em branco e não mostra função nem CPF", () => {
    const html = buildOsPrintHtml(baseOs as never, { bootstrap: bootstrap });
    expect(html).toContain("Quantidade");
    expect(html).not.toMatch(/<td[^>]*>1<\/td><td[^>]*>Descri/);
    expect(html).not.toContain("FUNÇÃO");
    expect(html).not.toContain("000.000.000-00");
  });

  it("usa os textos do modelo original (NR35, ergonomia 23 kg, ato faltoso)", () => {
    const html = buildOsPrintHtml(baseOs as never, { bootstrap });
    expect(html).toContain("Treinamento em altura (NR35)");
    expect(html).toContain("23 kg por colaborador");
    expect(html).toContain("Constitui ato faltoso e, portanto passível de punição");
    expect(html).toContain("Recebi da empresa");
  });

  it("lista todos os serviços do grupo e um bloco de observação por serviço", () => {
    const segunda = { ...baseOs, id: "OSDB-002", numero: "OS-101/2026", servico: "Higienização de Caixa d'Água", grupoId: "GRP-1" };
    const primeira = { ...baseOs, grupoId: "GRP-1" };
    const html = buildOsPrintHtml(primeira as never, { bootstrap, groupOrders: [segunda, primeira] as never });
    expect(html).toContain(`( X ) ${service.nome.toUpperCase()}, ( X ) HIGIENIZAÇÃO DE CAIXA D&#39;ÁGUA`.replace("&#39;", "'"));
    expect(html).toContain("Altura SIM( ) NÃO( )");
    expect(html).toContain("Inclui: 101 / 2026");
  });
});
