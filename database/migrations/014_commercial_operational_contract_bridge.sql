-- Etapa 3 - Vinculo entre contrato comercial e contrato operacional.
-- Base de homologacao: Atenza FieldOps / tenant Ciperprag.

ALTER TABLE IF EXISTS ciperprag_hub.contratos
  ADD COLUMN IF NOT EXISTS contrato_template_id VARCHAR(20),
  ADD COLUMN IF NOT EXISTS contrato_template_servico_id INTEGER,
  ADD COLUMN IF NOT EXISTS servico_catalogo_id VARCHAR(20),
  ADD COLUMN IF NOT EXISTS numero_comercial VARCHAR(30),
  ADD COLUMN IF NOT EXISTS vigencia_inicio DATE,
  ADD COLUMN IF NOT EXISTS vigencia_fim DATE,
  ADD COLUMN IF NOT EXISTS frequencia TEXT;

CREATE INDEX IF NOT EXISTS idx_contratos_template
  ON ciperprag_hub.contratos(tenant_id, contrato_template_id);

CREATE INDEX IF NOT EXISTS idx_contratos_servico_catalogo
  ON ciperprag_hub.contratos(tenant_id, servico_catalogo_id);
