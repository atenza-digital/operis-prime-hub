import { pool, query, withTransaction } from "../server/db.mjs";

const schemaName = "ciperprag_hub";
const tenantSlug = process.argv.find((arg) => arg.startsWith("--tenant="))?.split("=")[1] || "ciperprag";
const apply = process.argv.includes("--apply");
const limitPerColumn = Number(process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1] || 500);

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

const tenantScopeCache = new Map();
const customerChildTables = new Set([
  "contatos_cliente",
  "cliente_locais",
  "cliente_equipamentos",
]);

const skipKeys = new Set([
  "conteudoBase64",
  "contentBase64",
  "fotos",
  "logoUrl",
  "logo_url",
  "clienteLogoUrl",
  "downloadUrl",
  "url",
  "hash",
  "hashSha256",
  "hash_sha256",
  "snapshotHashSha256",
  "snapshot_hash_sha256",
  "storageKey",
  "storage_key",
  "storageEtag",
  "storage_etag",
  "token",
]);

const replacements = [
  ["Ã§", "ç"], ["Ã£", "ã"], ["Ã¡", "á"], ["Ã©", "é"], ["Ãª", "ê"],
  ["Ã­", "í"], ["Ã³", "ó"], ["Ã´", "ô"], ["Ãµ", "õ"], ["Ãº", "ú"],
  ["Ã‰", "É"], ["ÃŠ", "Ê"], ["Ã“", "Ó"], ["Ãš", "Ú"], ["Ã‡", "Ç"],
  ["Ã‚", "Â"], ["Ã€", "À"], ["Âº", "º"], ["Âª", "ª"], ["Â·", "·"],
  ["â€¢", "•"], ["â€“", "–"], ["â€”", "—"], ["â€œ", "“"], ["â€", "”"], ["â€™", "’"], ["Â", ""],
  ["Jo??o", "João"],
  ["S??o", "São"],
  ["T??cnico", "Técnico"],
  ["Sanit??rio", "Sanitário"],
  ["An??lise", "Análise"],
  ["D'??gua", "D'água"],
  ["D????gua", "D'água"],
  ["??gua", "água"],
  ["Metal??rgica", "Metalúrgica"],
  ["Manuten????o", "Manutenção"],
  ["Higieniza????o", "Higienização"],
  ["Desratiza????o", "Desratização"],
  ["Desinsetiza????o", "Desinsetização"],
  ["Servi????o", "Serviço"],
  ["Servi??o", "Serviço"],
  ["execu????o", "execução"],
  ["Execu????o", "Execução"],
  ["medi????o", "medição"],
  ["Medi????o", "Medição"],
  ["observa????o", "observação"],
  ["Observa????o", "Observação"],
  ["evid??ncia", "evidência"],
  ["Evid??ncia", "Evidência"],
  ["Homologacao", "Homologação"],
  ["M??scara", "Máscara"],
  ["Nitr??lica", "Nitrílica"],
  ["Seguran??a", "Segurança"],
  ["Macac??o", "Macacão"],
  ["Diagn??stico", "Diagnóstico"],
  ["Aplica????o", "Aplicação"],
  ["Instala????o", "Instalação"],
  ["Inspe????es", "Inspeções"],
  ["peri??dicas", "periódicas"],
  ["Emiss??o", "Emissão"],
  ["relat??rios", "relatórios"],
  ["t??cnicos", "técnicos"],
  ["espec??ficos", "específicos"],
  ["Aplicavel", "Aplicável"],
];

const suspiciousPatterns = ["%??%", "%Ã%", "%Â%", "%�%", "%ï¿½%"];

function quoteIdent(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function repairText(value) {
  return replacements.reduce((result, [from, to]) => result.replaceAll(from, to), value);
}

function repairValue(value, key = "") {
  if (typeof value === "string") {
    return skipKeys.has(key) ? value : repairText(value);
  }

  if (Array.isArray(value)) {
    if (skipKeys.has(key)) return value;
    return value.map((item) => repairValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        repairValue(entryValue, entryKey),
      ]),
    );
  }

  return value;
}

function stringifyForCompare(value) {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function columnKind(column) {
  if (["text", "character varying", "character"].includes(column.data_type)) return "text";
  if (column.data_type === "ARRAY" && column.udt_name === "_text") return "text_array";
  if (["json", "jsonb"].includes(column.data_type)) return column.data_type;
  return null;
}

function updateExpression(column, paramIndex) {
  const field = quoteIdent(column.column_name);
  const kind = columnKind(column);
  if (kind === "jsonb") return `${field} = $${paramIndex}::jsonb`;
  if (kind === "json") return `${field} = $${paramIndex}::json`;
  if (kind === "text_array") return `${field} = $${paramIndex}::text[]`;
  return `${field} = $${paramIndex}`;
}

async function tableHasColumn(client, tableName, columnName) {
  const { rows } = await client.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = $1
        AND table_name = $2
        AND column_name = $3
      LIMIT 1`,
    [schemaName, tableName, columnName],
  );
  return rows.length > 0;
}

async function resolveTenantScope(client, tableName) {
  if (tenantScopeCache.has(tableName)) return tenantScopeCache.get(tableName);

  if (await tableHasColumn(client, tableName, "tenant_id")) {
    const scope = {
      source: "tenant_id",
      selectWhere: `t.${quoteIdent("tenant_id")} = $1`,
      updateWhere: `t.${quoteIdent("tenant_id")} = $3`,
    };
    tenantScopeCache.set(tableName, scope);
    return scope;
  }

  if (customerChildTables.has(tableName) && await tableHasColumn(client, tableName, "cliente_id")) {
    const tenantId = quoteIdent("tenant_id");
    const clienteId = quoteIdent("cliente_id");
    const clienteTable = `${quoteIdent(schemaName)}.${quoteIdent("clientes")}`;
    const scope = {
      source: "clientes.tenant_id",
      selectWhere: `EXISTS (SELECT 1 FROM ${clienteTable} parent WHERE parent.${quoteIdent("id")} = t.${clienteId} AND parent.${tenantId} = $1)`,
      updateWhere: `EXISTS (SELECT 1 FROM ${clienteTable} parent WHERE parent.${quoteIdent("id")} = t.${clienteId} AND parent.${tenantId} = $3)`,
    };
    tenantScopeCache.set(tableName, scope);
    return scope;
  }

  const scope = null;
  tenantScopeCache.set(tableName, scope);
  return scope;
}

async function main() {
  const { rows: tenants } = await query(
    `SELECT id, slug, nome_fantasia, razao_social
       FROM ${schemaName}.tenants
      WHERE slug = $1
      LIMIT 1`,
    [tenantSlug],
  );
  const tenant = tenants[0];
  if (!tenant) throw new Error(`Tenant nao encontrado: ${tenantSlug}`);

  const { rows: columns } = await query(
    `SELECT table_name, column_name, data_type, udt_name
       FROM information_schema.columns
      WHERE table_schema = $1
      ORDER BY table_name, ordinal_position`,
    [schemaName],
  );

  const candidates = columns
    .filter((column) => targetTables.has(column.table_name))
    .filter((column) => columnKind(column));

  const summary = [];
  const skippedTables = new Set();
  let changedRows = 0;

  await withTransaction(async (client) => {
    for (const column of candidates) {
      const scope = await resolveTenantScope(client, column.table_name);
      if (!scope) {
        skippedTables.add(column.table_name);
        continue;
      }

      const tableSql = `${quoteIdent(schemaName)}.${quoteIdent(column.table_name)}`;
      const field = quoteIdent(column.column_name);

      const { rows } = await client.query(
        `SELECT t.ctid::text AS row_ctid, t.${field} AS value
           FROM ${tableSql} AS t
          WHERE ${scope.selectWhere}
            AND t.${field} IS NOT NULL
            AND t.${field}::text ILIKE ANY($2::text[])
          LIMIT $3`,
        [tenant.id, suspiciousPatterns, limitPerColumn],
      );

      let changed = 0;
      let examples = [];

      for (const row of rows) {
        const before = row.value;
        const after = repairValue(before, column.column_name);
        if (stringifyForCompare(before) === stringifyForCompare(after)) continue;

        changed += 1;
        changedRows += 1;
        if (examples.length < 3) {
          examples.push({
            before: stringifyForCompare(before)?.slice(0, 180),
            after: stringifyForCompare(after)?.slice(0, 180),
          });
        }

        if (apply) {
          await client.query(
            `UPDATE ${tableSql} AS t
                SET ${updateExpression(column, 1)}
              WHERE t.ctid = $2::tid
                AND ${scope.updateWhere}`,
            [after, row.row_ctid, tenant.id],
          );
        }
      }

      if (changed > 0 || rows.length > 0) {
        summary.push({
          table: column.table_name,
          column: column.column_name,
          type: columnKind(column),
          scope: scope.source,
          candidates: rows.length,
          changed,
          examples,
        });
      }
    }
  });

  console.log(JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    tenant: tenant.slug,
    changedRows,
    touchedColumns: summary.filter((item) => item.changed > 0).length,
    skippedTables: [...skippedTables].sort(),
    summary,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
