BEGIN;

CREATE SCHEMA IF NOT EXISTS ciperprag_hub;
SET search_path TO ciperprag_hub, public;

ALTER TABLE IF EXISTS medicao_itens
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

UPDATE medicao_itens mi
SET tenant_id = m.tenant_id
FROM medicoes m
WHERE m.id = mi.medicao_id
  AND mi.tenant_id IS DISTINCT FROM m.tenant_id;

ALTER TABLE IF EXISTS medicao_itens
  ADD COLUMN IF NOT EXISTS medicao_ativa BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE medicao_itens mi
SET medicao_ativa = EXISTS (
  SELECT 1
  FROM medicoes m
  WHERE m.id = mi.medicao_id
    AND m.status <> 'cancelada'
)
WHERE medicao_ativa IS DISTINCT FROM EXISTS (
  SELECT 1
  FROM medicoes m
  WHERE m.id = mi.medicao_id
    AND m.status <> 'cancelada'
);

DROP INDEX IF EXISTS ux_medicao_itens_os_ativa;

CREATE UNIQUE INDEX IF NOT EXISTS ux_medicao_itens_tenant_os_ativa
  ON medicao_itens (tenant_id, os_id)
  WHERE medicao_ativa IS TRUE
    AND tenant_id IS NOT NULL;

ALTER TABLE IF EXISTS medicoes
  DROP CONSTRAINT IF EXISTS medicoes_financeiro_status_check;

ALTER TABLE IF EXISTS medicoes
  ADD CONSTRAINT medicoes_financeiro_status_check
  CHECK (financeiro_status IN (
    'em_conferencia',
    'emitida',
    'enviada_ao_cliente',
    'aceita',
    'aguardando_nf',
    'nf_registrada',
    'nf_enviada',
    'aguardando_pagamento',
    'paga',
    'pago_no_erp',
    'pendente_cliente',
    'cancelada',
    'substituida'
  ));

INSERT INTO audit_logs (tenant_id, entidade_tipo, acao, resumo)
SELECT id, 'system', 'migration_applied', 'Migracao 026_measurement_validation_and_tracking aplicada'
FROM tenants
WHERE slug = 'ciperprag';

COMMIT;
