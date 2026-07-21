BEGIN;

ALTER TABLE IF EXISTS ciperprag_hub.contratos_templates_servicos
  ADD COLUMN IF NOT EXISTS descricao_comercial TEXT,
  ADD COLUMN IF NOT EXISTS unidade_comercial TEXT;

COMMIT;

