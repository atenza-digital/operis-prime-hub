BEGIN;

WITH tenant AS (
  SELECT id FROM ciperprag_hub.tenants WHERE slug = 'ciperprag' LIMIT 1
)
UPDATE ciperprag_hub.empresa_config
SET razao_social = 'CIPERPRAG Controle de Pragas e Serviços LTDA',
    nome_fantasia = 'Ciperprag',
    endereco = 'Rua Tiradentes, nº 190, Centro, Rondon do Pará',
    telefone = '(94) 99258-2761',
    email = 'adm@ciperprag.com',
    responsavel_execucao = 'Aline Vieira',
    cargo_responsavel = 'Diretora/Gerente de Negócios/Resp. Técnica'
FROM tenant
WHERE empresa_config.tenant_id = tenant.id;

WITH tenant AS (
  SELECT id FROM ciperprag_hub.tenants WHERE slug = 'ciperprag' LIMIT 1
)
UPDATE ciperprag_hub.clientes
SET razao_social = CASE clientes.id
      WHEN 'CLI-001' THEN 'Komatsu Brasil International LTDA'
      WHEN 'CLI-002' THEN 'Metalúrgica Sigma S.A.'
      WHEN 'CLI-003' THEN 'Hospital São Lucas'
      WHEN 'CLI-004' THEN 'Construtora G-Maia S.A.'
      WHEN 'CLI-005' THEN 'MIP Engenharia LTDA'
      WHEN 'CLI-006' THEN 'Tecnosonda S.A.'
      ELSE razao_social
    END,
    bairro = CASE clientes.id
      WHEN 'CLI-001' THEN 'Nova Carajás'
      WHEN 'CLI-002' THEN 'Distrito Industrial'
      WHEN 'CLI-003' THEN 'Centro'
      WHEN 'CLI-004' THEN 'Jardim Canadá'
      WHEN 'CLI-005' THEN 'Nova Canaã'
      ELSE bairro
    END,
    municipio = CASE clientes.id
      WHEN 'CLI-002' THEN 'Marabá'
      WHEN 'CLI-005' THEN 'Canaã dos Carajás'
      ELSE municipio
    END,
    endereco = CASE clientes.id
      WHEN 'CLI-003' THEN 'Rua da Saúde, 450'
      ELSE endereco
    END
FROM tenant
WHERE clientes.tenant_id = tenant.id;

WITH tenant AS (
  SELECT id FROM ciperprag_hub.tenants WHERE slug = 'ciperprag' LIMIT 1
)
UPDATE ciperprag_hub.servicos_catalogo
SET nome = CASE servicos_catalogo.id
      WHEN 'SRV-001' THEN 'Controle Integrado de Pragas (CIP)'
      WHEN 'SRV-002' THEN 'Higienização de Caixas D''Água'
      WHEN 'SRV-003' THEN 'Coleta e Análise de Bebedouros'
      WHEN 'SRV-004' THEN 'Manutenção Civil Predial'
      WHEN 'SRV-005' THEN 'Manutenção de Ar-Condicionado (PMOC)'
      WHEN 'SRV-006' THEN 'Roçagem e Limpeza de Área'
      ELSE nome
    END,
    descricao = CASE servicos_catalogo.id
      WHEN 'SRV-001' THEN 'Programa de manejo eficaz de insetos rasteiros/voadores, roedores e pragas urbanas.'
      WHEN 'SRV-002' THEN 'Esvaziamento, limpeza mecânica, desinfecção e emissão de certificado.'
      WHEN 'SRV-003' THEN 'Higienização, desinfecção e coleta de amostras de água para análise laboratorial.'
      WHEN 'SRV-004' THEN 'Serviços de manutenção predial geral conforme demanda.'
      WHEN 'SRV-005' THEN 'Plano de Manutenção, Operação e Controle para sistemas de climatização.'
      WHEN 'SRV-006' THEN 'Roçagem mecanizada e manual de áreas verdes e limpeza de terrenos.'
      ELSE descricao
    END,
    unidade = CASE servicos_catalogo.id
      WHEN 'SRV-002' THEN 'limpezas'
      WHEN 'SRV-003' THEN 'itens'
      WHEN 'SRV-004' THEN 'horas'
      WHEN 'SRV-005' THEN 'equipamentos'
      WHEN 'SRV-006' THEN 'm²'
      ELSE unidade
    END,
    procedimentos = CASE servicos_catalogo.id
      WHEN 'SRV-006' THEN ARRAY[
        'Sinalização da área',
        'Roçagem mecanizada/manual',
        'Recolhimento de resíduos',
        'Limpeza geral'
      ]::TEXT[]
      ELSE procedimentos
    END
FROM tenant
WHERE servicos_catalogo.tenant_id = tenant.id;

WITH tenant AS (
  SELECT id FROM ciperprag_hub.tenants WHERE slug = 'ciperprag' LIMIT 1
)
UPDATE ciperprag_hub.contratos_templates
SET titulo = 'Serviço mensal de roçagem, aplicação de herbicida e jardinagem semanal',
    objeto = 'Prestação mensal de serviços de roçagem, jardinagem, aplicação controlada de herbicida e manutenção preventiva das áreas ajardinadas.',
    forma_pagamento = 'Medição mensal após aceite dos serviços executados',
    modalidade = 'Contrato mensal com medição por serviços executados',
    locais_execucao = '[
      "KMCB - Rodovia Faruk Salmen, KM 05, Distrito Industrial.",
      "KBI Filial / KRCB - Av. Serra Arqueada, Qd. 205, Lt. 01, Lote 001 e 2, Bairro Nova Carajás.",
      "Almoxarifado e Área 51 - Av. Serra Arqueada, Qd. QNC, S/N, Bairro Nova Carajás.",
      "CTKA e CTK - Av. Carajás, QD 141, LT 14, 15, 23 e 24, S/N, Bairro Nova Carajás.",
      "Fábrica de Mangueiras - Rua 20, Qd. 141, Lote 14, Bairro Nova Carajás."
    ]'::jsonb,
    escopo_tecnico = 'Roçagem manual/mecanizada nas áreas indicadas, incluindo vegetação rasteira, aceiros, calçadas e perímetro externo.
Aplicação controlada de herbicida com produto, preparo, aplicação e registro técnico.
Jardinagem semanal para canteiros, vasos, poda leve, capina manual e conservação geral.
Recolhimento, rastelamento, limpeza pós-serviço e direcionamento dos resíduos vegetais.
Entrega de relatório mensal com atividades executadas, fotos, equipe mobilizada e recomendações técnicas.',
    condicoes_comerciais = 'Valores mensais incluem impostos, mobilização local, mão de obra, EPIs, ferramentas ordinárias e administração operacional.
Serviços extraordinários ou com necessidade de plataforma serão tratados como serviço spot.
Validade de 30 dias corridos a partir da emissão.'
FROM tenant
WHERE contratos_templates.tenant_id = tenant.id
  AND contratos_templates.id = 'TPL-KOM-ROCO';

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
  FROM ciperprag_hub.contratos_templates_servicos
  WHERE template_id = 'TPL-KOM-ROCO'
)
UPDATE ciperprag_hub.contratos_templates_servicos s
SET descricao_comercial = CASE ranked.rn
      WHEN 1 THEN 'Roçagem mensal manual/mecanizada nas unidades indicadas'
      WHEN 2 THEN 'Aplicação mensal controlada de herbicida'
      WHEN 3 THEN 'Jardineiro fixo semanal para conservação geral'
      WHEN 4 THEN 'Recolhimento, rastelamento e limpeza pós-serviço'
      ELSE descricao_comercial
    END,
    unidade_comercial = CASE ranked.rn
      WHEN 1 THEN 'mês'
      WHEN 2 THEN 'mês'
      WHEN 3 THEN 'visita'
      WHEN 4 THEN 'mês'
      ELSE unidade_comercial
    END
FROM ranked
WHERE s.id = ranked.id;

COMMIT;
