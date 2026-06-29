BEGIN;

CREATE SCHEMA IF NOT EXISTS ciperprag_hub;
SET search_path TO ciperprag_hub;

CREATE TABLE IF NOT EXISTS evidencias_anexos (
  id VARCHAR(30) PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  entidade_tipo VARCHAR(30) NOT NULL,
  entidade_id VARCHAR(40) NOT NULL,
  categoria VARCHAR(40) NOT NULL DEFAULT 'evidencia',
  nome_arquivo TEXT NOT NULL,
  mime_type VARCHAR(120),
  tamanho_bytes INTEGER,
  conteudo_base64 TEXT,
  url TEXT,
  metadados JSONB NOT NULL DEFAULT '{}'::jsonb,
  criado_por UUID REFERENCES usuarios(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT evidencias_anexos_entidade_check CHECK (entidade_tipo IN ('os','certificado','medicao','servico_pop','cliente','contrato')),
  CONSTRAINT evidencias_anexos_categoria_check CHECK (categoria IN ('evidencia','foto','documento','pop_aprovado','pdf_historico','outro'))
);

CREATE INDEX IF NOT EXISTS idx_evidencias_entidade ON evidencias_anexos(entidade_tipo, entidade_id);
CREATE INDEX IF NOT EXISTS idx_evidencias_tenant ON evidencias_anexos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_evidencias_categoria ON evidencias_anexos(categoria);

WITH tenant AS (
  SELECT id FROM tenants WHERE slug = 'ciperprag' LIMIT 1
),
expanded AS (
  SELECT
    o.id AS os_id,
    tenant.id AS tenant_id,
    foto,
    ord::int AS posicao
  FROM ordens_servico o
  CROSS JOIN tenant
  CROSS JOIN LATERAL unnest(COALESCE(o.fotos, ARRAY[]::TEXT[])) WITH ORDINALITY AS f(foto, ord)
  WHERE COALESCE(array_length(o.fotos, 1), 0) > 0
)
INSERT INTO evidencias_anexos (
  id, tenant_id, entidade_tipo, entidade_id, categoria, nome_arquivo, mime_type,
  conteudo_base64, metadados
)
SELECT
  'EV-' || os_id || '-' || LPAD(posicao::text, 2, '0'),
  tenant_id,
  'os',
  os_id,
  'foto',
  'evidencia-' || LPAD(posicao::text, 2, '0') || '.jpg',
  CASE
    WHEN foto LIKE 'data:%;base64,%' THEN split_part(split_part(foto, ';', 1), ':', 2)
    ELSE 'image/jpeg'
  END,
  foto,
  jsonb_build_object('origem', 'migracao_fotos_os', 'posicao', posicao)
FROM expanded
ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_logs (tenant_id, entidade_tipo, acao, resumo)
SELECT id, 'system', 'migration_applied', 'Migracao 009_structured_evidence_attachments aplicada'
FROM tenants
WHERE slug = 'ciperprag';

COMMIT;
