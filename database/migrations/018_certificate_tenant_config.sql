-- Atenza FieldOps - homologacao
-- Configuracao documental do certificado por tenant.

ALTER TABLE IF EXISTS ciperprag_hub.empresa_config
  ADD COLUMN IF NOT EXISTS certificado_config JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE ciperprag_hub.empresa_config
SET certificado_config = COALESCE(certificado_config, '{}'::jsonb)
WHERE certificado_config IS NULL;
