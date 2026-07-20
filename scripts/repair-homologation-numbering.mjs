import { query, withTransaction } from "../server/db.mjs";

const apply = process.argv.includes("--apply") || process.env.HOMOLOGATION_NUMBERING_APPLY === "true";
const tenantSlug = process.env.HOMOLOGATION_TENANT_SLUG || "ciperprag";

async function main() {
  const result = await withTransaction(async (client) => {
    const { rows: tenants } = await client.query(
      "SELECT id FROM ciperprag_hub.tenants WHERE slug = $1 LIMIT 1",
      [tenantSlug],
    );
    const tenant = tenants[0];
    if (!tenant) throw new Error(`Tenant not found: ${tenantSlug}`);

    const { rows: duplicates } = await client.query(
      `SELECT numero, tipo, COUNT(*)::int AS total
         FROM ciperprag_hub.contratos_templates
        WHERE tenant_id = $1
          AND NULLIF(BTRIM(numero::text), '') IS NOT NULL
        GROUP BY numero, tipo
       HAVING COUNT(*) > 1
        ORDER BY numero, tipo`,
      [tenant.id],
    );
    const actions = [];
    const blocked = [];

    for (const duplicate of duplicates) {
      const { rows } = await client.query(
        `SELECT id, numero, tipo, status, criado_em, atualizado_em
           FROM ciperprag_hub.contratos_templates
          WHERE tenant_id = $1 AND numero = $2 AND tipo = $3
          ORDER BY atualizado_em DESC NULLS LAST, criado_em DESC NULLS LAST, id DESC`,
        [tenant.id, duplicate.numero, duplicate.tipo],
      );
      const enriched = [];
      for (const row of rows) {
        const { rows: refs } = await client.query(
          `SELECT COUNT(*)::int AS total
             FROM ciperprag_hub.contratos
            WHERE tenant_id = $1 AND contrato_template_id = $2`,
          [tenant.id, row.id],
        );
        enriched.push({ ...row, references: Number(refs[0]?.total || 0) });
      }

      const referenced = enriched.filter((row) => row.references > 0);
      if (referenced.length > 1) {
        blocked.push({ numero: duplicate.numero, tipo: duplicate.tipo, reason: "Mais de um registro duplicado possui contratos operacionais vinculados.", rows: enriched });
        continue;
      }

      const keeper = referenced[0] || enriched[0];
      const remove = enriched.filter((row) => row.id !== keeper.id);
      if (apply) {
        for (const row of remove) {
          if (row.references > 0) throw new Error(`Registro ${row.id} possui referencias e nao pode ser removido.`);
          await client.query(
            "DELETE FROM ciperprag_hub.contratos_templates_servicos WHERE template_id = $1",
            [row.id],
          );
          await client.query(
            "DELETE FROM ciperprag_hub.contratos_templates WHERE id = $1 AND tenant_id = $2",
            [row.id, tenant.id],
          );
          await client.query(
            `INSERT INTO ciperprag_hub.audit_logs
             (tenant_id, entidade_tipo, entidade_id, acao, resumo, dados_depois)
             VALUES ($1, 'contratos_template', $2::text, 'homologation_duplicate_number_repaired',
                     'Registro duplicado de numeracao removido em homologacao', $3::jsonb)`,
            [tenant.id, row.id, JSON.stringify({ removed: row, keeper })],
          );
        }
      }
      actions.push({ numero: duplicate.numero, tipo: duplicate.tipo, keeper, removed: remove });
    }

    return { duplicates, actions, blocked };
  });

  console.log(JSON.stringify({ apply, tenant: tenantSlug, duplicates: result.duplicates.length, repaired: result.actions.length, blocked: result.blocked.length, details: result.actions, blockedDetails: result.blocked }, null, 2));
  if (result.blocked.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
