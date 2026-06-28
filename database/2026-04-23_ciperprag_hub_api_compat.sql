BEGIN;

CREATE SCHEMA IF NOT EXISTS ciperprag_hub;

ALTER TABLE IF EXISTS ciperprag_hub.contratos
  ADD COLUMN IF NOT EXISTS locais TEXT[] DEFAULT '{}'::TEXT[];

ALTER TABLE IF EXISTS ciperprag_hub.agendamentos
  ADD COLUMN IF NOT EXISTS cliente_id VARCHAR(20),
  ADD COLUMN IF NOT EXISTS cliente_cnpj VARCHAR(18),
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(15),
  ADD COLUMN IF NOT EXISTS local_execucao TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT,
  ADD COLUMN IF NOT EXISTS observacao TEXT,
  ADD COLUMN IF NOT EXISTS tecnicos_ids TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS tecnicos_nomes TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS veiculo_id VARCHAR(20),
  ADD COLUMN IF NOT EXISTS veiculo_descricao TEXT,
  ADD COLUMN IF NOT EXISTS os_id VARCHAR(30),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agendamentos_status_check'
      AND conrelid = 'ciperprag_hub.agendamentos'::regclass
  ) THEN
    ALTER TABLE ciperprag_hub.agendamentos DROP CONSTRAINT agendamentos_status_check;
  END IF;
END $$;

ALTER TABLE ciperprag_hub.agendamentos
  ADD CONSTRAINT agendamentos_status_check
  CHECK (status IN ('agendado', 'os_gerada', 'encerrado', 'cancelado'));

UPDATE ciperprag_hub.agendamentos ag
SET
  created_at = COALESCE(ag.created_at, ag.criado_em, NOW()),
  cliente_id = COALESCE(ag.cliente_id, ct.cliente_id),
  cliente_cnpj = COALESCE(ag.cliente_cnpj, ct.cnpj),
  tipo = COALESCE(ag.tipo, ct.tipo)
FROM ciperprag_hub.contratos ct
WHERE ag.contrato_id = ct.id;

UPDATE ciperprag_hub.agendamentos
SET status = CASE status
  WHEN 'pendente' THEN 'agendado'
  WHEN 'confirmado' THEN 'os_gerada'
  WHEN 'concluido' THEN 'encerrado'
  ELSE status
END;

ALTER TABLE IF EXISTS ciperprag_hub.ordens_servico
  ADD COLUMN IF NOT EXISTS numero VARCHAR(30),
  ADD COLUMN IF NOT EXISTS agendamento_id VARCHAR(30),
  ADD COLUMN IF NOT EXISTS cliente_id VARCHAR(20),
  ADD COLUMN IF NOT EXISTS cliente_endereco TEXT,
  ADD COLUMN IF NOT EXISTS cliente_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS tecnico_cpf VARCHAR(14),
  ADD COLUMN IF NOT EXISTS tecnico_data_admissao DATE,
  ADD COLUMN IF NOT EXISTS equipe_tecnicos_ids TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS equipe_tecnicos_nomes TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS veiculo_id VARCHAR(20),
  ADD COLUMN IF NOT EXISTS veiculo_descricao TEXT,
  ADD COLUMN IF NOT EXISTS local_execucao TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT,
  ADD COLUMN IF NOT EXISTS tag_equipamento_servico TEXT,
  ADD COLUMN IF NOT EXISTS observacao TEXT,
  ADD COLUMN IF NOT EXISTS data_emissao DATE DEFAULT CURRENT_DATE;

UPDATE ciperprag_hub.ordens_servico os
SET
  numero = COALESCE(os.numero, os.id),
  data_emissao = COALESCE(os.data_emissao, os.data_execucao, os.criado_em::DATE, CURRENT_DATE),
  cliente_id = COALESCE(os.cliente_id, ct.cliente_id),
  cliente_endereco = COALESCE(
    os.cliente_endereco,
    CASE
      WHEN cli.id IS NOT NULL THEN CONCAT_WS(', ', cli.endereco, cli.bairro, CONCAT_WS('-', cli.municipio, cli.uf))
      ELSE NULL
    END
  ),
  cliente_logo_url = COALESCE(os.cliente_logo_url, cli.logo_url),
  tecnico_cpf = COALESCE(os.tecnico_cpf, tec.cpf),
  tecnico_data_admissao = COALESCE(os.tecnico_data_admissao, tec.data_admissao)
FROM ciperprag_hub.contratos ct
LEFT JOIN ciperprag_hub.clientes cli
  ON cli.id = ct.cliente_id
LEFT JOIN ciperprag_hub.tecnicos tec
  ON tec.nome = os.tecnico
WHERE os.contrato_id = ct.id;

CREATE TABLE IF NOT EXISTS ciperprag_hub.certificados (
  id VARCHAR(30) PRIMARY KEY,
  hash VARCHAR(50) UNIQUE NOT NULL,
  numero VARCHAR(30) NOT NULL,
  os_id VARCHAR(30) NOT NULL,
  os_numero VARCHAR(30),
  cliente_id VARCHAR(20),
  cliente_nome TEXT NOT NULL,
  cliente_cnpj VARCHAR(18) NOT NULL,
  cliente_endereco TEXT,
  cliente_logo_url TEXT,
  contrato_id VARCHAR(20) NOT NULL,
  servico TEXT NOT NULL,
  tecnico_nome TEXT,
  local_execucao TEXT,
  data_execucao DATE NOT NULL,
  emitido_em TIMESTAMPTZ DEFAULT NOW(),
  validade_dias INTEGER DEFAULT 0,
  produtos_quimicos TEXT[] DEFAULT '{}'::TEXT[],
  produtos_detalhados JSONB DEFAULT '[]'::JSONB
);

CREATE TABLE IF NOT EXISTS ciperprag_hub.recorrencia_sugestoes (
  id VARCHAR(30) PRIMARY KEY,
  cliente_id VARCHAR(20),
  cliente_nome TEXT NOT NULL,
  cliente_cnpj VARCHAR(18) NOT NULL,
  contrato_id VARCHAR(20) NOT NULL,
  servico TEXT NOT NULL,
  tipo VARCHAR(15) NOT NULL,
  local_execucao TEXT,
  tags TEXT,
  observacao TEXT,
  tecnicos_ids TEXT[] DEFAULT '{}'::TEXT[],
  tecnicos_nomes TEXT[] DEFAULT '{}'::TEXT[],
  veiculo_id VARCHAR(20),
  veiculo_descricao TEXT,
  suggested_date DATE NOT NULL,
  source_agendamento_id VARCHAR(30),
  source_os_id VARCHAR(30) NOT NULL,
  status VARCHAR(15) NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO ciperprag_hub.certificados (
  id,
  hash,
  numero,
  os_id,
  os_numero,
  cliente_id,
  cliente_nome,
  cliente_cnpj,
  cliente_endereco,
  cliente_logo_url,
  contrato_id,
  servico,
  tecnico_nome,
  local_execucao,
  data_execucao,
  emitido_em,
  validade_dias,
  produtos_quimicos
)
SELECT
  'SEED-CERT-' || ROW_NUMBER() OVER (ORDER BY os.id),
  os.certificado_hash,
  COALESCE(NULLIF(REGEXP_REPLACE(os.id, '[^0-9]', '', 'g'), ''), '0') || '/' || EXTRACT(YEAR FROM COALESCE(os.data_execucao, CURRENT_DATE)),
  os.id,
  COALESCE(os.numero, os.id),
  os.cliente_id,
  os.cliente,
  os.cnpj,
  os.cliente_endereco,
  os.cliente_logo_url,
  os.contrato_id,
  os.servico,
  os.tecnico,
  COALESCE(os.local_execucao, ''),
  COALESCE(os.data_execucao, CURRENT_DATE),
  NOW(),
  COALESCE(srv.validade_certificado_dias, 0),
  COALESCE(srv.produtos_quimicos, ARRAY[]::TEXT[])
FROM ciperprag_hub.ordens_servico os
LEFT JOIN ciperprag_hub.servicos_catalogo srv
  ON srv.nome = os.servico
WHERE os.certificado_hash IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM ciperprag_hub.certificados cert
    WHERE cert.hash = os.certificado_hash
  );

UPDATE ciperprag_hub.certificados cert
SET os_numero = COALESCE(cert.os_numero, os.numero)
FROM ciperprag_hub.ordens_servico os
WHERE cert.os_id = os.id;

CREATE INDEX IF NOT EXISTS idx_certificados_hash
  ON ciperprag_hub.certificados (hash);

CREATE INDEX IF NOT EXISTS idx_certificados_os_id
  ON ciperprag_hub.certificados (os_id);

CREATE INDEX IF NOT EXISTS idx_recorrencia_sugestoes_status
  ON ciperprag_hub.recorrencia_sugestoes (status);

CREATE INDEX IF NOT EXISTS idx_recorrencia_sugestoes_suggested_date
  ON ciperprag_hub.recorrencia_sugestoes (suggested_date);

COMMIT;
