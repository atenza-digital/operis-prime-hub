-- Atenza FieldOps - homologacao
-- Aliases SaaS para identidade visual documental por tenant.

ALTER TABLE IF EXISTS ciperprag_hub.empresa_config
  ADD COLUMN IF NOT EXISTS certificado_config JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE ciperprag_hub.empresa_config
SET certificado_config =
  COALESCE(certificado_config, '{}'::jsonb)
  || CASE
       WHEN certificado_config ? 'brandIconUrl' THEN '{}'::jsonb
       WHEN certificado_config ? 'arteFundoUrl' THEN jsonb_build_object('brandIconUrl', certificado_config->>'arteFundoUrl')
       ELSE '{}'::jsonb
     END
  || CASE
       WHEN certificado_config ? 'sidebarLogoDarkUrl' THEN '{}'::jsonb
       WHEN certificado_config ? 'logoInterfaceUrl' THEN jsonb_build_object('sidebarLogoDarkUrl', certificado_config->>'logoInterfaceUrl')
       ELSE '{}'::jsonb
     END
  || CASE
       WHEN certificado_config ? 'documentLogoLightUrl' THEN '{}'::jsonb
       WHEN certificado_config ? 'logoPrincipalUrl' THEN jsonb_build_object('documentLogoLightUrl', certificado_config->>'logoPrincipalUrl')
       WHEN logo_url IS NOT NULL AND logo_url <> '' THEN jsonb_build_object('documentLogoLightUrl', logo_url)
       ELSE '{}'::jsonb
     END
  || CASE
       WHEN certificado_config ? 'assinaturaModo' THEN '{}'::jsonb
       ELSE jsonb_build_object('assinaturaModo', CASE WHEN certificado_config ? 'assinaturaUrl' THEN 'imagem' ELSE 'linha' END)
     END,
  atualizado_em = NOW()
WHERE certificado_config IS NULL
   OR NOT certificado_config ? 'brandIconUrl'
   OR NOT certificado_config ? 'sidebarLogoDarkUrl'
   OR NOT certificado_config ? 'documentLogoLightUrl'
   OR NOT certificado_config ? 'assinaturaModo';
