-- Permite atendimentos avulsos sem contrato, mantendo o serviço rastreável no catálogo.
ALTER TABLE IF EXISTS ciperprag_hub.agendamentos
  ADD COLUMN IF NOT EXISTS servico_catalogo_id VARCHAR(20);

ALTER TABLE IF EXISTS ciperprag_hub.recorrencia_sugestoes
  ADD COLUMN IF NOT EXISTS servico_catalogo_id VARCHAR(20);

ALTER TABLE IF EXISTS ciperprag_hub.recorrencia_sugestoes
  ALTER COLUMN contrato_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agendamentos_servico_catalogo
  ON ciperprag_hub.agendamentos (tenant_id, servico_catalogo_id);

CREATE INDEX IF NOT EXISTS idx_recorrencia_servico_catalogo
  ON ciperprag_hub.recorrencia_sugestoes (tenant_id, servico_catalogo_id);
