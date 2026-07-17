import crypto from "node:crypto";
import { hashPassword, normalizeEmail } from "../server/auth.mjs";
import { pool, withTransaction } from "../server/db.mjs";

const tenantSlug = process.argv.find((arg) => arg.startsWith("--tenant="))?.split("=")[1] || "ciperprag";
const resetPasswords = process.argv.includes("--reset-passwords");

const users = [
  {
    nome: "Homologacao Comercial",
    email: "homolog.comercial@atenza.digital",
    perfis: ["comercial"],
  },
  {
    nome: "Homologacao Operacao",
    email: "homolog.operacao@atenza.digital",
    perfis: ["operacao", "administrativo"],
  },
  {
    nome: "Homologacao Qualidade",
    email: "homolog.qualidade@atenza.digital",
    perfis: ["responsavel_tecnico"],
  },
  {
    nome: "Homologacao Medicao",
    email: "homolog.medicao@atenza.digital",
    perfis: ["financeiro"],
  },
];

function makeTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#";
  const bytes = crypto.randomBytes(14);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

async function main() {
  const result = await withTransaction(async (client) => {
    const { rows: tenantRows } = await client.query(
      "SELECT id, slug FROM ciperprag_hub.tenants WHERE slug = $1 LIMIT 1",
      [tenantSlug],
    );
    const tenant = tenantRows[0];
    if (!tenant) throw new Error(`Tenant nao encontrado: ${tenantSlug}`);

    const prepared = [];

    for (const user of users) {
      const email = normalizeEmail(user.email);
      const temporaryPassword = makeTemporaryPassword();
      const passwordHash = await hashPassword(temporaryPassword);

      const { rows: existingRows } = await client.query(
        "SELECT id FROM ciperprag_hub.usuarios WHERE tenant_id = $1 AND email = $2 LIMIT 1",
        [tenant.id, email],
      );
      const exists = Boolean(existingRows[0]);
      const shouldResetPassword = resetPasswords || !exists;

      const { rows: savedRows } = await client.query(
        `INSERT INTO ciperprag_hub.usuarios
         (tenant_id, nome, email, senha_hash, status, senha_alterada_em, senha_temporaria, tentativas_login, bloqueado_ate)
         VALUES ($1,$2,$3,$4,'ativo',NOW(),TRUE,0,NULL)
         ON CONFLICT (tenant_id, email) DO UPDATE SET
           nome = EXCLUDED.nome,
           status = 'ativo',
           senha_hash = CASE WHEN $5 THEN EXCLUDED.senha_hash ELSE ciperprag_hub.usuarios.senha_hash END,
           senha_temporaria = CASE WHEN $5 THEN TRUE ELSE ciperprag_hub.usuarios.senha_temporaria END,
           senha_alterada_em = CASE WHEN $5 THEN NOW() ELSE ciperprag_hub.usuarios.senha_alterada_em END,
           tentativas_login = 0,
           bloqueado_ate = NULL,
           updated_at = NOW()
         RETURNING id, email, nome, status, senha_temporaria`,
        [tenant.id, user.nome, email, passwordHash, shouldResetPassword],
      );
      const saved = savedRows[0];

      const { rows: roleRows } = await client.query(
        `SELECT id, codigo
           FROM ciperprag_hub.perfis
          WHERE tenant_id = $1
            AND codigo = ANY($2::text[])`,
        [tenant.id, user.perfis],
      );

      const foundRoles = new Set(roleRows.map((role) => role.codigo));
      const missingRoles = user.perfis.filter((role) => !foundRoles.has(role));
      if (missingRoles.length) {
        throw new Error(`Perfis nao encontrados para ${email}: ${missingRoles.join(", ")}`);
      }

      await client.query("DELETE FROM ciperprag_hub.usuario_perfis WHERE usuario_id = $1", [saved.id]);

      for (const role of roleRows) {
        await client.query(
          `INSERT INTO ciperprag_hub.usuario_perfis (usuario_id, perfil_id)
           VALUES ($1,$2)
           ON CONFLICT DO NOTHING`,
          [saved.id, role.id],
        );
      }

      await client.query(
        `INSERT INTO ciperprag_hub.audit_logs
         (tenant_id, usuario_id, entidade_tipo, entidade_id, acao, resumo)
         VALUES ($1,$2,'usuario',$3,'homologation_user_prepared','Usuario de homologacao preparado')`,
        [tenant.id, saved.id, saved.id],
      );

      prepared.push({
        nome: saved.nome,
        email: saved.email,
        status: saved.status,
        perfis: user.perfis,
        senhaTemporaria: shouldResetPassword ? temporaryPassword : "(mantida)",
        trocaObrigatoria: shouldResetPassword || saved.senha_temporaria,
      });
    }

    return prepared;
  });

  console.log(JSON.stringify({ ok: true, tenant: tenantSlug, users: result }, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
