BEGIN;

CREATE SCHEMA IF NOT EXISTS ciperprag_hub;
SET search_path TO ciperprag_hub;

ALTER TABLE ordens_servico
  ADD COLUMN IF NOT EXISTS snapshot_dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS snapshot_emitido_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS snapshot_encerrado_em TIMESTAMPTZ;

UPDATE ordens_servico
SET snapshot_dados = jsonb_build_object(
      'legado', true,
      'emissao', jsonb_build_object(
        'os', jsonb_build_object(
          'id', id,
          'numero', numero,
          'dataEmissao', data_emissao,
          'status', status
        ),
        'cliente', jsonb_build_object(
          'id', cliente_id,
          'nome', cliente,
          'cnpj', cnpj,
          'endereco', cliente_endereco,
          'logoUrl', cliente_logo_url
        ),
        'servico', jsonb_build_object(
          'nome', servico,
          'tipo', tipo
        ),
        'operacao', jsonb_build_object(
          'tecnicoNome', tecnico,
          'localExecucao', local_execucao,
          'tags', tags,
          'observacao', observacao
        )
      )
    ),
    snapshot_emitido_em = COALESCE(snapshot_emitido_em, NOW())
WHERE snapshot_dados = '{}'::jsonb;

INSERT INTO audit_logs (tenant_id, entidade_tipo, acao, resumo)
SELECT id, 'system', 'migration_applied', 'Migracao 010_order_operational_snapshots aplicada'
FROM tenants
WHERE slug = 'ciperprag';

COMMIT;
