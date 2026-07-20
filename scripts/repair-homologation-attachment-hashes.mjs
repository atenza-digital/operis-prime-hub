import crypto from "node:crypto";
import { query, withTransaction } from "../server/db.mjs";

const apply = process.argv.includes("--apply") || process.env.HOMOLOGATION_ATTACHMENT_HASH_APPLY === "true";
const tenantSlug = process.env.HOMOLOGATION_TENANT_SLUG || "ciperprag";

function decodeStoredContent(content) {
  const value = String(content || "");
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (match) return Buffer.from(match[2], "base64");
  return Buffer.from(value, "utf8");
}

async function main() {
  const result = await withTransaction(async (client) => {
    const { rows: tenants } = await client.query(
      "SELECT id FROM ciperprag_hub.tenants WHERE slug = $1 LIMIT 1",
      [tenantSlug],
    );
    const tenant = tenants[0];
    if (!tenant) throw new Error(`Tenant not found: ${tenantSlug}`);

    const { rows } = await client.query(
      `SELECT id, entidade_tipo, categoria, nome_arquivo, conteudo_base64, hash_sha256,
              storage_provider, imutavel
         FROM ciperprag_hub.evidencias_anexos
        WHERE tenant_id = $1
        ORDER BY criado_em, id`,
      [tenant.id],
    );
    const changes = [];
    const skipped = [];
    for (const row of rows) {
      if (!row.conteudo_base64 || row.storage_provider === "r2") {
        skipped.push({ id: row.id, reason: row.storage_provider === "r2" ? "r2" : "sem_conteudo_local" });
        continue;
      }
      const actualHash = crypto.createHash("sha256").update(decodeStoredContent(row.conteudo_base64)).digest("hex");
      if (String(row.hash_sha256 || "").toLowerCase() === actualHash) continue;
      changes.push({
        id: row.id,
        entity: `${row.entidade_tipo}/${row.categoria}`,
        fileName: row.nome_arquivo,
        previousHash: row.hash_sha256 || null,
        nextHash: actualHash,
        immutable: Boolean(row.imutavel),
      });
      if (apply) {
        await client.query(
          `UPDATE ciperprag_hub.evidencias_anexos
              SET hash_sha256 = $2::text,
                  metadados = COALESCE(metadados, '{}'::jsonb) || jsonb_build_object(
                    'hashSha256', $2::text,
                    'hashRecalculadoHomologacaoEm', NOW()::text,
                    'hashAnteriorHomologacao', $3::text
                  )
            WHERE id = $1 AND tenant_id = $4`,
          [row.id, actualHash, row.hash_sha256 || null, tenant.id],
        );
        await client.query(
          `INSERT INTO ciperprag_hub.audit_logs
           (tenant_id, entidade_tipo, entidade_id, acao, resumo, after)
           VALUES ($1,'anexo',$2::text,'homologation_attachment_hash_repaired',
                   'Hash SHA-256 recalculado a partir do conteudo persistido em homologacao', $3::jsonb)`,
          [tenant.id, row.id, JSON.stringify({ previousHash: row.hash_sha256 || null, hashSha256: actualHash })],
        );
      }
    }
    return { total: rows.length, changes, skipped };
  });
  console.log(JSON.stringify({ apply, tenant: tenantSlug, total: result.total, changes: result.changes.length, skipped: result.skipped.length, details: result.changes }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
