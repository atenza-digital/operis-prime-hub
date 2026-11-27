import { describe, expect, it } from "vitest";
import { parseTagPhotoGroups, photosForTag } from "../../server/tag-photos.mjs";

describe("fotos por equipamento (TAG)", () => {
  it("retorna null quando o payload não foi enviado (fluxo antigo)", () => {
    expect(parseTagPhotoGroups(undefined, 3)).toBeNull();
    expect(parseTagPhotoGroups(null, 3)).toBeNull();
  });

  it("agrupa por TAG ignorando maiúsculas e rejeita mais de 3 fotos por TAG", () => {
    const groups = parseTagPhotoGroups({ "tag-01": ["a", "b"], "TAG-01": ["c"], "TAG-02": ["d"] }, 3);
    expect(groups).toEqual([
      { tag: "TAG-01", fotos: ["a", "b", "c"] },
      { tag: "TAG-02", fotos: ["d"] },
    ]);
    expect(() => parseTagPhotoGroups({ "TAG-01": ["a", "b", "c", "d"] }, 3)).toThrow(/TAG-01/);
    expect(() => parseTagPhotoGroups([], 3)).toThrow();
  });

  it("cada certificado recebe somente as fotos da sua TAG", () => {
    const byTag = { "TAG-01": ["f1"], "TAG-02": ["f2", "f3"] };
    expect(photosForTag(byTag, "tag-02")).toEqual(["f2", "f3"]);
    expect(photosForTag(byTag, "TAG-09")).toEqual([]);
    expect(photosForTag(null, "TAG-01")).toBeNull();
  });
});
