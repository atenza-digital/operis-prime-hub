import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool, query } from "../server/db.mjs";
import { readAttachmentContentFromStorage, resolveDocumentStorageConfig } from "../server/storage.mjs";

const schemaName = "ciperprag_hub";
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(rootDir, "docs", "evidencias", "etapa8_infra_saas");
const outputFile = path.join(outputDir, "R2_POST_MIGRATION_VERIFY_2026-07-19.md");

const args = new Map(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith("--") && arg.includes("="))
    .map((arg) => {
      const [key, ...value] = arg.slice(2).split("=");
      return [key, value.join("=")];
    }),
);

const tenantSlug = args.get("tenant") || process.env.STORAGE_VERIFY_TENANT || "ciperprag";
const entityType = args.get("entity-type") || process.env.STORAGE_VERIFY_ENTITY_TYPE || null;
const category = args.get("category") || process.env.STORAGE_VERIFY_CATEGORY || null;
const limit = Number(args.get("limit") || process.env.STORAGE_VERIFY_LIMIT || 10);
const requireRows = process.argv.includes("--require-rows") || process.env.STORAGE_VERIFY_REQUIRE_ROWS === "true";

function quoteIdent(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function sha256Hex(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function brDateTime(value = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Fortaleza",
  }).format(value);
}

function markdownTable(headers, rows) {
  if (!rows.length) return "_Sem registros._";
  const sanitize = (value) => String(value ?? "").replaceAll("|", "\\|").replace(/\r?\n/g, " ");
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(sanitize).join(" | ")} |`),
  ].join("\n");
}

async function getTenant() {
  const { rows } = await query(
    `SELECT id, slug, nome_fantasia, razao_social
       FROM ${quoteIdent(schemaName)}.tenants
      WHERE slug = $1
      LIMIT 1`,
    [tenantSlug],
  );
  if (!rows[0]) throw new Error(`Tenant nao encontrado: ${tenantSlug}`);
  return rows[0];
}

function buildWhere(tenantId) {
  const clauses = [
    "tenant_id = $1",
    "storage_provider = 'r2'",
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

async function getR2Rows(tenantId) {
  const { where, params, limitParam } = buildWhere(tenantId);
  const { rows } = await query(
    `SELECT id, entidade_tipo, entidade_id, categoria, nome_arquivo, mime_type,
            tamanho_bytes, conteudo_base64, metadados, hash_sha256,
            storage_bucket, storage_key, storage_etag, criado_em
       FROM ${quoteIdent(schemaName)}.evidencias_anexos
      WHERE ${where}
      ORDER BY criado_em DESC NULLS LAST, id
      LIMIT ${limitParam}`,
    params,
  );
  return rows;
}

async function getStorageSummary(tenantId) {
  const { rows } = await query(
    `SELECT COALESCE(storage_provider, 'database') AS provider, COUNT(*)::int AS total
       FROM ${quoteIdent(schemaName)}.evidencias_anexos
      WHERE tenant_id = $1
      GROUP BY COALESCE(storage_provider, 'database')
      ORDER BY provider`,
    [tenantId],
  );
  return rows;
}

async function verifyRow(row, config) {
  const base = {
    id: row.id,
    entityType: row.entidade_tipo,
    entityId: row.entidade_id,
    category: row.categoria,
    fileName: row.nome_arquivo,
    storageKey: row.storage_key,
  };

  if (!config.r2Ready) {
    return {
      ...base,
      status: "skipped",
      message: "Credenciais R2 nao configuradas no ambiente de verificacao.",
    };
  }

  if (!row.storage_bucket || !row.storage_key) {
    return {
      ...base,
      status: "failed",
      message: "Registro R2 sem bucket ou chave.",
    };
  }

  try {
    const stored = await readAttachmentContentFromStorage({
      bucket: row.storage_bucket,
      key: row.storage_key,
    });
    const hash = sha256Hex(stored.buffer);
    const hashMatches = row.hash_sha256 ? hash.toLowerCase() === String(row.hash_sha256).toLowerCase() : true;
    const sizeMatches = row.tamanho_bytes ? Number(row.tamanho_bytes) === stored.buffer.length : true;

    return {
      ...base,
      status: hashMatches && sizeMatches ? "ok" : "failed",
      message: [
        `bytes=${stored.buffer.length}`,
        row.hash_sha256 ? `hash=${hashMatches ? "ok" : "divergente"}` : "hash=ausente_no_banco",
        row.tamanho_bytes ? `tamanho=${sizeMatches ? "ok" : "divergente"}` : "tamanho=ausente_no_banco",
        row.conteudo_base64 ? "fallback_banco=sim" : "fallback_banco=nao",
      ].join("; "),
    };
  } catch (error) {
    return {
      ...base,
      status: "failed",
      message: String(error?.message || error || "erro_desconhecido").slice(0, 300),
    };
  }
}

function buildReport({ tenant, config, storageSummary, rows, results }) {
  const failed = results.filter((result) => result.status === "failed");
  const skipped = results.filter((result) => result.status === "skipped");
  const ok = results.filter((result) => result.status === "ok");
  const status = failed.length
    ? "REPROVADO"
    : skipped.length
      ? "AGUARDANDO R2"
      : "APROVADO";

  return [
    "# Verificacao pos-migracao R2",
    "",
    `Gerado em: ${brDateTime()}`,
    `Tenant: ${tenant.slug}`,
    "Modo: somente leitura",
    "",
    "## Status",
    "",
    `- Provider ativo no ambiente: ${config.activeProvider}.`,
    `- Credenciais R2 completas: ${config.r2Ready ? "sim" : "nao"}.`,
    `- Registros R2 avaliados: ${rows.length}.`,
    `- OK: ${ok.length}.`,
    `- Ignorados: ${skipped.length}.`,
    `- Falhas: ${failed.length}.`,
    `- Resultado tecnico: ${status}.`,
    "",
    "## Distribuicao atual por provider",
    "",
    markdownTable(["Provider", "Total"], storageSummary.map((row) => [row.provider, row.total])),
    "",
    "## Registros avaliados",
    "",
    markdownTable(["Status", "ID", "Entidade", "Entidade ID", "Categoria", "Arquivo", "Mensagem"], results.map((row) => [
      row.status,
      row.id,
      row.entityType,
      row.entityId,
      row.category,
      row.fileName,
      row.message,
    ])),
    "",
    "## Proxima acao recomendada",
    "",
    rows.length === 0
      ? "- Ainda nao ha anexos migrados para R2 neste tenant. Execute primeiro um lote pequeno com `keep_database_copy=true`."
      : failed.length
        ? "- Nao ampliar a migracao. Corrigir falhas de leitura/hash/tamanho antes de novo lote."
        : skipped.length
          ? "- Configurar credenciais R2 no ambiente de verificacao para validar leitura real dos objetos."
          : "- Lote validado. Pode ampliar gradualmente mantendo monitoramento e auditoria por tenant.",
    "",
  ].join("\n");
}

async function main() {
  const tenant = await getTenant();
  const config = resolveDocumentStorageConfig(process.env);
  const storageSummary = await getStorageSummary(tenant.id);
  const rows = await getR2Rows(tenant.id);
  const results = [];

  for (const row of rows) {
    results.push(await verifyRow(row, config));
  }

  const report = buildReport({ tenant, config, storageSummary, rows, results });
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputFile, report, "utf8");

  const failed = results.filter((result) => result.status === "failed");
  console.log(`Verificacao R2 gerada: ${path.relative(rootDir, outputFile)}`);
  console.log(`Registros R2 avaliados: ${rows.length}`);
  console.log(`Falhas: ${failed.length}`);

  if (requireRows && rows.length === 0) process.exitCode = 1;
  if (failed.length) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
