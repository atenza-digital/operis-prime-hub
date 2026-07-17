BEGIN;

CREATE SCHEMA IF NOT EXISTS ciperprag_hub;
SET search_path TO ciperprag_hub;

ALTER TABLE IF EXISTS certificados
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

ALTER TABLE IF EXISTS recorrencia_sugestoes
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

ALTER TABLE IF EXISTS medicoes
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

UPDATE certificados
SET tenant_id = tenants.id
FROM tenants
WHERE certificados.tenant_id IS NULL
  AND tenants.slug = 'ciperprag';

UPDATE recorrencia_sugestoes
SET tenant_id = tenants.id
FROM tenants
WHERE recorrencia_sugestoes.tenant_id IS NULL
  AND tenants.slug = 'ciperprag';

UPDATE medicoes
SET tenant_id = tenants.id
FROM tenants
WHERE medicoes.tenant_id IS NULL
  AND tenants.slug = 'ciperprag';

CREATE INDEX IF NOT EXISTS idx_certificados_tenant_id ON certificados (tenant_id);
CREATE INDEX IF NOT EXISTS idx_recorrencia_sugestoes_tenant_id ON recorrencia_sugestoes (tenant_id);
CREATE INDEX IF NOT EXISTS idx_medicoes_tenant_id ON medicoes (tenant_id);

INSERT INTO audit_logs (tenant_id, entidade_tipo, acao, resumo)
SELECT id, 'system', 'migration_applied', 'Migracao 013_tenant_scope_measurements_and_documents aplicada'
FROM tenants
WHERE slug = 'ciperprag';

COMMIT;
