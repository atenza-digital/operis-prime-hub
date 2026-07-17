-- Atenza FieldOps - homologacao
-- Produtos detalhados do catalogo para certificado e snapshot da OS.

ALTER TABLE IF EXISTS ciperprag_hub.servicos_catalogo
  ADD COLUMN IF NOT EXISTS produtos_detalhados JSONB DEFAULT '[]'::jsonb;

UPDATE ciperprag_hub.servicos_catalogo
SET produtos_detalhados = COALESCE(produtos_detalhados, '[]'::jsonb)
WHERE produtos_detalhados IS NULL;

