BEGIN;

ALTER TABLE IF EXISTS ciperprag_hub.contratos_templates_servicos
  ADD COLUMN IF NOT EXISTS endereco_atividade TEXT;

COMMIT;
