-- =============================================================
--  CIPERPRAG HUB — Script de criação do banco PostgreSQL
--  Host   : 89.116.214.65:5432
--  Banco  : atenza
--  Schema : ciperprag_hub
--  Usuário: root
-- =============================================================

-- Cria o schema se não existir
CREATE SCHEMA IF NOT EXISTS ciperprag_hub;

-- Define o search_path da sessão
SET search_path TO ciperprag_hub;

-- ==========================
-- DROP (ordem inversa de FK)
-- ==========================
DROP TABLE IF EXISTS contratos_templates_servicos CASCADE;
DROP TABLE IF EXISTS contratos_templates           CASCADE;
DROP TABLE IF EXISTS ordens_servico                CASCADE;
DROP TABLE IF EXISTS agendamentos                  CASCADE;
DROP TABLE IF EXISTS contratos                     CASCADE;
DROP TABLE IF EXISTS alocacoes_semanais            CASCADE;
DROP TABLE IF EXISTS contatos_cliente              CASCADE;
DROP TABLE IF EXISTS clientes                      CASCADE;
DROP TABLE IF EXISTS veiculos                      CASCADE;
DROP TABLE IF EXISTS tecnicos                      CASCADE;
DROP TABLE IF EXISTS servicos_catalogo             CASCADE;
DROP TABLE IF EXISTS numeracao_config              CASCADE;
DROP TABLE IF EXISTS empresa_config                CASCADE;

-- ==========================
-- EMPRESA / CONFIGURAÇÕES
-- ==========================

CREATE TABLE empresa_config (
    id               SERIAL PRIMARY KEY,
    razao_social     TEXT NOT NULL,
    nome_fantasia    TEXT,
    cnpj             VARCHAR(18) NOT NULL,
    endereco         TEXT,
    telefone         VARCHAR(20),
    email            VARCHAR(120),
    logo_url         TEXT,
    alvara           VARCHAR(50),
    cr02             VARCHAR(50),
    anvisa           VARCHAR(50),
    vigilancia_sanitaria     VARCHAR(50),
    responsavel_tecnico      TEXT,
    responsavel_execucao     TEXT,
    cargo_responsavel        TEXT,
    criado_em        TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE numeracao_config (
    id                    SERIAL PRIMARY KEY,
    proposta_formato      VARCHAR(50)  DEFAULT 'PC-{SEQ}/{ANO}',
    proposta_ultimo       INTEGER      DEFAULT 0,
    contrato_formato      VARCHAR(50)  DEFAULT 'CT-{SEQ}/{ANO}',
    contrato_ultimo       INTEGER      DEFAULT 0,
    os_formato            VARCHAR(50)  DEFAULT 'OS-{SEQ}',
    os_ultimo             INTEGER      DEFAULT 0,
    atualizado_em         TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================
-- CLIENTES
-- ==========================

CREATE TABLE clientes (
    id                  VARCHAR(20) PRIMARY KEY,
    razao_social        TEXT        NOT NULL,
    nome_fantasia       TEXT,
    cnpj                VARCHAR(18) NOT NULL,
    inscricao_estadual  VARCHAR(30),
    endereco            TEXT,
    bairro              TEXT,
    municipio           TEXT,
    uf                  CHAR(2),
    cep                 VARCHAR(10),
    logo_url            TEXT,
    ativo               BOOLEAN     DEFAULT TRUE,
    criado_em           TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contatos_cliente (
    id          SERIAL PRIMARY KEY,
    cliente_id  VARCHAR(20) NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    nome        TEXT        NOT NULL,
    cargo       TEXT,
    telefone    VARCHAR(20),
    email       VARCHAR(120),
    principal   BOOLEAN     DEFAULT FALSE,
    criado_em   TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================
-- TÉCNICOS E VEÍCULOS
-- ==========================

CREATE TABLE tecnicos (
    id              VARCHAR(20) PRIMARY KEY,
    nome            TEXT        NOT NULL,
    cpf             VARCHAR(14),
    cargo           TEXT,
    data_admissao   DATE,
    telefone        VARCHAR(20),
    ativo           BOOLEAN     DEFAULT TRUE,
    criado_em       TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE veiculos (
    id            VARCHAR(20) PRIMARY KEY,
    placa         VARCHAR(10) NOT NULL,
    modelo        TEXT,
    ano           SMALLINT,
    ativo         BOOLEAN     DEFAULT TRUE,
    criado_em     TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE alocacoes_semanais (
    id          VARCHAR(20) PRIMARY KEY,
    tecnico_id  VARCHAR(20) NOT NULL REFERENCES tecnicos(id) ON DELETE CASCADE,
    veiculo_id  VARCHAR(20)          REFERENCES veiculos(id) ON DELETE SET NULL,
    dia_semana  SMALLINT    NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    cliente     TEXT,
    servico     TEXT,
    turno       VARCHAR(10) NOT NULL CHECK (turno IN ('manha','tarde','integral')),
    criado_em   TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================
-- CATÁLOGO DE SERVIÇOS
-- ==========================

CREATE TABLE servicos_catalogo (
    id                          VARCHAR(20) PRIMARY KEY,
    nome                        TEXT        NOT NULL,
    tipo                        VARCHAR(15) NOT NULL CHECK (tipo IN ('sanitario','manutencao')),
    descricao                   TEXT,
    unidade                     VARCHAR(30),
    recorrencia_dias            INTEGER     DEFAULT 0,
    gera_certificado            BOOLEAN     DEFAULT FALSE,
    validade_certificado_dias   INTEGER     DEFAULT 0,
    produtos_quimicos           TEXT[]      DEFAULT '{}',
    epis                        TEXT[]      DEFAULT '{}',
    riscos                      TEXT[]      DEFAULT '{}',
    normas_aplicaveis           TEXT[]      DEFAULT '{}',
    procedimentos               TEXT[]      DEFAULT '{}',
    ativo                       BOOLEAN     DEFAULT TRUE,
    criado_em                   TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em               TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================
-- CONTRATOS (operacional)
-- ==========================

CREATE TABLE contratos (
    id                  VARCHAR(20) PRIMARY KEY,
    cliente_id          VARCHAR(20)          REFERENCES clientes(id) ON DELETE SET NULL,
    cliente             TEXT        NOT NULL,
    cnpj                VARCHAR(18),
    servico             TEXT        NOT NULL,
    tipo                VARCHAR(15) NOT NULL CHECK (tipo IN ('sanitario','manutencao')),
    contratado          NUMERIC(10,2) NOT NULL DEFAULT 0,
    executado           NUMERIC(10,2) NOT NULL DEFAULT 0,
    unidade             VARCHAR(30),
    status              VARCHAR(10) NOT NULL CHECK (status IN ('ativo','pendente','vencido')),
    ultima_execucao     DATE,
    validade_dias       INTEGER     DEFAULT 0,
    valor_unitario      NUMERIC(12,2),
    tags                TEXT[]      DEFAULT '{}',
    produtos_quimicos   TEXT[]      DEFAULT '{}',
    epis                TEXT[]      DEFAULT '{}',
    riscos              TEXT[]      DEFAULT '{}',
    criado_em           TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================
-- AGENDAMENTOS
-- ==========================

CREATE TABLE agendamentos (
    id                  VARCHAR(20) PRIMARY KEY,
    contrato_id         VARCHAR(20)          REFERENCES contratos(id) ON DELETE SET NULL,
    cliente             TEXT        NOT NULL,
    servico             TEXT        NOT NULL,
    data_agendada       DATE        NOT NULL,
    dias_para_vencer    INTEGER     DEFAULT 0,
    status              VARCHAR(15) DEFAULT 'pendente' CHECK (status IN ('pendente','confirmado','cancelado','concluido')),
    criado_em           TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================
-- ORDENS DE SERVIÇO
-- ==========================

CREATE TABLE ordens_servico (
    id                  VARCHAR(20) PRIMARY KEY,
    contrato_id         VARCHAR(20)          REFERENCES contratos(id) ON DELETE SET NULL,
    cliente             TEXT        NOT NULL,
    cnpj                VARCHAR(18),
    servico             TEXT        NOT NULL,
    tipo                VARCHAR(15) NOT NULL CHECK (tipo IN ('sanitario','manutencao')),
    tecnico             TEXT,
    data_execucao       DATE,
    fotos               TEXT[]      DEFAULT '{}',
    quantidade          NUMERIC(10,2) NOT NULL DEFAULT 1,
    unidade             VARCHAR(30),
    certificado_hash    VARCHAR(50),
    status              VARCHAR(15) NOT NULL CHECK (status IN ('aberta','encerrada')),
    criado_em           TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================
-- PROPOSTAS / CONTRATOS TEMPLATE
-- ==========================

CREATE TABLE contratos_templates (
    id                      VARCHAR(20) PRIMARY KEY,
    numero                  VARCHAR(30),
    cliente_id              VARCHAR(20)          REFERENCES clientes(id) ON DELETE SET NULL,
    tipo                    VARCHAR(10) NOT NULL CHECK (tipo IN ('contrato','proposta')),
    vigencia_meses          INTEGER     DEFAULT 12,
    forma_pagamento         TEXT,
    prazo_pagamento_dias    INTEGER     DEFAULT 30,
    status                  VARCHAR(15) NOT NULL CHECK (status IN ('rascunho','enviado','aprovado','vigente','encerrado')),
    data_criacao            DATE,
    observacoes             TEXT,
    criado_em               TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contratos_templates_servicos (
    id              SERIAL PRIMARY KEY,
    template_id     VARCHAR(20)   NOT NULL REFERENCES contratos_templates(id) ON DELETE CASCADE,
    servico_id      VARCHAR(20)            REFERENCES servicos_catalogo(id)   ON DELETE SET NULL,
    quantidade      NUMERIC(10,2) NOT NULL DEFAULT 1,
    valor_unitario  NUMERIC(12,2) NOT NULL DEFAULT 0,
    frequencia      VARCHAR(30),
    criado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================
-- ÍNDICES
-- ==========================

CREATE INDEX idx_contratos_cliente_id     ON contratos(cliente_id);
CREATE INDEX idx_contratos_status         ON contratos(status);
CREATE INDEX idx_agendamentos_contrato_id ON agendamentos(contrato_id);
CREATE INDEX idx_agendamentos_data        ON agendamentos(data_agendada);
CREATE INDEX idx_os_contrato_id           ON ordens_servico(contrato_id);
CREATE INDEX idx_os_status                ON ordens_servico(status);
CREATE INDEX idx_os_data_execucao         ON ordens_servico(data_execucao);
CREATE INDEX idx_contatos_cliente         ON contatos_cliente(cliente_id);
CREATE INDEX idx_alocacoes_tecnico        ON alocacoes_semanais(tecnico_id);
CREATE INDEX idx_cts_template             ON contratos_templates_servicos(template_id);

-- ==========================
-- SEED — EMPRESA
-- ==========================

INSERT INTO empresa_config (razao_social, nome_fantasia, cnpj, endereco, telefone, email,
    alvara, cr02, anvisa, vigilancia_sanitaria,
    responsavel_tecnico, responsavel_execucao, cargo_responsavel)
VALUES (
    'CIPERPRAG Controle de Pragas e Serviços LTDA', 'Ciperprag',
    '15.722.292/0001-43', 'Rua Tiradentes 190, centro Rondon do Pará',
    '(94) 99258-2761', 'adm@ciperprag.com',
    '00060/2025', '1611984/2025', '3.09876.2', 'VSP-2025-4432',
    'Dr. Carlos Mendes - CRQ 04.123.456', 'Aline Vieira',
    'Diretora/Gerente de Negócios/Resp. Técnica'
);

INSERT INTO numeracao_config (proposta_formato, proposta_ultimo, contrato_formato, contrato_ultimo, os_formato, os_ultimo)
VALUES ('PC-{SEQ}/{ANO}', 50, 'CT-{SEQ}/{ANO}', 125, 'OS-{SEQ}', 2675);

-- ==========================
-- SEED — TÉCNICOS E VEÍCULOS
-- ==========================

INSERT INTO tecnicos (id, nome, cpf, cargo, data_admissao, telefone, ativo) VALUES
    ('TEC-001', 'João Silva',     '123.456.789-00', 'Técnico Sanitário',     '2022-03-15', '(94) 99111-1111', TRUE),
    ('TEC-002', 'Pedro Oliveira', '234.567.890-11', 'Técnico Sanitário',     '2023-01-10', '(94) 99222-2222', TRUE),
    ('TEC-003', 'Marcos Santos',  '345.678.901-22', 'Técnico de Manutenção', '2021-08-20', '(94) 99333-3333', TRUE),
    ('TEC-004', 'Rafael Almeida', '456.789.012-33', 'Técnico Sanitário',     '2024-05-01', '(94) 99444-4444', TRUE);

INSERT INTO veiculos (id, placa, modelo, ano, ativo) VALUES
    ('VEI-001', 'QRA-1234', 'Fiat Fiorino',   2023, TRUE),
    ('VEI-002', 'QRB-5678', 'Renault Kangoo', 2022, TRUE),
    ('VEI-003', 'QRC-9012', 'VW Saveiro',     2024, TRUE);

-- ==========================
-- SEED — CLIENTES
-- ==========================

INSERT INTO clientes (id, razao_social, nome_fantasia, cnpj, inscricao_estadual, endereco, bairro, municipio, uf, cep, ativo) VALUES
    ('CLI-001', 'Komatsu Brasil International LTDA', 'Komatsu',    '02.336.124/0009-25', '15.432.789-0', 'Av. Serra Arqueada S/N, QD QNC 205', 'Nova Carajás',       'Parauapebas',       'PA', '68.515-000', TRUE),
    ('CLI-002', 'Metalúrgica Sigma S.A.',             'Sigma',      '11.222.333/0001-44', NULL,           'Rod. PA-275, KM 18',                  'Distrito Industrial', 'Marabá',           'PA', '68.502-100', TRUE),
    ('CLI-003', 'Hospital São Lucas',                 'HSL',        '55.666.777/0001-88', NULL,           'Rua da Saúde, 450',                   'Centro',             'Parauapebas',       'PA', '68.515-200', TRUE),
    ('CLI-004', 'Construtora G-Maia S.A.',            'G-Maia',     '44.555.666/0001-77', NULL,           'Rua 80 S/N, Quadra 28, Lotes 12-14', 'Jardim Canadá',      'Parauapebas',       'PA', '68.515-000', TRUE),
    ('CLI-005', 'MIP Engenharia LTDA',                'MIP',        '33.193.966/0041-45', NULL,           'Rua Modesto, 149, Sala D',            'Nova Canaã',         'Canaã dos Carajás', 'PA', '68.356-025', TRUE),
    ('CLI-006', 'Tecnosonda S.A.',                    'Tecnosonda', '08.765.432/0001-99', NULL,           'Av. Industrial, 1200',                'Polo Industrial',    'Parauapebas',       'PA', '68.515-300', TRUE);

INSERT INTO contatos_cliente (cliente_id, nome, cargo, telefone, email, principal) VALUES
    ('CLI-001', 'Sophia Machado',           'Gestora de Contratos', '(94) 99123-4567', 'sophia@komatsu.com.br',      TRUE),
    ('CLI-001', 'Carlos Ferreira',          'Coord. Facilities',    '(94) 99234-5678', 'carlos.f@komatsu.com.br',    FALSE),
    ('CLI-002', 'Ricardo Lopes',            'Gerente Operacional',  '(94) 99345-6789', 'ricardo@sigma.com.br',       TRUE),
    ('CLI-003', 'Ana Paula Reis',           'Coord. Hospitalar',    '(94) 99456-7890', 'ana.paula@hsl.com.br',       TRUE),
    ('CLI-004', 'Vitor Martins',            'Depto. de Compras',    '(94) 99567-8901', 'vitor@gmaia.com.br',         TRUE),
    ('CLI-005', 'Marcio Ferreira da Silva', 'Gestor de Contratos',  '(31) 99954-4705', 'marcio@mip.com.br',          TRUE),
    ('CLI-006', 'Fernanda Costa',           'Adm. de Contratos',    '(94) 99678-9012', 'fernanda@tecnosonda.com.br', TRUE);

-- ==========================
-- SEED — SERVIÇOS
-- ==========================

INSERT INTO servicos_catalogo (id, nome, tipo, descricao, unidade, recorrencia_dias, gera_certificado, validade_certificado_dias, produtos_quimicos, epis, riscos, normas_aplicaveis, procedimentos, ativo) VALUES
('SRV-001', 'Controle Integrado de Pragas (CIP)', 'sanitario',
 'Programa de manejo eficaz de insetos rasteiros/voadores, roedores e pragas urbanas.',
 'visitas', 30, TRUE, 30,
 ARRAY['Gel Inseticida Maxforce','Raticida Brodifacoum 0,005%','Cipermetrina 25% CE','Raticida em Bloco Parafinado'],
 ARRAY['Máscara PFF2','Luva Nitrílica','Bota de Segurança','Macacão Tyvek'],
 ARRAY['Risco Químico','Risco Biológico'],
 ARRAY['RDC ANVISA Nº 18/2000','Lei Nº 5.882/1994'],
 ARRAY['Diagnóstico e mapeamento de focos','Aplicação de produtos específicos','Instalação de pontos de iscagem','Inspeções periódicas','Emissão de relatórios técnicos'],
 TRUE),

('SRV-002', 'Higienização de Caixas D''Água', 'sanitario',
 'Esvaziamento, limpeza mecânica, desinfecção e emissão de certificado.',
 'limpezas', 180, TRUE, 180,
 ARRAY['Hipoclorito de Sódio 2,5%'],
 ARRAY['Máscara PFF2','Luva Nitrílica','Cinto de Segurança','Capacete'],
 ARRAY['Risco Químico','Risco de Queda'],
 ARRAY['NR-33 Espaços Confinados','NR-35 Trabalho em Altura'],
 ARRAY['Esvaziamento do reservatório','Limpeza mecânica interna','Desinfecção com hipoclorito','Enxágue e reenchimento','Emissão de certificado'],
 TRUE),

('SRV-003', 'Coleta e Análise de Bebedouros', 'sanitario',
 'Higienização, desinfecção e coleta de amostras de água para análise laboratorial.',
 'itens', 30, TRUE, 30,
 ARRAY['Hipoclorito de Sódio 2,5%','Ácido Peracético 0,2%','Dicloroisocianurato Sódico Di-hidratado'],
 ARRAY['Máscara PFF2','Luva Nitrílica','Óculos de Proteção','Avental Impermeável'],
 ARRAY['Risco Químico','Risco Biológico'],
 ARRAY['RDC ANVISA Nº 18/2000','Portaria MS Nº 888/2021'],
 ARRAY['Desmontagem do bebedouro','Limpeza por fricção','Desinfecção química','Coleta de amostra','Emissão de laudo e certificado'],
 TRUE),

('SRV-004', 'Manutenção Civil Predial', 'manutencao',
 'Serviços de manutenção predial geral conforme demanda.',
 'horas', 0, FALSE, 0,
 ARRAY[]::TEXT[],
 ARRAY['Capacete','Luva de Vaqueta','Bota de Segurança','Óculos de Proteção'],
 ARRAY['Risco de Queda','Risco Elétrico'],
 ARRAY['NR-10 Eletricidade','NR-18 Construção Civil','NR-35 Trabalho em Altura'],
 ARRAY['Avaliação técnica','Execução do reparo','Teste de funcionamento','Relatório de serviço'],
 TRUE),

('SRV-005', 'Manutenção de Ar-Condicionado (PMOC)', 'manutencao',
 'Plano de Manutenção, Operação e Controle para sistemas de climatização.',
 'equipamentos', 30, FALSE, 0,
 ARRAY['Bactericida para serpentina'],
 ARRAY['Máscara PFF2','Luva Nitrílica','Óculos de Proteção'],
 ARRAY['Risco Elétrico','Risco Químico'],
 ARRAY['Lei Federal Nº 13.589/2018','NR-10 Eletricidade'],
 ARRAY['Inspeção de filtros','Limpeza de bandeja de condensado','Verificação elétrica/mecânica','Reposição de gás','Emissão de relatório PMOC'],
 TRUE),

('SRV-006', 'Roçagem e Limpeza de Área', 'manutencao',
 'Roçagem mecanizada e manual de áreas verdes e limpeza de terrenos.',
 'm²', 30, FALSE, 0,
 ARRAY[]::TEXT[],
 ARRAY['Capacete com viseira','Protetor auricular','Luva de Vaqueta','Perneira','Bota de Segurança'],
 ARRAY['Risco de Acidente','Risco Ergonômico'],
 ARRAY['NR-12 Máquinas e Equipamentos'],
 ARRAY['Sinalização da área','Roçagem mecanizada/manual','Recolhimento de resíduos','Limpeza geral'],
 TRUE);

-- ==========================
-- SEED — CONTRATOS
-- ==========================

INSERT INTO contratos (id, cliente_id, cliente, cnpj, servico, tipo, contratado, executado, unidade, status, ultima_execucao, validade_dias, valor_unitario, tags, produtos_quimicos, epis, riscos) VALUES
('CT-001', 'CLI-001', 'Komatsu Brasil International LTDA', '02.336.124/0009-25',
 'Coleta e Análise de Bebedouros', 'sanitario', 14, 1, 'itens', 'ativo', '2026-02-15', 30, 355.00,
 ARRAY['BEB-01','BEB-02','BEB-03','BEB-04','BEB-05'],
 ARRAY['Hipoclorito de Sódio 2,5%','Ácido Peracético 0,2%'],
 ARRAY['Máscara PFF2','Luva Nitrílica','Óculos de Proteção','Avental Impermeável'],
 ARRAY['Risco Químico','Risco Biológico']),

('CT-002', 'CLI-001', 'Komatsu Brasil International LTDA', '02.336.124/0009-25',
 'Controle Integrado de Pragas', 'sanitario', 12, 4, 'visitas', 'ativo', '2026-03-01', 30, 480.00,
 ARRAY['ARM-01','ARM-02','ARM-03'],
 ARRAY['Gel Inseticida Maxforce','Raticida Brodifacoum 0,005%'],
 ARRAY['Máscara PFF2','Luva Nitrílica','Bota de Segurança'],
 ARRAY['Risco Químico','Risco Biológico']),

('CT-003', 'CLI-001', 'Komatsu Brasil International LTDA', '02.336.124/0009-25',
 'Manutenção Civil Predial', 'manutencao', 100, 32, 'horas', 'ativo', '2026-03-10', 0, 95.00,
 ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[]),

('CT-004', 'CLI-002', 'Metalúrgica Sigma S.A.', '11.222.333/0001-44',
 'Desratização e Desinsetização', 'sanitario', 6, 6, 'visitas', 'vencido', '2026-01-20', 30, 520.00,
 ARRAY['EST-01','EST-02'],
 ARRAY['Cipermetrina 25% CE','Raticida em Bloco Parafinado'],
 ARRAY['Máscara PFF2','Luva Nitrílica','Macacão Tyvek'],
 ARRAY['Risco Químico']),

('CT-005', 'CLI-003', 'Hospital São Lucas', '55.666.777/0001-88',
 'Higienização de Caixas D''Água', 'sanitario', 4, 2, 'limpezas', 'ativo', '2026-02-28', 180, 747.90,
 ARRAY['CX-01','CX-02','CX-03'],
 ARRAY['Hipoclorito de Sódio 2,5%'],
 ARRAY['Máscara PFF2','Luva Nitrílica','Cinto de Segurança','Capacete'],
 ARRAY['Risco Químico','Risco de Queda']);

-- ==========================
-- SEED — AGENDAMENTOS
-- ==========================

INSERT INTO agendamentos (id, contrato_id, cliente, servico, data_agendada, dias_para_vencer, status) VALUES
    ('AG-001', 'CT-004', 'Metalúrgica Sigma S.A.',            'Desratização e Desinsetização',  '2026-03-20', -57, 'pendente'),
    ('AG-002', 'CT-001', 'Komatsu Brasil International LTDA', 'Coleta e Análise de Bebedouros', '2026-03-17', -1,  'pendente'),
    ('AG-003', 'CT-002', 'Komatsu Brasil International LTDA', 'Controle Integrado de Pragas',   '2026-03-31',  13, 'pendente');

-- ==========================
-- SEED — ORDENS DE SERVIÇO
-- ==========================

INSERT INTO ordens_servico (id, contrato_id, cliente, cnpj, servico, tipo, tecnico, data_execucao, fotos, quantidade, unidade, certificado_hash, status) VALUES
('OS-2670', 'CT-001', 'Komatsu Brasil International LTDA', '02.336.124/0009-25',
 'Coleta e Análise de Bebedouros', 'sanitario', 'João Silva', '2026-02-15',
 ARRAY['evidencia_1.jpg','evidencia_2.jpg','evidencia_3.jpg'], 1, 'itens', 'HSH-2026-A3F', 'encerrada'),

('OS-2671', 'CT-002', 'Komatsu Brasil International LTDA', '02.336.124/0009-25',
 'Controle Integrado de Pragas', 'sanitario', 'Pedro Oliveira', '2026-02-20',
 ARRAY['evidencia_1.jpg','evidencia_2.jpg','evidencia_3.jpg'], 1, 'visitas', 'HSH-2026-B7K', 'encerrada'),

('OS-2672', 'CT-002', 'Komatsu Brasil International LTDA', '02.336.124/0009-25',
 'Controle Integrado de Pragas', 'sanitario', 'Pedro Oliveira', '2026-03-01',
 ARRAY['evidencia_1.jpg','evidencia_2.jpg','evidencia_3.jpg'], 1, 'visitas', 'HSH-2026-C2M', 'encerrada'),

('OS-2673', 'CT-003', 'Komatsu Brasil International LTDA', '02.336.124/0009-25',
 'Manutenção Civil Predial', 'manutencao', 'Marcos Santos', '2026-03-10',
 ARRAY['evidencia_1.jpg','evidencia_2.jpg','evidencia_3.jpg'], 8, 'horas', NULL, 'encerrada'),

('OS-2674', 'CT-004', 'Metalúrgica Sigma S.A.', '11.222.333/0001-44',
 'Desratização e Desinsetização', 'sanitario', 'Rafael Almeida', '2026-01-20',
 ARRAY['evidencia_1.jpg','evidencia_2.jpg','evidencia_3.jpg'], 1, 'visitas', 'HSH-2026-D9P', 'encerrada'),

('OS-2675', 'CT-005', 'Hospital São Lucas', '55.666.777/0001-88',
 'Higienização de Caixas D''Água', 'sanitario', 'João Silva', '2026-02-28',
 ARRAY['evidencia_1.jpg','evidencia_2.jpg','evidencia_3.jpg'], 1, 'limpezas', 'HSH-2026-E4R', 'encerrada');

-- ==========================
-- SEED — CONTRATOS TEMPLATE
-- ==========================

INSERT INTO contratos_templates (id, numero, cliente_id, tipo, vigencia_meses, forma_pagamento, prazo_pagamento_dias, status, data_criacao, observacoes) VALUES
    ('TPL-001', 'CT-125/2025', 'CLI-006', 'contrato', 12, 'Medição mensal - NF/Boleto - 30 dias', 30, 'vigente', '2025-06-15', 'Contrato com cláusula de reajuste anual pelo IPCA.'),
    ('TPL-002', 'PC-50/2026',  'CLI-004', 'proposta', 12, 'A negociar',                           30, 'enviado', '2026-03-03', 'Proposta técnica para Construtora G-Maia.');

INSERT INTO contratos_templates_servicos (template_id, servico_id, quantidade, valor_unitario, frequencia) VALUES
    ('TPL-001', 'SRV-001', 12,  480.00, 'Mensal'),
    ('TPL-001', 'SRV-002',  4,  747.90, 'Semestral'),
    ('TPL-001', 'SRV-003', 14,  355.00, 'Mensal'),
    ('TPL-001', 'SRV-005', 12,  150.00, 'Mensal'),
    ('TPL-001', 'SRV-006',  6, 1200.00, 'Bimestral'),
    ('TPL-002', 'SRV-001', 12,  520.00, 'Mensal'),
    ('TPL-002', 'SRV-002',  4,  747.90, 'Semestral'),
    ('TPL-002', 'SRV-003', 14,  355.00, 'Mensal'),
    ('TPL-002', 'SRV-005', 24,  120.00, 'Mensal');

-- ==========================
-- SEED — ALOCAÇÕES SEMANAIS
-- ==========================

INSERT INTO alocacoes_semanais (id, tecnico_id, veiculo_id, dia_semana, cliente, servico, turno) VALUES
    ('AL-001', 'TEC-001', 'VEI-001', 1, 'Komatsu',           'Coleta de Bebedouros',     'manha'),
    ('AL-002', 'TEC-001', 'VEI-001', 1, 'Komatsu',           'Controle de Pragas',       'tarde'),
    ('AL-003', 'TEC-002', 'VEI-002', 1, 'Metalúrgica Sigma', 'Desratização',             'integral'),
    ('AL-004', 'TEC-003', 'VEI-003', 2, 'Komatsu',           'Manutenção Civil',         'integral'),
    ('AL-005', 'TEC-001', 'VEI-001', 3, 'Hospital São Lucas','Higienização Cx. D''Água', 'manha'),
    ('AL-006', 'TEC-004', NULL,      3, 'G-Maia',            'Controle de Pragas',       'integral'),
    ('AL-007', 'TEC-002', 'VEI-002', 4, 'Tecnosonda',        'CIP + Bebedouros',         'integral'),
    ('AL-008', 'TEC-003', 'VEI-003', 5, 'MIP',               'Manutenção Civil',         'manha');

-- Fim do script
