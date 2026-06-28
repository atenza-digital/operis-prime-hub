BEGIN;

CREATE SCHEMA IF NOT EXISTS ciperprag_hub;
SET search_path TO ciperprag_hub;

CREATE TABLE IF NOT EXISTS medicoes (
  id VARCHAR(30) PRIMARY KEY,
  numero VARCHAR(40) NOT NULL UNIQUE,
  cliente_id VARCHAR(20),
  cliente_nome TEXT NOT NULL,
  cliente_cnpj VARCHAR(18),
  cliente_endereco TEXT,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'emitida',
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  forma_pagamento TEXT,
  local_entrega TEXT,
  snapshot_dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT medicoes_status_check CHECK (status IN ('emitida','cancelada'))
);

CREATE TABLE IF NOT EXISTS medicao_itens (
  id BIGSERIAL PRIMARY KEY,
  medicao_id VARCHAR(30) NOT NULL REFERENCES medicoes(id) ON DELETE CASCADE,
  os_id VARCHAR(30) NOT NULL,
  os_numero VARCHAR(30),
  contrato_id VARCHAR(20),
  servico TEXT NOT NULL,
  data_execucao DATE NOT NULL,
  quantidade NUMERIC(10,2) NOT NULL DEFAULT 0,
  unidade VARCHAR(30),
  valor_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medicoes_cliente_periodo ON medicoes(cliente_nome, periodo_inicio, periodo_fim);
CREATE INDEX IF NOT EXISTS idx_medicoes_status ON medicoes(status);
CREATE INDEX IF NOT EXISTS idx_medicao_itens_medicao ON medicao_itens(medicao_id);
CREATE INDEX IF NOT EXISTS idx_medicao_itens_os ON medicao_itens(os_id);

INSERT INTO audit_logs (tenant_id, entidade_tipo, acao, resumo)
SELECT id, 'system', 'migration_applied', 'Migracao 007_persistent_measurements aplicada'
FROM tenants
WHERE slug = 'ciperprag';

COMMIT;
