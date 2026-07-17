# Roadmap por Etapas - Atenza FieldOps

Este arquivo e o mapa canonico do backlog. Nenhum item deve ficar solto fora das etapas abaixo.

## Resumo atual

- Versao de homologacao: `0.6.3`.
- Etapa atual: Etapa 7 de 8 em andamento.
- Proxima etapa recomendada: continuar Etapa 8 de 8 em paralelo aos testes da equipe, priorizando infraestrutura de homologacao, branding SaaS e preparacao de producao sem publicar em producao.
- Itens de backlog mapeados apos feedback externo incorporado: 44.
- Itens de backlog remanescentes: 38.
- Itens fora de etapa: 0.
- Feedback externo incorporado: observacoes de teste do estagiario Tarcisio Lucas em 16/07/2026.

## Etapa 1 de 8 - Correcoes P0 de seguranca e consistencia

Status: concluida.

Entregue:

- Isolamento por tenant no nucleo operacional.
- Remocao da rota duplicada de certificado.
- Protecao contra escrita silenciosa em tenant incorreto.
- Migracao `013_tenant_scope_measurements_and_documents.sql`.

## Etapa 2 de 8 - Documentacao Atenza e rebranding base

Status: concluida.

Entregue:

- Estrutura documental `docs/*` no padrao Atenza.
- Nome de produto: Atenza FieldOps.
- Subtitulo: Gestao de servicos tecnicos, equipes de campo, OS, evidencias, certificados e medicoes.
- Chamada: Do contrato ao campo. Do campo ao certificado.
- Versao e ambiente visiveis na interface.
- Release notes e roteiro de homologacao.

## Etapa 3 de 8 - Integracao comercial para operacional

Status: concluida no escopo base.

Entregue:

- Contrato vigente sincroniza contratos operacionais ativos por item de servico.
- Proposta aprovada, ao gerar contrato, cria tambem os contratos operacionais usados pela agenda.
- Contrato operacional recebeu vinculo com template comercial, item, servico do catalogo, numero comercial, vigencia e frequencia.
- Agenda passa a listar contratos operacionais ativos para iniciar o fluxo de OS.
- Tela comercial indica quando o contrato esta integrado ao operacional.

## Etapa 4 de 8 - Aderencia documental Ciperprag

Status: concluida no escopo visual-base.

Entregue:

- Modelos originais de OS, certificado e medicao renderizados em PNG para comparacao visual.
- Impressao de OS, certificado, proposta, contrato e medicao ajustada para homologacao visual.
- Layout moderno da medicao em A4 retrato aprovado para homologacao.
- Proposta e contrato refinados como documentos distintos, formais e parametrizaveis.
- Evidencias visuais geradas em `docs/evidencias`.

## Etapa 5 de 8 - Medicao e acompanhamento financeiro operacional

Status: concluida no escopo base.

Entregue:

- Acompanhamento financeiro operacional em `medicoes`: status financeiro, NF, envio, previsao de pagamento, baixa no ERP, observacao e data de atualizacao.
- API autenticada para atualizar acompanhamento financeiro com auditoria.
- Cancelamento da medicao move o acompanhamento financeiro para `cancelada`.
- Tela de Medicao recebeu kanban/resumo financeiro por status e total.
- Historico de medicoes recebeu filtro por status financeiro e formulario compacto.
- Mantido o escopo correto: o FieldOps acompanha a medicao operacional; o ERP permanece responsavel pelo financeiro formal.

## Etapa 6 de 8 - Documentos historicos, hashes e anexos imutaveis

Status: concluida no escopo de homologacao.

Objetivo fechado:

- Criar base confiavel para rastrear documentos gerados, snapshots, hashes, anexos historicos e download seguro.
- Evitar que documentos operacionais dependam apenas de impressao local do navegador.
- Deixar a arquitetura pronta para PDF server-side binario final na etapa de producao/hardening.

Entregue:

- `evidencias_anexos` centraliza anexos por OS, certificado, medicao, POP, cliente e contrato.
- Anexos possuem `hash_sha256`, `imutavel`, `template_codigo`, `template_versao` e `snapshot_hash_sha256`.
- Download/visualizacao segura de anexos autenticados via `/api/attachments/:id/download`.
- Auditoria de downloads e visualizacoes de anexos.
- Tela de Auditoria de Anexos com filtros, hash parcial, categoria, imutabilidade e download.
- OS, certificado e medicao possuem documentos historicos imutaveis em HTML com hash.
- Validacao publica de certificado exibe metadados de integridade quando houver documento imutavel.
- Certificado tem QR Code com rota publica de validacao.
- Certificado usa configuracao documental por tenant (`empresa_config.certificado_config`), fotos dinamicas da OS e ate 3 imagens.
- Catalogo de servicos passou a suportar produtos detalhados para certificados.
- Proposta e contrato receberam layout formal com dados dinamicos e evidencias em PDF/PNG para aprovacao visual.
- Contrato publicado na VPS com assinaturas posicionadas no rodape quando houver espaco.
- Migrações associadas: `016_document_pdf_snapshot_metadata.sql`, `017_service_detailed_products.sql` e `018_certificate_tenant_config.sql`.

Observacao de fechamento:

- A geracao de PDF binario server-side para todos os documentos nao foi marcada como concluida nesta etapa porque o criterio visual exige renderizacao fiel dos templates aprovados. O backend mantem funcoes de PDF manual desativadas por seguranca visual. Esse trabalho foi realocado para a Etapa 8, junto com hardening, storage e governanca de producao.

## Etapa 7 de 8 - QA, testes E2E e homologacao guiada

Status: em andamento.

Objetivo:

- Validar o produto ponta a ponta com dados reais de homologacao, reduzindo friccao de uso antes de novas evolucoes estruturais.

Entregue ate agora:

- Orientacoes contextuais em pontos estrategicos do fluxo: Dashboard, Comercial, Agendamento, OS, Certificados/Historico e Medicao.
- Comercial passou a reforcar o caminho recomendado: proposta -> aceite -> contrato -> liberacao operacional.
- Botao de contrato direto passou a indicar "Contrato do cliente", deixando claro que e alternativa quando o cliente fornece modelo proprio.
- Contrato direto novo nasce como `vigente`, para sincronizar os itens operacionais quando salvo corretamente.
- Agendamento passou a listar apenas contratos vigentes com saldo operacional positivo para evitar abertura de OS sem saldo.
- Seletor de contrato no agendamento passou a mostrar saldo operacional por item.
- Medicao passou a comunicar explicitamente que acompanha NF, cobranca, pagamento e baixa manual no ERP, sem substituir contas a receber do ERP.
- Roteiro formal de homologacao E2E criado em `docs/cliente/ROTEIRO_HOMOLOGACAO_E2E.md`.
- Guia de homologacao operacional atualizado para refletir proposta, contrato, OS, medicao e ERP.
- Pasta de evidencias da Etapa 7 criada em `docs/evidencias/etapa7_homologacao`.
- Smoke tests ampliados para 11 testes, cobrindo rotas criticas de contratos/propostas, certificados/historico e medicao.
- Ficha de execucao E2E criada para rodada assistida com usuarios em `docs/evidencias/etapa7_homologacao/EXECUCAO_E2E_2026-07-07.md`.
- Auditoria tecnica de dados de homologacao criada via `npm run audit:e2e`, gerando `docs/evidencias/etapa7_homologacao/auditoria-e2e-dados.md`.
- Release note interna criada para a auditoria E2E da Etapa 7.
- Contas de homologacao por perfil operacional documentadas e preparadas por comando interno.
- Smoke tecnico da VPS criado via `npm run homologation:smoke-vps`, validando login, API protegida, bootstrap e certificado publicado.
- Hotfix `0.6.1` aplicado para compatibilizar bootstrap com o schema real de tenants (`nome_fantasia`/`razao_social`).
- Hotfix `0.6.2` aplicado para normalizar produtos detalhados em JSONB na emissao de certificados.
- Hotfix `0.6.3` aplicado para corrigir auditoria do encerramento de OS com certificado automatico.
- E2E tecnico de escrita aprovado na VPS via `npm run homologation:e2e-vps`, cobrindo proposta aprovada, contrato, agendamento, OS, encerramento, certificado, medicao, acompanhamento financeiro operacional e recorrencia.
- Roteiros de homologacao por perfil gerados em DOCX/PDF para Comercial, Operacao, Qualidade e Medicao, com prints de referencia, acessos de teste e orientacao de registro de divergencias.
- Tela de Medicao passou a exibir painel visivel da medicao selecionada, com acoes de imprimir, acompanhar e limpar selecao, evitando acao aparentemente sem retorno visual.
- Dashboard Operacional passou a priorizar contratos criticos e recolher a lista de Contratos em Execucao, reduzindo pagina longa sem esconder o acesso ao total.
- Ajustes de Dashboard e Medicao publicados na VPS de homologacao com imagem `atenza-fieldops:20260717-visual-etapa7`.
- Checagem visual de Dashboard e Medicao aprovada via tunel SSH para a VPS, com prints em `docs/evidencias/etapa7_homologacao/prints_visuais`.
- Login deixou de exibir marca de tenant especifico, mantendo identidade institucional Atenza FieldOps para o SaaS.
- Sidebar passou a usar logo dinamica do tenant sem container branco forcado, com fallback visual adequado para a Ciperprag.
- CI basico criado no GitHub Actions com `npm ci`, lint, testes e build.
- Tela de login removeu o card superior de marca e passou a usar fonte institucional `NeuePower Ultra` no nome Atenza FieldOps.
- Secrets de homologacao preparados no GitHub para deploy manual na VPS: host, usuario, porta e chave SSH.

Backlog da Etapa 7: 7 itens.

- Executar E2E manual e documentado: proposta -> contrato -> contrato operacional -> agenda -> OS -> encerramento -> certificado -> medicao -> recorrencia.
- Validar multi-tenant com tenant generico e tenant Ciperprag, incluindo documentos sem logo.
- Validar numeração automatica de OS, proposta, contrato, certificado e medicao.
- Validar datas, horas, moeda e acentuacao em formato brasileiro.
- Validar anexos, downloads, hashes e documentos historicos na tela de auditoria.
- Validar UX com usuarios: quantidade de cliques, mensagens, estados vazios e confirmacoes.
- Validar OS usando tags/equipamentos cadastrados e registrar melhorias de usabilidade.

## Etapa 8 de 8 - Producao, governanca SaaS e hardening

Status: em andamento para homologacao. Producao ainda nao iniciada.

Objetivo:

- Preparar o Atenza FieldOps para operacao SaaS, com producao separada de homologacao, governanca de tenants, hardening tecnico, PDFs finais e operacao assistida.

Entregue inicialmente em homologacao:

- Workflow manual `deploy-homologation-vps.yml` criado para validar, buildar e publicar imagem Docker na VPS de homologacao com health check e rollback basico.
- Deploy de producao permanece bloqueado/nao configurado ate existirem ambiente, secrets, politica de release e rotina de rollback aprovados.
- Login publico passou a resolver contexto de tenant por URL/subdominio/query string, mantendo login padrao neutro e exibindo discretamente o ambiente do cliente quando aplicavel.
- Login autenticado passou a aceitar `tenantSlug` para evitar ambiguidade de e-mails iguais em tenants diferentes.

Backlog da Etapa 8: 31 itens.

- Separar formalmente ambientes de homologacao e producao, incluindo identidade visual evidente para evitar uso errado. Decisao SaaS: tela de login padrao deve usar Atenza FieldOps e visual institucional Atenza, sem logo de cliente; tela de login com tenant na URL pode exibir discretamente "Ambiente [cliente]" e logo do cliente em menor destaque; apos login, sidebar e documentos usam logo/configuracao do tenant; futuro SaaS deve usar `tenants`/`empresa_config` para `logo_url`, `cor_primaria`, `nome_exibicao`, dominio/subdominio e assets documentais. Decisao tipografica: a fonte padrao da interface sera Sora; para escrever o nome da ferramenta como marca/logo, usar as fontes institucionais da Atenza localizadas em `C:\Projetos\Atenza\site_atenza\public\@font-faces`.
- Implementar PDF server-side binario final de OS, certificado, medicao, proposta e contrato com renderizacao fiel aos templates aprovados.
- Persistir PDF final como anexo imutavel com hash real, snapshot completo e versao do template.
- Criar templates versionados em tabela propria por tenant e por tipo documental.
- Criar historico de versoes de templates/documentos na interface.
- Criar backfill controlado para documentos antigos.
- Implementar storage externo ou filesystem controlado para anexos/documentos, reduzindo base64 no banco.
- Adicionar validacao de arquivo/antivirus antes de aceitar uploads em producao.
- Criar editor visual/guiado de certificado por tenant.
- Persistir imagens documentais por tenant e por usuario responsavel: logo, arte de fundo, selo, assinatura e rodape. A assinatura deve ser parametrizavel por usuario/perfil/tenant, permitindo upload de imagem de assinatura, vinculacao a papeis documentais (ex.: responsavel comercial, responsavel tecnico, emissor da medicao) e uso automatico em proposta, contrato, OS, certificado e medicao quando o documento exigir assinatura.
- Parametrizar clausulas comerciais/juridicas por tenant.
- Criar biblioteca de condicoes comerciais padrao por tenant.
- Parametrizar textos executivos da proposta por tenant e por tipo de servico.
- Implementar assinatura eletronica/digital ou trilha formal de aceite.
- Implementar revogacao/substituicao formal de certificados e documentos.
- Evoluir OS para selecao obrigatoria/guiada de local, tag/equipamento e evidencias por checklist.
- Evoluir POP com historico visual, anexos aprovados, fluxo de aprovacao, assinatura e bloqueio de edicao retroativa.
- Evoluir auditoria com filtros server-side, retencao, alertas e politicas por tenant.
- Corrigir warnings tecnicos conhecidos e executar auditoria de dependencias (`npm audit`) antes de producao.
- Hardening de seguranca: CORS, rate limit, politica de sessao, cookies, headers e backup de credenciais.
- Observabilidade: logs estruturados, monitoramento de uptime, alertas e painel simples de saude.
- Backup/restauracao testada, rotina de release e rollback.
- Automatizar CD para VPS de homologacao/producao via GitHub Actions, com secrets, chave SSH, build de imagem versionada, health check, rollback controlado e registro de release.
- Painel Atenza dono do SaaS para tenants, planos, pagamentos, bloqueios e controle de inadimplencia.
- Evoluir Comercial > Contratos com filtros e ordenacoes por status, integracao operacional, valor crescente e valor decrescente.
- Criar central de relatorios operacionais e comerciais com filtros semanal, mensal e anual, incluindo visitas tecnicas, visitas nao realizadas, reagendamentos, propostas finalizadas, propostas nao finalizadas e geracao de PDF para impressao.
- Criar pesquisa global do sistema, limitada pelas permissoes do usuario, permitindo localizar OS, agendamentos, clientes, contratos, propostas, certificados, telas e funcionalidades, com pre-visualizacao ao digitar.
- Consolidar perfil ADM/administrador do tenant com acesso total as funcionalidades permitidas ao cliente, gestao granular de usuarios, papeis, perfis, permissoes, resets de senha e auditoria de acesso, permitindo que o administrador defina o que cada papel pode fazer. Exemplo Ciperprag: Aline pode atuar como comercial e administradora, acumulando papeis conforme decisao do tenant.
- Criar grupos/equipes de usuarios gerenciados pelo administrador, como grupo comercial ou equipe operacional, permitindo incluir/remover membros, delegar tarefas e organizar responsabilidades.
- Evoluir um unico `/dashboard` adaptativo por perfil/contexto, sem criar telas demais no inicio. O dashboard deve mudar cards, atalhos, alertas e graficos conforme papeis/permissoes do usuario logado, por exemplo comercial, operacao, tecnico, qualidade, medicao, administrador do tenant e administrador Atenza/SaaS.
- Planejar e implementar login com Google como opcao futura de autenticacao SaaS, mantendo login interno por e-mail/senha como base. A integracao deve respeitar tenant, dominio permitido, convite/primeiro acesso, associacao com usuario existente e auditoria de login.

## Itens explicitamente postergados

Todos os itens abaixo estao alocados na Etapa 8:

- SMTP/e-mails transacionais usando remetente padrao da plataforma, preferencialmente `noreply@atenza.digital`, para convite de usuario, reset de senha, confirmacao/solicitacao de alteracao de e-mail e avisos operacionais. Futuramente permitir remetente/domino do tenant quando houver configuracao validada de DNS, SPF, DKIM e DMARC.
- Estoque simples.
- Help center e onboarding guiado.
- Renomear fisicamente a pasta local do projeto.
- Minha conta e politica visual de senha, incluindo visualizar dados do proprio perfil, redefinir senha, solicitar/alterar e-mail com confirmacao por e-mail transacional da Atenza (`noreply@atenza.digital`) conforme politica do tenant e validar permissoes de autogerenciamento.

## Controle de backlog

- Total de itens mapeados apos fechamento da Etapa 6: 35.
- Total de itens remanescentes: 38.
- Etapa 7: 7 itens.
- Etapa 8: 31 itens.
- Itens fora de etapa: 0.
