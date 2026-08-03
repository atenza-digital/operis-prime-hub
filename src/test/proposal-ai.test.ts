import { describe, expect, it, vi } from "vitest";
import { buildProposalCatalogContext, generateProposalAssistDraft, normalizeProposalAssistDraft } from "../../server/proposal-ai.mjs";

const clients = [
  { id: "CLI-001", razaoSocial: "Construtora G-Maia S.A.", nomeFantasia: "G-Maia", cnpj: "44.555.666/0001-77", endereco: "Rua A", municipio: "Parauapebas", uf: "PA" },
];

const services = [
  { id: "SRV-001", nome: "Controle Integrado de Pragas", descricao: "Controle técnico de pragas", unidade: "visitas", tipo: "sanitario", recorrenciaDias: 30, geraCertificado: true },
  { id: "SRV-002", nome: "Higienização de Caixas d'Água", descricao: "Limpeza técnica", unidade: "limpezas", tipo: "sanitario", recorrenciaDias: 180, geraCertificado: true },
];

describe("assistente de propostas por PDF", () => {
  it("reconcilia cliente e serviço com o catálogo do tenant", () => {
    const draft = normalizeProposalAssistDraft({
      clienteNome: "Construtora G-Maia S.A.",
      servicos: [{ servicoNome: "Controle Integrado de Pragas", quantidade: 12, valorUnitario: 480, frequencia: "Mensal", enderecoAtividade: "Unidade industrial" }],
      locaisExecucao: ["Unidade industrial"],
      confianca: "alta",
    }, { clients, services });

    expect(draft.clienteId).toBe("CLI-001");
    expect(draft.servicos[0].servicoId).toBe("SRV-001");
    expect(draft.servicos[0].quantidade).toBe(12);
    expect(draft.camposPendentes).not.toContain("cliente");
  });

  it("não aceita serviço fora do catálogo como serviço gravável", () => {
    const draft = normalizeProposalAssistDraft({
      clienteNome: "Outro cliente",
      servicos: [{ servicoNome: "Serviço inventado", quantidade: 1, valorUnitario: 10 }],
    }, { clients, services });

    expect(draft.clienteId).toBe("");
    expect(draft.servicos[0].servicoId).toBe("");
    expect(draft.camposPendentes).toEqual(expect.arrayContaining(["cliente", "serviço: Serviço inventado"]));
  });

  it("limita o contexto enviado à API aos dados necessários do tenant", () => {
    const context = buildProposalCatalogContext({ clients, services });
    expect(context.clientes[0]).toEqual(expect.objectContaining({ id: "CLI-001", cnpj: "44.555.666/0001-77" }));
    expect(context.servicos[0]).toEqual(expect.objectContaining({ id: "SRV-001", unidade: "visitas" }));
  });

  it("remove o arquivo temporário da API depois da análise", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "file-test-1" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ output_text: JSON.stringify({
        clienteId: "CLI-001",
        clienteNome: "Construtora G-Maia S.A.",
        clienteCnpj: "44.555.666/0001-77",
        titulo: null,
        objeto: null,
        modalidade: null,
        validadeDias: 30,
        locaisExecucao: [],
        escopoTecnico: [],
        condicoesComerciais: [],
        servicos: [],
        observacoes: [],
        confianca: "media",
        camposPendentes: ["serviços"],
        avisos: [],
      }) }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ deleted: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await generateProposalAssistDraft({ apiKey: "test-key", fileName: "referencia.pdf", buffer: Buffer.from("%PDF-test"), context: {} });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.openai.com/v1/files");
    expect(fetchMock.mock.calls[2][0]).toBe("https://api.openai.com/v1/files/file-test-1");
    expect(fetchMock.mock.calls[2][1].method).toBe("DELETE");
  });
});
