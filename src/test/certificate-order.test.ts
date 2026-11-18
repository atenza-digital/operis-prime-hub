import { describe, expect, it } from "vitest";
import { sortCertificates } from "../lib/certificateOrder";

const cert = (hash: string, emitidoEm: string, tag?: string, osNumero = "OS-1") => ({ hash, emitidoEm, tagEquipamentoServico: tag, osNumero });

describe("ordem dos certificados", () => {
  it("mais recente primeiro e TAGs da mesma OS em ordem crescente", () => {
    const sorted = sortCertificates([
      cert("a", "2026-10-01T10:00:00Z", "TAG-02"),
      cert("b", "2026-10-05T10:00:00Z", "TAG-10"),
      cert("c", "2026-10-05T10:00:00Z", "TAG-02"),
      cert("d", "2026-10-05T10:00:00Z", "TAG-01"),
      cert("e", "2026-10-01T10:00:00Z", "TAG-01"),
    ]);
    expect(sorted.map((item) => item.hash)).toEqual(["d", "c", "b", "e", "a"]);
  });
});
