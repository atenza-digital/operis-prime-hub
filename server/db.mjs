import pg from "pg";

const { Pool } = pg;

function getConnectionConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false,
    };
  }

  return {
    host: process.env.PGHOST || "89.116.214.65",
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || "atenza",
    user: process.env.PGUSER || "root",
    password: process.env.PGPASSWORD,
    ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false,
  };
}

export const pool = new Pool(getConnectionConfig());

export async function query(text, params) {
  return pool.query(text, params);
}

export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function ensureDatabaseShape() {
  await query("CREATE SCHEMA IF NOT EXISTS ciperprag_hub");
  await query("SET search_path TO ciperprag_hub");

  await query(`
    ALTER TABLE IF EXISTS ciperprag_hub.empresa_config
    ADD COLUMN IF NOT EXISTS certificado_validade_padrao_dias INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN IF NOT EXISTS certificado_texto_legal TEXT,
    ADD COLUMN IF NOT EXISTS certificado_texto_fixacao TEXT DEFAULT 'FIXAR OBRIGATORIAMENTE EM LOCAL VISIVEL',
    ADD COLUMN IF NOT EXISTS telefone_emergencia VARCHAR(30),
    ADD COLUMN IF NOT EXISTS medicao_forma_pagamento_padrao TEXT,
    ADD COLUMN IF NOT EXISTS medicao_local_entrega_padrao TEXT
  `);

  await query(`
    ALTER TABLE IF EXISTS ciperprag_hub.numeracao_config
    ADD COLUMN IF NOT EXISTS certificado_formato VARCHAR(50) DEFAULT 'CERT-{SEQ}/{ANO}',
    ADD COLUMN IF NOT EXISTS certificado_ultimo INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS medicao_formato VARCHAR(50) DEFAULT 'MED-{SEQ}/{ANO}',
    ADD COLUMN IF NOT EXISTS medicao_ultimo INTEGER NOT NULL DEFAULT 0
  `);

  await query(`
    ALTER TABLE IF EXISTS ciperprag_hub.contatos_cliente
    ADD COLUMN IF NOT EXISTS funcao VARCHAR(40) DEFAULT 'operacional',
    ADD COLUMN IF NOT EXISTS observacoes TEXT
  `);

  await query(`
    ALTER TABLE IF EXISTS ciperprag_hub.servicos_catalogo
    ADD COLUMN IF NOT EXISTS checklist_itens TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS exige_foto BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS exige_assinatura BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS permite_nao_execucao BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS pop_codigo VARCHAR(40),
    ADD COLUMN IF NOT EXISTS pop_titulo TEXT,
    ADD COLUMN IF NOT EXISTS pop_versao VARCHAR(20)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS ciperprag_hub.cliente_locais_execucao (
      id VARCHAR(30) PRIMARY KEY,
      tenant_id UUID REFERENCES ciperprag_hub.tenants(id),
      cliente_id VARCHAR(20) NOT NULL REFERENCES ciperprag_hub.clientes(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      endereco TEXT,
      bairro TEXT,
      municipio TEXT,
      uf CHAR(2),
      cep VARCHAR(10),
      observacoes TEXT,
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS ciperprag_hub.cliente_equipamentos (
      id VARCHAR(30) PRIMARY KEY,
      tenant_id UUID REFERENCES ciperprag_hub.tenants(id),
      cliente_id VARCHAR(20) NOT NULL REFERENCES ciperprag_hub.clientes(id) ON DELETE CASCADE,
      local_id VARCHAR(30) REFERENCES ciperprag_hub.cliente_locais_execucao(id) ON DELETE SET NULL,
      tag VARCHAR(80) NOT NULL,
      descricao TEXT,
      tipo VARCHAR(80),
      setor TEXT,
      observacoes TEXT,
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT cliente_equipamentos_tag_unique UNIQUE (cliente_id, tag)
    )
  `);

  await query("CREATE INDEX IF NOT EXISTS idx_cliente_locais_cliente ON ciperprag_hub.cliente_locais_execucao(cliente_id)");
  await query("CREATE INDEX IF NOT EXISTS idx_cliente_locais_tenant ON ciperprag_hub.cliente_locais_execucao(tenant_id)");
  await query("CREATE INDEX IF NOT EXISTS idx_cliente_equipamentos_cliente ON ciperprag_hub.cliente_equipamentos(cliente_id)");
  await query("CREATE INDEX IF NOT EXISTS idx_cliente_equipamentos_local ON ciperprag_hub.cliente_equipamentos(local_id)");
  await query("CREATE INDEX IF NOT EXISTS idx_cliente_equipamentos_tenant ON ciperprag_hub.cliente_equipamentos(tenant_id)");

  await query(`
    WITH tenant AS (
      SELECT id FROM ciperprag_hub.tenants WHERE slug = 'ciperprag' LIMIT 1
    )
    INSERT INTO ciperprag_hub.cliente_locais_execucao (id, tenant_id, cliente_id, nome, endereco, bairro, municipio, uf, cep, ativo)
    SELECT
      'LOC-' || c.id,
      tenant.id,
      c.id,
      COALESCE(NULLIF(c.nome_fantasia, ''), c.razao_social),
      c.endereco,
      c.bairro,
      c.municipio,
      c.uf,
      c.cep,
      TRUE
    FROM ciperprag_hub.clientes c
    CROSS JOIN tenant
    WHERE NOT EXISTS (
      SELECT 1
      FROM ciperprag_hub.cliente_locais_execucao l
      WHERE l.cliente_id = c.id
    )
  `);

  await query(`
    ALTER TABLE IF EXISTS ciperprag_hub.contratos
    ADD COLUMN IF NOT EXISTS locais TEXT[] DEFAULT '{}'
  `);

  await query(`
    ALTER TABLE IF EXISTS ciperprag_hub.agendamentos
    ADD COLUMN IF NOT EXISTS cliente_id VARCHAR(20),
    ADD COLUMN IF NOT EXISTS cliente_cnpj VARCHAR(18),
    ADD COLUMN IF NOT EXISTS tipo VARCHAR(15),
    ADD COLUMN IF NOT EXISTS local_execucao TEXT,
    ADD COLUMN IF NOT EXISTS tags TEXT,
    ADD COLUMN IF NOT EXISTS observacao TEXT,
    ADD COLUMN IF NOT EXISTS tecnicos_ids TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS tecnicos_nomes TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS veiculo_id VARCHAR(20),
    ADD COLUMN IF NOT EXISTS veiculo_descricao TEXT,
    ADD COLUMN IF NOT EXISTS os_id VARCHAR(30),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()
  `);

  await query(`
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
  `);

  await query(`
    ALTER TABLE ciperprag_hub.agendamentos
    ADD CONSTRAINT agendamentos_status_check
    CHECK (status IN ('agendado','os_gerada','encerrado','cancelado'))
  `).catch(() => {});

  await query(`
    UPDATE ciperprag_hub.agendamentos
    SET status = CASE status
      WHEN 'pendente' THEN 'agendado'
      WHEN 'confirmado' THEN 'os_gerada'
      WHEN 'concluido' THEN 'encerrado'
      ELSE status
    END
  `);

  await query(`
    ALTER TABLE IF EXISTS ciperprag_hub.ordens_servico
    ADD COLUMN IF NOT EXISTS numero VARCHAR(30),
    ADD COLUMN IF NOT EXISTS agendamento_id VARCHAR(30),
    ADD COLUMN IF NOT EXISTS cliente_id VARCHAR(20),
    ADD COLUMN IF NOT EXISTS cliente_endereco TEXT,
    ADD COLUMN IF NOT EXISTS cliente_logo_url TEXT,
    ADD COLUMN IF NOT EXISTS tecnico_cpf VARCHAR(14),
    ADD COLUMN IF NOT EXISTS tecnico_data_admissao DATE,
    ADD COLUMN IF NOT EXISTS equipe_tecnicos_ids TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS equipe_tecnicos_nomes TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS veiculo_id VARCHAR(20),
    ADD COLUMN IF NOT EXISTS veiculo_descricao TEXT,
    ADD COLUMN IF NOT EXISTS local_execucao TEXT,
    ADD COLUMN IF NOT EXISTS tags TEXT,
    ADD COLUMN IF NOT EXISTS tag_equipamento_servico TEXT,
    ADD COLUMN IF NOT EXISTS observacao TEXT,
    ADD COLUMN IF NOT EXISTS data_emissao DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS checklist_respostas JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS nao_executada BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS motivo_nao_execucao TEXT
  `);

  await query(`
    UPDATE ciperprag_hub.ordens_servico
    SET numero = COALESCE(numero, id),
        data_emissao = COALESCE(data_emissao, data_execucao, CURRENT_DATE)
  `);

  await query(`
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
      produtos_quimicos TEXT[] DEFAULT '{}',
      produtos_detalhados JSONB DEFAULT '[]'::jsonb
    )
  `);

  await query(`
    ALTER TABLE IF EXISTS ciperprag_hub.certificados
    ADD COLUMN IF NOT EXISTS snapshot_dados JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'emitido',
    ADD COLUMN IF NOT EXISTS revogado_em TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS motivo_revogacao TEXT
  `);

  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'certificados_status_check'
          AND conrelid = 'ciperprag_hub.certificados'::regclass
      ) THEN
        ALTER TABLE ciperprag_hub.certificados
          ADD CONSTRAINT certificados_status_check
          CHECK (status IN ('emitido','revogado'));
      END IF;
    END $$;
  `);

  await query(`
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
      tecnicos_ids TEXT[] DEFAULT '{}',
      tecnicos_nomes TEXT[] DEFAULT '{}',
      veiculo_id VARCHAR(20),
      veiculo_descricao TEXT,
      suggested_date DATE NOT NULL,
      source_agendamento_id VARCHAR(30),
      source_os_id VARCHAR(30) NOT NULL,
      status VARCHAR(15) NOT NULL DEFAULT 'pendente',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    UPDATE ciperprag_hub.certificados c
    SET os_numero = COALESCE(c.os_numero, o.numero)
    FROM ciperprag_hub.ordens_servico o
    WHERE c.os_id = o.id
  `);

  await query(`
    INSERT INTO ciperprag_hub.certificados (
      id, hash, numero, os_id, os_numero, cliente_id, cliente_nome, cliente_cnpj,
      cliente_endereco, cliente_logo_url, contrato_id, servico, tecnico_nome,
      local_execucao, data_execucao, emitido_em, validade_dias, produtos_quimicos
    )
    SELECT
      'SEED-CERT-' || ROW_NUMBER() OVER (ORDER BY o.id),
      o.certificado_hash,
      COALESCE(NULLIF(REGEXP_REPLACE(o.id, '[^0-9]', '', 'g'), ''), '0') || '/' || EXTRACT(YEAR FROM COALESCE(o.data_execucao, CURRENT_DATE)),
      o.id,
      COALESCE(o.numero, o.id),
      o.cliente_id,
      o.cliente,
      o.cnpj,
      o.cliente_endereco,
      o.cliente_logo_url,
      o.contrato_id,
      o.servico,
      o.tecnico,
      COALESCE(o.local_execucao, ''),
      COALESCE(o.data_execucao, CURRENT_DATE),
      NOW(),
      COALESCE(s.validade_certificado_dias, 0),
      COALESCE(s.produtos_quimicos, ARRAY[]::TEXT[])
    FROM ciperprag_hub.ordens_servico o
    LEFT JOIN ciperprag_hub.servicos_catalogo s
      ON s.nome = o.servico
    WHERE o.certificado_hash IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM ciperprag_hub.certificados c
        WHERE c.hash = o.certificado_hash
      )
  `);
}
