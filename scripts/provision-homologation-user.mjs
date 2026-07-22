import crypto from "node:crypto";
import { hashPassword, normalizeEmail } from "../server/auth.mjs";
import { pool, withTransaction } from "../server/db.mjs";

const tenantSlug = process.env.HOMOLOGATION_TENANT_SLUG || "ciperprag";
const email = normalizeEmail(process.env.HOMOLOGATION_USER_EMAIL || "homolog.operacao@atenza.digital");
const passwordBase64 = String(process.env.HOMOLOGATION_USER_PASSWORD_B64 || "");
const password = passwordBase64 ? Buffer.from(passwordBase64, "base64").toString("utf8") : "";
const roles = String(process.env.HOMOLOGATION_USER_ROLES || "operacao,administrativo")
  .split(",")
  .map((role) => role.trim())
  .filter(Boolean);

if (!password || password.length < 12) {
  throw new Error("HOMOLOGATION_USER_PASSWORD_B64 precisa representar uma senha temporaria forte.");
}

const passwordHash = await hashPassword(password);

try {
  const result = await withTransaction(async (client) => {
    const { rows: tenantRows } = await client.query(
      "SELECT id FROM ciperprag_hub.tenants WHERE slug = $1 LIMIT 1",
      [tenantSlug],
    );
    const tenant = tenantRows[0];
    if (!tenant) throw new Error(`Tenant nao encontrado: ${tenantSlug}`);

    const { rows: userRows } = await client.query(
      `INSERT INTO ciperprag_hub.usuarios
       (tenant_id, nome, email, senha_hash, status, senha_alterada_em, senha_temporaria, tentativas_login, bloqueado_ate)
       VALUES ($1,'Homologacao Operacao',$2,$3,'ativo',NOW(),TRUE,0,NULL)
       ON CONFLICT (tenant_id, email) DO UPDATE SET
         nome = EXCLUDED.nome,
         senha_hash = EXCLUDED.senha_hash,
         status = 'ativo',
         senha_alterada_em = NOW(),
         senha_temporaria = TRUE,
         tentativas_login = 0,
         bloqueado_ate = NULL,
         updated_at = NOW()
       RETURNING id, email` ,
      [tenant.id, email, passwordHash],
    );
    const user = userRows[0];

    const { rows: roleRows } = await client.query(
      `SELECT id, codigo FROM ciperprag_hub.perfis
        WHERE tenant_id = $1 AND codigo = ANY($2::text[])`,
      [tenant.id, roles],
    );
    const found = new Set(roleRows.map((role) => role.codigo));
    const missing = roles.filter((role) => !found.has(role));
    if (missing.length) throw new Error(`Perfis nao encontrados: ${missing.join(", ")}`);

    await client.query("DELETE FROM ciperprag_hub.usuario_perfis WHERE usuario_id = $1", [user.id]);
    for (const role of roleRows) {
      await client.query(
        `INSERT INTO ciperprag_hub.usuario_perfis (usuario_id, perfil_id)
         VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [user.id, role.id],
      );
    }
    await client.query(
      `INSERT INTO ciperprag_hub.audit_logs
       (tenant_id, usuario_id, entidade_tipo, entidade_id, acao, resumo)
       VALUES ($1,$2,'usuario',$3,'homologation_user_provisioned','Credencial temporaria de homologacao redefinida')`,
      [tenant.id, user.id, user.id],
    );
    return { userId: user.id, email: user.email, roles };
  });

  console.log(JSON.stringify({ ok: true, tenant: tenantSlug, ...result, passwordPrinted: false }, null, 2));
} finally {
  await pool.end();
}
