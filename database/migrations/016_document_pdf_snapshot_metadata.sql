BEGIN;

CREATE SCHEMA IF NOT EXISTS ciperprag_hub;
SET search_path TO ciperprag_hub, public;

ALTER TABLE IF EXISTS evidencias_anexos
  ADD COLUMN IF NOT EXISTS template_codigo VARCHAR(80),
  ADD COLUMN IF NOT EXISTS template_versao VARCHAR(40),
  ADD COLUMN IF NOT EXISTS snapshot_hash_sha256 VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_evidencias_snapshot_hash_sha256 ON evidencias_anexos(snapshot_hash_sha256);
CREATE INDEX IF NOT EXISTS idx_evidencias_template ON evidencias_anexos(template_codigo, template_versao);

INSERT INTO audit_logs (tenant_id, entidade_tipo, acao, resumo)
SELECT id, 'system', 'migration_applied', 'Migracao 016_document_pdf_snapshot_metadata aplicada'
FROM tenants
WHERE slug = 'ciperprag';

COMMIT;
