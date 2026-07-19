import { describe, expect, it } from "vitest";
import { buildTenantObjectKey, createAttachmentStoragePlan, resolveDocumentStorageConfig, sanitizeStorageSegment } from "../../server/storage.mjs";

describe("document storage planning", () => {
  it("normaliza segmentos para chaves seguras e previsiveis", () => {
    expect(sanitizeStorageSegment(" Ciperprag Serviços / PA ")).toBe("ciperprag-servicos-pa");
    expect(sanitizeStorageSegment("")).toBe("item");
  });

  it("gera chave por ambiente, tenant, entidade, categoria e hash", () => {
    const key = buildTenantObjectKey({
      environment: "Homologação",
      tenantSlug: "CIPERPRAG",
      entityType: "OS",
      entityId: "OS-2677",
      category: "Foto",
      fileName: "Evidência Técnica 01.JPG",
      hashSha256: "08E597799288ED0B52DA",
      issuedAt: "2026-07-19T12:00:00Z",
    });

    expect(key).toBe("homologacao/tenants/ciperprag/os/os-2677/foto/2026/07/08e597799288ed0b-evidencia-tecnica-01.jpg");
  });

  it("mantem banco como storage ativo e registra plano R2 quando bucket existe", () => {
    const plan = createAttachmentStoragePlan({
      tenantSlug: "ciperprag",
      entityType: "certificado",
      entityId: "CERT-001",
      category: "pdf_historico",
      fileName: "certificado-001.html",
      hashSha256: "ABCDEF1234567890",
      issuedAt: "2026-07-19T12:00:00Z",
      env: {
        RUNTIME_ENV: "homologacao",
        R2_BUCKET_DOCUMENTS: "fieldops-homologacao-docs",
      },
    });

    expect(plan.provider).toBe("database");
    expect(plan.plannedProvider).toBe("r2");
    expect(plan.plannedBucket).toBe("fieldops-homologacao-docs");
    expect(plan.plannedKey).toBe("homologacao/tenants/ciperprag/certificado/cert-001/pdf_historico/2026/07/abcdef1234567890-certificado-001.html");
  });

  it("diferencia provider solicitado de provider ativo ate haver credenciais completas", () => {
    const config = resolveDocumentStorageConfig({
      DOCUMENT_STORAGE_PROVIDER: "r2",
      RUNTIME_ENV: "producao",
      R2_BUCKET_DOCUMENTS: "fieldops-producao-docs",
    });

    expect(config.requestedProvider).toBe("r2");
    expect(config.activeProvider).toBe("database");
    expect(config.plannedProvider).toBe("r2");
    expect(config.r2Ready).toBe(false);
  });
});
