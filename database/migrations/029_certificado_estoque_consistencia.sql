BEGIN;

SET search_path TO ciperprag_hub;

ALTER TABLE IF EXISTS ordens_servico
  ADD COLUMN IF NOT EXISTS servico_catalogo_id VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_ordens_servico_servico_catalogo
  ON ordens_servico (tenant_id, servico_catalogo_id);

ALTER TABLE IF EXISTS certificados
  ALTER COLUMN contrato_id DROP NOT NULL;

INSERT INTO permissoes (codigo, modulo, acao, descricao)
VALUES ('estoque.manage', 'estoque', 'manage', 'Gerenciar produtos, saldo e movimentos de estoque')
ON CONFLICT (codigo) DO UPDATE
SET descricao = EXCLUDED.descricao;

INSERT INTO perfil_permissoes (perfil_id, permissao_id)
SELECT p.id, perm.id
FROM perfis p
JOIN permissoes perm ON perm.codigo = 'estoque.manage'
WHERE p.codigo IN ('admin_empresa', 'comercial', 'administrativo')
ON CONFLICT DO NOTHING;

COMMIT;
