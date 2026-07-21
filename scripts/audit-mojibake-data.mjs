import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool, query } from "../server/db.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(rootDir, "docs", "evidencias", "etapa7_homologacao");
const tenantSlug = process.argv.find((arg) => arg.startsWith("--tenant="))?.split("=")[1] || "ciperprag";

const targetTables = new Set([
  "clientes",
  "contatos_cliente",
  "cliente_locais",
  "cliente_equipamentos",
  "servicos_catalogo",
  "servico_pops",
  "contratos",
  "contratos_templates",
  "agendamentos",
  "ordens_servico",
  "certificados",
  "medicoes",
  "funcionarios",
  "veiculos",
  "alocacoes_semanais",
]);

const suspiciousPatterns = [
  { label: "interrogacoes", sql: "%??%" },
  { label: "mojibake_A", sql: "%Ã%" },
  { label: "mojibake_B", sql: "%Â%" },
  { label: "replacement_char", sql: "%�%" },
];

const suspiciousEncodingRegex = /(\?\?|Ã[\u0080-\u00BF]|Â[\u0080-\u00BF]|�|ï¿½)/;

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
  const header = `| ${headers.join(" | ")} |`;
  const divider = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.map((cell) => String(cell ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").slice(0, 180)).join(" | ")} |`);
  return [header, divider, ...body].join("\n");
}

function hasSuspiciousEncoding(value) {
  return suspiciousEncodingRegex.test(String(value ?? ""));
}

async function main() {
  const { rows: tenants } = await query(
    "SELECT id, slug, nome_fantasia, razao_social FROM ciperprag_hub.tenants WHERE slug = $1 LIMIT 1",
    [tenantSlug],
  );
  const tenant = tenants[0];
  if (!tenant) throw new Error(`Tenant nao encontrado: ${tenantSlug}`);

  const { rows: columns } = await query(
    `SELECT table_name, column_name, data_type
       FROM information_schema.columns
      WHERE table_schema = 'ciperprag_hub'
        AND data_type IN ('text', 'character varying', 'character')
      ORDER BY table_name, ordinal_position`,
  );

  const findings = [];

  for (const column of columns.filter((item) => targetTables.has(item.table_name))) {
    const table = quoteIdent(column.table_name);
    const field = quoteIdent(column.column_name);
    const hasTenant = (await query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = 'ciperprag_hub' AND table_name = $1 AND column_name = 'tenant_id' LIMIT 1`,
      [column.table_name],
    )).rows.length > 0;

    const tenantWhere = hasTenant ? "tenant_id = $1 AND" : "";
    const params = hasTenant ? [tenant.id] : [];
    const patternParams = suspiciousPatterns.map((pattern) => pattern.sql);
    const offset = params.length;
    const likeSql = suspiciousPatterns
      .map((pattern, index) => `${field} ILIKE $${offset + index + 1}`)
      .join(" OR ");

    const { rows } = await query(
      `SELECT ${field}::text AS value
         FROM ciperprag_hub.${table}
        WHERE ${tenantWhere} ${field} IS NOT NULL
          AND (${likeSql})
        LIMIT 5`,
      [...params, ...patternParams],
    );

    const suspiciousRows = rows.filter((row) => hasSuspiciousEncoding(row.value));

    if (suspiciousRows.length) {
      findings.push({
        table: column.table_name,
        column: column.column_name,
        examples: suspiciousRows.map((row) => row.value).join(" || "),
      });
    }
  }

  const report = [
    "# Auditoria de dados com encoding suspeito",
    "",
    `Tenant: ${tenant.nome_fantasia || tenant.razao_social || tenant.slug} (${tenant.slug})`,
    `Executado em: ${brDateTime()}`,
    "",
    "## Resultado",
    "",
    findings.length ? `Status: verificar ${findings.length} coluna(s) com exemplo suspeito.` : "Status: aprovado, sem exemplos suspeitos nas tabelas auditadas.",
    "",
    "## Achados",
    "",
    markdownTable(["Tabela", "Coluna", "Exemplos"], findings.map((item) => [item.table, item.column, item.examples])),
    "",
    "## Observacoes",
    "",
    "- Este script e somente leitura.",
    "- Nao substitui backup antes de saneamento.",
    "- Campos com `??` podem exigir decisao humana porque nem sempre e possivel reconstruir o caractere original automaticamente.",
    "",
  ].join("\n");

  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "auditoria-dados-encoding.md");
  await fs.writeFile(outputPath, report, "utf8");

  console.log(`Auditoria de encoding: ${findings.length ? "verificar" : "aprovada"}`);
  console.log(`Relatorio: ${outputPath}`);
  console.log(JSON.stringify({ findings: findings.length }, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
