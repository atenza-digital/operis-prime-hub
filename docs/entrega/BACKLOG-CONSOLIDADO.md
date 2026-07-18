# Backlog Consolidado

Este backlog não é uma lista paralela de ideias. Cada item deve pertencer a uma etapa do P0, P1 ou P2. Novas demandas identificadas durante auditoria, testes ou homologação devem ser encaixadas em uma dessas etapas.

## P0 - Entrega vertical Ciperprag

### P0.1 Propostas

- Validar e ajustar cadastro/geração de propostas com dados do cliente, contatos, locais, serviços, escopo, periodicidade, quantidades, valores, validade, condições comerciais e observações.
- Suportar propostas com um ou vários serviços/produtos.
- Suportar anexos de referência e planilhas de preço quando aplicável.
- Reproduzir fielmente o layout da proposta Ciperprag v1 enviada, alterando somente fonte para Noto Sans, correções gramaticais/ortográficas, alinhamento, paginação, legibilidade e dados dinâmicos do tenant.
- Registrar status da proposta: rascunho, enviada, em negociação, aprovada, recusada, cancelada.
- Converter proposta aprovada em contrato/minuta.
- Registrar auditoria de criação, edição, emissão e aprovação.
- Guardar snapshot da proposta emitida.

Status de execução P0.1: snapshot histórico, hash de conteúdo, hash de snapshot, versão de template e auditoria implementados. R2 efetivo e PDF server-side permanecem na fundação documental do P1.

### P0.2 Contratos e minutas

- Separar claramente proposta, minuta e contrato.
- Permitir gerar contrato a partir da proposta aprovada.
- Permitir usar modelo/minuta do cliente quando houver.
- Parametrizar cláusulas, assinatura, vigência, periodicidade, forma de pagamento, reajuste e observações.
- Criar itens contratuais consumíveis pelo operacional.
- Controlar saldo técnico por item contratado.
- Guardar PDF/snapshot e versão emitida.

Status de execução P0.2: iniciado. O Comercial agora diferencia proposta, minuta/modelo do cliente e contrato. Minutas aprovadas podem ser versionadas e convertidas em contrato vigente, com sincronização dos itens para o operacional.

### P0.3 Agendamentos

- Agendar serviços apenas a partir de contrato vigente ou regra permitida.
- Selecionar cliente, contrato, item de contrato, local, data, período, equipe, técnicos, veículos e observações.
- Indicar recorrência e sugerir próximo agendamento após conclusão.
- Exibir filtros por período, equipe, status, cliente e contrato.
- Melhorar calendário com visualização mensal, semanal e detalhes ao clicar.
- Impedir que Operacional visualize valores comerciais.

### P0.4 Ordens de Serviço

- Gerar OS a partir do agendamento.
- Garantir numeração automática com configuração de último número por tenant.
- Permitir imprimir via para equipe de campo.
- Permitir encerramento com execução, não execução, tags/equipamentos, observações, assinatura e até 3 fotos.
- Controlar checklist, POP aplicável, EPIs e normas com linguagem acessível.
- Permitir upload de POP quando o tenant já possuir documentos prontos.
- Corrigir acentuação e textos quebrados.
- Evitar tabelas estouradas no PDF.

### P0.5 Certificados com QR Code e hash

- Gerar certificados apenas para serviços que permitem certificado.
- Usar fotos dinâmicas vindas da OS, até 3 imagens.
- Usar logo, ícone de fundo, cor e dados parametrizados do tenant.
- Gerar QR Code com rota pública de validação.
- Gerar hash real com snapshot imutável.
- Permitir revogação/substituição com histórico.
- Preservar aderência visual ao certificado Ciperprag, sem impedir modelos SaaS de outros tenants.

### P0.6 Relatórios técnicos

- Gerar relatório técnico com identificação, objetivo, metodologia, evidências, não conformidades, recomendações, plano de ação e assinatura.
- Usar fotos/evidências da OS quando aplicável.
- Permitir texto técnico configurável por serviço.
- Preservar template versionado e snapshot.
- Comparar com relatório técnico Ciperprag de controle de pulgas.

### P0.7 Medições e acompanhamento

- Consolidar OS encerradas por período e contrato.
- Evitar medição duplicada do mesmo item/OS.
- Gerar PDF da medição preservando o layout aprovado.
- Acompanhar status: emitida, NF enviada, aguardando pagamento, paga, cobrar, baixada no ERP.
- Não implementar contas a pagar ou contas a receber dentro do FieldOps.
- Garantir que o Financeiro veja valores e o Operacional não.
- Guardar histórico de versões da medição.

## P1 - Fundação SaaS e produção

- Tenant obrigatório em entidades de cliente, contrato, proposta, OS, certificado, relatório, medição e anexos.
- RLS PostgreSQL com testes de isolamento.
- Permissões backend por perfil, módulo e ação.
- R2 privado por ambiente, tenant, entidade e versão.
- URLs temporárias para download seguro.
- Auditoria completa de ações críticas.
- React Query progressivo com cache por tenant/usuário.
- Tratamento padronizado de erros.
- Observabilidade, logs e readiness de produção, incluindo a disponibilidade do controlador de navegador usado nas validações visuais automatizadas.
- Separação homologação/produção em banco, bucket, variáveis e credenciais.
- Gestão de usuários, papéis, permissões e assinatura do usuário para documentos.
- Preparação futura para login Google e e-mail noreply Atenza.
- Identidade SaaS: login Atenza FieldOps, tenant discreto por URL, logo do tenant após login e em documentos.
- Tipografia definida: Nortica na interface, Neue Ultra apenas na marca textual Atenza FieldOps e Noto Sans incorporada nos documentos/PDFs gerados.

## P2 - Evolução após P0 aprovado

- PWA/offline para equipe de campo.
- Dashboard único adaptado ao perfil logado.
- Widgets por módulo e permissão.
- Gestão avançada de equipes, qualificações e vencimentos.
- Ativos/equipamentos e planos de manutenção.
- Automação de recorrência.
- Relatórios gerenciais.
- Microinterações e melhorias visuais leves, incluindo morphismo quando fizer sentido.
- Integração com Atenza Hub para licença/status do tenant.
- Portal ou experiência externa somente após validação do fluxo interno.

## Quantidade atual

- P0: 7 etapas principais.
- P1: 14 blocos de fundação.
- P2: 10 blocos de evolução.
- Total consolidado: 31 blocos controlados.

Atualização P0.2: o arquivo original do cliente pode ser anexado à minuta em PDF, DOC, DOCX, ODT, PNG ou JPG, com limite de 8 MB, vínculo ao tenant, hash SHA-256, anexo imutável, auditoria e download autenticado. O provedor efetivo nesta homologação é o banco; R2 e PDF server-side permanecem na fundação do P1.
