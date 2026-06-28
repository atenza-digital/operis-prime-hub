-- Ciperprag Hub - SaaS foundation
-- Safe, additive migration for the first production/SaaS step.
-- It creates tenant, user, role, permission and audit structures without
-- removing current MVP columns or blocking the existing operational flow.

BEGIN;

CREATE SCHEMA IF NOT EXISTS ciperprag_hub;
SET search_path TO ciperprag_hub;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(80) UNIQUE NOT NULL,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT NOT NULL,
  cnpj VARCHAR(18),
  status VARCHAR(20) NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tenants_status_check CHECK (status IN ('ativo', 'suspenso', 'inativo'))
);

INSERT INTO tenants (slug, razao_social, nome_fantasia, cnpj)
VALUES (
  'ciperprag',
  'CIPERPRAG Controle de Pragas e Serviços LTDA',
  'Ciperprag',
  '15.722.292/0001-43'
)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  nome TEXT NOT NULL,
  email CITEXT,
  senha_hash TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ativo',
  ultimo_login_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT usuarios_status_check CHECK (status IN ('ativo', 'convidado', 'bloqueado', 'inativo')),
  CONSTRAINT usuarios_email_tenant_unique UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS perfis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  codigo VARCHAR(80) NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  escopo VARCHAR(20) NOT NULL DEFAULT 'tenant',
  sistema BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT perfis_escopo_check CHECK (escopo IN ('sistema', 'tenant')),
  CONSTRAINT perfis_codigo_tenant_unique UNIQUE (tenant_id, codigo)
);

CREATE TABLE IF NOT EXISTS permissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(120) UNIQUE NOT NULL,
  modulo VARCHAR(80) NOT NULL,
  acao VARCHAR(80) NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS perfil_permissoes (
  perfil_id UUID NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  permissao_id UUID NOT NULL REFERENCES permissoes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (perfil_id, permissao_id)
);

CREATE TABLE IF NOT EXISTS usuario_perfis (
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  perfil_id UUID NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usuario_id, perfil_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  usuario_id UUID REFERENCES usuarios(id),
  entidade_tipo VARCHAR(80) NOT NULL,
  entidade_id TEXT,
  acao VARCHAR(80) NOT NULL,
  resumo TEXT,
  dados_antes JSONB,
  dados_depois JSONB,
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created_at
  ON audit_logs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entidade
  ON audit_logs (entidade_tipo, entidade_id);

INSERT INTO permissoes (codigo, modulo, acao, descricao)
VALUES
  ('dashboard.view', 'dashboard', 'view', 'Visualizar dashboard'),
  ('clientes.manage', 'clientes', 'manage', 'Criar e editar clientes'),
  ('servicos.manage', 'servicos', 'manage', 'Criar e editar serviços'),
  ('contratos.manage', 'contratos', 'manage', 'Criar e editar contratos e propostas'),
  ('agenda.manage', 'agenda', 'manage', 'Criar e gerenciar agendamentos'),
  ('os.manage', 'ordens_servico', 'manage', 'Gerenciar ordens de serviço'),
  ('os.close', 'ordens_servico', 'close', 'Encerrar ordens de serviço'),
  ('certificados.manage', 'certificados', 'manage', 'Gerenciar certificados'),
  ('medicoes.manage', 'medicoes', 'manage', 'Gerenciar medições'),
  ('financeiro.view', 'financeiro', 'view', 'Visualizar valores e dados financeiros'),
  ('equipes.manage', 'equipes', 'manage', 'Gerenciar técnicos, veículos e alocações'),
  ('configuracoes.manage', 'configuracoes', 'manage', 'Gerenciar configurações da empresa'),
  ('usuarios.manage', 'usuarios', 'manage', 'Gerenciar usuários e permissões'),
  ('auditoria.view', 'auditoria', 'view', 'Consultar auditoria')
ON CONFLICT (codigo) DO NOTHING;

WITH tenant AS (
  SELECT id FROM tenants WHERE slug = 'ciperprag'
),
inserted AS (
  INSERT INTO perfis (tenant_id, codigo, nome, descricao, escopo, sistema)
  SELECT tenant.id, role.codigo, role.nome, role.descricao, 'tenant', TRUE
  FROM tenant
  CROSS JOIN (
    VALUES
      ('admin_empresa', 'Administrador da empresa', 'Acesso administrativo completo ao tenant'),
      ('comercial', 'Comercial', 'Clientes, propostas, contratos e valores comerciais'),
      ('administrativo', 'Contratos/Administrativo', 'Contratos, agenda, OS e documentos administrativos'),
      ('operacao', 'Operação/Agendamento', 'Agenda, OS, equipe e execução operacional'),
      ('tecnico', 'Técnico', 'Execução de campo com acesso operacional limitado'),
      ('responsavel_tecnico', 'Responsável técnico', 'Certificados, validações técnicas e documentação operacional'),
      ('financeiro', 'Financeiro', 'Medições, notas, pagamentos e valores'),
      ('consulta_auditoria', 'Consulta/Auditoria', 'Consulta de dados e auditoria sem edição ampla')
  ) AS role(codigo, nome, descricao)
  ON CONFLICT (tenant_id, codigo) DO UPDATE
    SET nome = EXCLUDED.nome,
        descricao = EXCLUDED.descricao,
        sistema = EXCLUDED.sistema,
        updated_at = NOW()
  RETURNING id, codigo
)
INSERT INTO perfil_permissoes (perfil_id, permissao_id)
SELECT p.id, perm.id
FROM inserted p
JOIN permissoes perm ON
  p.codigo = 'admin_empresa'
  OR (p.codigo = 'comercial' AND perm.codigo IN ('dashboard.view', 'clientes.manage', 'servicos.manage', 'contratos.manage', 'financeiro.view'))
  OR (p.codigo = 'administrativo' AND perm.codigo IN ('dashboard.view', 'clientes.manage', 'contratos.manage', 'agenda.manage', 'os.manage', 'certificados.manage', 'medicoes.manage'))
  OR (p.codigo = 'operacao' AND perm.codigo IN ('dashboard.view', 'agenda.manage', 'os.manage', 'os.close', 'equipes.manage'))
  OR (p.codigo = 'tecnico' AND perm.codigo IN ('dashboard.view', 'os.manage', 'os.close'))
  OR (p.codigo = 'responsavel_tecnico' AND perm.codigo IN ('dashboard.view', 'servicos.manage', 'os.manage', 'certificados.manage'))
  OR (p.codigo = 'financeiro' AND perm.codigo IN ('dashboard.view', 'medicoes.manage', 'financeiro.view'))
  OR (p.codigo = 'consulta_auditoria' AND perm.codigo IN ('dashboard.view', 'auditoria.view'))
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  ciperprag_tenant UUID;
BEGIN
  SELECT id INTO ciperprag_tenant FROM tenants WHERE slug = 'ciperprag';

  IF to_regclass('ciperprag_hub.empresa_config') IS NOT NULL THEN
    ALTER TABLE empresa_config ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE empresa_config SET tenant_id = ciperprag_tenant WHERE tenant_id IS NULL;
  END IF;

  IF to_regclass('ciperprag_hub.numeracao_config') IS NOT NULL THEN
    ALTER TABLE numeracao_config ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE numeracao_config SET tenant_id = ciperprag_tenant WHERE tenant_id IS NULL;
  END IF;

  IF to_regclass('ciperprag_hub.clientes') IS NOT NULL THEN
    ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE clientes SET tenant_id = ciperprag_tenant WHERE tenant_id IS NULL;
  END IF;

  IF to_regclass('ciperprag_hub.tecnicos') IS NOT NULL THEN
    ALTER TABLE tecnicos ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE tecnicos SET tenant_id = ciperprag_tenant WHERE tenant_id IS NULL;
  END IF;

  IF to_regclass('ciperprag_hub.veiculos') IS NOT NULL THEN
    ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE veiculos SET tenant_id = ciperprag_tenant WHERE tenant_id IS NULL;
  END IF;

  IF to_regclass('ciperprag_hub.alocacoes_semanais') IS NOT NULL THEN
    ALTER TABLE alocacoes_semanais ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE alocacoes_semanais SET tenant_id = ciperprag_tenant WHERE tenant_id IS NULL;
  END IF;

  IF to_regclass('ciperprag_hub.servicos_catalogo') IS NOT NULL THEN
    ALTER TABLE servicos_catalogo ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE servicos_catalogo SET tenant_id = ciperprag_tenant WHERE tenant_id IS NULL;
  END IF;

  IF to_regclass('ciperprag_hub.contratos') IS NOT NULL THEN
    ALTER TABLE contratos ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE contratos SET tenant_id = ciperprag_tenant WHERE tenant_id IS NULL;
  END IF;

  IF to_regclass('ciperprag_hub.agendamentos') IS NOT NULL THEN
    ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE agendamentos SET tenant_id = ciperprag_tenant WHERE tenant_id IS NULL;
  END IF;

  IF to_regclass('ciperprag_hub.ordens_servico') IS NOT NULL THEN
    ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE ordens_servico SET tenant_id = ciperprag_tenant WHERE tenant_id IS NULL;
  END IF;

  IF to_regclass('ciperprag_hub.certificados') IS NOT NULL THEN
    ALTER TABLE certificados ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE certificados SET tenant_id = ciperprag_tenant WHERE tenant_id IS NULL;
  END IF;

  IF to_regclass('ciperprag_hub.recorrencia_sugestoes') IS NOT NULL THEN
    ALTER TABLE recorrencia_sugestoes ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE recorrencia_sugestoes SET tenant_id = ciperprag_tenant WHERE tenant_id IS NULL;
  END IF;

  IF to_regclass('ciperprag_hub.contratos_templates') IS NOT NULL THEN
    ALTER TABLE contratos_templates ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE contratos_templates SET tenant_id = ciperprag_tenant WHERE tenant_id IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('ciperprag_hub.empresa_config') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_empresa_config_tenant_id ON empresa_config (tenant_id);
  END IF;
  IF to_regclass('ciperprag_hub.numeracao_config') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_numeracao_config_tenant_id ON numeracao_config (tenant_id);
  END IF;
  IF to_regclass('ciperprag_hub.clientes') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_clientes_tenant_id ON clientes (tenant_id);
  END IF;
  IF to_regclass('ciperprag_hub.tecnicos') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_tecnicos_tenant_id ON tecnicos (tenant_id);
  END IF;
  IF to_regclass('ciperprag_hub.veiculos') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_veiculos_tenant_id ON veiculos (tenant_id);
  END IF;
  IF to_regclass('ciperprag_hub.alocacoes_semanais') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_alocacoes_semanais_tenant_id ON alocacoes_semanais (tenant_id);
  END IF;
  IF to_regclass('ciperprag_hub.servicos_catalogo') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_servicos_catalogo_tenant_id ON servicos_catalogo (tenant_id);
  END IF;
  IF to_regclass('ciperprag_hub.contratos') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_contratos_tenant_id ON contratos (tenant_id);
  END IF;
  IF to_regclass('ciperprag_hub.agendamentos') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_agendamentos_tenant_id ON agendamentos (tenant_id);
  END IF;
  IF to_regclass('ciperprag_hub.ordens_servico') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_ordens_servico_tenant_id ON ordens_servico (tenant_id);
  END IF;
  IF to_regclass('ciperprag_hub.certificados') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_certificados_tenant_id ON certificados (tenant_id);
  END IF;
  IF to_regclass('ciperprag_hub.recorrencia_sugestoes') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_recorrencia_sugestoes_tenant_id ON recorrencia_sugestoes (tenant_id);
  END IF;
  IF to_regclass('ciperprag_hub.contratos_templates') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_contratos_templates_tenant_id ON contratos_templates (tenant_id);
  END IF;
END $$;

INSERT INTO audit_logs (tenant_id, entidade_tipo, acao, resumo)
SELECT id, 'system', 'migration_applied', 'Migração 001_saas_foundation aplicada'
FROM tenants
WHERE slug = 'ciperprag';

COMMIT;
