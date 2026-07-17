BEGIN;

SET search_path TO ciperprag_hub;

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created_at
  ON audit_logs (acao, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_usuario_created_at
  ON audit_logs (usuario_id, created_at DESC);

INSERT INTO permissoes (codigo, modulo, acao, descricao)
VALUES ('auditoria.view', 'auditoria', 'view', 'Consultar eventos e trilhas de auditoria')
ON CONFLICT (codigo) DO UPDATE
SET descricao = EXCLUDED.descricao;

INSERT INTO perfil_permissoes (perfil_id, permissao_id)
SELECT p.id, perm.id
FROM perfis p
JOIN permissoes perm ON perm.codigo = 'auditoria.view'
WHERE p.codigo IN ('admin_empresa', 'consulta_auditoria')
ON CONFLICT DO NOTHING;

INSERT INTO audit_logs (tenant_id, entidade_tipo, acao, resumo)
SELECT id, 'migration', '012_operational_audit_events_applied', 'Migration 012 aplicada: eventos operacionais de auditoria'
FROM tenants
WHERE slug = 'ciperprag'
ON CONFLICT DO NOTHING;

COMMIT;
