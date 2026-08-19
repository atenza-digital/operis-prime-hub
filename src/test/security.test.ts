import { describe, expect, it } from "vitest";
import { isCorsOriginAllowed, parseCorsOrigins, securityHeaders } from "../../server/security.mjs";

describe("controles HTTP de seguranca", () => {
  it("usa allowlist configurada para CORS", () => {
    const origins = parseCorsOrigins({ CORS_ORIGINS: "https://fieldops-homologacao.atenza.digital, https://app.example.com/" });

    expect(isCorsOriginAllowed("https://fieldops-homologacao.atenza.digital", origins)).toBe(true);
    expect(isCorsOriginAllowed("https://app.example.com/", origins)).toBe(true);
    expect(isCorsOriginAllowed("https://malicioso.example", origins)).toBe(false);
    expect(isCorsOriginAllowed(undefined, origins)).toBe(true);
  });

  it("mantem origens locais quando nao ha configuracao explicita", () => {
    const origins = parseCorsOrigins({ PUBLIC_APP_URL: "https://fieldops-homologacao.atenza.digital" });

    expect(origins.has("http://localhost:5173")).toBe(true);
    expect(origins.has("https://fieldops-homologacao.atenza.digital")).toBe(true);
  });

  it("aplica headers de seguranca e HSTS somente em HTTPS", () => {
    expect(securityHeaders()).toMatchObject({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    });
    expect(securityHeaders()).not.toHaveProperty("Strict-Transport-Security");
    expect(securityHeaders({ secure: true })).toHaveProperty("Strict-Transport-Security", "max-age=31536000");
  });
});
