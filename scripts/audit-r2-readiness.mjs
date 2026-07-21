import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool, query } from "../server/db.mjs";
import { createAttachmentStoragePlan, resolveDocumentStorageConfig } from "../server/storage.mjs";

const schemaName = "ciperprag_hub";
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(rootDir, "docs", "evidencias", "etapa8_infra_saas");
const outputFile = path.join(outputDir, "R2_READINESS_2026-07-19.md");

const args = new Map(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith("--") && arg.includes("="))
    .map((arg) => {
      const [key, ...value] = arg.slice(2).split("=");
      return [key, value.join("=")];
    }),
);

const tenantSlug = args.get("tenant") || process.env.STORAGE_MIGRATION_TENANT || "ciperprag";
const limit = Number(args.get("limit") || process.env.STORAGE_MIGRATION_LIMIT || 5);

function quoteIdent(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
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

async function getPendingSummary(tenantId) {
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

async function getCandidates(tenantId) {
  const { rows } = await query(
    `SELECT id, entidade_tipo, entidade_id, categoria, nome_arquivo, mime_type, tamanho_bytes, hash_sha256, criado_em
       FROM ${quoteIdent(schemaName)}.evidencias_anexos
      WHERE tenant_id = $1
        AND conteudo_base64 IS NOT NULL
        AND COALESCE(storage_provider, 'database') <> 'r2'
      ORDER BY criado_em NULLS FIRST, id
      LIMIT $2`,
    [tenantId, limit],
  );
  return rows;
}

async function getStorageBreakdown(tenantId) {
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

function buildReport({ tenant, config, pendingSummary, candidates, storageBreakdown }) {
  const ready = config.activeProvider === "r2" && config.r2Ready;
  const pendingTotal = pendingSummary.reduce((total, row) => total + Number(row.total || 0), 0);
  const candidateRows = candidates.map((row) => {
    const plan = createAttachmentStoragePlan({
      tenantSlug: tenant.slug,
      entityType: row.entidade_tipo,
      entityId: row.entidade_id,
      category: row.categoria,
      fileName: row.nome_arquivo,
      hashSha256: row.hash_sha256 || "sem-hash",
      issuedAt: row.criado_em || new Date(),
    });
    return [
      row.id,
      row.entidade_tipo,
      row.entidade_id,
      row.categoria,
      row.nome_arquivo,
      row.mime_type,
      row.tamanho_bytes,
      plan.plannedKey || "(sem bucket configurado)",
    ];
  });

  return [
    "# Preflight de storage R2",
    "",
    `Gerado em: ${brDateTime()}`,
    `Tenant: ${tenant.slug}`,
    "Modo: somente leitura",
    "",
    "## Status",
    "",
    `- Provider solicitado: ${config.requestedProvider}.`,
    `- Provider ativo: ${config.activeProvider}.`,
    `- Bucket configurado: ${config.bucket ? "sim" : "nao"}.`,
    `- Credenciais R2 completas: ${config.r2Ready ? "sim" : "nao"}.`,
    `- Pronto para apply R2: ${ready ? "sim" : "nao"}.`,
    `- Anexos pendentes para migracao: ${pendingTotal}.`,
    "",
    "## Distribuicao atual por provider",
    "",
    markdownTable(["Provider", "Total"], storageBreakdown.map((row) => [row.provider, row.total])),
    "",
    "## Pendencias por tipo/categoria",
    "",
    markdownTable(["Entidade", "Categoria", "Total", "Bytes informados"], pendingSummary.map((row) => [
      row.entidade_tipo,
      row.categoria,
      row.total,
      row.bytes,
    ])),
    "",
    `## Amostra de ${Math.min(limit, candidates.length)} candidato(s)`,
    "",
    markdownTable(["ID", "Entidade", "Entidade ID", "Categoria", "Arquivo", "MIME", "Bytes", "Chave planejada"], candidateRows),
    "",
    "## Proxima acao recomendada",
    "",
    ready
      ? "- Executar `storage:migrate-r2` em modo `apply` com `limit` baixo e `keep_database_copy=true`, validar download e depois ampliar lote."
      : "- Nao executar `apply` ainda. Configurar secrets/variaveis `R2_BUCKET_DOCUMENTS`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` e `DOCUMENT_STORAGE_PROVIDER=r2` no fluxo de execucao controlado.",
    "",
  ].join("\n");
}

async function main() {
  const tenant = await getTenant();
  const config = resolveDocumentStorageConfig(process.env);
  const pendingSummary = await getPendingSummary(tenant.id);
  const candidates = await getCandidates(tenant.id);
  const storageBreakdown = await getStorageBreakdown(tenant.id);
  const report = buildReport({ tenant, config, pendingSummary, candidates, storageBreakdown });

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputFile, report, "utf8");

  console.log(`Preflight R2 gerado: ${path.relative(rootDir, outputFile)}`);
  console.log(`Provider ativo: ${config.activeProvider}`);
  console.log(`R2 pronto: ${config.r2Ready ? "sim" : "nao"}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
