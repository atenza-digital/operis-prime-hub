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
| Etapa 7 - Evidencias/fotos/anexos | Parcial avancado | Evidencias de OS agora possuem tabela estruturada, metadados, vinculo por entidade e visualizacao na OS. | Expandir anexos para POP aprovado, medicao, certificado PDF, download e armazenamento externo. |
| Etapa 8 - Certificados antifraude | Parcial | Certificado com QR Code e rota publica de validacao foram implementados. | Persistir snapshot final, status, revogacao, hash imutavel, divergencia entre certificado e relatorio e aderencia total ao modelo original. |
| Etapa 9 - Medicao | Parcial avancado | Medicao persistida com itens, status, historico, snapshot, reimpressao e cancelamento inicial. | Evoluir baixa contratual detalhada, anexos, NF, PDF historico server-side e auditoria de cancelamento. |
| Etapa 10 - POPs/checklists | Parcial avancado | POPs versionados por servico, checklist ativo e uso no encerramento/OS implementados no escopo inicial. | Evoluir anexos de POP, fluxo de aprovacao formal, historico visual de versoes e assinatura do responsavel tecnico. |
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

## Atualizacao - Etapa 8A executada

Status: concluida no escopo minimo de certificado com snapshot.

Entregas realizadas:

- Certificados passaram a armazenar snapshot JSON dos dados finais de OS, cliente, servico e empresa.
- Emissao de certificado foi centralizada em uma funcao unica para encerramento de OS e geracao manual.
- Numeracao de certificado passou a usar configuracao persistida em numeracao_config.
- Certificado impresso passou a preferir dados do snapshot, evitando alteracao retroativa quando cadastros forem editados.
- Validacao publica passou a reconhecer certificado revogado.
- Banco recebeu campos para status, revogacao e motivo de revogacao.

Backlog remanescente da Etapa 8A:

- Criar interface administrativa para revogar certificado e informar motivo.
- Popular snapshot para certificados antigos ja existentes.
- Remover rota antiga duplicada de geracao de certificado apos limpeza completa de encoding do arquivo server/index.mjs.
- Assinar/hashar criptograficamente o snapshot para verificacao forte de integridade.
- Exibir na tela publica um resumo mais completo do snapshot validado.

## Atualizacao - Etapa 9A executada

Status: concluida no escopo minimo de medicao persistida.

Entregas realizadas:

- Criadas tabelas `medicoes` e `medicao_itens` para armazenar medicoes historicas no banco.
- Bootstrap passou a carregar medicoes emitidas/canceladas junto com os dados operacionais.
- Tela de Medicao passou a gerar medicao persistida por cliente e intervalo de datas.
- Geracao da medicao passou a considerar apenas OS encerradas, executadas e ainda nao medidas em medicao ativa.
- Medicoes passaram a armazenar snapshot JSON com cliente, empresa, periodo, forma de pagamento, local de entrega, itens e total.
- Historico de medicoes passou a permitir busca, visualizacao, reimpressao e cancelamento.
- Cancelamento de medicao libera as OS para uma nova medicao sem apagar o historico cancelado.
- Impressao da medicao passou a usar o registro persistido, evitando documento temporario sem rastreabilidade.

Backlog remanescente da Etapa 9A:

- Criar PDF server-side de medicao e armazenar versao historica assinada/imutavel.
- Permitir selecao manual de itens antes de emitir a medicao quando o cliente nao quiser medir todas as OS do periodo.
- Adicionar motivo de cancelamento, usuario responsavel e trilha de auditoria detalhada.
- Bloquear cancelamento quando houver nota fiscal/faturamento vinculado.
- Incluir anexos de medicao, numero de NF, data de faturamento e status financeiro.
- Amarrar baixa contratual por item de contrato com saldo medido/pendente mais explicito.
- Evoluir painel Atenza/dono do SaaS para controlar tenants, planos, pagamentos, bloqueios, cobranca e inadimplencia.

## Atualizacao - Etapa 10A executada

Status: concluida no escopo minimo de POPs e checklists versionados por servico.

Entregas realizadas:

- Criada tabela `servico_pops` para controlar POP por servico, codigo, versao, status e metadados tecnicos.
- Servicos passaram a apontar para um POP ativo por meio de `pop_ativo_id`.
- POPs iniciais foram criados a partir dos campos ja existentes de servicos, procedimentos e checklist.
- Tela de Servicos foi reescrita em UTF-8 e passou a editar POP versionado com objetivo, aplicacao, responsabilidades, materiais, aprovador e data de aprovacao.
- Backend passou a salvar servico e POP em transacao, ativando a versao atual e inativando versoes anteriores do mesmo servico.
- Impressao da OS passou a incluir detalhes do POP ativo quando cadastrados.
- Encerramento da OS continua consumindo o checklist ativo do servico, agora vindo preferencialmente da versao ativa do POP.

Backlog remanescente da Etapa 10A:

- Criar tela dedicada de historico de versoes de POP por servico.
- Adicionar anexos formais do POP em PDF/DOCX e controle de arquivo aprovado.
- Criar fluxo de aprovacao com responsavel tecnico, data, assinatura e bloqueio de edicao retroativa.
- Persistir na OS um snapshot do POP/checklist usado no momento da emissao/encerramento.
- Melhorar checklist com tipos de resposta, obrigatoriedade por item, observacao obrigatoria quando nao conforme e evidencias por item.
- Criar relatorio de conformidade mostrando OS encerradas com checklist incompleto ou POP vencido/inativo.

## Atualizacao - Etapa 11A executada

Status: concluida no escopo minimo de evidencias/anexos estruturados.

Entregas realizadas:

- Criada tabela `evidencias_anexos` para centralizar anexos por entidade: OS, certificado, medicao, POP, cliente e contrato.
- Fotos antigas das OS foram migradas para anexos estruturados sem remover o campo legado `fotos`.
- Encerramento de OS passou a salvar as fotos tambem como anexos estruturados, com categoria, nome de arquivo, mime type, tamanho aproximado, metadados, usuario e data de criacao.
- Bootstrap passou a carregar anexos vinculados a cada OS.
- Tela de Ordens de Servico passou a exibir quantidade de evidencias e galeria baseada preferencialmente nos anexos estruturados.
- Base ficou preparada para anexar POP aprovado, PDF historico de medicao, certificado gerado e documentos de cliente/contrato.

Backlog remanescente da Etapa 11A:

- Criar upload/download dedicado de anexos fora do fluxo de encerramento da OS.
- Migrar armazenamento de base64 no banco para storage externo ou filesystem controlado, mantendo apenas metadados e URL segura.
- Permitir anexos por item de checklist, com obrigatoriedade de evidencia quando item estiver nao conforme.
- Criar anexos formais para POP aprovado e versoes assinadas.
- Armazenar PDFs historicos de certificado e medicao como anexos imutaveis.
- Adicionar antivirus/validador de tipo de arquivo antes de aceitar documentos em producao.

## Atualizacao - Etapa 12A executada

Status: concluida no escopo minimo de snapshots operacionais da OS.

Entregas realizadas:

- Ordens de servico passaram a ter `snapshot_dados`, `snapshot_emitido_em` e `snapshot_encerrado_em`.
- OS antigas receberam snapshot legado de emissao para evitar registros vazios.
- Geracao de OS a partir de agendamento passou a gravar snapshot de emissao com cliente, contrato, servico, POP ativo, tecnico, operacao e empresa.
- Encerramento de OS passou a gravar snapshot de encerramento com checklist respondido e evidencias estruturadas.
- Impressao da OS passou a preferir dados do snapshot de servico/POP quando disponivel, mantendo fallback para cadastros atuais em OS antigas.

Backlog remanescente da Etapa 12A:

- Criar painel visual para comparar snapshot da OS com o cadastro atual e destacar divergencias.
- Persistir tambem o HTML/PDF final da OS como anexo imutavel.
- Incluir assinatura digital/coleta de assinatura no snapshot de encerramento.
- Criar rotina para enriquecer snapshots legados com dados completos de POP, empresa e contrato quando possivel.
- Aplicar conceito semelhante de snapshot final em todos os documentos financeiros e comerciais.

## Atualizacao - Etapa 13A executada

Status: concluida no escopo minimo de documentos historicos imutaveis.

Entregas realizadas:

- Anexos passaram a ter `hash_sha256` e flag `imutavel`.
- Fluxo de encerramento de OS passou a salvar documento historico HTML imutavel com hash.
- Fluxo de emissao de certificado passou a salvar documento historico HTML imutavel com hash.
- Fluxo de geracao de medicao passou a salvar documento historico HTML imutavel com hash.
- Visualizacao da OS passou a separar fotos de documentos historicos e mostrar hash parcial dos documentos imutaveis.
- Estrutura ficou preparada para substituir o HTML historico por PDF binario server-side mantendo os mesmos metadados e vinculos.

Backlog remanescente da Etapa 13A:

- Implementar geracao real de PDF no backend para OS, certificado e medicao.
- Criar rota segura de download/visualizacao dos documentos historicos.
- Criar tela de auditoria para conferir hash, data, usuario e versao do documento.
- Impedir alteracao/delecao de anexos marcados como imutaveis, exceto por rotina administrativa auditada.
- Versionar templates de documentos para rastrear qual layout gerou cada historico.

## Atualizacao - Etapa 14A executada

Status: concluida no escopo minimo de download/visualizacao segura de anexos historicos.

Entregas realizadas:

- Bootstrap passou a omitir o conteudo de anexos nao-imagem, mantendo somente metadados e `downloadUrl`.
- Criada rota autenticada `/api/attachments/:id/download` para abrir ou baixar anexos.
- A rota valida permissao conforme o tipo de entidade vinculada ao anexo: OS, certificado, medicao, POP, cliente ou contrato.
- Download/visualizacao retorna `Content-Type`, `Content-Disposition`, tamanho e header de hash SHA-256 quando existir.
- Tela de OS passou a ter botoes para abrir e baixar documentos historicos imutaveis.

Backlog remanescente da Etapa 14A:

- Criar uma tela central de anexos/auditoria por cliente, OS, certificado e medicao.
- Adicionar assinatura de URL temporaria quando o armazenamento sair do banco para storage externo.
- Implementar preview integrado em modal para PDF/HTML sem abrir nova aba.
- Criar endpoint administrativo auditado para revogar/substituir anexos quando permitido.
- Reduzir tambem o payload de imagens usando thumbnails ou URLs assinadas.

## Atualizacao - Etapa 15A executada

Status: concluida no escopo minimo de auditoria visual central de anexos.

Entregas realizadas:

- Bootstrap passou a expor um inventario global de anexos com metadados, sem carregar conteudo base64 de documentos.
- Criada tela operacional `Auditoria de Anexos` com indicadores de total de anexos, arquivos imutaveis, documentos historicos e fotos.
- Tela de auditoria passou a filtrar por busca livre, entidade vinculada, categoria e imutabilidade.
- Listagem mostra nome do arquivo, origem, categoria, tamanho, tipo MIME, data/hora em formato brasileiro e hash SHA-256 parcial.
- Acoes de abrir e baixar usam a rota segura `/api/attachments/:id/download`, respeitando autenticacao e permissao por entidade.
- Menu lateral operacional passou a incluir acesso direto a auditoria para usuarios com permissao de OS.

Backlog remanescente da Etapa 15A:

- Criar tela de detalhes do anexo com metadados completos, usuario de criacao e linha do tempo.
- Adicionar comparacao visual de hash/documento para conferencia antifraude mais forte.
- Implementar preview integrado em modal para PDF/HTML e imagens, sem abrir nova aba.
- Registrar eventos de visualizacao/download em tabela de auditoria.
- Adicionar filtros por cliente, contrato, numero de OS, numero de certificado e numero de medicao.
- Evoluir para storage externo com thumbnails e URLs temporarias assinadas.

## Atualizacao - Etapa 16A executada

Status: concluida no escopo minimo de eventos de auditoria operacional.

Entregas realizadas:

- Reaproveitada a tabela `audit_logs` da fundacao SaaS para registrar eventos reais da aplicacao.
- Criado endpoint protegido `/api/audit-logs` com filtros por busca, entidade, acao e limite de resultados.
- Criada tela administrativa `Eventos de Auditoria`, protegida por `auditoria.view`.
- Menu lateral passou a exibir `Eventos de Auditoria` para perfis autorizados.
- Downloads e visualizacoes de anexos passaram a registrar usuario, IP, user-agent, entidade vinculada, categoria e hash quando houver.
- Logout passou a registrar evento de sessao; login e troca/reset de senha ja eram registrados e agora ficam visiveis na tela.
- Fluxos operacionais principais passaram a registrar eventos: criar/editar agendamento, gerar OS, editar OS, encerrar OS, gerar certificado, gerar/cancelar medicao e confirmar/dispensar recorrencia.
- Criada migration `012_operational_audit_events.sql` com indices e reforco da permissao `auditoria.view`.

Backlog remanescente da Etapa 16A:

- Registrar eventos de clientes, servicos, contratos, configuracoes e POPs com antes/depois detalhado.
- Criar exportacao CSV/PDF da auditoria para evidencias de compliance.
- Adicionar filtros avancados por periodo, usuario, IP, cliente, contrato e numero de documento.
- Criar tela de detalhe do evento com diff visual entre `dados_antes` e `dados_depois`.
- Definir politica de retencao de logs por tenant e rotina de arquivamento.
- Adicionar alertas para eventos suspeitos: muitas tentativas de login, download em massa, alteracoes fora do horario.

## Atualizacao - Etapa 17A executada

Status: concluida no escopo minimo de auditoria de cadastros comerciais, equipe e configuracoes.

Entregas realizadas:

- Clientes passaram a registrar criacao/edicao com snapshot anterior, resumo e contagem de contatos, locais e equipamentos.
- Servicos e POP ativo passaram a registrar criacao/edicao, incluindo geracao de certificado, recorrencia, versao/codigo do POP e checklist.
- Tecnicos, veiculos e alocacoes semanais passaram a registrar criacao/edicao.
- Configuracoes da empresa e numeracao passaram a registrar alteracoes com antes/depois.
- Propostas/contratos passaram a registrar criacao/edicao e geracao de contrato a partir de proposta.
- Tela `Eventos de Auditoria` recebeu rotulos amigaveis para os novos tipos de entidade e acao.

Backlog remanescente da Etapa 17A:

- Criar diff visual detalhado para comparar antes/depois de cadastros complexos.
- Normalizar snapshots de auditoria para remover campos irrelevantes e reduzir tamanho dos logs.
- Auditar exclusoes/inativacoes quando forem criados endpoints dedicados.
- Adicionar filtros por periodo, cliente, contrato, servico e usuario diretamente na tela.
- Implementar exportacao da trilha de auditoria para CSV/PDF.

## Atualizacao - Etapa 18A executada

Status: concluida no escopo minimo de investigacao visual dos eventos de auditoria.

Entregas realizadas:

- Endpoint `/api/audit-logs` passou a aceitar filtros por periodo, usuario/e-mail, IP e ID da entidade.
- Tela `Eventos de Auditoria` passou a ter filtros avancados em duas linhas, incluindo periodo, usuario, entidade, IP e limite de resultados.
- Adicionado botao para limpar filtros e recarregar a trilha padrao.
- Cada evento passou a ter acao `Ver`, abrindo detalhe em modal.
- Modal exibe metadados do evento, resumo, origem, user-agent e JSON de `antes`/`depois` lado a lado.
- Quando existe antes/depois, a tela destaca as chaves alteradas para acelerar investigacao.

Backlog remanescente da Etapa 18A:

- Melhorar o diff visual para tipos complexos com expansao por item/campo aninhado.
- Criar filtros especificos por cliente, contrato, servico, numero de OS, certificado e medicao usando relacionamentos.
- Adicionar exportacao PDF dos eventos filtrados.
- Evoluir de ultimo filtro salvo para presets nomeados por administrador.
- Criar painel de eventos suspeitos e alertas operacionais.

## Atualizacao - Etapa 19A executada

Status: concluida no escopo minimo de melhorias pequenas agrupadas da auditoria.

Entregas realizadas:

- Tela `Eventos de Auditoria` passou a exportar os resultados filtrados em CSV.
- CSV usa separador `;` e BOM UTF-8 para abrir corretamente em planilhas com acentos.
- Exportacao inclui ID, data, hora, usuario, e-mail, acao, entidade, entidade ID, resumo, IP e user-agent.
- A tela passou a salvar automaticamente o ultimo conjunto de filtros no navegador.
- Botao `Limpar` agora tambem remove os filtros salvos e restaura a consulta padrao.

Backlog remanescente da Etapa 19A:

- Implementar exportacao PDF dos eventos filtrados.
- Criar presets nomeados de filtros para administradores.
- Adicionar exportacao CSV server-side quando o volume de logs crescer alem do limite carregado na tela.

## Atualizacao - Etapa 20A executada

Status: concluida no escopo minimo de diff visual amigavel de auditoria.

Entregas realizadas:

- Modal de detalhes dos eventos passou a mostrar uma tabela `Diferenças identificadas`.
- A tabela compara campo, valor anterior e novo valor lado a lado.
- Valores booleanos agora aparecem como `Sim`/`Não`.
- Listas e objetos grandes passam a ser resumidos para reduzir ruido visual.
- O JSON completo de antes/depois continua disponivel abaixo da tabela para investigacao profunda.

Backlog remanescente da Etapa 20A:

- Expandir objetos/listas aninhados no diff com navegacao por campo.
- Permitir configurar por tenant quais campos devem ser considerados criticos.
- Avaliar politica de compliance para eventos de copia/exportacao e tempo de retencao.

## Atualizacao - Etapa 21A executada

Status: concluida no escopo minimo de apoio a evidencias no diff de auditoria.

Entregas realizadas:

- Campos criticos no diff passaram a receber destaque visual.
- A classificacao inicial considera nomes relacionados a status, permissao, valor, validade, quantidade, hash, senha, certificado, medicao, contrato e ativo.
- Cada linha do diff ganhou botao `Copiar`.
- A copia inclui campo, valor anterior e novo valor em texto simples, facilitando envio para suporte/evidencia.

Backlog remanescente da Etapa 21A:

- Permitir configurar campos criticos por tenant.
- Avaliar se copia/exportacao de evidencia deve exigir justificativa do usuario.

## Atualizacao - Etapa 22A executada

Status: concluida no escopo minimo de pacote seguro para reduzir backlog de auditoria.

Entregas realizadas:

- Criado endpoint protegido `/api/audit-logs/evidence` para registrar copia/exportacao de evidencias de auditoria.
- Exportacao CSV da auditoria passou a registrar evento `audit_evidence_exported`.
- Copia de linha do diff passou a registrar evento `audit_evidence_copied`.
- Modal passou a ter botao `Copiar diff completo`.
- Copia completa inclui evento, acao, entidade, usuario, data, resumo e todos os campos alterados.
- Copia completa tambem registra evento `audit_evidence_copied`.

Backlog remanescente da Etapa 22A:

- Adicionar justificativa obrigatoria para exportacoes/copias quando compliance exigir.
- Evoluir painel de eventos suspeitos para regras configuraveis por tenant, historico server-side e alertas.

## Atualizacao - Etapa 23A executada

Status: concluida no escopo minimo de painel inicial de eventos suspeitos.

Entregas realizadas:

- Tela `Eventos de Auditoria` passou a exibir um painel de eventos suspeitos acima da trilha detalhada.
- Painel analisa o recorte carregado de forma read-only, sem alterar dados e sem criar bloqueios automaticos.
- Regras iniciais identificam volume de copia/exportacao de evidencias, copias recorrentes, exportacoes recorrentes, acoes administrativas sensiveis, campos criticos alterados, acoes sensiveis fora do horario comercial e alto volume vindo do mesmo IP.
- Achados recebem severidade visual `Alta`, `Media` ou `Baixa`.
- Achados com filtro direto permitem acionar `Revisar`, reaproveitando os filtros existentes de acao, entidade e IP.
- Acoes de evidencia ganharam rotulo amigavel na tabela de auditoria.

Backlog remanescente da Etapa 23A:

- Tornar limiares e regras do painel configuraveis por tenant.
- Persistir achados relevantes server-side quando for necessario gerar historico de investigacao.
- Criar alertas/notificacoes para eventos realmente criticos apos validacao das regras em homologacao.

## Atualizacao - Etapa 24A executada

Status: concluida no escopo minimo de filtros rapidos e presets locais de auditoria.

Entregas realizadas:

- Tela `Eventos de Auditoria` ganhou atalhos de investigacao para OS, certificados, medicoes, clientes, evidencias e usuarios.
- Atalhos reutilizam os filtros ja existentes e nao exigem alteracao no banco.
- Adicionado recurso de presets locais de filtro para salvar combinacoes usadas com frequencia na estacao de trabalho.
- Presets podem ser aplicados ou removidos diretamente na tela.
- A tela continua usando a permissao `auditoria.view` e nao cria novas acoes sensiveis.

Backlog remanescente da Etapa 24A:

- Avaliar presets compartilhados por tenant/perfil quando houver necessidade operacional.
- Criar filtros server-side mais especificos para cliente, contrato, servico, numero de OS, certificado e medicao quando o volume de logs crescer.

## Atualizacao - Etapa 25A executada

Status: concluida no escopo minimo de code splitting por rota.

Entregas realizadas:

- Paginas principais passaram a ser carregadas sob demanda com `React.lazy`.
- Rotas foram envolvidas com `Suspense` e fallback visual simples de carregamento de modulo.
- Layouts, autenticacao e protecao de rotas permaneceram no fluxo principal para reduzir risco de regressao.
- Build passou a gerar chunks separados por modulo/tela.
- Aviso de chunk principal acima de 500 kB deixou de ocorrer no build local.

Backlog remanescente da Etapa 25A:

- Avaliar manual chunks para bibliotecas pesadas caso novas telas voltem a aumentar o bundle inicial.
- Expandir testes automatizados para fluxos criticos completos de agendamento, OS, certificado e medicao.

## Atualizacao - Etapa 26A executada

Status: concluida no escopo minimo de smoke tests automatizados de rotas.

Entregas realizadas:

- Substituido teste generico de exemplo por smoke tests reais do `App`.
- Criado teste para rota publica de login.
- Criado teste para redirecionamento de rota protegida sem sessao.
- Criado teste para dashboard autenticado com bootstrap mockado.
- Testes usam mock local de `fetch`, evitando dependencia de VPS, banco ou dados de homologacao.
- Suite `npm test` passou com 3 testes.

Backlog remanescente da Etapa 26A:

- Expandir smoke tests para mais rotas secundarias, formularios e estados de erro.
- Criar testes de fluxo completo para agendamento, OS, encerramento, certificado e medicao.
- Avaliar Playwright/E2E contra ambiente de homologacao em rotina separada.

## Atualizacao - Etapa 27A executada

Status: concluida no escopo agrupado de auditoria visual e ampliacao da rede de testes.

Entregas realizadas:

- Diff da tela `Eventos de Auditoria` passou a comparar campos aninhados em snapshots JSON.
- Campos aninhados sao exibidos com caminho estruturado, como `cliente.endereco.cidade` e `itens[0].quantidade`.
- Comparacao usa limite de profundidade para evitar travamentos com snapshots grandes.
- Valores de listas e objetos passaram a ser resumidos de forma mais legivel.
- A copia de linha e copia completa do diff continuam funcionando com os novos caminhos aninhados.
- Smoke tests foram ampliados de 3 para 8 testes.
- Rotas autenticadas adicionais cobertas: `/agendar`, `/ordens`, `/auditoria-eventos`, `/comercial/clientes` e `/comercial/servicos`.
- Assercoes passaram a usar `heading`, evitando falsos negativos por textos duplicados no menu e breadcrumbs.

Backlog remanescente da Etapa 27A:

- Criar visualizador expansivel para objetos/listas muito grandes dentro do modal de auditoria.
- Expandir testes para formularios, estados de erro e permissoes negadas.
- Criar testes de fluxo completo para agendamento, OS, encerramento, certificado e medicao.

## Atualizacao - Etapa 28A executada

Status: concluida no escopo agrupado de compliance leve para evidencias de auditoria.

Entregas realizadas:

- Exportacao CSV de auditoria passou a exigir justificativa antes de gerar o arquivo.
- Copia de linha do diff e copia do diff completo passaram a exigir justificativa antes de copiar evidencias.
- Endpoint `/api/audit-logs/evidence` passou a persistir a justificativa informada no snapshot do evento.
- Tela `Eventos de Auditoria` ganhou exportacao PDF simples usando a impressao do navegador.
- Exportacao PDF tambem registra evento `audit_evidence_exported` com formato `pdf`, filtros aplicados e justificativa.
- Eventos de inativacao/bloqueio de usuarios passaram a ser classificados como `user_inactivated`.
- Inativacao de clientes, servicos, tecnicos e veiculos passou a gerar acoes especificas na auditoria.
- Labels amigaveis foram adicionados para os novos eventos de inativacao.

Backlog remanescente da Etapa 28A:

- Criar PDF server-side/assinado para auditoria quando houver exigencia formal de validade documental.
- Auditar exclusoes fisicas e remocoes de itens filhos em cadastros compostos, sem gerar ruido excessivo.
- Evoluir a justificativa obrigatoria para politica configuravel por tenant/perfil quando houver multiempresa em producao.

## Backlog - Rebranding para Atenza FieldOps

Status: pendente para execucao planejada, pois envolve alteracoes amplas de identidade, documentacao, deploy e estrutura local.

Nome definido do sistema:

- Atenza FieldOps

Subtitulo institucional:

- Gestao de servicos tecnicos, equipes de campo, OS, evidencias, certificados e medicoes.

Chamada principal sugerida:

- Atenza FieldOps
- Do contrato ao campo. Do campo ao certificado.

Escopo previsto:

- Alterar nome visivel do sistema em login, layout operacional, layout comercial, cabecalhos, rodapes, badges e metadados.
- Atualizar documentacao funcional, tecnica, mensagens para cliente/equipe e referencias de projeto.
- Revisar PDFs, certificados, OS, medicoes e telas de validacao para manter a nova identidade sem afetar a marca do cliente final quando aplicavel.
- Atualizar variaveis, nomes de pacote, titulos HTML, manifestos, Docker/deploy e textos internos que ainda apontem para o nome antigo.
- Renomear a pasta local do projeto de forma planejada, atualizando workspace, scripts, atalhos e referencias para evitar quebra de ambiente.
- Manter rastreabilidade da mudanca em uma etapa propria, com testes de smoke, build e publicacao na VPS de homologacao.

## Atualizacao - Diagnostico Atenza de prontidao para testes

Data: 2026-07-06

Status: diagnostico executado antes de novas alteracoes funcionais, seguindo o prompt mestre e os padroes Atenza.

Identidade confirmada:

- Nome atual do projeto: Ciperprag Hub, com rebranding planejado para Atenza FieldOps.
- Cliente atual: Ciperprag.
- Pasta local: `C:\Projetos\Atenza\ciperprag_hub`.
- Tipo: projeto existente/em andamento com documentacao parcial.
- Ambiente analisado: homologacao.
- Anexos e referencias usados no historico pertencem ao fluxo Ciperprag/Atenza FieldOps de OS, certificados, medicoes, POPs, proposta e contrato.

Validacoes executadas:

- Leitura do prompt mestre Atenza e padroes de projeto existente.
- Leitura de `README.md`, documentacao completa e backlog existente.
- Verificacao da estrutura documental exigida pelos padroes Atenza.
- Verificacao da API publicada na VPS de homologacao.
- Healthcheck da API retornou sucesso.
- Login administrativo validado.
- Bootstrap retornou dados reais do banco de homologacao.
- Rotas principais retornaram HTTP 200: login, dashboard, agendar, ordens, certificados, medicao, equipes, comercial/clientes, comercial/servicos, comercial/contratos, comercial/configuracoes e validacao de certificado.
- `npm test -- --run` passou com 8 testes.
- `npm run lint` passou sem erros, mantendo 17 warnings conhecidos.
- `npm run build` passou.

Diagnostico de prontidao:

- O sistema esta apto para testes internos guiados em homologacao.
- O sistema ainda nao esta recomendado para homologacao ampla com cliente final nem para producao.
- Fluxos operacionais principais existem e estao conectados: cadastro, agenda, OS, encerramento, certificados, historico, recorrencia, anexos, auditoria e medicao.
- A experiencia visual evoluiu, mas ainda precisa de polimento em telas comerciais, documentos impressos e estados de fluxo para aumentar aderencia dos usuarios.
- OS e certificado estao mais proximos dos modelos recebidos do que proposta, contrato e medicao.
- Proposta/contrato comercial ainda sao modelos simplificados e nao devem ser considerados aderentes ao padrao documental final da Ciperprag.
- Integracao comercial-operacional ainda e parcial: propostas/contratos comerciais ficam em `contratos_templates`, enquanto agenda/OS/medicao usam `contratos`; gerar contrato a partir de proposta ainda nao cria automaticamente o contrato operacional consumido pela agenda.
- Financeiro ainda esta limitado a medicao; nao ha NF, faturamento, contas a receber, status financeiro ou bloqueios por faturamento.

Pendencias criticas identificadas por prioridade:

1. Corrigir isolamento por tenant em todas as consultas e mutacoes operacionais antes de multiempresa/producao.
2. Remover endpoint duplicado `POST /api/orders/:id/certificado`, mantendo apenas a versao com snapshot, auditoria e anexo historico.
3. Integrar contrato comercial aprovado/vigente com contrato operacional usado por agendamento, OS, baixa e medicao.
4. Atualizar documentacao completa, pois ha trechos desatualizados sobre login, auditoria e medicao persistida.
5. Criar estrutura documental padrao Atenza: `docs/backlog`, `docs/cliente`, `docs/interno`, `docs/evidencias`, `docs/versoes`, `docs/releases` e `docs/validados`.
6. Rebranding completo para Atenza FieldOps, incluindo pasta local, metadados, UI, docs, Docker/deploy e textos internos.
7. Revisar proposta e contrato para aproximar o layout, linguagem e campos do modelo real da Ciperprag.
8. Gerar PDFs server-side reais e imutaveis para OS, certificado, medicao, proposta e contrato.
9. Finalizar aderencia da OS ao modelo Ciperprag com campos pendentes: acompanhante, assinaturas, setor/funcao, EPC, FISPQ, treinamentos e textos parametrizados.
10. Finalizar aderencia do certificado ao modelo original com conferencia visual formal e snapshot/hashing forte.
11. Evoluir medicao com selecao manual de itens, motivo de cancelamento, NF, faturamento e status financeiro.
12. Criar roteiro formal de homologacao operacional/comercial quando for iniciar teste com equipe/cliente.
13. Criar checklist de prontidao para producao antes de qualquer Go-Live.
14. Corrigir warnings conhecidos de lint e dependencias de hooks.
15. Implementar testes E2E dos fluxos criticos: comercial -> contrato operacional -> agenda -> OS -> encerramento -> certificado -> medicao -> recorrencia.
16. Validar seguranca: CORS restrito, rate limit, politica de senha, expiração/renovacao de sessao, scan de secrets/dependencias e backup testado.
17. Evoluir storage de anexos/fotos para armazenamento externo ou filesystem controlado, com URLs seguras.
18. Criar painel administrativo Atenza para tenants, planos, pagamentos, inadimplencia, bloqueios e governanca SaaS.

Backlog por ordem de importancia apos diagnostico:

- P0 - Segurança/dados: isolamento por tenant em todos os endpoints e consultas.
- P0 - Bug tecnico: remover rota duplicada de certificado.
- P0 - Integracao de negocio: transformar contrato comercial vigente em contrato operacional.
- P0 - Documentacao: reconciliar documentacao completa com estado atual real do sistema.
- P1 - Documentacao Atenza: criar estrutura `docs/*` padrao e versionar releases/evidencias.
- P1 - Rebranding: Atenza FieldOps em UI, docs, pacote, deploy e pasta local.
- P1 - Documentos Ciperprag: revisar proposta, contrato, OS, certificado e medicao contra modelos originais.
- P1 - PDFs server-side: documentos imutaveis, assinados/hashados e anexados.
- P1 - E2E: fluxo completo comercial-operacional-financeiro.
- P2 - UX: polir telas comerciais, medicao, empty states, confirmacoes e guias de fluxo.
- P2 - Financeiro: NF, faturamento, status financeiro e bloqueios.
- P2 - POP/anexos: historico de versoes, aprovacao formal e anexos assinados.
- P2 - Auditoria: filtros server-side, retencao, alertas e politicas por tenant.
- P3 - Sustentacao: observabilidade, backup/restauracao testada e rotina de release.
- P3 - SaaS Atenza: painel dono do SaaS, planos, pagamentos e bloqueios.
