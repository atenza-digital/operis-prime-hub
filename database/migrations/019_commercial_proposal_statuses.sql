BEGIN;

ALTER TABLE IF EXISTS ciperprag_hub.contratos_templates
  DROP CONSTRAINT IF EXISTS contratos_templates_status_check;

ALTER TABLE IF EXISTS ciperprag_hub.contratos_templates
  ADD CONSTRAINT contratos_templates_status_check
  CHECK (status IN (
    'rascunho',
    'enviado',
    'em_negociacao',
    'aprovado',
    'recusado',
    'cancelado',
    'vigente',
    'encerrado'
  ));

COMMIT;

