import { describe, expect, it } from "vitest";
import { joinLocais, splitLocais } from "../lib/locations";

describe("locais de execução múltiplos", () => {
  it("separa por linha ou ponto e vírgula, remove vazios e duplicados", () => {
    expect(splitLocais("Bloco A\n Bloco B ;bloco a\n\n")).toEqual(["Bloco A", "Bloco B"]);
    expect(splitLocais("")).toEqual([]);
  });

  it("junta com '; ' para persistir em uma única coluna", () => {
    expect(joinLocais(["Bloco A\nBloco B"])).toBe("Bloco A; Bloco B");
    expect(joinLocais(["Rua X, 100"])).toBe("Rua X, 100");
  });
});
