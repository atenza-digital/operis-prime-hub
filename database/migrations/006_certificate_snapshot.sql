BEGIN;

CREATE SCHEMA IF NOT EXISTS ciperprag_hub;
SET search_path TO ciperprag_hub;

ALTER TABLE certificados
  ADD COLUMN IF NOT EXISTS snapshot_dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'emitido',
  ADD COLUMN IF NOT EXISTS revogado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_revogacao TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'certificados_status_check'
      AND conrelid = 'ciperprag_hub.certificados'::regclass
  ) THEN
    ALTER TABLE certificados
      ADD CONSTRAINT certificados_status_check
      CHECK (status IN ('emitido','revogado'));
  END IF;
END $$;

INSERT INTO audit_logs (tenant_id, entidade_tipo, acao, resumo)
SELECT id, 'system', 'migration_applied', 'Migracao 006_certificate_snapshot aplicada'
FROM tenants
WHERE slug = 'ciperprag';

COMMIT;
