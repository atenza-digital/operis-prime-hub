ALTER TABLE ciperprag_hub.ordens_servico ADD COLUMN IF NOT EXISTS atividades JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE ciperprag_hub.certificados ADD COLUMN IF NOT EXISTS atividade_id VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS ux_certificado_atividade_vigente
  ON ciperprag_hub.certificados (tenant_id, os_id, atividade_id)
  WHERE atividade_id IS NOT NULL AND status = 'emitido';
ALTER TABLE ciperprag_hub.medicao_itens ADD COLUMN IF NOT EXISTS atividade_id VARCHAR(64);
ALTER TABLE ciperprag_hub.medicoes DROP CONSTRAINT IF EXISTS medicoes_numero_key;
CREATE UNIQUE INDEX IF NOT EXISTS ux_medicoes_tenant_numero ON ciperprag_hub.medicoes (tenant_id, numero);
DROP INDEX IF EXISTS ciperprag_hub.ux_medicao_itens_tenant_os_ativa;
DROP INDEX IF EXISTS ciperprag_hub.ux_medicao_atividade_ativa;
-- Retain the legacy name so the preceding release can still start during rollback.
CREATE UNIQUE INDEX IF NOT EXISTS ux_medicao_itens_tenant_os_ativa
  ON ciperprag_hub.medicao_itens (tenant_id, os_id, COALESCE(atividade_id, 'principal'))
  WHERE medicao_ativa IS TRUE AND tenant_id IS NOT NULL;
