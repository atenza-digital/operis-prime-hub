# Matriz de Origem dos Dados - Propostas

Esta matriz descreve a origem dos dados usados na proposta técnica e comercial do Atenza FieldOps. O objetivo é evitar hardcode da Ciperprag e manter o documento preparado para SaaS.

| Campo no documento | Origem | Observação |
| --- | --- | --- |
| Logo da contratada | Configuração do tenant (`empresa_config.logo_url`) ou asset padrão do tenant | Deve ser parametrizável por cliente SaaS. |
| Razão social, CNPJ, endereço, telefone e e-mail da contratada | Configuração do tenant (`empresa_config`) | Não deve ficar fixo em código. |
| Número da proposta | `contratos_templates.numero` com base em `numeracao_config.proposta_formato` | Deve seguir sequência por tenant. |
| Data de emissão | `contratos_templates.data_criacao` | Exibida em formato brasileiro. |
| Cliente/contratante | Cadastro de clientes (`clientes`) | Razão social, CNPJ, município, UF e endereço. |
| Título/subtítulo da proposta | `contratos_templates.titulo` | Ex.: serviço mensal de roçagem, aplicação de herbicida e jardinagem semanal. |
| Objeto | `contratos_templates.objeto` | Texto comercial/técnico da proposta. |
| Validade da proposta | `contratos_templates.validade_dias` | Separada da vigência contratual. |
| Vigência prevista | `contratos_templates.vigencia_meses` | Usada para previsão de contrato após aceite. |
| Modalidade | `contratos_templates.modalidade` | Ex.: contrato mensal, medição por unidade executada, serviço avulso. |
| Forma de pagamento e prazo | `contratos_templates.forma_pagamento` e `prazo_pagamento_dias` | Usados na proposta e no contrato derivado. |
| Unidades/locais contemplados | `contratos_templates.locais_execucao` | Lista JSON por proposta/contrato. |
| Serviços/produtos | `contratos_templates_servicos` + `servicos_catalogo` | Mantém vínculo operacional com catálogo. |
| Descrição comercial da linha | `contratos_templates_servicos.descricao_comercial` | Permite texto vendável sem duplicar o catálogo operacional. |
| Unidade comercial da linha | `contratos_templates_servicos.unidade_comercial` | Ex.: mês, visita, m². |
| Quantidade, frequência, valor unitário e total | `contratos_templates_servicos` | Valores são comerciais; não devem aparecer para perfil Operacional. |
| Natureza do serviço | `servicos_catalogo.nome` e `descricao`, com override comercial quando houver | Alimenta a proposta sem engessar o SaaS. |
| Escopo técnico | `contratos_templates.escopo_tecnico` ou procedimentos do catálogo | Itens por linha para facilitar leitura. |
| Condições comerciais complementares | `contratos_templates.condicoes_comerciais` | Itens por linha. |
| Observações | `contratos_templates.observacoes` | Campo livre para ressalvas. |
| Assinatura/representante | Configuração do tenant e, futuramente, assinatura do usuário responsável | Ainda não finalizado como assinatura parametrizada por usuário. |

## Situação atual

- Implementado: campos estruturados de proposta e descrições comerciais por item.
- Parcial: assinatura/representante ainda usa configuração do tenant; assinatura por usuário segue em P1.
- Pendente: snapshot imutável/versionamento do PDF emitido e armazenamento R2.

## Atualização de versionamento

- Implementado: snapshot histórico HTML imutável, hash do conteúdo, hash do snapshot, template versionado e auditoria de emissão.
- Implementado: o snapshot consolida `contratos_templates`, cliente, empresa e `contratos_templates_servicos` no momento da emissão.
- Parcial: armazenamento efetivo ainda é no banco; R2 está preparado por metadados e padrão de chave, sem upload ativo nesta homologação.
- Pendente: PDF server-side aderente ao layout aprovado e armazenamento binário no R2 quando o motor documental do P1 for concluído.
