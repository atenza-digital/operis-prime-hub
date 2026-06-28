BEGIN;

CREATE SCHEMA IF NOT EXISTS ciperprag_hub;
SET search_path TO ciperprag_hub;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS senha_temporaria BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO audit_logs (tenant_id, entidade_tipo, acao, resumo)
SELECT id, 'system', 'migration_applied', 'Migracao 003_password_change_flow aplicada'
FROM tenants
WHERE slug = 'ciperprag';

COMMIT;
