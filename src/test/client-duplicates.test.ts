import { describe, expect, it } from "vitest";
import { findDuplicateClient, normalizeCnpj, normalizeName } from "../../server/client-rules.mjs";

const existing = [
  { id: "CLI-1", razao_social: "AC PARCERIA E TERRAPLENAGEM LTDA", cnpj: "25.290.339/0007-96" },
  { id: "CLI-2", razao_social: "Hospital São Lucas", cnpj: "55.666.777/0001-88" },
];

describe("duplicidade de cliente", () => {
  it("normaliza CNPJ e nome", () => {
    expect(normalizeCnpj("25.290.339/0007-96")).toBe("25290339000796");
    expect(normalizeName("  Hospital   SÃO Lucas ")).toBe("hospital sao lucas");
  });

  it("detecta CNPJ repetido com ou sem máscara", () => {
    expect(findDuplicateClient(existing, { razaoSocial: "Outra", cnpj: "25290339000796" })?.field).toBe("cnpj");
    expect(findDuplicateClient(existing, { razaoSocial: "Outra", cnpj: "00.000.000/0001-00" })).toBeNull();
  });

  it("detecta razão social repetida ignorando acento e caixa", () => {
    expect(findDuplicateClient(existing, { razaoSocial: "hospital sao lucas", cnpj: "11.111.111/0001-11" })?.field).toBe("nome");
  });

  it("editar o mesmo cliente não é duplicidade", () => {
    expect(findDuplicateClient(existing, { razaoSocial: "Hospital São Lucas", cnpj: "55.666.777/0001-88" }, { ignoreId: "CLI-2" })).toBeNull();
  });

  it("cliente já duplicado não trava edição que não muda CNPJ nem nome", () => {
    const dupes = [...existing, { id: "CLI-3", razao_social: "AC PARCERIA E TERRAPLENAGEM LTDA", cnpj: "25.290.339/0007-96" }];
    const before = { razao_social: "AC PARCERIA E TERRAPLENAGEM LTDA", cnpj: "25.290.339/0007-96" };
    expect(findDuplicateClient(dupes, { razaoSocial: "AC PARCERIA E TERRAPLENAGEM LTDA", cnpj: "25.290.339/0007-96" }, { ignoreId: "CLI-3", before })).toBeNull();
    expect(findDuplicateClient(dupes, { razaoSocial: "AC PARCERIA E TERRAPLENAGEM LTDA", cnpj: "55.666.777/0001-88" }, { ignoreId: "CLI-3", before })?.field).toBe("cnpj");
  });
});
