import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool, query } from "../server/db.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidenceDir = path.join(rootDir, "docs", "evidencias", "etapa7_homologacao");
const tenantSlug = process.argv.find((arg) => arg.startsWith("--tenant="))?.split("=")[1] || "ciperprag";

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
  const body = rows.map((row) => `| ${row.map((cell) => String(cell ?? "").replaceAll("|", "\\|")).join(" | ")} |`);
  return [header, divider, ...body].join("\n");
}

async function tableExists(tableName) {
  const { rows } = await query(
    `SELECT 1
       FROM information_schema.tables
      WHERE table_schema = 'ciperprag_hub'
        AND table_name = $1
      LIMIT 1`,
    [tableName],
  );
  return rows.length > 0;
}

async function groupedCount(tableName, columns, tenantId) {
  if (!(await tableExists(tableName))) return { tableName, rows: [], missing: true };
  const groupExpr = columns.map((column) => `COALESCE(${column}::text, 'sem_${column}')`).join(", ");
  const selectExpr = columns.map((column) => `COALESCE(${column}::text, 'sem_${column}') AS ${column}`).join(", ");
  const tenantFilter = await hasColumn(tableName, "tenant_id") ? "WHERE tenant_id = $1" : "";
  const params = tenantFilter ? [tenantId] : [];
  const { rows } = await query(
    `SELECT ${selectExpr}, COUNT(*)::int AS total
       FROM ciperprag_hub.${tableName}
       ${tenantFilter}
      GROUP BY ${groupExpr}
      ORDER BY ${groupExpr}`,
    params,
  );
  return { tableName, rows, missing: false };
}

async function hasColumn(tableName, columnName) {
  const { rows } = await query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = 'ciperprag_hub'
        AND table_name = $1
        AND column_name = $2
      LIMIT 1`,
    [tableName, columnName],
  );
  return rows.length > 0;
}

async function scalarCheck(title, sql, params = []) {
  const { rows } = await query(sql, params);
  const total = Number(rows[0]?.total || 0);
  return {
    title,
    total,
    status: total === 0 ? "OK" : "Verificar",
  };
}

async function main() {
  const { rows: tenantRows } = await query(
    "SELECT id, slug, razao_social, nome_fantasia FROM ciperprag_hub.tenants WHERE slug = $1 LIMIT 1",
    [tenantSlug],
  );

  if (!tenantRows.length) {
    throw new Error(`Tenant nao encontrado: ${tenantSlug}`);
  }

  const tenant = tenantRows[0];
  const tenantId = tenant.id;

  const sections = await Promise.all([
    groupedCount("contratos_templates", ["tipo", "status"], tenantId),
    groupedCount("contratos", ["status"], tenantId),
    groupedCount("agendamentos", ["status"], tenantId),
    groupedCount("ordens_servico", ["status"], tenantId),
    groupedCount("certificados", ["status"], tenantId),
    groupedCount("medicoes", ["status", "financeiro_status"], tenantId),
    groupedCount("recorrencia_sugestoes", ["status"], tenantId),
    groupedCount("evidencias_anexos", ["entidade_tipo", "categoria"], tenantId),
  ]);

  const checks = [];

  if ((await tableExists("contratos_templates")) && (await tableExists("contratos"))) {
    checks.push(await scalarCheck(
      "Propostas aprovadas sem contrato gerado identificado",
      `SELECT COUNT(*)::int AS total
         FROM ciperprag_hub.contratos_templates p
        WHERE p.tenant_id = $1
          AND p.tipo = 'proposta'
          AND p.status = 'aprovado'
          AND NOT EXISTS (
            SELECT 1
              FROM ciperprag_hub.contratos_templates c
             WHERE c.tenant_id = p.tenant_id
               AND c.tipo = 'contrato'
               AND c.observacoes ILIKE '%' || COALESCE(p.numero, p.id) || '%'
          )`,
      [tenantId],
    ));

    checks.push(await scalarCheck(
      "Contratos vigentes sem item operacional sincronizado",
      `SELECT COUNT(*)::int AS total
         FROM ciperprag_hub.contratos_templates t
        WHERE t.tenant_id = $1
          AND t.tipo = 'contrato'
          AND t.status = 'vigente'
          AND NOT EXISTS (
            SELECT 1
              FROM ciperprag_hub.contratos o
             WHERE o.tenant_id = t.tenant_id
               AND o.contrato_template_id = t.id
          )`,
      [tenantId],
    ));
  }

  if (await tableExists("agendamentos")) {
    checks.push(await scalarCheck(
      "Agendamentos em aberto sem OS gerada",
      `SELECT COUNT(*)::int AS total
         FROM ciperprag_hub.agendamentos
        WHERE tenant_id = $1
          AND status = 'agendado'
          AND os_id IS NULL`,
      [tenantId],
    ));
  }

  if (await tableExists("ordens_servico")) {
    checks.push(await scalarCheck(
      "OS encerradas sem snapshot de encerramento",
      `SELECT COUNT(*)::int AS total
         FROM ciperprag_hub.ordens_servico
        WHERE tenant_id = $1
          AND status IN ('concluida', 'encerrada')
          AND snapshot_encerrado_em IS NULL`,
      [tenantId],
    ));

    if (await tableExists("medicao_itens")) {
      checks.push(await scalarCheck(
        "OS encerradas sem medicao vinculada",
        `SELECT COUNT(*)::int AS total
           FROM ciperprag_hub.ordens_servico o
          WHERE o.tenant_id = $1
            AND o.status IN ('concluida', 'encerrada')
            AND NOT EXISTS (
              SELECT 1
                FROM ciperprag_hub.medicao_itens mi
               WHERE mi.os_id = o.id
            )`,
        [tenantId],
      ));
    }
  }

  if ((await tableExists("certificados")) && (await tableExists("evidencias_anexos"))) {
    checks.push(await scalarCheck(
      "Certificados emitidos sem documento historico imutavel",
      `SELECT COUNT(*)::int AS total
         FROM ciperprag_hub.certificados c
        WHERE c.tenant_id = $1
          AND c.status = 'emitido'
          AND NOT EXISTS (
            SELECT 1
              FROM ciperprag_hub.evidencias_anexos e
             WHERE e.tenant_id = c.tenant_id
               AND e.entidade_tipo = 'certificado'
               AND e.entidade_id = c.id
               AND e.categoria = 'pdf_historico'
               AND e.imutavel = TRUE
          )`,
      [tenantId],
    ));
  }

  const generatedAt = brDateTime();
  const report = [
    "# Auditoria de Homologacao E2E",
    "",
    `Ambiente: Homologacao`,
    `Tenant: ${tenant.nome_fantasia || tenant.razao_social || tenant.slug} (${tenant.slug})`,
    `Gerado em: ${generatedAt}`,
    "",
    "## Resumo de consistencia",
    "",
    markdownTable(["Verificacao", "Status", "Total"], checks.map((check) => [check.title, check.status, check.total])),
    "",
    "## Contagens por area",
    "",
    ...sections.flatMap((section) => {
      if (section.missing) return [`### ${section.tableName}`, "", "_Tabela nao encontrada._", ""];
      const headers = [...Object.keys(section.rows[0] || {}).filter((key) => key !== "total"), "total"];
      const rows = section.rows.map((row) => headers.map((key) => row[key]));
      return [`### ${section.tableName}`, "", markdownTable(headers, rows), ""];
    }),
    "## Como usar",
    "",
    "- Use os itens com status `Verificar` como fila de validacao durante a homologacao.",
    "- Este relatorio nao altera dados e nao substitui o teste manual do usuario.",
    "- Divergencias encontradas devem ser registradas no roteiro e acompanhadas ate resolucao.",
    "",
  ].join("\n");

  await fs.mkdir(evidenceDir, { recursive: true });
  const outputPath = path.join(evidenceDir, "auditoria-e2e-dados.md");
  await fs.writeFile(outputPath, report, "utf8");

  console.log(`Auditoria gerada: ${outputPath}`);
  console.log(`Itens para verificar: ${checks.filter((check) => check.status !== "OK").length}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
