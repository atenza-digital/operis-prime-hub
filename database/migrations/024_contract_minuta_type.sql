BEGIN;

CREATE SCHEMA IF NOT EXISTS ciperprag_hub;
SET search_path TO ciperprag_hub, public;

ALTER TABLE IF EXISTS contratos_templates
  DROP CONSTRAINT IF EXISTS contratos_templates_tipo_check;

ALTER TABLE IF EXISTS contratos_templates
  ADD CONSTRAINT contratos_templates_tipo_check
  CHECK (tipo IN ('contrato', 'proposta', 'minuta'));

ALTER TABLE IF EXISTS evidencias_anexos
  DROP CONSTRAINT IF EXISTS evidencias_anexos_entidade_check;

ALTER TABLE IF EXISTS evidencias_anexos
  ADD CONSTRAINT evidencias_anexos_entidade_check
  CHECK (entidade_tipo IN ('os','certificado','medicao','servico_pop','cliente','contrato','proposta','minuta'));

INSERT INTO audit_logs (tenant_id, entidade_tipo, acao, resumo)
SELECT id, 'system', 'migration_applied', 'Migracao 024_contract_minuta_type aplicada'
FROM tenants
WHERE slug = 'ciperprag';

COMMIT;
