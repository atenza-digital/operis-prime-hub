import { afterEach, describe, expect, it, vi } from "vitest";
import { getBootstrap, getStockProducts } from "@/lib/api";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("api text normalization", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("repara textos legados do bootstrap sem alterar hashes, urls e base64", async () => {
    const base64 = "data:image/png;base64,QUJDREVGR0g=";
    const hash = "08E597799288ED0B52DA";

    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({
      clients: [
        {
          razaoSocial: "Metal??rgica Sigma",
          logoUrl: "https://cdn.exemplo.com/logo??tenant=ciperprag",
        },
      ],
      services: [
        {
          nome: "Higieniza????o de Cx. D????gua",
          aplicacao: "Aplicavel ao servico Tecnico",
          epis: ["M??scara PFF2", "Luva Nitr??lica"],
        },
      ],
      attachments: [
        {
          conteudoBase64: base64,
          hashSha256: hash,
          downloadUrl: "/api/attachments/att-1/download??download=1",
        },
      ],
    })));

    const data = await getBootstrap();

    expect(data.clients[0].razaoSocial).toBe("Metalúrgica Sigma");
    expect(data.services[0].nome).toBe("Higienização de Cx. D'água");
    expect(data.services[0].aplicacao).toBe("Aplicável ao serviço Técnico");
    expect(data.services[0].epis).toEqual(["Máscara PFF2", "Luva Nitrílica"]);
    expect(data.clients[0].logoUrl).toBe("https://cdn.exemplo.com/logo??tenant=ciperprag");
    expect(data.attachments[0].conteudoBase64).toBe(base64);
    expect(data.attachments[0].hashSha256).toBe(hash);
    expect(data.attachments[0].downloadUrl).toBe("/api/attachments/att-1/download??download=1");
  });

  it("consulta o catalogo de estoque por endpoint leve", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({
      ok: true,
      products: [{
        id: "PROD-001",
        codigo: "PROD-001",
        nome: "Produto de teste",
        descricao: "",
        unidade: "un.",
        quantidadeAtual: 2,
        estoqueMinimo: 1,
        ativo: true,
        movimentos: [],
      }],
    })));

    const response = await getStockProducts();

    expect(response.products).toHaveLength(1);
    expect(response.products[0].codigo).toBe("PROD-001");
    expect(fetch).toHaveBeenCalledWith("/api/stock/products", expect.any(Object));
  });
});
