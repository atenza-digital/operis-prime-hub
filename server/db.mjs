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
    ADD COLUMN IF NOT EXISTS medicao_local_entrega_padrao TEXT,
    ADD COLUMN IF NOT EXISTS cor_primaria VARCHAR(20),
    ADD COLUMN IF NOT EXISTS cor_secundaria VARCHAR(20),
    ADD COLUMN IF NOT EXISTS cor_destaque VARCHAR(20),
    ADD COLUMN IF NOT EXISTS certificado_config JSONB NOT NULL DEFAULT '{}'::jsonb
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
    ADD COLUMN IF NOT EXISTS produtos_detalhados JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS exige_foto BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS exige_assinatura BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS permite_nao_execucao BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS pop_codigo VARCHAR(40),
    ADD COLUMN IF NOT EXISTS pop_titulo TEXT,
    ADD COLUMN IF NOT EXISTS pop_versao VARCHAR(20)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS ciperprag_hub.servico_pops (
      id VARCHAR(30) PRIMARY KEY,
      tenant_id UUID REFERENCES ciperprag_hub.tenants(id),
      servico_id VARCHAR(20) NOT NULL REFERENCES ciperprag_hub.servicos_catalogo(id) ON DELETE CASCADE,
      codigo VARCHAR(40) NOT NULL,
      titulo TEXT NOT NULL,
      versao VARCHAR(20) NOT NULL DEFAULT '001',
      status VARCHAR(20) NOT NULL DEFAULT 'ativo',
      objetivo TEXT,
      aplicacao TEXT,
      responsabilidades TEXT[] DEFAULT '{}',
      materiais TEXT[] DEFAULT '{}',
      procedimentos TEXT[] DEFAULT '{}',
      checklist_itens TEXT[] DEFAULT '{}',
      aprovado_por TEXT,
      aprovado_em DATE,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT servico_pops_status_check CHECK (status IN ('rascunho','ativo','inativo')),
      CONSTRAINT servico_pops_unique_version UNIQUE (servico_id, codigo, versao)
    )
  `);

  await query(`
    ALTER TABLE IF EXISTS ciperprag_hub.servicos_catalogo
    ADD COLUMN IF NOT EXISTS pop_ativo_id VARCHAR(30) REFERENCES ciperprag_hub.servico_pops(id) ON DELETE SET NULL
  `);

  await query("CREATE INDEX IF NOT EXISTS idx_servico_pops_servico ON ciperprag_hub.servico_pops(servico_id)");
  await query("CREATE INDEX IF NOT EXISTS idx_servico_pops_status ON ciperprag_hub.servico_pops(status)");
  await query("CREATE INDEX IF NOT EXISTS idx_servicos_catalogo_pop_ativo ON ciperprag_hub.servicos_catalogo(pop_ativo_id)");

  await query(`
    WITH tenant AS (
      SELECT id FROM ciperprag_hub.tenants WHERE slug = 'ciperprag' LIMIT 1
    ),
    seed AS (
      INSERT INTO ciperprag_hub.servico_pops (
        id, tenant_id, servico_id, codigo, titulo, versao, status, objetivo, aplicacao,
        procedimentos, checklist_itens
      )
      SELECT
        'POP-' || s.id || '-001',
        tenant.id,
        s.id,
        COALESCE(NULLIF(s.pop_codigo, ''), 'POP-' || s.id),
        COALESCE(NULLIF(s.pop_titulo, ''), s.nome),
        COALESCE(NULLIF(s.pop_versao, ''), '001'),
        'ativo',
        s.descricao,
        'Aplicavel ao servico ' || s.nome,
        COALESCE(s.procedimentos, ARRAY[]::TEXT[]),
        COALESCE(s.checklist_itens, ARRAY[]::TEXT[])
      FROM ciperprag_hub.servicos_catalogo s
      CROSS JOIN tenant
      WHERE s.pop_ativo_id IS NULL
        AND (
          NULLIF(s.pop_codigo, '') IS NOT NULL
          OR NULLIF(s.pop_titulo, '') IS NOT NULL
          OR COALESCE(array_length(s.procedimentos, 1), 0) > 0
          OR COALESCE(array_length(s.checklist_itens, 1), 0) > 0
        )
      ON CONFLICT (id) DO UPDATE SET
        codigo = EXCLUDED.codigo,
        titulo = EXCLUDED.titulo,
        versao = EXCLUDED.versao,
        objetivo = EXCLUDED.objetivo,
        aplicacao = EXCLUDED.aplicacao,
        procedimentos = EXCLUDED.procedimentos,
        checklist_itens = EXCLUDED.checklist_itens,
        atualizado_em = NOW()
      RETURNING id, servico_id
    )
    UPDATE ciperprag_hub.servicos_catalogo s
    SET pop_ativo_id = seed.id
    FROM seed
    WHERE s.id = seed.servico_id
      AND s.pop_ativo_id IS NULL
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
    ADD COLUMN IF NOT EXISTS locais TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS contrato_template_id VARCHAR(20),
    ADD COLUMN IF NOT EXISTS contrato_template_servico_id INTEGER,
    ADD COLUMN IF NOT EXISTS servico_catalogo_id VARCHAR(20),
    ADD COLUMN IF NOT EXISTS numero_comercial VARCHAR(30),
    ADD COLUMN IF NOT EXISTS vigencia_inicio DATE,
    ADD COLUMN IF NOT EXISTS vigencia_fim DATE,
    ADD COLUMN IF NOT EXISTS frequencia TEXT
  `);

  await query("CREATE INDEX IF NOT EXISTS idx_contratos_template ON ciperprag_hub.contratos(tenant_id, contrato_template_id)");
  await query("CREATE INDEX IF NOT EXISTS idx_contratos_servico_catalogo ON ciperprag_hub.contratos(tenant_id, servico_catalogo_id)");

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
    ADD COLUMN IF NOT EXISTS motivo_nao_execucao TEXT,
    ADD COLUMN IF NOT EXISTS snapshot_dados JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS snapshot_emitido_em TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS snapshot_encerrado_em TIMESTAMPTZ
  `);

  await query(`
    UPDATE ciperprag_hub.ordens_servico
    SET numero = COALESCE(numero, id),
        data_emissao = COALESCE(data_emissao, data_execucao, CURRENT_DATE)
  `);

  await query(`
    UPDATE ciperprag_hub.ordens_servico
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
    WHERE snapshot_dados = '{}'::jsonb
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
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES ciperprag_hub.tenants(id),
    ADD COLUMN IF NOT EXISTS snapshot_dados JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'emitido',
    ADD COLUMN IF NOT EXISTS revogado_em TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS motivo_revogacao TEXT
  `);

  await query(`
    UPDATE ciperprag_hub.certificados
    SET tenant_id = tenants.id
    FROM ciperprag_hub.tenants
    WHERE certificados.tenant_id IS NULL
      AND tenants.slug = 'ciperprag'
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
      tenant_id UUID REFERENCES ciperprag_hub.tenants(id),
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
    ALTER TABLE IF EXISTS ciperprag_hub.recorrencia_sugestoes
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES ciperprag_hub.tenants(id)
  `);

  await query(`
    UPDATE ciperprag_hub.recorrencia_sugestoes
    SET tenant_id = tenants.id
    FROM ciperprag_hub.tenants
    WHERE recorrencia_sugestoes.tenant_id IS NULL
      AND tenants.slug = 'ciperprag'
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS ciperprag_hub.medicoes (
      id VARCHAR(30) PRIMARY KEY,
      tenant_id UUID REFERENCES ciperprag_hub.tenants(id),
      numero VARCHAR(40) NOT NULL UNIQUE,
      cliente_id VARCHAR(20),
      cliente_nome TEXT NOT NULL,
      cliente_cnpj VARCHAR(18),
      cliente_endereco TEXT,
      periodo_inicio DATE NOT NULL,
      periodo_fim DATE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'emitida',
      financeiro_status VARCHAR(40) NOT NULL DEFAULT 'em_conferencia',
      nf_numero VARCHAR(80),
      nf_enviada_em DATE,
      pagamento_previsto_em DATE,
      pago_no_erp_em DATE,
      financeiro_observacao TEXT,
      financeiro_atualizado_em TIMESTAMPTZ,
      total NUMERIC(12,2) NOT NULL DEFAULT 0,
      forma_pagamento TEXT,
      local_entrega TEXT,
      snapshot_dados JSONB NOT NULL DEFAULT '{}'::jsonb,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT medicoes_status_check CHECK (status IN ('emitida','cancelada'))
    )
  `);

  await query(`
    ALTER TABLE IF EXISTS ciperprag_hub.medicoes
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES ciperprag_hub.tenants(id)
  `);

  await query(`
    ALTER TABLE IF EXISTS ciperprag_hub.medicoes
    ADD COLUMN IF NOT EXISTS financeiro_status VARCHAR(40) NOT NULL DEFAULT 'em_conferencia',
    ADD COLUMN IF NOT EXISTS nf_numero VARCHAR(80),
    ADD COLUMN IF NOT EXISTS nf_enviada_em DATE,
    ADD COLUMN IF NOT EXISTS pagamento_previsto_em DATE,
    ADD COLUMN IF NOT EXISTS pago_no_erp_em DATE,
    ADD COLUMN IF NOT EXISTS financeiro_observacao TEXT,
    ADD COLUMN IF NOT EXISTS financeiro_atualizado_em TIMESTAMPTZ
  `);

  await query(`
    UPDATE ciperprag_hub.medicoes
    SET financeiro_status = CASE
      WHEN status = 'cancelada' THEN 'cancelada'
      ELSE COALESCE(NULLIF(financeiro_status, ''), 'em_conferencia')
    END
    WHERE financeiro_status IS NULL OR financeiro_status = '' OR status = 'cancelada'
  `);

  await query("ALTER TABLE IF EXISTS ciperprag_hub.medicoes DROP CONSTRAINT IF EXISTS medicoes_financeiro_status_check");
  await query(`
    ALTER TABLE IF EXISTS ciperprag_hub.medicoes
    ADD CONSTRAINT medicoes_financeiro_status_check
    CHECK (financeiro_status IN ('em_conferencia','aguardando_nf','nf_enviada','aguardando_pagamento','pago_no_erp','pendente_cliente','cancelada'))
  `);

  await query(`
    UPDATE ciperprag_hub.medicoes
    SET tenant_id = tenants.id
    FROM ciperprag_hub.tenants
    WHERE medicoes.tenant_id IS NULL
      AND tenants.slug = 'ciperprag'
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS ciperprag_hub.medicao_itens (
      id BIGSERIAL PRIMARY KEY,
      medicao_id VARCHAR(30) NOT NULL REFERENCES ciperprag_hub.medicoes(id) ON DELETE CASCADE,
      os_id VARCHAR(30) NOT NULL,
      os_numero VARCHAR(30),
      contrato_id VARCHAR(20),
      servico TEXT NOT NULL,
      data_execucao DATE NOT NULL,
      quantidade NUMERIC(10,2) NOT NULL DEFAULT 0,
      unidade VARCHAR(30),
      valor_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
      valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query("CREATE INDEX IF NOT EXISTS idx_medicoes_cliente_periodo ON ciperprag_hub.medicoes(cliente_nome, periodo_inicio, periodo_fim)");
  await query("CREATE INDEX IF NOT EXISTS idx_medicoes_status ON ciperprag_hub.medicoes(status)");
  await query("CREATE INDEX IF NOT EXISTS idx_medicoes_financeiro_status ON ciperprag_hub.medicoes(financeiro_status)");
  await query("CREATE INDEX IF NOT EXISTS idx_certificados_tenant ON ciperprag_hub.certificados(tenant_id)");
  await query("CREATE INDEX IF NOT EXISTS idx_recorrencia_sugestoes_tenant ON ciperprag_hub.recorrencia_sugestoes(tenant_id)");
  await query("CREATE INDEX IF NOT EXISTS idx_medicoes_tenant ON ciperprag_hub.medicoes(tenant_id)");
  await query("CREATE INDEX IF NOT EXISTS idx_medicao_itens_medicao ON ciperprag_hub.medicao_itens(medicao_id)");
  await query("CREATE INDEX IF NOT EXISTS idx_medicao_itens_os ON ciperprag_hub.medicao_itens(os_id)");

  await query(`
    CREATE TABLE IF NOT EXISTS ciperprag_hub.evidencias_anexos (
      id VARCHAR(30) PRIMARY KEY,
      tenant_id UUID REFERENCES ciperprag_hub.tenants(id),
      entidade_tipo VARCHAR(30) NOT NULL,
      entidade_id VARCHAR(40) NOT NULL,
      categoria VARCHAR(40) NOT NULL DEFAULT 'evidencia',
      nome_arquivo TEXT NOT NULL,
      mime_type VARCHAR(120),
      tamanho_bytes INTEGER,
      conteudo_base64 TEXT,
      url TEXT,
      metadados JSONB NOT NULL DEFAULT '{}'::jsonb,
      hash_sha256 VARCHAR(64),
      imutavel BOOLEAN NOT NULL DEFAULT FALSE,
      storage_provider VARCHAR(40) NOT NULL DEFAULT 'database',
      storage_bucket TEXT,
      storage_key TEXT,
      storage_etag TEXT,
      criado_por UUID REFERENCES ciperprag_hub.usuarios(id),
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT evidencias_anexos_entidade_check CHECK (entidade_tipo IN ('os','certificado','medicao','servico_pop','cliente','contrato','proposta')),
      CONSTRAINT evidencias_anexos_categoria_check CHECK (categoria IN ('evidencia','foto','documento','pop_aprovado','pdf_historico','outro'))
    )
  `);

  await query(`
    ALTER TABLE IF EXISTS ciperprag_hub.evidencias_anexos
    ADD COLUMN IF NOT EXISTS hash_sha256 VARCHAR(64),
    ADD COLUMN IF NOT EXISTS imutavel BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS template_codigo VARCHAR(80),
    ADD COLUMN IF NOT EXISTS template_versao VARCHAR(40),
    ADD COLUMN IF NOT EXISTS snapshot_hash_sha256 VARCHAR(64),
    ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(40) NOT NULL DEFAULT 'database',
    ADD COLUMN IF NOT EXISTS storage_bucket TEXT,
    ADD COLUMN IF NOT EXISTS storage_key TEXT,
    ADD COLUMN IF NOT EXISTS storage_etag TEXT
  `);

  await query("ALTER TABLE IF EXISTS ciperprag_hub.contratos_templates DROP CONSTRAINT IF EXISTS contratos_templates_tipo_check");
  await query("ALTER TABLE IF EXISTS ciperprag_hub.contratos_templates ADD CONSTRAINT contratos_templates_tipo_check CHECK (tipo IN ('contrato','proposta','minuta'))");
  await query("ALTER TABLE IF EXISTS ciperprag_hub.evidencias_anexos DROP CONSTRAINT IF EXISTS evidencias_anexos_entidade_check");
  await query("ALTER TABLE IF EXISTS ciperprag_hub.evidencias_anexos ADD CONSTRAINT evidencias_anexos_entidade_check CHECK (entidade_tipo IN ('os','certificado','medicao','servico_pop','cliente','contrato','proposta','minuta'))");

  await query("CREATE INDEX IF NOT EXISTS idx_evidencias_entidade ON ciperprag_hub.evidencias_anexos(entidade_tipo, entidade_id)");
  await query("CREATE INDEX IF NOT EXISTS idx_evidencias_tenant ON ciperprag_hub.evidencias_anexos(tenant_id)");
  await query("CREATE INDEX IF NOT EXISTS idx_evidencias_categoria ON ciperprag_hub.evidencias_anexos(categoria)");
  await query("CREATE INDEX IF NOT EXISTS idx_evidencias_hash_sha256 ON ciperprag_hub.evidencias_anexos(hash_sha256)");
  await query("CREATE INDEX IF NOT EXISTS idx_evidencias_snapshot_hash_sha256 ON ciperprag_hub.evidencias_anexos(snapshot_hash_sha256)");
  await query("CREATE INDEX IF NOT EXISTS idx_evidencias_template ON ciperprag_hub.evidencias_anexos(template_codigo, template_versao)");
  await query("CREATE INDEX IF NOT EXISTS idx_evidencias_imutavel ON ciperprag_hub.evidencias_anexos(imutavel)");
  await query("CREATE INDEX IF NOT EXISTS idx_evidencias_storage_provider ON ciperprag_hub.evidencias_anexos(storage_provider)");
  await query("CREATE INDEX IF NOT EXISTS idx_evidencias_storage_key ON ciperprag_hub.evidencias_anexos(storage_key)");

  await query(`
    WITH tenant AS (
      SELECT id FROM ciperprag_hub.tenants WHERE slug = 'ciperprag' LIMIT 1
    ),
    expanded AS (
      SELECT
        o.id AS os_id,
        tenant.id AS tenant_id,
        foto,
        ord::int AS posicao
      FROM ciperprag_hub.ordens_servico o
      CROSS JOIN tenant
      CROSS JOIN LATERAL unnest(COALESCE(o.fotos, ARRAY[]::TEXT[])) WITH ORDINALITY AS f(foto, ord)
      WHERE COALESCE(array_length(o.fotos, 1), 0) > 0
    )
    INSERT INTO ciperprag_hub.evidencias_anexos (
      id, tenant_id, entidade_tipo, entidade_id, categoria, nome_arquivo, mime_type,
      conteudo_base64, metadados
    )
    SELECT
      'EV-' || os_id || '-' || LPAD(posicao::text, 2, '0'),
      tenant_id,
      'os',
      os_id,
      'foto',
      'evidencia-' || LPAD(posicao::text, 2, '0') || '.jpg',
      CASE
        WHEN foto LIKE 'data:%;base64,%' THEN split_part(split_part(foto, ';', 1), ':', 2)
        ELSE 'image/jpeg'
      END,
      foto,
      jsonb_build_object('origem', 'migracao_fotos_os', 'posicao', posicao)
    FROM expanded
    ON CONFLICT (id) DO NOTHING
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
