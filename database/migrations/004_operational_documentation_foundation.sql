BEGIN;

CREATE SCHEMA IF NOT EXISTS ciperprag_hub;
SET search_path TO ciperprag_hub;

ALTER TABLE empresa_config
  ADD COLUMN IF NOT EXISTS certificado_validade_padrao_dias INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS certificado_texto_legal TEXT,
  ADD COLUMN IF NOT EXISTS certificado_texto_fixacao TEXT DEFAULT 'FIXAR OBRIGATORIAMENTE EM LOCAL VISIVEL',
  ADD COLUMN IF NOT EXISTS telefone_emergencia VARCHAR(30),
  ADD COLUMN IF NOT EXISTS medicao_forma_pagamento_padrao TEXT,
  ADD COLUMN IF NOT EXISTS medicao_local_entrega_padrao TEXT;

ALTER TABLE numeracao_config
  ADD COLUMN IF NOT EXISTS certificado_formato VARCHAR(50) DEFAULT 'CERT-{SEQ}/{ANO}',
  ADD COLUMN IF NOT EXISTS certificado_ultimo INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS medicao_formato VARCHAR(50) DEFAULT 'MED-{SEQ}/{ANO}',
  ADD COLUMN IF NOT EXISTS medicao_ultimo INTEGER NOT NULL DEFAULT 0;

ALTER TABLE contatos_cliente
  ADD COLUMN IF NOT EXISTS funcao VARCHAR(40) DEFAULT 'operacional',
  ADD COLUMN IF NOT EXISTS observacoes TEXT;

ALTER TABLE servicos_catalogo
  ADD COLUMN IF NOT EXISTS checklist_itens TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS exige_foto BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS exige_assinatura BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS permite_nao_execucao BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS pop_codigo VARCHAR(40),
  ADD COLUMN IF NOT EXISTS pop_titulo TEXT,
  ADD COLUMN IF NOT EXISTS pop_versao VARCHAR(20);

CREATE TABLE IF NOT EXISTS cliente_locais_execucao (
  id VARCHAR(30) PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  cliente_id VARCHAR(20) NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  endereco TEXT,
  bairro TEXT,
  municipio TEXT,
  uf CHAR(2),
  cep VARCHAR(10),
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cliente_equipamentos (
  id VARCHAR(30) PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  cliente_id VARCHAR(20) NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  local_id VARCHAR(30) REFERENCES cliente_locais_execucao(id) ON DELETE SET NULL,
  tag VARCHAR(80) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(80),
  setor TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cliente_equipamentos_tag_unique UNIQUE (cliente_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_cliente_locais_cliente ON cliente_locais_execucao(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_locais_tenant ON cliente_locais_execucao(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cliente_equipamentos_cliente ON cliente_equipamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_equipamentos_local ON cliente_equipamentos(local_id);
CREATE INDEX IF NOT EXISTS idx_cliente_equipamentos_tenant ON cliente_equipamentos(tenant_id);

WITH tenant AS (
  SELECT id FROM tenants WHERE slug = 'ciperprag' LIMIT 1
)
INSERT INTO cliente_locais_execucao (id, tenant_id, cliente_id, nome, endereco, bairro, municipio, uf, cep, ativo)
SELECT
  'LOC-' || c.id,
  tenant.id,
  c.id,
  COALESCE(NULLIF(c.nome_fantasia, ''), c.razao_social),
  c.endereco,
  c.bairro,
  c.municipio,
  c.uf,
  c.cep,
  TRUE
FROM clientes c
CROSS JOIN tenant
WHERE NOT EXISTS (
  SELECT 1
  FROM cliente_locais_execucao l
  WHERE l.cliente_id = c.id
);

WITH tenant AS (
  SELECT id FROM tenants WHERE slug = 'ciperprag' LIMIT 1
)
UPDATE cliente_locais_execucao
SET tenant_id = tenant.id
FROM tenant
WHERE cliente_locais_execucao.tenant_id IS NULL;

WITH tenant AS (
  SELECT id FROM tenants WHERE slug = 'ciperprag' LIMIT 1
)
UPDATE cliente_equipamentos
SET tenant_id = tenant.id
FROM tenant
WHERE cliente_equipamentos.tenant_id IS NULL;

INSERT INTO audit_logs (tenant_id, entidade_tipo, acao, resumo)
SELECT id, 'system', 'migration_applied', 'Migracao 004_operational_documentation_foundation aplicada'
FROM tenants
WHERE slug = 'ciperprag';

COMMIT;
