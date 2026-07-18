BEGIN;

ALTER TABLE IF EXISTS ciperprag_hub.contratos_templates
  ADD COLUMN IF NOT EXISTS titulo TEXT,
  ADD COLUMN IF NOT EXISTS objeto TEXT,
  ADD COLUMN IF NOT EXISTS validade_dias INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS modalidade TEXT,
  ADD COLUMN IF NOT EXISTS locais_execucao JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS escopo_tecnico TEXT,
  ADD COLUMN IF NOT EXISTS condicoes_comerciais TEXT;

UPDATE ciperprag_hub.contratos_templates
SET validade_dias = COALESCE(validade_dias, 30),
    locais_execucao = COALESCE(locais_execucao, '[]'::jsonb)
WHERE validade_dias IS NULL
   OR locais_execucao IS NULL;

COMMIT;

