# Auditoria de Aderencia - Prompt, Anexos e Backlog

Data: 2026-06-28

Ambiente analisado: homologacao

## Objetivo

Consolidar o que ja foi implementado, o que esta parcial e o que ainda precisa entrar no backlog para evoluir o Ciperprag Hub como plataforma SaaS operacional, usando como base:

- Prompt de evolucao do sistema.
- Estado atual da aplicacao.
- Modelos anexados de OS, certificado, medicao e POPs.
- Diretriz de manter a comunicacao visual e institucional como Atenza quando houver referencia ao desenvolvimento.

## Resumo executivo

A aplicacao ja avancou em uma base importante de homologacao: login interno, usuarios, perfis, permissoes, sessoes, troca obrigatoria de senha temporaria, identificacao visual de homologacao e versao visivel na interface.

O ponto mais critico antes de novas telas grandes e organizar a base operacional que sustenta os documentos reais: OS, certificado, medicao, POP/checklist, equipamentos/tags, locais de execucao e parametrizacoes da empresa. Os anexos deixam claro que os documentos precisam sair de dados persistidos, parametrizados e auditaveis, evitando textos fixos espalhados no frontend.

## Aderencia por etapa

| Etapa | Status | Evidencia atual | Proxima acao recomendada |
| --- | --- | --- | --- |
| Etapa 0 - Diagnostico e plano | Parcial | Analise inicial feita ao longo da evolucao, mas sem uma matriz unica ate este documento. | Manter este arquivo como referencia viva de aderencia e backlog. |
| Etapa 1 - Fundacao SaaS, login e seguranca | Parcial avancado | Login interno, sessoes, usuarios, perfis, permissoes e troca de senha temporaria implementados. | Completar isolamento por tenant em todas as consultas, auditoria ampliada, politicas de senha e revisao de permissoes por modulo. |
| Versionamento e homologacao | Concluido inicial | Interface mostra ambiente de homologacao e versao. | Padronizar leitura da versao via build/release e preparar diferenca visual futura para producao. |
| Etapa 2 - Cadastros estruturantes | Parcial | Clientes, servicos, contratos e configuracoes existem, mas ainda nao cobrem todos os dados exigidos pelos documentos. | Priorizar locais de execucao, contatos por funcao, equipamentos/tags, regras por servico e configuracoes documentais. |
| Etapa 3 - SMTP/e-mails | Pendente | Ainda nao ha configuracao generica de SMTP nem envio transacional. | Colocar apos a estabilizacao dos fluxos operacionais principais. |
| Etapa 4 - Comercial/propostas/contratos | Parcial | Ha cadastros comerciais basicos. | Evoluir oportunidade, proposta, aceite, geracao de contrato e status comercial depois dos documentos operacionais. |
| Etapa 5 - Agenda/calendario | Parcial | Existe agenda/agendamento e quadro semanal. | Melhorar conflitos, visao calendario/kanban, alocacao de equipes, recorrencia confirmada e transicoes de status. |
| Etapa 6 - OS robusta | Parcial | OS gerada e ajustada para se aproximar do modelo em duas paginas. | Persistir mais campos da OS, suportar cancelamento/nao execucao, acompanhantes, assinaturas, varios itens, riscos, EPI/EPC e textos parametrizados. |
| Etapa 7 - Evidencias/fotos/anexos | Parcial | Encerramento aceita fotos de forma limitada. | Criar armazenamento estruturado de anexos, metadados, limites por tipo, preview, download e associacao com OS/certificado/medicao. |
| Etapa 8 - Certificados antifraude | Parcial | Certificado com QR Code e rota publica de validacao foram implementados. | Persistir snapshot final, status, revogacao, hash imutavel, divergencia entre certificado e relatorio e aderencia total ao modelo original. |
| Etapa 9 - Medicao | Parcial | Tela e PDF de medicao existem, mas ainda precisam de persistencia robusta. | Criar entidade de medicao, status, itens medidos, baixa contratual, anexos, numero, NF e PDF historico. |
| Etapa 10 - POPs/checklists | Pendente | Anexos mostram POPs reais, mas o sistema ainda nao gerencia POP/checklist por servico. | Criar cadastro de POPs, versoes, checklist vinculado ao servico e uso na OS/encerramento. |
| Etapa 11 - Estoque simples | Pendente | Nao identificado fluxo de estoque operacional. | Manter em backlog apos OS, certificados e medicao. |
| Etapa 12 - Ajuda, UX e dashboards | Parcial | UI foi melhorada e o menu foi reorganizado. | Adicionar ajuda contextual, indicadores por perfil, telas vazias melhores e fluxo guiado. |
| Etapa 13 - Hardening/testes/performance | Parcial | Build, lint e testes foram executados nas etapas anteriores, com warnings conhecidos. | Automatizar testes criticos, revisar warnings, auditoria de seguranca, backups e deploy versionado. |

## Requisitos extraidos dos anexos

### Ordem de Servico

O modelo de OS anexado tem duas paginas e exige dados dinamicos de:

- Numero da OS, ano, setor e funcao.
- Colaborador, CPF e data de admissao.
- Cliente, CNPJ, local de execucao e contrato.
- Servicos executados com checkboxes e quantidades.
- Tags/equipamentos atendidos.
- Riscos envolvidos, EPI, EPC, procedimentos especificos e treinamentos.
- Produtos quimicos e referencia a FISPQ quando aplicavel.
- Medidas preventivas, ergonomia, movimentacao de materiais e obrigacoes do colaborador.
- Data de emissao, guarita, acompanhante, matricula e responsavel tecnico.
- Assinaturas e rodape institucional.

Impacto: a OS nao deve depender de texto fixo no frontend. Ela precisa ser montada a partir de servico, contrato, colaborador/equipe, local, tags, configuracoes da empresa e parametros tecnicos.

### Certificado

O modelo de certificado anexado exige:

- Periodo de validade.
- Cliente, CNPJ, endereco e local.
- Informacoes do servico e tag quando aplicavel.
- Legislacao/referencia tecnica.
- Numero do certificado e registros/licencas.
- Texto de atestacao do servico.
- Bloco institucional e telefone de emergencia/toxicologia.
- QR Code antifraude com validacao publica.

Impacto: o certificado deve ser um snapshot final validavel, com hash, status, possibilidade futura de revogacao e dados que nao mudem retroativamente quando um cadastro for alterado.

### Medicao

O modelo de medicao anexado exige:

- Numero da medicao e ano.
- Periodo/mes de referencia.
- Dados da empresa contratante e contratada.
- Contrato, endereco, bairro, CEP, contato, municipio e e-mail.
- Itens com OS, descricao, quantidade, valor unitario e total.
- Total da medicao, forma de pagamento, local de entrega e assinatura.

Impacto: a medicao precisa ser persistida, versionada e vinculada aos itens baixados do contrato, evitando ser apenas um PDF gerado temporariamente.

### POPs e checklists

Os POPs anexados indicam necessidade de:

- Cadastro de POP por servico/procedimento.
- Controle de versao, revisao, elaboracao, validacao e aprovacao.
- Objetivo, aplicacao, responsabilidades, materiais, procedimentos e registros.
- Checklist operacional vinculado a OS/encerramento.

Impacto: POP e checklist devem virar dados estruturados, nao apenas anexos soltos.

## Backlog priorizado

### Alta prioridade

- Completar isolamento por tenant em consultas e mutacoes antes da base virar multiempresa real.
- Criar cadastros de locais de execucao, contatos por funcao e equipamentos/tags.
- Parametrizar dados documentais da empresa: licencas, responsaveis tecnicos, rodapes, textos legais, numeracoes e validade padrao.
- Evoluir OS para usar dados persistidos e suportar todos os campos criticos do modelo.
- Persistir certificado como snapshot final com hash, QR Code, status e futura revogacao.
- Persistir medicao com itens, baixa contratual, status, PDF historico e anexos.

### Media prioridade

- Cadastro de POPs e checklists por servico.
- Melhorar agenda com conflitos, recorrencia confirmada e transicoes visuais claras.
- Evidencias e anexos com armazenamento estruturado.
- Auditoria mais detalhada para acoes sensiveis.
- Testes automatizados dos fluxos operacionais principais.

### Baixa prioridade ou posterior

- Minha Conta.
- Politica visual de senha e dicas de complexidade.
- SMTP/e-mails.
- Estoque simples.
- Painel do dono do SaaS para controle de tenants, planos, pagamentos, bloqueios e cobranca.
- Help center e onboarding guiado.

### Oportunidades identificadas fora do prompt

- Criar observabilidade basica para SaaS: logs estruturados, monitoramento de uptime, alertas de erro, trilha de deploy e painel simples de saude do ambiente.
- Definir rotina automatizada de backup/restauracao testada para homologacao e producao.
- Criar checklist interno de QA por release, com versao, data, responsavel, itens testados e links dos documentos gerados.

## Recomendacao de proxima etapa

Seguir com uma etapa intermediaria chamada **Etapa 2A - Cadastros e parametrizacao documental minima**.

Escopo recomendado:

- Configuracoes documentais da empresa.
- Locais de execucao.
- Equipamentos/tags.
- Contatos por funcao.
- Regras tecnicas por servico.
- Base para OS, certificado e medicao consumirem dados reais e persistidos.

Motivo: essa etapa destrava os documentos operacionais sem pular direto para telas finais que depois precisariam ser refeitas.

## Atualizacao - Etapa 2A executada

Status: concluida no escopo minimo de base cadastral.

Entregas realizadas:

- Criadas estruturas para locais de execucao do cliente.
- Criadas estruturas para equipamentos/tags do cliente.
- Contatos de cliente passaram a aceitar funcao no fluxo e observacoes.
- Configuracoes da empresa passaram a armazenar textos e padroes de certificado e medicao.
- Numeracao passou a contemplar certificados e medicoes.
- Servicos passaram a armazenar checklist, exigencia de foto, exigencia de assinatura, permissao de nao execucao e dados de POP.
- Telas de Clientes, Servicos e Configuracoes foram atualizadas para editar esses dados com acentuacao corrigida.

Backlog remanescente da Etapa 2A:

- Aplicar isolamento por tenant em todas as consultas operacionais.
- Fazer certificado e medicao consumirem os novos campos documentais.
- Criar cadastro completo de POP com versionamento, aprovacao e anexos.

## Atualizacao - Etapa 6A executada

Status: concluida no escopo minimo de OS operacional.

Entregas realizadas:

- Agendamento passou a permitir selecionar equipamentos/tags cadastrados do cliente.
- OS passou a persistir checklist respondido, nao execucao e motivo de nao execucao.
- Encerramento da OS passou a usar checklist configurado no servico.
- Encerramento da OS passou a respeitar exigencia de foto configurada no servico.
- Encerramento da OS passou a permitir registro de nao execucao quando o servico permitir.
- Seleção de tag no encerramento passou a ser guiada pelos equipamentos do cliente quando existirem.
- Impressao da OS passou a mostrar POP vinculado, checklist operacional, tags e motivo de nao execucao.

Backlog remanescente da Etapa 6A:

- Melhorar edicao da OS aberta para selecionar local/tag por listas guiadas em vez de campo livre.
- Corrigir acentuacao completa das telas antigas de Agendamento e Ordens de Servico.
- Adicionar assinatura digital/assinatura coletada em campo.
- Registrar auditoria detalhada de alteracao/encerramento/cancelamento de OS.
- Criar status especifico de OS nao executada, caso o cliente queira diferenciar visualmente de encerrada.
