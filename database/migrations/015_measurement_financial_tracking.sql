BEGIN;

CREATE SCHEMA IF NOT EXISTS ciperprag_hub;
SET search_path TO ciperprag_hub, public;

ALTER TABLE IF EXISTS medicoes
  ADD COLUMN IF NOT EXISTS financeiro_status VARCHAR(40) NOT NULL DEFAULT 'em_conferencia',
  ADD COLUMN IF NOT EXISTS nf_numero VARCHAR(80),
  ADD COLUMN IF NOT EXISTS nf_enviada_em DATE,
  ADD COLUMN IF NOT EXISTS pagamento_previsto_em DATE,
  ADD COLUMN IF NOT EXISTS pago_no_erp_em DATE,
  ADD COLUMN IF NOT EXISTS financeiro_observacao TEXT,
  ADD COLUMN IF NOT EXISTS financeiro_atualizado_em TIMESTAMPTZ;

UPDATE medicoes
SET financeiro_status = CASE
  WHEN status = 'cancelada' THEN 'cancelada'
  ELSE COALESCE(NULLIF(financeiro_status, ''), 'em_conferencia')
END
WHERE financeiro_status IS NULL
   OR financeiro_status = ''
   OR status = 'cancelada';

ALTER TABLE IF EXISTS medicoes
  DROP CONSTRAINT IF EXISTS medicoes_financeiro_status_check;

ALTER TABLE IF EXISTS medicoes
  ADD CONSTRAINT medicoes_financeiro_status_check
  CHECK (financeiro_status IN (
    'em_conferencia',
    'aguardando_nf',
    'nf_enviada',
    'aguardando_pagamento',
    'pago_no_erp',
    'pendente_cliente',
    'cancelada'
  ));

CREATE INDEX IF NOT EXISTS idx_medicoes_financeiro_status ON medicoes (financeiro_status);

INSERT INTO audit_logs (tenant_id, entidade_tipo, acao, resumo)
SELECT id, 'system', 'migration_applied', 'Migracao 015_measurement_financial_tracking aplicada'
FROM tenants
WHERE slug = 'ciperprag';

COMMIT;
