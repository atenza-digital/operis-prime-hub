import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool, query } from "../server/db.mjs";

const schemaName = "ciperprag_hub";
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidenceDir = path.join(rootDir, "docs", "evidencias", "etapa7_homologacao");
const tenantSlugs = (process.env.HOMOLOGATION_TENANT_SLUGS || "ciperprag,empresa-demonstracao,tenant-sem-logo")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const documentTargets = [
  { table: "contratos_templates", numberColumn: "numero", discriminator: "tipo", label: "Propostas, minutas e contratos" },
  { table: "contratos", numberColumn: "numero", discriminator: null, label: "Contratos operacionais" },
  { table: "ordens_servico", numberColumn: "numero", discriminator: null, label: "Ordens de servico" },
  { table: "certificados", numberColumn: "numero", discriminator: null, label: "Certificados" },
  { table: "medicoes", numberColumn: "numero", discriminator: null, label: "Medicoes" },
];

function quoteIdent(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function markdownTable(headers, rows) {
  if (!rows.length) return "_Sem registros._";
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((value) => String(value ?? "").replaceAll("|", "\\|")).join(" | ")} |`),
  ].join("\n");
}

async function hasTable(tableName) {
  const { rows } = await query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2 LIMIT 1`,
    [schemaName, tableName],
  );
  return rows.length > 0;
}

async function hasColumn(tableName, columnName) {
  const { rows } = await query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 AND column_name = $3 LIMIT 1`,
    [schemaName, tableName, columnName],
  );
  return rows.length > 0;
}

async function main() {
  const { rows: tenants } = await query(
    `SELECT id, slug FROM ${quoteIdent(schemaName)}.tenants WHERE slug = ANY($1::text[]) ORDER BY slug`,
    [tenantSlugs],
  );
  const tenantIds = tenants.map((tenant) => tenant.id);
  const checks = [];

  if (!tenantIds.length) throw new Error("Nenhum tenant de homologacao foi encontrado.");

  for (const target of documentTargets) {
    if (!(await hasTable(target.table)) || !(await hasColumn(target.table, target.numberColumn)) || !(await hasColumn(target.table, "tenant_id"))) {
      checks.push({ area: target.label, status: "NA", total: 0, detail: "Tabela ou coluna nao aplicavel nesta base." });
      continue;
    }

    const discriminatorSelect = target.discriminator && await hasColumn(target.table, target.discriminator)
      ? `, ${quoteIdent(target.discriminator)}`
      : "";
    const discriminatorGroup = discriminatorSelect ? `, ${quoteIdent(target.discriminator)}` : "";
    const statusSelect = await hasColumn(target.table, "status") ? `, STRING_AGG(COALESCE(${quoteIdent("status")}::text, ''), ' | ') AS statuses` : "";
    const idSelect = await hasColumn(target.table, "id") ? `, STRING_AGG(${quoteIdent("id")}::text, ' | ') AS ids` : "";
    const { rows } = await query(
      `SELECT tenant_id, ${quoteIdent(target.numberColumn)} AS numero${discriminatorSelect}, COUNT(*)::int AS total${statusSelect}${idSelect}
         FROM ${quoteIdent(schemaName)}.${quoteIdent(target.table)}
        WHERE tenant_id = ANY($1::uuid[])
          AND NULLIF(BTRIM(${quoteIdent(target.numberColumn)}::text), '') IS NOT NULL
        GROUP BY tenant_id, ${quoteIdent(target.numberColumn)}${discriminatorGroup}
       HAVING COUNT(*) > 1
        ORDER BY total DESC, numero`,
      [tenantIds],
    );
    checks.push({
      area: target.label,
      status: rows.length ? "FALHA" : "OK",
      total: rows.length,
      detail: rows.length ? "Numeracao repetida dentro do mesmo tenant." : "Sem duplicidades.",
      rows,
    });
  }

  const numberingColumns = ["proposta_ultimo", "contrato_ultimo", "os_ultimo", "certificado_ultimo", "medicao_ultimo"];
  if (await hasTable("numeracao_config") && await hasColumn("numeracao_config", "tenant_id")) {
    const availableColumns = [];
    for (const column of numberingColumns) if (await hasColumn("numeracao_config", column)) availableColumns.push(column);
    if (!availableColumns.length) {
      checks.push({ area: "Configuracao de numeracao por tenant", status: "FALHA", total: 1, detail: "Nenhum contador documental foi encontrado." });
    } else {
    const { rows } = await query(
      `SELECT tenant_id, COUNT(*)::int AS total, ${availableColumns.map((column) => `MIN(${quoteIdent(column)}) AS ${quoteIdent(column)}`).join(", ")}
         FROM ${quoteIdent(schemaName)}.numeracao_config
        WHERE tenant_id = ANY($1::uuid[])
        GROUP BY tenant_id`,
      [tenantIds],
    );
    const invalid = rows.filter((row) => row.total !== 1 || availableColumns.some((column) => Number(row[column]) < 0));
    checks.push({
      area: "Configuracao de numeracao por tenant",
      status: invalid.length ? "FALHA" : "OK",
      total: invalid.length,
      detail: invalid.length ? "Tenant sem configuracao unica ou com contador invalido." : "Cada tenant possui configuracao unica e contadores validos.",
      rows: invalid,
    });
    }
  } else {
    checks.push({ area: "Configuracao de numeracao por tenant", status: "FALHA", total: 1, detail: "Tabela numeracao_config ou tenant_id ausente." });
  }

  const failures = checks.filter((check) => check.status === "FALHA");
  const report = [
    "# Validacao de numeracao da homologacao",
    "",
    `Tenants avaliados: ${tenants.map((tenant) => tenant.slug).join(", ")}`,
    `Gerado em: ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Fortaleza" }).format(new Date())}`,
    "",
    "## Resultado",
    "",
    markdownTable(["Area", "Status", "Achados", "Detalhe"], checks.map((check) => [check.area, check.status, check.total, check.detail])),
    "",
    "## Duplicidades encontradas",
    "",
    ...checks.flatMap((check) => check.rows?.length ? [`### ${check.area}`, "", markdownTable(Object.keys(check.rows[0]), check.rows.map((row) => Object.values(row))), ""] : []),
    "## Escopo",
    "",
    "- Validacao somente leitura; nenhum contador ou documento foi alterado.",
    "- A unicidade e verificada por tenant e, quando aplicavel, pelo tipo documental.",
    "- A numeracao continua sendo gerada pelo backend e pelos contadores persistidos do tenant.",
    "",
  ].join("\n");

  await fs.mkdir(evidenceDir, { recursive: true });
  await fs.writeFile(path.join(evidenceDir, "VALIDACAO_NUMERACAO_HOMOLOGACAO.md"), report, "utf8");
  console.log(`Validacao de numeracao: ${failures.length ? "falha" : "aprovada"}`);
  console.log(`Tenants avaliados: ${tenants.map((tenant) => tenant.slug).join(", ")}`);
  console.log(`Achados bloqueantes: ${failures.reduce((total, check) => total + check.total, 0)}`);
  for (const check of failures) {
    console.log(`${check.area}: ${JSON.stringify(check.rows || [])}`);
  }
  if (failures.length) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
