BEGIN;

CREATE SCHEMA IF NOT EXISTS ciperprag_hub;
SET search_path TO ciperprag_hub;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS senha_alterada_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ultimo_login_ip INET,
  ADD COLUMN IF NOT EXISTS tentativas_login INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bloqueado_ate TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS convite_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS convite_expira_em TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS usuario_sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  ip INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuario_sessoes_usuario
  ON usuario_sessoes (usuario_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_usuario_sessoes_token
  ON usuario_sessoes (token_hash);

CREATE INDEX IF NOT EXISTS idx_usuario_sessoes_active
  ON usuario_sessoes (tenant_id, expires_at DESC)
  WHERE revoked_at IS NULL;

INSERT INTO audit_logs (tenant_id, entidade_tipo, acao, resumo)
SELECT id, 'system', 'migration_applied', 'Migracao 002_internal_auth aplicada'
FROM tenants
WHERE slug = 'ciperprag'
ON CONFLICT DO NOTHING;

COMMIT;
