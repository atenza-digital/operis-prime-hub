import { normalizeEmail } from "../server/auth.mjs";
import { pool, withTransaction } from "../server/db.mjs";

const tenantSlug = process.env.HOMOLOGATION_TENANT_SLUG || "ciperprag";
const assignments = [
  { email: "homolog.comercial@atenza.digital", roles: ["admin_empresa", "comercial"] },
  { email: "homolog.operacao@atenza.digital", roles: ["admin_empresa", "operacao", "administrativo"] },
];

try {
  const result = await withTransaction(async (client) => {
    const { rows: tenantRows } = await client.query(
      "SELECT id FROM ciperprag_hub.tenants WHERE slug = $1 LIMIT 1",
      [tenantSlug],
    );
    const tenant = tenantRows[0];
    if (!tenant) throw new Error(`Tenant nao encontrado: ${tenantSlug}`);

    const updated = [];
    for (const assignment of assignments) {
      const email = normalizeEmail(assignment.email);
      const { rows: userRows } = await client.query(
        `SELECT id, email FROM ciperprag_hub.usuarios
          WHERE tenant_id = $1 AND email = $2 LIMIT 1`,
        [tenant.id, email],
      );
      const user = userRows[0];
      if (!user) throw new Error(`Usuario de homologacao nao encontrado: ${email}`);

      const { rows: roleRows } = await client.query(
        `SELECT id, codigo FROM ciperprag_hub.perfis
          WHERE tenant_id = $1 AND codigo = ANY($2::text[])`,
        [tenant.id, assignment.roles],
      );
      const found = new Set(roleRows.map((role) => role.codigo));
      const missing = assignment.roles.filter((role) => !found.has(role));
      if (missing.length) throw new Error(`Perfis nao encontrados para ${email}: ${missing.join(", ")}`);

      await client.query("DELETE FROM ciperprag_hub.usuario_perfis WHERE usuario_id = $1", [user.id]);
      for (const role of roleRows) {
        await client.query(
          `INSERT INTO ciperprag_hub.usuario_perfis (usuario_id, perfil_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [user.id, role.id],
        );
      }

      await client.query(
        `INSERT INTO ciperprag_hub.audit_logs
         (tenant_id, usuario_id, entidade_tipo, entidade_id, acao, resumo)
         VALUES ($1, $2, 'usuario', $3, 'homologation_roles_promoted', 'Papeis administrativos de homologacao atualizados')`,
        [tenant.id, user.id, user.id],
      );
      updated.push({ email: user.email, roles: assignment.roles });
    }
    return updated;
  });

  console.log(JSON.stringify({ ok: true, tenant: tenantSlug, users: result }, null, 2));
} finally {
  await pool.end();
}
