BEGIN;

CREATE SCHEMA IF NOT EXISTS ciperprag_hub;
SET search_path TO ciperprag_hub;

ALTER TABLE evidencias_anexos
  ADD COLUMN IF NOT EXISTS hash_sha256 VARCHAR(64),
  ADD COLUMN IF NOT EXISTS imutavel BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_evidencias_hash_sha256 ON evidencias_anexos(hash_sha256);
CREATE INDEX IF NOT EXISTS idx_evidencias_imutavel ON evidencias_anexos(imutavel);

INSERT INTO audit_logs (tenant_id, entidade_tipo, acao, resumo)
SELECT id, 'system', 'migration_applied', 'Migracao 011_immutable_document_attachments aplicada'
FROM tenants
WHERE slug = 'ciperprag';

COMMIT;
