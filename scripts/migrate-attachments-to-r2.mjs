import crypto from "node:crypto";
import { pool, query } from "../server/db.mjs";
import { createAttachmentStoragePlan, persistAttachmentContent, resolveDocumentStorageConfig } from "../server/storage.mjs";

const schemaName = "ciperprag_hub";
const args = new Map(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith("--") && arg.includes("="))
    .map((arg) => {
      const [key, ...value] = arg.slice(2).split("=");
      return [key, value.join("=")];
    }),
);

const apply = process.argv.includes("--apply") || process.env.STORAGE_MIGRATION_APPLY === "true";
const keepDatabaseCopy = process.argv.includes("--keep-database-copy") || process.env.STORAGE_MIGRATION_KEEP_DATABASE_COPY === "true";
const tenantSlug = args.get("tenant") || process.env.STORAGE_MIGRATION_TENANT || "ciperprag";
const entityType = args.get("entity-type") || process.env.STORAGE_MIGRATION_ENTITY_TYPE || null;
const category = args.get("category") || process.env.STORAGE_MIGRATION_CATEGORY || null;
const limit = Number(args.get("limit") || process.env.STORAGE_MIGRATION_LIMIT || 50);

function quoteIdent(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function sha256Hex(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function parseStoredContent(value, fallbackMimeType) {
  const content = String(value || "");
  const dataUrlMatch = content.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    return {
      buffer: Buffer.from(dataUrlMatch[2], "base64"),
      contentBase64: content,
      mimeType: dataUrlMatch[1] || fallbackMimeType || "application/octet-stream",
    };
  }

  const base64Like = /^[A-Za-z0-9+/=\r\n]+$/.test(content) && content.replace(/\s/g, "").length % 4 === 0;
  if (base64Like) {
    const clean = content.replace(/\s/g, "");
    return {
      buffer: Buffer.from(clean, "base64"),
      contentBase64: `data:${fallbackMimeType || "application/octet-stream"};base64,${clean}`,
      mimeType: fallbackMimeType || "application/octet-stream",
    };
  }

  const buffer = Buffer.from(content, "utf8");
  return {
    buffer,
    contentBase64: `data:${fallbackMimeType || "text/plain"};base64,${buffer.toString("base64")}`,
    mimeType: fallbackMimeType || "text/plain",
  };
}

function buildWhereClause(tenantId) {
  const clauses = [
    "tenant_id = $1",
    "conteudo_base64 IS NOT NULL",
    "COALESCE(storage_provider, 'database') <> 'r2'",
  ];
  const params = [tenantId];
  if (entityType) {
    params.push(entityType);
    clauses.push(`entidade_tipo = $${params.length}`);
  }
  if (category) {
    params.push(category);
    clauses.push(`categoria = $${params.length}`);
  }
  params.push(limit);
  return {
    where: clauses.join(" AND "),
    params,
    limitParam: `$${params.length}`,
  };
}

async function getTenant() {
  const { rows } = await query(
    `SELECT id, slug, nome_fantasia, razao_social
       FROM ${quoteIdent(schemaName)}.tenants
      WHERE slug = $1
      LIMIT 1`,
    [tenantSlug],
  );
  const tenant = rows[0];
  if (!tenant) throw new Error(`Tenant nao encontrado: ${tenantSlug}`);
  return tenant;
}

async function findCandidates(tenantId) {
  const { where, params, limitParam } = buildWhereClause(tenantId);
  const { rows } = await query(
    `SELECT id, tenant_id, entidade_tipo, entidade_id, categoria, nome_arquivo, mime_type,
            tamanho_bytes, conteudo_base64, metadados, hash_sha256, criado_em
       FROM ${quoteIdent(schemaName)}.evidencias_anexos
      WHERE ${where}
      ORDER BY criado_em NULLS FIRST, id
      LIMIT ${limitParam}`,
    params,
  );
  return rows;
}

async function summarizePending(tenantId) {
  const { rows } = await query(
    `SELECT entidade_tipo, categoria, COUNT(*)::int AS total, COALESCE(SUM(tamanho_bytes), 0)::bigint AS bytes
       FROM ${quoteIdent(schemaName)}.evidencias_anexos
      WHERE tenant_id = $1
        AND conteudo_base64 IS NOT NULL
        AND COALESCE(storage_provider, 'database') <> 'r2'
      GROUP BY entidade_tipo, categoria
      ORDER BY entidade_tipo, categoria`,
    [tenantId],
  );
  return rows;
}

async function migrateAttachment(client, tenant, row) {
  const parsed = parseStoredContent(row.conteudo_base64, row.mime_type);
  const hash = row.hash_sha256 || sha256Hex(parsed.buffer);
  const storagePlan = createAttachmentStoragePlan({
    tenantSlug: tenant.slug,
    entityType: row.entidade_tipo,
    entityId: row.entidade_id,
    category: row.categoria,
    fileName: row.nome_arquivo,
    hashSha256: hash,
    issuedAt: row.criado_em || new Date(),
  });
  const persisted = await persistAttachmentContent({
    storagePlan,
    buffer: parsed.buffer,
    contentBase64: parsed.contentBase64,
    mimeType: parsed.mimeType,
    hashSha256: hash,
    fileName: row.nome_arquivo,
    metadata: {
      ...(row.metadados && typeof row.metadados === "object" ? row.metadados : {}),
      migratedToR2At: new Date().toISOString(),
      migratedFromProvider: row.storage_provider || "database",
    },
  });

  if (persisted.provider !== "r2") {
    return {
      id: row.id,
      status: "fallback",
      storageProvider: persisted.provider,
      error: persisted.metadata?.storageUploadError || "R2 nao utilizado",
    };
  }

  await client.query(
    `UPDATE ${quoteIdent(schemaName)}.evidencias_anexos
        SET conteudo_base64 = $2,
            mime_type = COALESCE(mime_type, $3),
            tamanho_bytes = COALESCE(tamanho_bytes, $4),
            metadados = $5::jsonb,
            hash_sha256 = COALESCE(hash_sha256, $6),
            storage_provider = $7,
            storage_bucket = $8,
            storage_key = $9,
            storage_etag = $10
      WHERE id = $1
        AND tenant_id = $11`,
    [
      row.id,
      keepDatabaseCopy ? row.conteudo_base64 : null,
      parsed.mimeType,
      parsed.buffer.length,
      JSON.stringify(persisted.metadata),
      hash,
      persisted.provider,
      persisted.bucket,
      persisted.key,
      persisted.etag,
      tenant.id,
    ],
  );

  return {
    id: row.id,
    status: keepDatabaseCopy ? "uploaded_kept_database_copy" : "uploaded_cleared_database_copy",
    storageProvider: persisted.provider,
    storageBucket: persisted.bucket,
    storageKey: persisted.key,
    bytes: parsed.buffer.length,
  };
}

async function main() {
  const tenant = await getTenant();
  const config = resolveDocumentStorageConfig(process.env);
  const pendingSummary = await summarizePending(tenant.id);
  const candidates = await findCandidates(tenant.id);

  const header = {
    mode: apply ? "apply" : "dry-run",
    tenant: tenant.slug,
    provider: {
      requested: config.requestedProvider,
      active: config.activeProvider,
      bucket: config.bucket,
      r2Ready: config.r2Ready,
    },
    filters: { entityType, category, limit },
    pendingSummary,
    candidates: candidates.map((row) => ({
      id: row.id,
      entityType: row.entidade_tipo,
      entityId: row.entidade_id,
      category: row.categoria,
      fileName: row.nome_arquivo,
      mimeType: row.mime_type,
      bytes: row.tamanho_bytes,
    })),
  };

  if (!apply) {
    console.log(JSON.stringify(header, null, 2));
    return;
  }

  if (config.activeProvider !== "r2") {
    throw new Error("Migracao bloqueada: configure DOCUMENT_STORAGE_PROVIDER=r2 e credenciais R2 completas antes de usar --apply.");
  }

  const results = [];
  for (const row of candidates) {
    results.push(await migrateAttachment({ query }, tenant, row));
  }

  console.log(JSON.stringify({ ...header, results }, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
