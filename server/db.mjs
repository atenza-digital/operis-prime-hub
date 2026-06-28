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
    ADD COLUMN IF NOT EXISTS data_emissao DATE DEFAULT CURRENT_DATE
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
