import { afterEach, describe, expect, it, vi } from "vitest";
import { generateProposalFromPdf } from "@/lib/api";

describe("transporte da análise de proposta", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("encaminha o sinal de cancelamento para a API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    await generateProposalFromPdf({ fileName: "referencia.pdf", mimeType: "application/pdf", contentBase64: "data:application/pdf;base64,dGVzdA==" }, controller.signal);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/contract-templates/proposal-assist",
      expect.objectContaining({ method: "POST", signal: controller.signal }),
    );
  });
});
