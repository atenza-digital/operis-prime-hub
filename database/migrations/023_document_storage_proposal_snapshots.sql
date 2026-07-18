BEGIN;

CREATE SCHEMA IF NOT EXISTS ciperprag_hub;
SET search_path TO ciperprag_hub, public;

ALTER TABLE IF EXISTS evidencias_anexos
  DROP CONSTRAINT IF EXISTS evidencias_anexos_entidade_check;

ALTER TABLE IF EXISTS evidencias_anexos
  ADD CONSTRAINT evidencias_anexos_entidade_check
  CHECK (entidade_tipo IN ('os','certificado','medicao','servico_pop','cliente','contrato','proposta'));

ALTER TABLE IF EXISTS evidencias_anexos
  ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(40) NOT NULL DEFAULT 'database',
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT,
  ADD COLUMN IF NOT EXISTS storage_key TEXT,
  ADD COLUMN IF NOT EXISTS storage_etag TEXT;

CREATE INDEX IF NOT EXISTS idx_evidencias_storage_provider ON evidencias_anexos(storage_provider);
CREATE INDEX IF NOT EXISTS idx_evidencias_storage_key ON evidencias_anexos(storage_key);

INSERT INTO audit_logs (tenant_id, entidade_tipo, acao, resumo)
SELECT id, 'system', 'migration_applied', 'Migracao 023_document_storage_proposal_snapshots aplicada'
FROM tenants
WHERE slug = 'ciperprag';

COMMIT;
