BEGIN;

ALTER TABLE ciperprag_hub.certificados
  ADD COLUMN IF NOT EXISTS substituido_por_id VARCHAR(30),
  ADD COLUMN IF NOT EXISTS substitui_certificado_id VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_certificados_substituicao
  ON ciperprag_hub.certificados(substituido_por_id, substitui_certificado_id);

COMMIT;
