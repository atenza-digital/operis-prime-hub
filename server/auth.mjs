import crypto from "node:crypto";
import { promisify } from "node:util";
import { query, withTransaction } from "./db.mjs";

const scryptAsync = promisify(crypto.scrypt);
const PASSWORD_PREFIX = "scrypt";
const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 12);

function timingSafeEqualText(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const derived = await scryptAsync(password, salt, 64);
  return `${PASSWORD_PREFIX}$${salt}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.startsWith(`${PASSWORD_PREFIX}$`)) return false;
  const [, salt, expected] = storedHash.split("$");
  if (!salt || !expected) return false;
  const derived = await scryptAsync(password, salt, 64);
  return timingSafeEqualText(derived.toString("base64url"), expected);
}

async function getUserPayload(client, userId) {
  const db = client ?? { query };
  const { rows } = await db.query(
    `SELECT
       u.id,
       u.nome,
       u.email,
       u.status,
       u.senha_temporaria,
       u.ultimo_login_em,
       t.id AS tenant_id,
       t.slug AS tenant_slug,
       t.nome_fantasia AS tenant_nome,
       ec.logo_url AS tenant_logo_url,
       ec.logo_interface_url AS tenant_logo_interface_url,
       COALESCE(
         JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('codigo', p.codigo, 'nome', p.nome))
           FILTER (WHERE p.id IS NOT NULL),
         '[]'
       ) AS perfis,
       COALESCE(
         ARRAY_AGG(DISTINCT perm.codigo)
           FILTER (WHERE perm.codigo IS NOT NULL),
         '{}'
       ) AS permissoes
     FROM ciperprag_hub.usuarios u
     JOIN ciperprag_hub.tenants t ON t.id = u.tenant_id
     LEFT JOIN LATERAL (
       SELECT
         logo_url,
         certificado_config->>'logoInterfaceUrl' AS logo_interface_url
         FROM ciperprag_hub.empresa_config
        WHERE tenant_id = t.id
        ORDER BY id
        LIMIT 1
     ) ec ON TRUE
     LEFT JOIN ciperprag_hub.usuario_perfis up ON up.usuario_id = u.id
     LEFT JOIN ciperprag_hub.perfis p ON p.id = up.perfil_id
     LEFT JOIN ciperprag_hub.perfil_permissoes pp ON pp.perfil_id = p.id
     LEFT JOIN ciperprag_hub.permissoes perm ON perm.id = pp.permissao_id
     WHERE u.id = $1
    GROUP BY u.id, t.id, ec.logo_url, ec.logo_interface_url`,
    [userId],
  );

  const user = rows[0];
  if (!user) return null;
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    status: user.status,
    senhaTemporaria: Boolean(user.senha_temporaria),
    ultimoLoginEm: user.ultimo_login_em?.toISOString?.() ?? user.ultimo_login_em,
    tenant: {
      id: user.tenant_id,
      slug: user.tenant_slug,
      nome: user.tenant_nome,
      logoUrl: user.tenant_logo_url,
      logoInterfaceUrl: user.tenant_logo_interface_url,
    },
    perfis: user.perfis ?? [],
    permissoes: user.permissoes ?? [],
  };
}

export async function loginWithPassword({ email, password, tenantSlug, ip, userAgent }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) {
    const error = new Error("Informe e-mail e senha.");
    error.status = 400;
    throw error;
  }
  const normalizedTenantSlug = tenantSlug ? String(tenantSlug).trim().toLowerCase() : null;

  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT u.*, t.slug AS tenant_slug
       FROM ciperprag_hub.usuarios u
       JOIN ciperprag_hub.tenants t ON t.id = u.tenant_id
       WHERE u.email = $1
         AND ($2::text IS NULL OR t.slug = $2)
       ORDER BY t.slug = 'ciperprag' DESC
       LIMIT 1`,
      [normalizedEmail, normalizedTenantSlug],
    );

    const user = rows[0];
    const invalidError = new Error("E-mail ou senha inválidos.");
    invalidError.status = 401;

    if (!user || user.status !== "ativo") throw invalidError;
    if (user.bloqueado_ate && new Date(user.bloqueado_ate).getTime() > Date.now()) {
      const error = new Error("Usuário temporariamente bloqueado. Tente novamente mais tarde.");
      error.status = 423;
      throw error;
    }

    const validPassword = await verifyPassword(password, user.senha_hash);
    if (!validPassword) {
      const attempts = Number(user.tentativas_login || 0) + 1;
      const blockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await client.query(
        `UPDATE ciperprag_hub.usuarios
         SET tentativas_login = $2, bloqueado_ate = $3, updated_at = NOW()
         WHERE id = $1`,
        [user.id, attempts, blockedUntil],
      );
      throw invalidError;
    }

    const token = createSessionToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

    await client.query(
      `INSERT INTO ciperprag_hub.usuario_sessoes
       (tenant_id, usuario_id, token_hash, ip, user_agent, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [user.tenant_id, user.id, tokenHash, ip || null, userAgent || null, expiresAt],
    );

    await client.query(
      `UPDATE ciperprag_hub.usuarios
       SET ultimo_login_em = NOW(),
           ultimo_login_ip = $2,
           tentativas_login = 0,
           bloqueado_ate = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [user.id, ip || null],
    );

    await client.query(
      `INSERT INTO ciperprag_hub.audit_logs
       (tenant_id, usuario_id, entidade_tipo, entidade_id, acao, resumo, ip, user_agent)
       VALUES ($1,$2,'usuario',$3,'login','Login realizado com sucesso',$4,$5)`,
      [user.tenant_id, user.id, user.id, ip || null, userAgent || null],
    );

    return {
      token,
      expiresAt: expiresAt.toISOString(),
      user: await getUserPayload(client, user.id),
    };
  });
}

export async function authenticateToken(token) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const { rows } = await query(
    `SELECT s.*, u.status AS usuario_status
     FROM ciperprag_hub.usuario_sessoes s
     JOIN ciperprag_hub.usuarios u ON u.id = s.usuario_id
     WHERE s.token_hash = $1
       AND s.revoked_at IS NULL
       AND s.expires_at > NOW()
     LIMIT 1`,
    [tokenHash],
  );

  const session = rows[0];
  if (!session || session.usuario_status !== "ativo") return null;

  await query("UPDATE ciperprag_hub.usuario_sessoes SET last_seen_at = NOW() WHERE id = $1", [session.id]).catch(() => {});
  const user = await getUserPayload(null, session.usuario_id);
  if (!user) return null;

  return {
    sessionId: session.id,
    tokenHash,
    user,
  };
}

export async function revokeSession(tokenHash) {
  if (!tokenHash) return;
  await query(
    `UPDATE ciperprag_hub.usuario_sessoes
     SET revoked_at = NOW(), last_seen_at = NOW()
     WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash],
  );
}

export async function changePassword({ userId, tenantId, currentPassword, newPassword, sessionTokenHash, ip, userAgent }) {
  if (!currentPassword || !newPassword) {
    const error = new Error("Informe a senha atual e a nova senha.");
    error.status = 400;
    throw error;
  }
  if (String(newPassword).length < 8) {
    const error = new Error("A nova senha deve ter pelo menos 8 caracteres.");
    error.status = 400;
    throw error;
  }
  if (currentPassword === newPassword) {
    const error = new Error("A nova senha precisa ser diferente da senha atual.");
    error.status = 400;
    throw error;
  }

  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT id, senha_hash
       FROM ciperprag_hub.usuarios
       WHERE id = $1 AND tenant_id = $2 AND status = 'ativo'
       LIMIT 1`,
      [userId, tenantId],
    );
    const user = rows[0];
    if (!user || !(await verifyPassword(currentPassword, user.senha_hash))) {
      const error = new Error("Senha atual inválida.");
      error.status = 401;
      throw error;
    }

    const passwordHash = await hashPassword(newPassword);
    await client.query(
      `UPDATE ciperprag_hub.usuarios
       SET senha_hash = $3,
           senha_temporaria = FALSE,
           senha_alterada_em = NOW(),
           tentativas_login = 0,
           bloqueado_ate = NULL,
           updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      [userId, tenantId, passwordHash],
    );

    await client.query(
      `UPDATE ciperprag_hub.usuario_sessoes
       SET revoked_at = NOW()
       WHERE usuario_id = $1
         AND revoked_at IS NULL
         AND token_hash <> $2`,
      [userId, sessionTokenHash],
    );

    await client.query(
      `INSERT INTO ciperprag_hub.audit_logs
       (tenant_id, usuario_id, entidade_tipo, entidade_id, acao, resumo, ip, user_agent)
       VALUES ($1,$2,'usuario',$3,'password_changed','Senha alterada pelo usuario',$4,$5)`,
      [tenantId, userId, userId, ip || null, userAgent || null],
    );

    return getUserPayload(client, userId);
  });
}
