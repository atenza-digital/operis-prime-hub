import { hashPassword, normalizeEmail } from "../server/auth.mjs";
import { pool, withTransaction } from "../server/db.mjs";

const email = normalizeEmail(process.env.ADMIN_EMAIL);
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME || "Administrador";
const tenantSlug = process.env.TENANT_SLUG || "ciperprag";

if (!email || !password) {
  console.error("Defina ADMIN_EMAIL e ADMIN_PASSWORD antes de executar.");
  process.exit(1);
}

if (password.length < 8) {
  console.error("ADMIN_PASSWORD deve ter pelo menos 8 caracteres.");
  process.exit(1);
}

try {
  const passwordHash = await hashPassword(password);

  const result = await withTransaction(async (client) => {
    const { rows: tenantRows } = await client.query("SELECT id FROM ciperprag_hub.tenants WHERE slug = $1 LIMIT 1", [tenantSlug]);
    const tenant = tenantRows[0];
    if (!tenant) throw new Error(`Tenant nao encontrado: ${tenantSlug}`);

    const { rows: userRows } = await client.query(
      `INSERT INTO ciperprag_hub.usuarios
       (tenant_id, nome, email, senha_hash, status, senha_alterada_em)
       VALUES ($1,$2,$3,$4,'ativo',NOW())
       ON CONFLICT (tenant_id, email) DO UPDATE SET
         nome = EXCLUDED.nome,
         senha_hash = EXCLUDED.senha_hash,
         status = 'ativo',
         senha_alterada_em = NOW(),
         tentativas_login = 0,
         bloqueado_ate = NULL,
         updated_at = NOW()
       RETURNING id, email, nome`,
      [tenant.id, name, email, passwordHash],
    );

    const user = userRows[0];

    await client.query(
      `INSERT INTO ciperprag_hub.usuario_perfis (usuario_id, perfil_id)
       SELECT $1, p.id
       FROM ciperprag_hub.perfis p
       WHERE p.tenant_id = $2 AND p.codigo = 'admin_empresa'
       ON CONFLICT DO NOTHING`,
      [user.id, tenant.id],
    );

    await client.query(
      `INSERT INTO ciperprag_hub.audit_logs
       (tenant_id, usuario_id, entidade_tipo, entidade_id, acao, resumo)
       VALUES ($1,$2,'usuario',$2,'admin_user_upsert','Administrador criado ou atualizado')`,
      [tenant.id, user.id],
    );

    return user;
  });

  console.log(JSON.stringify({ ok: true, user: result }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
