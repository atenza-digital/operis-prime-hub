-- Atenza FieldOps - homologacao
-- Compatibilidade de assets documentais legados por tenant.

BEGIN;

ALTER TABLE IF EXISTS ciperprag_hub.empresa_config
  ADD COLUMN IF NOT EXISTS certificado_config JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE ciperprag_hub.empresa_config
SET certificado_config = COALESCE(certificado_config, '{}'::jsonb)
  || CASE
       WHEN certificado_config ? 'brandIconUrl' THEN '{}'::jsonb
       WHEN certificado_config ? 'arteFundoUrl'
         THEN jsonb_build_object('brandIconUrl', certificado_config->>'arteFundoUrl')
       ELSE '{}'::jsonb
     END,
    atualizado_em = NOW()
WHERE COALESCE(certificado_config, '{}'::jsonb) ? 'arteFundoUrl'
  AND NOT (COALESCE(certificado_config, '{}'::jsonb) ? 'brandIconUrl');

COMMIT;
