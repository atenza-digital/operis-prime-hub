-- Atenza FieldOps - homologacao
-- Agrupa agendamentos/OS criados juntos (varios servicos no mesmo atendimento).

BEGIN;

ALTER TABLE IF EXISTS ciperprag_hub.agendamentos
  ADD COLUMN IF NOT EXISTS grupo_id VARCHAR(40);

ALTER TABLE IF EXISTS ciperprag_hub.ordens_servico
  ADD COLUMN IF NOT EXISTS grupo_id VARCHAR(40);

CREATE INDEX IF NOT EXISTS idx_agendamentos_tenant_grupo ON ciperprag_hub.agendamentos (tenant_id, grupo_id) WHERE grupo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ordens_servico_tenant_grupo ON ciperprag_hub.ordens_servico (tenant_id, grupo_id) WHERE grupo_id IS NOT NULL;

COMMIT;
