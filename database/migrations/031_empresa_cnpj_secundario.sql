-- Atenza FieldOps - homologacao
-- CNPJ secundario opcional da empresa emissora (documentos exibem os dois).

BEGIN;

ALTER TABLE IF EXISTS ciperprag_hub.empresa_config
  ADD COLUMN IF NOT EXISTS cnpj_secundario VARCHAR(18);

COMMIT;
