import { describe, expect, it } from "vitest";
import { buildAttachmentSecurityMetadata, buildTenantObjectKey, createAttachmentStoragePlan, persistAttachmentContent, resolveAttachmentPolicy, resolveDocumentStorageConfig, sanitizeStorageSegment, validateAttachmentPayload } from "../../server/storage.mjs";

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

  it("ativa R2 somente quando bucket e credenciais estao completos", () => {
    const config = resolveDocumentStorageConfig({
      DOCUMENT_STORAGE_PROVIDER: "r2",
      RUNTIME_ENV: "homologacao",
      R2_BUCKET_DOCUMENTS: "fieldops-homologacao-docs",
      R2_ACCOUNT_ID: "account-id",
      R2_ACCESS_KEY_ID: "access-key",
      R2_SECRET_ACCESS_KEY: "secret-key",
    });

    expect(config.activeProvider).toBe("r2");
    expect(config.r2Ready).toBe(true);
  });

  it("mantem conteudo no banco quando R2 nao esta pronto", async () => {
    const env = {
      DOCUMENT_STORAGE_PROVIDER: "r2",
      RUNTIME_ENV: "homologacao",
      R2_BUCKET_DOCUMENTS: "fieldops-homologacao-docs",
    };
    const plan = createAttachmentStoragePlan({
      tenantSlug: "ciperprag",
      entityType: "proposta",
      entityId: "PC-001",
      category: "documento",
      fileName: "proposta.html",
      hashSha256: "ABCDEF1234567890",
      env,
    });
    const persisted = await persistAttachmentContent({
      storagePlan: plan,
      contentBase64: "data:text/html;base64,PGgxPk9LPC9oMT4=",
      mimeType: "text/html",
      hashSha256: "ABCDEF1234567890",
      fileName: "proposta.html",
      metadata: { origem: "teste" },
      env,
    });

    expect(persisted.provider).toBe("database");
    expect(persisted.contentBase64).toBe("data:text/html;base64,PGgxPk9LPC9oMT4=");
    expect(persisted.metadata.storageUpload).toBe("database");
    expect(persisted.metadata.plannedStorageProvider).toBe("r2");
  });

  it("valida anexo base64, mime permitido e tamanho real", () => {
    const payload = validateAttachmentPayload({
      contentBase64: "data:image/png;base64,iVBORw0KGgo=",
      allowedMimeTypes: new Set(["image/png"]),
      maxBytes: 10,
      label: "foto",
    });

    expect(payload.mimeType).toBe("image/png");
    expect(payload.bytes).toBe(8);
    expect(payload.dataUrl).toBe("data:image/png;base64,iVBORw0KGgo=");
  });

  it("bloqueia anexos com mime divergente, formato invalido ou tamanho acima do limite", () => {
    expect(() => validateAttachmentPayload({
      contentBase64: "data:image/png;base64,iVBORw0KGgo=",
      declaredMimeType: "image/jpeg",
      allowedMimeTypes: new Set(["image/jpeg"]),
      maxBytes: 10,
      label: "foto",
    })).toThrow(/divergente/);

    expect(() => validateAttachmentPayload({
      contentBase64: "nao-e-base64",
      allowedMimeTypes: new Set(["image/png"]),
      maxBytes: 10,
      label: "foto",
    })).toThrow(/base64/);

    expect(() => validateAttachmentPayload({
      contentBase64: "data:image/png;base64,iVBORw0KGgo=",
      allowedMimeTypes: new Set(["image/png"]),
      maxBytes: 4,
      label: "foto",
    })).toThrow(/maximo/);
  });

  it("bloqueia arquivo com base64 valido mas assinatura incompativel", () => {
    expect(() => validateAttachmentPayload({
      contentBase64: "data:image/png;base64,aGVsbG8=",
      allowedMimeTypes: new Set(["image/png"]),
      maxBytes: 10,
      label: "foto",
    })).toThrow(/assinatura/);
  });

  it("resolve politicas padrao de upload por familia documental", () => {
    expect(resolveAttachmentPolicy("os.foto")).toMatchObject({
      key: "os.foto",
      maxFiles: 3,
      maxBytes: 5 * 1024 * 1024,
      allowedMimeTypes: ["image/png", "image/jpeg"],
    });

    expect(resolveAttachmentPolicy("minuta.documento")).toMatchObject({
      key: "minuta.documento",
      maxFiles: 1,
      maxBytes: 8 * 1024 * 1024,
    });

    expect(resolveAttachmentPolicy("servico_pop.pop_aprovado")).toMatchObject({
      key: "servico_pop.pop_aprovado",
      maxFiles: 1,
      maxBytes: 12 * 1024 * 1024,
    });

    expect(resolveAttachmentPolicy("documento.pdf_historico")).toMatchObject({
      key: "documento.pdf_historico",
      allowedMimeTypes: ["application/pdf", "text/html"],
    });
  });

  it("permite sobrescrever politica de upload pela configuracao do tenant", () => {
    const policy = resolveAttachmentPolicy("os.foto", {
      uploadPolicies: {
        "os.foto": {
          maxFiles: 2,
          maxBytes: 1024,
          allowedMimeTypes: ["image/jpeg"],
        },
      },
    });

    expect(policy).toEqual({
      key: "os.foto",
      maxFiles: 2,
      maxBytes: 1024,
      allowedMimeTypes: ["image/jpeg"],
      securityScan: {
        required: false,
        provider: "not_configured",
        quarantineMode: "disabled",
        blockingMode: "metadata_only",
      },
    });
  });

  it("prepara metadados de seguranca para auditoria futura de uploads", () => {
    const policy = resolveAttachmentPolicy("cliente.documento", {
      uploadPolicies: {
        "cliente.documento": {
          securityScan: {
            required: true,
            provider: "cloudflare_or_external_av",
            quarantineMode: "enabled",
            blockingMode: "future_blocking",
          },
        },
      },
    });

    expect(buildAttachmentSecurityMetadata(policy)).toMatchObject({
      uploadPolicyKey: "cliente.documento",
      securityScanRequired: true,
      securityScanProvider: "cloudflare_or_external_av",
      securityScanStatus: "pending_provider",
      quarantineMode: "enabled",
      quarantineStatus: "planned",
      securityBlockingMode: "future_blocking",
    });
  });
});
