BEGIN;

CREATE SCHEMA IF NOT EXISTS ciperprag_hub;
SET search_path TO ciperprag_hub;

CREATE TABLE IF NOT EXISTS servico_pops (
  id VARCHAR(30) PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  servico_id VARCHAR(20) NOT NULL REFERENCES servicos_catalogo(id) ON DELETE CASCADE,
  codigo VARCHAR(40) NOT NULL,
  titulo TEXT NOT NULL,
  versao VARCHAR(20) NOT NULL DEFAULT '001',
  status VARCHAR(20) NOT NULL DEFAULT 'ativo',
  objetivo TEXT,
  aplicacao TEXT,
  responsabilidades TEXT[] DEFAULT '{}',
  materiais TEXT[] DEFAULT '{}',
  procedimentos TEXT[] DEFAULT '{}',
  checklist_itens TEXT[] DEFAULT '{}',
  aprovado_por TEXT,
  aprovado_em DATE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT servico_pops_status_check CHECK (status IN ('rascunho','ativo','inativo')),
  CONSTRAINT servico_pops_unique_version UNIQUE (servico_id, codigo, versao)
);

ALTER TABLE servicos_catalogo
  ADD COLUMN IF NOT EXISTS pop_ativo_id VARCHAR(30) REFERENCES servico_pops(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_servico_pops_servico ON servico_pops(servico_id);
CREATE INDEX IF NOT EXISTS idx_servico_pops_status ON servico_pops(status);
CREATE INDEX IF NOT EXISTS idx_servicos_catalogo_pop_ativo ON servicos_catalogo(pop_ativo_id);

WITH tenant AS (
  SELECT id FROM tenants WHERE slug = 'ciperprag' LIMIT 1
),
seed AS (
  INSERT INTO servico_pops (
    id, tenant_id, servico_id, codigo, titulo, versao, status, objetivo, aplicacao,
    procedimentos, checklist_itens
  )
  SELECT
    'POP-' || s.id || '-001',
    tenant.id,
    s.id,
    COALESCE(NULLIF(s.pop_codigo, ''), 'POP-' || s.id),
    COALESCE(NULLIF(s.pop_titulo, ''), s.nome),
    COALESCE(NULLIF(s.pop_versao, ''), '001'),
    'ativo',
    s.descricao,
    'Aplicavel ao servico ' || s.nome,
    COALESCE(s.procedimentos, ARRAY[]::TEXT[]),
    COALESCE(s.checklist_itens, ARRAY[]::TEXT[])
  FROM servicos_catalogo s
  CROSS JOIN tenant
  WHERE s.pop_ativo_id IS NULL
    AND (
      NULLIF(s.pop_codigo, '') IS NOT NULL
      OR NULLIF(s.pop_titulo, '') IS NOT NULL
      OR COALESCE(array_length(s.procedimentos, 1), 0) > 0
      OR COALESCE(array_length(s.checklist_itens, 1), 0) > 0
    )
  ON CONFLICT (id) DO UPDATE SET
    codigo = EXCLUDED.codigo,
    titulo = EXCLUDED.titulo,
    versao = EXCLUDED.versao,
    objetivo = EXCLUDED.objetivo,
    aplicacao = EXCLUDED.aplicacao,
    procedimentos = EXCLUDED.procedimentos,
    checklist_itens = EXCLUDED.checklist_itens,
    atualizado_em = NOW()
  RETURNING id, servico_id
)
UPDATE servicos_catalogo s
SET pop_ativo_id = seed.id
FROM seed
WHERE s.id = seed.servico_id
  AND s.pop_ativo_id IS NULL;

INSERT INTO audit_logs (tenant_id, entidade_tipo, acao, resumo)
SELECT id, 'system', 'migration_applied', 'Migracao 008_service_pop_versions aplicada'
FROM tenants
WHERE slug = 'ciperprag';

COMMIT;
