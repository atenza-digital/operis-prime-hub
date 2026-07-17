# Matriz de origem dos dados - Proposta e Contrato

Esta matriz registra a origem dos campos usados nos templates comerciais revisados. A proposta e o contrato sao documentos diferentes: a proposta apresenta a oferta tecnico-comercial; o contrato formaliza as condicoes apos aprovacao.

| Campo/bloco | Proposta | Contrato | Origem atual | Status SaaS | Observacao |
| --- | --- | --- | --- | --- | --- |
| Logo da contratada | Sim | Sim | `empresa_config.logo_url`; fallback visual sem logo | Dinamico | Cenario generico sem logo validado com marca textual neutra. |
| Cor principal | Sim | Sim | `empresa_config.cor_primaria` | Dinamico | Usada em divisorias, titulos e destaques financeiros. |
| Cor secundaria | Sim | Sim | `empresa_config.cor_secundaria` ou fallback do tema | Dinamico parcial | Pode evoluir para paleta completa por tenant. |
| Nome fantasia/razao social da contratada | Sim | Sim | `empresa_config.nome_fantasia` e `empresa_config.razao_social` | Dinamico | Sem fixar Ciperprag no template. |
| CNPJ, endereco, telefone e e-mail da contratada | Sim | Sim | `empresa_config` | Dinamico | No tenant generico usa dados ficticios neutros. |
| Responsavel da contratada | Sim | Sim | `empresa_config.responsavel_execucao`, `responsavel_tecnico` ou fallback administrativo | Dinamico parcial | Futuro: selecionar responsavel por documento/usuario logado. |
| Cargo do responsavel | Sim | Sim | `empresa_config.cargo_responsavel` ou fallback por tipo de documento | Dinamico parcial | Futuro: parametrizar por perfil e tipo documental. |
| Numero do documento | Sim | Sim | `contratos_templates.numero`; criacao usa `numeracao_config` | Dinamico | A numeracao deve continuar pelo ultimo numero parametrizado. |
| Tipo documental | Sim | Sim | `contratos_templates.tipo` | Dinamico | Proposta e contrato tem layouts e textos diferentes. |
| Data de emissao | Sim | Sim | `contratos_templates.data_criacao` / `criado_em` | Dinamico | Formatada em `pt-BR`. |
| Cliente/contratante | Sim | Sim | `clientes` vinculado por `cliente_id` + snapshot no template | Dinamico | Inclui CNPJ, endereco, municipio, UF e CEP. |
| Validade/vigencia | Validade | Vigencia | `contratos_templates.vigencia_meses` | Dinamico | O rotulo muda conforme proposta ou contrato. |
| Forma e prazo de pagamento | Sim | Sim | `contratos_templates.forma_pagamento` e `prazo_pagamento_dias` | Dinamico | Futuro: condicoes por biblioteca comercial do tenant. |
| Servicos/produtos | Sim | Sim | `contratos_templates_servicos` + `servicos_catalogo` | Dinamico | Nome, descricao, unidade, procedimentos e EPIs vem do catalogo. |
| Quantidade, frequencia e valores | Sim | Sim | Itens do template comercial | Dinamico | Total calculado a partir dos itens. |
| Natureza do servico | Sim | Nao | `servicos_catalogo.descricao` | Dinamico | Bloco executivo da proposta. |
| Forma de execucao/tratamento | Sim | Nao | `servicos_catalogo.procedimentos` e `epis` | Dinamico parcial | Futuro: textos comerciais proprios por servico. |
| Clausulas contratuais | Nao | Sim | Texto padrao universal no template atual | Fixo temporario | Deve ir para biblioteca versionada por tenant. |
| Observacoes | Sim | Sim | `contratos_templates.observacoes` | Dinamico | Preservado no documento impresso. |
| Assinaturas | Sim | Sim | Dados da empresa + cliente + linhas do template | Dinamico parcial | Futuro: assinatura eletronica e snapshot. |
| Quebra de pagina longa | Sim | Sim | Regra visual por quantidade de itens | Template | Acima de 8 itens, fechamento comercial/assinaturas inicia em pagina propria. |

## Fixo temporario

- Titulos das secoes e ordem dos blocos do template.
- Texto juridico universal das clausulas contratuais.
- Texto institucional de apresentacao e capacidade tecnica.
- Linhas de assinatura manual.

## Deve evoluir

- Biblioteca de clausulas e condicoes comerciais versionada por tenant.
- Snapshot imutavel da proposta aprovada para gerar o contrato.
- PDF server-side com hash e anexo imutavel.
- Assinatura eletronica/digital ou registro formal de aceite.
- Editor administrativo para textos comerciais, juridicos e responsaveis por documento.
