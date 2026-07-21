# Matriz de dados dos documentos operacionais

Esta matriz define quais dados devem ser parametrizáveis no SaaS, quais vêm do fluxo operacional e quais textos podem permanecer como padrão do template.

## Ordem de Serviço

| Campo/bloco | Origem dinâmica | Fallback permitido | Observação |
| --- | --- | --- | --- |
| Logo e dados da contratada | `empresa_config` do tenant | Logo/identidade padrão do tenant | Nunca fixar Ciperprag no código; Ciperprag é apenas o tenant atual. |
| Número da OS | `numeracao_config.os_formato` + `os_ultimo` | `OS-{SEQ}` | A tela Comercial > Configurações permite ajustar formato e último número. |
| Ano da OS | Data de emissão | Ano atual | Usado apenas para exibição quando o formato não trouxer `{ANO}`. |
| Cliente, CNPJ e endereço | Cadastro de `clientes` por `cliente_id` | Snapshot/campos salvos em `ordens_servico` | Preferir cadastro atual quando disponível; snapshot preserva histórico. |
| Contrato | `ordens_servico.contrato_id` e `contratos` | Valor salvo na OS | Contrato operacional vem do contrato comercial vigente. |
| Serviço executado | `ordens_servico.servico`, `servicos_catalogo` e snapshot | Texto salvo na OS | O catálogo deve alimentar descrição, unidade, POP, riscos, EPIs, checklist e produtos. |
| Técnico líder | `tecnicos`/`funcionarios` + OS | Nome salvo na OS | CPF e admissão devem vir do cadastro do técnico. |
| Equipe, veículo e local | Agendamento/OS | Campos salvos na OS | Devem vir do agendamento que gerou a OS. |
| Tags/equipamentos | Equipamentos do cliente/local + OS | Campo livre atual | Evoluir para seleção guiada por cadastro. |
| Quantidade e unidade | OS encerrada e contrato | Serviço/contrato | Quantidade final deve ser informada no encerramento. |
| Riscos, EPIs, EPCs, POP e checklist | `servicos_catalogo`, POP ativo e contrato | Textos padrão do template | Devem ser snapshotados na emissão/encerramento. |
| Observação e motivo de não execução | OS | Vazio | Dados operacionais livres. |
| Assinaturas e campos de campo | Template da OS | Linhas em branco | São campos para impressão e preenchimento manual. |
| Rodapé | `empresa_config` | Dados do tenant | Endereço, telefone e e-mail parametrizados. |

## Proposta e contrato

A proposta, a minuta e o contrato final são documentos distintos no fluxo comercial. A proposta nasce primeiro, com escopo técnico-comercial, valores, validade e condições. Quando aprovada, ela deve originar a minuta para revisão/negociação. Somente a minuta aprovada deve originar o contrato final vigente, preservando os itens aprovados como base do contrato operacional.

| Campo/bloco | Origem dinâmica | Fallback permitido | Observação |
| --- | --- | --- | --- |
| Identidade visual | `empresa_config` do tenant | Tema padrão Atenza FieldOps | Deve suportar qualquer tenant. |
| Número | `numeracao_config.proposta_formato` ou `contrato_formato` | `PROP-{SEQ}/{ANO}` / `CT-{SEQ}/{ANO}` | Configurável pelo usuário administrador. |
| Dados da contratada | `empresa_config` | Vazio controlado | Não fixar Ciperprag. |
| Dados do cliente | `clientes` | Snapshot do documento | Inclui razão social, CNPJ, endereço, contatos e financeiro. |
| Itens de serviço/produto | `contratos_templates_servicos` + `servicos_catalogo` | Texto do item | Serviços/produtos devem vir do cadastro e não de texto solto. |
| Quantidade, unidade, frequência, valor | Itens da proposta/contrato | Campos do contrato operacional | Alimenta agenda, OS, saldo e medição. |
| Escopo técnico | Catálogo de serviços, POP e campos comerciais | Texto padrão por serviço | Deve ser parametrizável por tenant e por serviço. |
| Condições comerciais | Modelo comercial + campos do contrato | Padrões do tenant | Forma de pagamento, prazo, validade da proposta, reajuste, vigência. |
| Aceite/assinaturas | Template + responsáveis configurados | Linhas em branco | Pode evoluir para assinatura digital/anexo. |
| Cláusulas padrão | Biblioteca de cláusulas do tenant | Template universal | Deve ser versionada por template. |

## Itens fixos aceitáveis no template

- Estrutura visual do documento, títulos de seções e ordem dos blocos.
- Textos padrão de orientação operacional, desde que possam virar parâmetros por tenant no futuro.
- Linhas para assinatura, guarita, acompanhante e matrícula quando o documento for impresso.
- Rótulos como Cliente, CNPJ, Serviço, Contrato, Quantidade, Valor e Assinatura.

## Itens que não devem ficar fixos

- Nome, CNPJ, logo, endereço, telefone, e-mail e responsáveis da empresa emissora.
- Nome, CNPJ e endereço do cliente.
- Serviços/produtos, valores, quantidades, frequência, riscos, EPIs, POPs e validade.
- Numeração de OS, proposta, contrato, certificado e medição.
- Cores e elementos visuais que identificam o tenant, quando configuráveis.
