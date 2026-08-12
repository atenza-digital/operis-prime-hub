# Roadmap por Etapas - Atenza FieldOps

Este arquivo e o mapa canonico do backlog. Nenhum item deve ficar solto fora das etapas abaixo.

## Resumo atual

- Versao de homologacao: `0.6.3`.
- Etapa atual: Etapa 8 de 8, com a Etapa 7 concluida e a Etapa 8 avancando em homologacao nos itens de hardening e governanca SaaS.
- Proxima etapa recomendada: executar a rodada externa completa com a Ciperprag usando o roteiro consolidado, registrar evidencias e corrigir somente reprovacoes ou observacoes confirmadas.
- Itens de backlog mapeados apos feedback externo incorporado: 48.
- Itens de backlog remanescentes: 39.
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

Status: concluida em 21/07/2026.

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
- Smoke tests ampliados para 12 testes, cobrindo rotas criticas de contratos/propostas, certificados/historico, relatorios tecnicos e medicao.
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
- Tela de Medicao foi reforcada para P0.7: modulo identificado como Financeiro, fluxo guiado em cinco passos, previa das OS elegiveis antes da geracao e quantidade/unidade normalizada na impressao.
- Dashboard Operacional passou a priorizar contratos criticos e recolher a lista de Contratos em Execucao, reduzindo pagina longa sem esconder o acesso ao total.
- Ajustes de Dashboard e Medicao publicados na VPS de homologacao com imagem `atenza-fieldops:20260717-visual-etapa7`.
- Checagem visual de Dashboard e Medicao aprovada via tunel SSH para a VPS, com prints em `docs/evidencias/etapa7_homologacao/prints_visuais`.
- Login deixou de exibir marca de tenant especifico, mantendo identidade institucional Atenza FieldOps para o SaaS.
- Sidebar passou a usar logo dinamica do tenant sem container branco forcado, com fallback visual adequado para a Ciperprag.
- CI basico criado no GitHub Actions com `npm ci`, lint, testes e build.
- Tela de login removeu o card superior de marca e passou a usar fonte institucional `NeuePower Ultra` no nome Atenza FieldOps.
- Secrets de homologacao preparados no GitHub para deploy manual na VPS: host, usuario, porta e chave SSH.
- PR de preparacao SaaS/CI-CD integrado na `main` e workflow manual de deploy liberado na branch padrao.
- Deploy manual de homologacao executado com sucesso via GitHub Actions, publicando a imagem `atenza-fieldops:homologacao-main-502c37e` na VPS.
- Smoke tecnico pos-deploy aprovado contra a VPS, com evidencia em `docs/evidencias/etapa7_homologacao/smoke-vps-api.md`.
- Smoke E2E local de P0.3 aprovado contra `http://127.0.0.1:3001`, validando proposta aprovada -> minuta aprovada -> contrato final vigente -> contrato operacional -> agendamento -> OS -> encerramento -> certificado -> medicao -> acompanhamento financeiro operacional -> recorrencia.
- Auditoria E2E atualizada para respeitar o fluxo proposta -> minuta -> contrato final, gerando alertas separados para propostas sem minuta e minutas sem contrato final.
- Evidencia da rodada local registrada em `docs/evidencias/etapa7_homologacao/execucao-tecnica-e2e.md`.
- P0.4 Ordens de Servico iniciada com melhoria de experiencia na tela: exibicao e busca passam a reparar dados legados com caracteres corrompidos, e encerramento/edicao mostram loading e erro amigavel.
- Impressao da OS a partir do agendamento foi unificada no gerador centralizado `printOsDocument`, removendo o HTML legado embutido que poderia gerar documento divergente.
- Edicao da OS recebeu campo de tag/equipamento para corrigir informacao operacional antes do encerramento/certificado.
- Evidencia visual da OS gerada em A4 retrato com 2 paginas: `docs/evidencias/qa_fluxo_visual/os-atual.pdf`, `docs/evidencias/qa_fluxo_visual/os-atual-page-1.png` e `docs/evidencias/qa_fluxo_visual/os-atual-page-2.png`.
- Renderizacao da OS passou a corrigir acentuacao legada em EPIs, procedimentos e observacoes vindas de seeds antigos, mantendo o saneamento definitivo do banco como backlog.
- P0.5 Certificados iniciou validacao visual assistida com evidencias SaaS para Ciperprag com produtos, Ciperprag com ate 3 fotos dinamicas da OS, tenant generico com logo propria e tenant generico sem logo.
- Roteiro especifico de certificados para validacao do Tarcisio gerado em `docs/cliente/ROTEIRO_VALIDACAO_CERTIFICADOS_TARCISIO.docx`, com checklist editavel, acesso de homologacao, criterios esperados e imagens de referencia renderizadas.
- PDF/PNGs auxiliares do roteiro gerados em `docs/cliente/qa_roteiro_certificados`, permitindo conferencia visual antes do envio.
- Familia de certificados refinada sem redesenho visual: rastreabilidade obrigatoria com numero do certificado, OS, data de execucao, validade quando aplicavel, codigo curto e impressao digital SHA-256 abreviada; blocos de produtos, licencas, fotos, assinatura e validade passaram a ser condicionais.
- Snapshot de certificado passou a persistir `snapshotHashSha256` criptografico no momento da emissao, separando identificador legado `HSH` do hash real.
- Validacao publica de certificado teve acentuacao corrigida e passou a exibir SHA-256 do snapshot quando disponivel.
- Evidencias de aceite da familia de certificados geradas com 13 cenarios em `docs/evidencias/certificado_saas` e PDF consolidado em `docs/cliente/certificados_montserrat/certificados-montserrat-validacao-final.pdf`.
- Teste automatizado `scripts/validate-certificate-evidence.py` aprovado com 13/13 cenarios, validando consistencia entre titulo, cliente, servico, OS, QR, codigo publico, SHA-256, blocos condicionais, fonte Montserrat, pagina nao vazia e PDF individual marcado como Tagged.
- P0.6 Relatorios tecnicos iniciado com tela operacional em `/relatorios-tecnicos`, filtros por status/servico/busca e emissao do relatorio a partir da OS, sem expor valores comerciais.
- Relatorio tecnico usa dados dinamicos de tenant, OS, servico, cliente, equipe, veiculo, checklist, fotos, produtos, EPIs e normas; logo e cor primaria documental seguem configuracao do tenant quando existir.
- Evidencia visual de P0.6 gerada em `docs/cliente/relatorios_tecnicos/relatorio-tecnico-ciperprag-amostra.pdf`, com renders `relatorio-tecnico-ciperprag-amostra-render-1.png` e `relatorio-tecnico-ciperprag-amostra-render-2.png`.
- Validacao tecnica do relatorio confirmou PDF A4 retrato com 2 paginas, texto selecionavel, acentuacao correta e PDF marcado como Tagged.
- Bootstrap da aplicacao passou a reparar textos legados com encoding corrompido antes de alimentar Dashboard, Agenda, Equipes e demais telas, preservando hashes, URLs, base64 e chaves de storage. Teste automatizado adicionado para impedir regressao em nomes, servicos, EPIs e anexos.
- Script operacional de saneamento controlado criado via `npm run audit:mojibake-sanitize`, com modo dry-run por padrao e escrita somente com `--apply`, cobrindo campos textuais, arrays e JSON/JSONB por tenant, preservando hashes, URLs, base64, logos e chaves de storage.
- Dados legados de homologacao saneados na VPS para o tenant Ciperprag: 12 registros corrigidos em `ordens_servico.snapshot_dados` e `servico_pops.aplicacao`; dry-run final retornou 0 alteracoes pendentes e `npm run audit:mojibake-data -- --tenant=ciperprag` retornou `findings: 0`.
- Residuos funcionais antigos da homologacao saneados na VPS: propostas aprovadas sem minuta foram encerradas como legado de teste, agendamentos antigos sem OS foram cancelados, OS encerradas receberam snapshot de encerramento, OS antigas sem medicao foram consolidadas em medicoes legadas canceladas e certificados emitidos receberam anexo historico imutavel; dry-run final do saneador retornou 0 acoes pendentes e `npm run audit:e2e -- --tenant=ciperprag` retornou 0 itens para verificar.
- Validacao visual de P0.7 Medicoes executada no ambiente local Docker: script `scripts/render-measurement-evidence.mjs` gera usuario tecnico temporario, cria amostra local `MED-VALIDACAO/2026`, renderiza a tela real de medicao, exporta PDF A4 retrato e registra validacao tecnica em `docs/evidencias/etapa7_homologacao/medicoes/VALIDACAO_MEDICAO_P07.md`.
- Complemento de Medicao aplicado no escopo seguro de homologacao: removido indicador de quantidade total quando ha unidades diferentes, adicionada composicao por unidade, pluralizacao pt-BR sem `item(ns)`, classificacao parcial quando o periodo ainda esta aberto, calculo de linha/total no backend em centavos, bloqueio de duplicidade por `tenant_id + os_id`, status financeiro-operacionais ampliados e responsavel documental priorizado no PDF.
- PDF de medicao de validacao regenerado em A4 retrato com 1 pagina real, assinatura junto ao total geral, rastreabilidade sem pagina orfa, texto selecionavel, `Tagged: yes`, sem `Gerado pelo Atenza FieldOps` e sem usuario de homologacao como responsavel documental.
- Ajustes finais da medicao aplicados: codigo `MED-VALIDACAO/2026` mantido em uma unica linha, cidade/data dinamicas por snapshot/configuracao antes das assinaturas e rodape visivel simplificado para `MED-VALIDACAO/2026 • Revisao 1 • Pagina 1 de 1`, mantendo IDs tecnicos completos fora do documento visual.
- Auditoria inicial de logos/assets documentais criada em `docs/auditorias/auditoria-assets-documentais.md`, com script `scripts/audit-document-assets.mjs`, matriz por familia documental e inspecao estatica dos renderizadores ativos.
- Infraestrutura tipografica documental corrigida para Montserrat local incorporada nos documentos gerados: pesos 400, 500, 600 e 700 sao carregados antes da impressao, codigos/valores usam Montserrat com numeros tabulares e a validacao pos-PDF bloqueia fallbacks como NotoSans, Arial, Roboto, Times, Consolas e Liberation Sans.
- Auditoria final de fontes documentais por lote aprovada para os PDFs representativos de proposta, contrato, OS, certificado, relatorio tecnico e medicao, com relatorio em `docs/evidencias/etapa7_homologacao/auditoria-fontes-documentais.md`.
- Roteiro consolidado de validacao final para Tarcisio atualizado para v1.4 em `docs/cliente/homologacao_roteiros/Roteiro_Validacao_Final_Atenza_FieldOps_Tarcisio_v1.4.docx`, com 13 prints reais, incluindo as duas paginas do relatorio tecnico, resultado esperado por tela e cobertura da administracao ao fluxo completo.
- Roteiro dirigido de revalidacao v1.5 criado em `docs/cliente/homologacao_roteiros/Roteiro_Validacao_Regressao_Atenza_FieldOps_Tarcisio_v1.5.docx`, com texto UTF-8 revisado, prints das telas impactadas, criterios objetivos e teste do QR Code em tela e impressao A4.
- Relatorio executivo de prontidao P0 gerado em `docs/cliente/relatorios_homologacao/Relatorio_Prontidao_P0_Atenza_FieldOps_v1.0.docx`, consolidando status por frente, evidencias, bloqueios para producao e proxima acao sugerida para a homologacao assistida.
- Matriz de triagem de divergencias P0 criada em `docs/cliente/relatorios_homologacao/Matriz_Triagem_Divergencias_Homologacao_P0_v1.0.xlsx`, com abas de resumo, triagem, criterios e referencias para classificar os retornos do Tarcisio/equipe sem deixar itens fora do roadmap.
- Validacao automatizada de anexos concluida no deploy de homologacao: 40 anexos catalogados, 8 amostras baixadas por API, hash SHA-256 e tamanho conferidos, provider identificado e 0 falhas; evidencia gerada em `/app/docs/evidencias/etapa7_homologacao/anexos/VALIDACAO_ANEXOS_HOMOLOGACAO_2026-07-20.md`.
- Auditorias automatizadas de homologacao integradas ao CI/CD e aprovadas no run `29756006104`: E2E de consistencia com 0 itens, isolamento tri-tenant com 0 falhas e 0 alertas, encoding sem achados e smoke publico aprovado.
- Validacao de numeracao automatica aprovada no run `29756006104` para propostas, contratos, OS, certificados, medicoes e contadores por tenant. Duplicidades legadas de `PC-051/2026` e `CT-133/2026` foram saneadas com preservacao de referencias, renumeracao controlada e auditoria das alteracoes.
- Ajustes da rodada de validacao do Tarcisio: fluxo recomendado recebeu cards responsivos sem distorcao; contratos passaram a aparecer do mais recente para o mais antigo; assinatura de proposta/minuta/contrato recebeu bloco indivisivel com altura reservada e quebra controlada; detalhes da agenda destacam equipe e veiculo designados.
- Certificados passaram a persistir a TAG no proprio registro e emitir um certificado por TAG quando a OS possuir varias TAGs, mantendo o hash principal da OS para compatibilidade e exibindo todos os hashes no encerramento.
- QR Code passou a priorizar a origem publica atual ao imprimir e o deploy de homologacao injeta `PUBLIC_APP_URL` no container para evitar links internos ou antigos; a rota publica `/api/certificates/:hash` foi validada localmente com HTTP 200.
- Encerramento de OS passou a redimensionar e comprimir fotos antes do envio, evitando o `HTTP 413` do proxy para imagens originais de celular; erros de payload grande agora recebem orientacao clara no frontend. Evidencia em `docs/releases/2026-07-21_correcao_upload_fotos_os.md`.
- Retorno do Tarcisio na revalidacao v1.5 registrado em `docs/evidencias/etapa7_homologacao/RETORNO_TARCISIO_REGRESSAO_V1.5_2026-07-21.md`: dashboard, contratos, certificados por TAG, consistencia documental e QR Code aprovados; assinatura de nova proposta reprovada e agenda aprovada com ressalva de visualizacao.
- HML-RET-03 recebeu nova correção no bloco de assinaturas da proposta/minuta/contrato: geometria em duas colunas, linha nivelada, altura reservada e teste automatizado de alinhamento. Evidencia em `docs/evidencias/etapa7_homologacao/CORRECAO_ASSINATURA_PROPOSTA_2026-07-21.md`; aguarda nova conferência humana.

Backlog da Etapa 7: 0 itens.

Os itens de validacao listados anteriormente foram cobertos e encerrados pela rodada final aprovada pelo Tarcisio; permanecem apenas como historico rastreavel.

- Revalidar a correção do bug de assinatura ao gerar uma nova proposta e concluir a conferencia do bloco de aceite no PDF.
- Observacao transferida para a Etapa 8: a agenda foi aprovada funcionalmente, mas a visualizacao mensal e anual permanece como melhoria de UX, sem bloquear o encerramento da Etapa 7.

## Etapa 8 de 8 - Producao, governanca SaaS e hardening

Status: em andamento para homologacao. Producao ainda nao iniciada.

Objetivo:

- Preparar o Atenza FieldOps para operacao SaaS, com producao separada de homologacao, governanca de tenants, hardening tecnico, PDFs finais e operacao assistida.

Entregue inicialmente em homologacao:

- Workflow manual `deploy-homologation-vps.yml` criado para validar, buildar e publicar imagem Docker na VPS de homologacao com health check e rollback basico.
- Workflow manual `deploy-homologation-vps.yml` validado pela `main`, com lint, testes, build, upload de imagem, deploy, health check e smoke tecnico aprovados.
- Warnings de hooks em filtros derivados corrigidos em Agenda, OS, Certificados/Historico e Contratos Comerciais.
- ESLint ajustado para manter Fast Refresh ativo no app e evitar falso positivo nos componentes base de UI/contexto compartilhado.
- Deploy de producao permanece bloqueado/nao configurado ate existirem ambiente, secrets, politica de release e rotina de rollback aprovados.
- Login publico passou a resolver contexto de tenant por URL/subdominio/query string, mantendo login padrao neutro e exibindo discretamente o ambiente do cliente quando aplicavel.
- Login autenticado passou a aceitar `tenantSlug` para evitar ambiguidade de e-mails iguais em tenants diferentes.
- Configuracoes passou a expor assets documentais por tenant em campos visuais: logo principal/documental, logo da interface, arte de fundo, selo institucional, assinatura, titulo e subtitulo do certificado, mantendo persistencia em `empresa_config.certificado_config`.
- Checagem visual automatizada passou a capturar tambem a tela de Configuracoes > assets documentais do tenant.
- Tela de login padrao recebeu refinamento visual local: remocao da divisoria vertical, melhor distribuicao entre bloco institucional e formulario, menor sensacao de conteudo colado nas laterais e manutencao do visual SaaS neutro.
- Dashboard recebeu base adaptativa por perfil/permissoes, com saudacao do usuario, badges de contexto, pontos de atencao e atalhos filtrados pelo que o perfil pode executar.
- Validacao local em Docker preparada antes da publicacao em homologacao, usando banco PostgreSQL local e container `atenza-fieldops-local-ux` em porta dedicada.
- Favicon alterado para identidade Atenza e fonte padrao da interface migrada para Nortica, mantendo NeuePower Ultra apenas na marca Atenza FieldOps.
- Navegacao principal reorganizada em Inicio, Comercial, Operacional, Financeiro e Administracao, com menu retratil mais evidente, logo do tenant menor e topbar com saudacao/data/perfil.
- Dashboard compactado com abas (`Agora`, `Contratos`, `Agenda`, `Atalhos`) para reduzir rolagem e separar aprofundamento por contexto.
- Agenda recebeu filtros por mes/semana/todos, ano/mes, busca por cliente e detalhes ao clicar no agendamento.
- Evoluir a agenda para visualizacoes dedicadas mensal e anual, preservando os filtros e o detalhe de equipe/veiculo aprovados na Etapa 7.
- Visões mensal e anual da agenda implementadas com calendário de eventos clicáveis, resumo dos 12 meses e evidências em `docs/evidencias/etapa8_agenda/VALIDACAO_AGENDA_VISAOES_2026-07-21.md`; publicação e smoke em homologação concluídos pelo CI/CD.
- Navegacao principal passou por novo ajuste de nomenclatura para aproximar nomes de menu, titulo da topbar e titulo das telas.
- Tela de Equipes e veiculos passou a priorizar cadastro de tecnicos e veiculos, deixando alocacao semanal como apoio visual secundario ate revisao completa do fluxo de agendamentos.
- Favicon global Atenza reforcado em `index.html` com PNG, ICO, shortcut e apple-touch; CI passou a executar auditoria de branding para impedir retorno de marca fixa de tenant no HTML publico.
- Deploy de homologacao passou a executar smoke obrigatorio dentro da VPS (health, login e favicons) e smoke publico best-effort no dominio oficial, registrando quando o GitHub Actions for bloqueado pelo desafio do Cloudflare.
- Script de auditoria de dados com encoding suspeito criado para localizar padroes de mojibake e caractere de substituicao em campos textuais do tenant antes de qualquer saneamento com escrita.
- Renderizadores ativos de documentos passaram a resolver logo documental por configuracao/snapshot do tenant, sem fallback fixo da Ciperprag: propostas, contratos/minutas, OS, certificados, medicoes e relatorios tecnicos.
- Auditoria de dependencias concluida em duas rodadas controladas: `npm audit fix` reduziu os achados sem `--force`; depois o toolchain foi atualizado para Vite 8.1.5, Vitest 4.1.10 e plugin React SWC 4.3.1; Browserslist/caniuse-lite foi atualizado via `npm update`; `npm audit` completo ficou zerado.
- Fundacao de storage documental por tenant criada: anexos e documentos imutaveis passam a registrar plano R2 deterministico por ambiente/tenant/entidade/categoria/hash, mantendo o banco como provider ativo em homologacao ate existir upload/download real validado.
- Upload e download R2 implementados no backend via API S3 compativel da Cloudflare, com proxy autenticado pela rota de anexos, hash/metadados preservados e fallback automatico para banco caso o ambiente nao tenha credenciais completas ou o envio falhe.
- Rotina controlada de migracao de anexos antigos base64 para R2 criada via `scripts/migrate-attachments-to-r2.mjs` e comando `storage:migrate-r2`, com dry-run por padrao, filtro por tenant/tipo/categoria/limite, bloqueio de `--apply` sem R2 ativo, preservacao de hash/metadados e opcao de manter copia no banco durante rollout assistido.
- Workflow manual `Storage R2 Migration Homologacao` criado para executar dry-run/aplicacao controlada da migracao dentro do container da VPS, reaproveitando os secrets de SSH e exigindo secrets R2 completos antes de permitir `apply`.
- Auditoria tri-tenant de isolamento SaaS criada via `scripts/validate-tri-tenant-isolation.mjs` e comando `saas:tri-tenant`, com validacao somente leitura de `tenant_id`, assets documentais, chaves R2/plano R2, duplicidade de storage entre tenants e vazamento de snapshots/metadados entre Ciperprag, tenants genericos e tenant sem identidade visual. Na primeira rodada em homologacao foi encontrado e saneado um veiculo legado sem `tenant_id`, confirmando a utilidade do auditor antes da matriz completa.
- Preparador de matriz tri-tenant criado via `scripts/prepare-tri-tenant-validation.mjs` e comando `saas:prepare-tri-tenant`, com dry-run por padrao e gravacao somente com `--apply`/`TRI_TENANT_APPLY=true`. O script cria/configura os tenants `empresa-demonstracao` e `tenant-sem-logo`, empresa_config, numeracao e perfis padrao por tenant, sem alterar dados Ciperprag e sem criar usuarios por padrao.
- Matriz tri-tenant completa aplicada e validada na VPS de homologacao: `ciperprag`, `empresa-demonstracao` e `tenant-sem-logo` avaliados com 0 falhas e 0 alertas, confirmando isolamento de `tenant_id`, assets documentais, planos/chaves R2 e snapshots/metadados no escopo atual.
- Preflight de readiness R2 criado via `scripts/audit-r2-readiness.mjs` e comando `storage:r2-readiness`, gerando evidencia de provider ativo, bucket/credenciais, distribuicao atual por provider, pendencias por tipo/categoria, amostra de chaves planejadas e recomendacao objetiva de bloquear ou permitir `apply`.
- Verificador pos-migracao R2 criado via `scripts/verify-r2-migration.mjs` e comando `storage:r2-verify`, validando leitura real de objetos R2, hash SHA-256, tamanho, fallback no banco, distribuicao por provider e recomendacao de ampliar ou bloquear novos lotes.
- Validacao central de anexos criada para uploads de minuta e fotos de OS, bloqueando base64 invalido, MIME divergente, tipos nao permitidos, fotos acima do limite e mais de 3 evidencias no encerramento da OS.
- Validacao por assinatura magica adicionada para anexos aceitos no P0, conferindo PNG, JPEG, PDF, DOC legado e conteiner ZIP de DOCX/ODT antes de persistir uploads.
- Politica tecnica de uploads por familia documental criada, com defaults seguros para `os.foto` e `minuta.documento` e possibilidade de sobrescrita futura por `certificado_config.uploadPolicies` do tenant.
- Workflow manual de migracao R2 reforcado para executar preflight antes da migracao e verificacao pos-migracao depois do lote, garantindo evidencia automatica de readiness, upload, leitura, hash e tamanho.
- Secrets R2 do ambiente GitHub `homologation` configurados com token de menor privilegio restrito ao bucket `atenza-hml-files`; dry-run oficial executado via CI/CD no run `29882003045`, com provider `r2`, readiness `sim`, zero registros avaliados e zero falhas. Evidencia: `docs/evidencias/etapa8_infra_saas/R2_DRY_RUN_CICD_HOMOLOGACAO_2026-07-22.md`.
- Apply piloto R2 executado via CI/CD no run `29882799051` para 5 fotos de OS do tenant Ciperprag, com `keep_database_copy=true`; 5 registros enviados, 5 avaliados na verificacao pos-migracao e 0 falhas de leitura, hash ou tamanho. Evidencia: `docs/evidencias/etapa8_infra_saas/R2_APPLY_PILOTO_HOMOLOGACAO_2026-07-22.md`.
- Tela de Parametros do tenant passou a expor politicas guiadas de upload por familia documental, inicialmente para fotos da OS e arquivo de minuta/contrato do cliente, gravando em `certificado_config.uploadPolicies` e usando os mesmos limites aplicados pelo backend.
- Politicas de upload foram ampliadas para POP aprovado, documentos do cliente, documentos contratuais e documentos historicos gerados, com metadados de seguranca preparando antivirus/quarentena sem bloquear a homologacao.
- Tela de Auditoria de Anexos revisada para exibir acentuacao correta, status de storage, plano R2, politica de upload aplicada, validacao de seguranca e quarentena planejada, dando visibilidade administrativa antes da migracao real de anexos.
- Auditoria de Anexos recebeu painel lateral de detalhes por arquivo, com IDs, origem, politica aplicada, limites, storage ativo/planejado, seguranca, quarentena, hashes, template, metadados brutos e acoes de copiar/abrir/baixar para apoio de suporte e homologacao.
- Validacao automatizada de anexos em homologacao criada, cobrindo login tecnico, bootstrap, visualizacao, download, provedor de armazenamento e conferencia do SHA-256 persistido.
- Deploy oficial pela CI/CD na VPS executado no run `29882972879`, com smoke autenticado da aplicacao aprovado para visualizacao/download dos anexos R2 piloto, hash SHA-256 conferido, auditorias de consistencia/isolation aprovadas e smoke publico aprovado. Evidencia: `docs/evidencias/etapa8_infra_saas/R2_DOWNLOAD_APLICACAO_HOMOLOGACAO_2026-07-22.md`.
- Segundo lote R2 executado pela CI/CD no run `29883935132`: 10 fotos de OS migradas, 10 verificadas no R2 e 0 falhas, mantendo copia no banco. O deploy seguinte no run `29883983839` refez o smoke autenticado da aplicacao com 68 anexos catalogados, 8 amostras e 0 falhas. Evidencia: `docs/evidencias/etapa8_infra_saas/R2_LOTE_2_HOMOLOGACAO_2026-07-22.md`.
- Terceiro lote R2 executado pela CI/CD no run `29884615968`: 20 fotos de OS avaliadas no pos-migracao, provider `r2`, 0 falhas de leitura, hash ou tamanho, mantendo copia no banco.
- Roteiro consolidado de validacao externa v1.6 gerado em `docs/cliente/homologacao_roteiros/Roteiro_Validacao_Completo_Atenza_FieldOps_Ciperprag_v1.6.docx`, cobrindo Administracao, Comercial, Operacional, Qualidade, Relatorios, Medicao, ERP, Recorrencia, isolamento SaaS, R2 e documentos, com prints, usuarios/perfis, criterios esperados e matriz de aceite. Senhas temporarias nao foram gravadas no arquivo por seguranca e devem ser entregues separadamente.
- Corrigido drift de schema identificado pelo smoke: `ensureDatabaseShape` agora garante as colunas comerciais de servicos de templates antes das consultas do bootstrap.
- Saneamento controlado de hashes legados de anexos preparado no CI/CD para homologacao: recalcula somente conteudo local persistido, registra auditoria e mantem o smoke bloqueando divergencias remanescentes.
- Rodada de correcoes para o retorno da validacao v1.6 implementada: endereco da atividade por item comercial, catalogo como origem de nome/unidade, marca-d'agua do certificado com fallback exclusivo do tenant, responsavel configuravel pela emissao da medicao e relatorios ordenados pela data real da OS. Evidencia: `docs/evidencias/etapa9_homologacao/CORRECOES_RETORNO_TARCISIO_V1.6.md`; roteiro de revalidacao: `docs/cliente/homologacao_roteiros/Roteiro_Validacao_Completo_Atenza_FieldOps_Ciperprag_v1.7.docx`.
- Assistente de proposta por PDF implementado como rascunho revisavel: upload validado, leitura estruturada pela API da OpenAI somente no backend, reconciliacao com clientes/servicos ativos do tenant, bloqueio de IDs fora do catalogo, anexacao opcional do PDF de referencia e auditoria sem persistir o conteudo enviado. Secret configurado em homologacao e validacao inicial executada com PDFs reais da Ciperprag. Evidencia: `docs/evidencias/etapa9_homologacao/ASSISTENTE_PROPOSTA_PDF_V1.md`.
- Correcoes do retorno ATZ-01/ATZ-02 implementadas: leitura isolada por solicitacao, cancelamento ao trocar de proposta/arquivo, timeout de 90 segundos no cliente e servidor, cancelamento manual e exibicao separada de valor mensal e valor total estimado pela vigencia. Evidencia: `docs/evidencias/etapa9_homologacao/CORRECOES_RETORNO_TARCISIO_ASSISTENTE_PROPOSTA_2026-08-10.md`. Aguarda revalidacao manual.
- Ajuste solicitado pela Ciperprag implementado por tenant: novos contratos e minutas podem ser desativados sem remover historicos, e a exibicao de valores mensais em contratos passou a ser parametrizavel. A regra tem fallback seguro para `ciperprag`, configuracao administrativa em `empresa_config.commercial_config`, bloqueio no backend e cobertura automatizada. Evidencia: `docs/evidencias/etapa9_homologacao/CONFIGURACAO_COMERCIAL_POR_TENANT_2026-08-12.md`. Aguarda validacao visual de Tarcisio/Aline.
- P0.4 de confidencialidade comercial implementado no bootstrap: usuarios sem `contratos.manage` nao recebem valores unitarios de contratos/propostas; usuarios sem `medicoes.manage` nao recebem totais ou valores de medicao. A filtragem ocorre no backend, com testes automatizados e evidencia em `docs/evidencias/etapa9_homologacao/VISIBILIDADE_VALORES_POR_PERFIL_2026-08-12.md`. Aguarda validacao de perfis na homologacao.
- Auditoria do backlog confirmou que P0.5 de duplicidade de OS em medicao ja estava implementado por transacao e indice unico `tenant_id + os_id` para medicoes ativas; a regra foi formalizada na matriz de negocio e mantida como item coberto por teste.
- P1.3 recebeu mitigacao tecnica para troca de telas autenticadas: o `AppLayout` permanece montado e o carregamento do modulo ocorre em um fallback local com skeleton, evitando substituir a tela inteira durante a navegacao. A validacao visual final permanece na homologacao.
- P1.6 recebeu ciclo formal de certificado: revogacao com motivo, reemissao a partir da OS de origem, vinculo entre certificado substituido e substituto, auditoria e filtro/status no modulo de certificados. A validacao publica continua informando quando o documento foi revogado. Evidencia em `docs/evidencias/etapa9_homologacao/REVOGACAO_REEMISSAO_CERTIFICADOS_2026-08-12.md`; aguarda homologacao externa.

Backlog da Etapa 8: 36 itens.

- Separar formalmente ambientes de homologacao e producao, incluindo identidade visual evidente para evitar uso errado. Decisao SaaS: tela de login padrao deve usar Atenza FieldOps e visual institucional Atenza, sem logo de cliente; tela de login com tenant na URL pode exibir discretamente "Ambiente [cliente]" e logo do cliente em menor destaque; apos login, sidebar e documentos usam logo/configuracao do tenant. Futuro SaaS deve usar `tenants`/`empresa_config` para `logo_url`, `nome_exibicao`, dominio/subdominio e assets documentais. A `cor_primaria` parametrizavel fica restrita aos documentos quando necessario, sem obrigacao de impactar a interface nesta fase. Decisao tipografica: a fonte padrao da interface sera Sora; para escrever o nome da ferramenta como marca/logo, usar as fontes institucionais da Atenza localizadas em `C:\Projetos\Atenza\site_atenza\public\@font-faces`.
- Implementar PDF server-side binario final de OS, certificado, medicao, proposta e contrato com renderizacao fiel aos templates aprovados.
- Persistir PDF final como anexo imutavel com hash real, snapshot completo e versao do template.
- Criar templates versionados em tabela propria por tenant e por tipo documental.
- Criar historico de versoes de templates/documentos na interface.
- Criar backfill controlado para documentos antigos.
- Concluir storage externo R2 para anexos/documentos, reduzindo base64 no banco. A politica de chaves por ambiente/tenant/entidade/hash, o upload real, o download autenticado, a rotina de migracao controlada, o workflow manual com preflight/verificacao, a auditoria automatizada tri-tenant, o preparador de tenants de validacao, o preflight R2, o verificador pos-migracao, os secrets de homologacao, o dry-run oficial, dois lotes controlados e a validacao do download pela aplicacao ja foram implementados e publicados em homologacao; falta ampliar a migracao gradualmente, observar estabilidade e validar backup/rollback antes de remover copias do banco.
- Concluir hardening de upload para producao com varredura antivirus/antimalware, quarentena opcional e inspecao profunda de DOCX/ODT conectadas a provedor externo ou rotina dedicada.
- Criar editor visual/guiado de certificado por tenant.
- Evoluir assets documentais para R2/storage externo controlado, rodape parametrizado e assinatura por usuario/perfil/papel documental. A base visual por tenant ja permite configurar ativos em `certificado_config`, mas a evolucao SaaS deve consolidar a tela "Identidade Visual e Documentos" com `brandIconUrl` (menu recolhido, marca d'agua e usos compactos), `sidebarLogoDarkUrl` (logo para fundo escuro), `documentLogoLightUrl` (logo para documentos em fundo claro), selo/brasao institucional opcional, cor primaria dos documentos, assinatura por responsavel, modo de assinatura por familia documental (`imagem`, `linha`, `ocultar`, `obrigatoria`) e vinculo a papeis documentais como responsavel comercial, responsavel tecnico e emissor da medicao. O uso da assinatura deve ser auditado, versionado e isolado por tenant, com versao/hash dos arquivos no snapshot e teste tri-tenant obrigatorio (Ciperprag, empresa demonstracao e tenant sem identidade visual) para impedir vazamento de logo, selo, assinatura, cor ou dados entre tenants.
- Parametrizar clausulas comerciais/juridicas por tenant.
- Parametrizar integralmente os blocos contratuais por tenant e versao documental, incluindo dados da empresa, clausulas, condicoes comerciais, local e periodicidade, vigencia, reajuste, rescisao, responsabilidades, aceite, observacoes, anexos e textos legais, evitando contrato/minuta/proposta engessados no frontend.
- Criar biblioteca de condicoes comerciais padrao por tenant.
- Parametrizar textos executivos da proposta por tenant e por tipo de servico.
- Implementar assinatura eletronica/digital ou trilha formal de aceite.
- Concluir hardening de medicao para producao: PDF server-side imutavel em R2 por ambiente/tenant, revisao/substituicao formal com vinculo historico e motivo, snapshot definitivo com cidade/data/responsavel/condicoes de contrato, separacao ou subtotal de contratos com condicoes incompatíveis, protecao contra duplicidade em nivel de item/saldo executado, permissões granulares no backend para valores e acoes financeiras, e matriz automatizada com 1, 5, 15, 30 e 100 itens validando paginacao, cabecalho repetido, total somente na ultima pagina e assinatura sem orfandade.
- Evoluir OS para selecao obrigatoria/guiada de local, tag/equipamento e evidencias por checklist.
- Evoluir POP com historico visual, anexos aprovados, fluxo de aprovacao, assinatura e bloqueio de edicao retroativa. Incluir descricoes curtas e acessiveis para usuarios nao tecnicos explicando POP, EPIs, normas, checklist e campos tecnicos; permitir upload de POP em PDF/DOCX/imagem para clientes que ja possuem documentos prontos e querem apenas controlar versoes/anexos pelo sistema, sem obrigar cadastro estruturado completo no primeiro uso.
- Evoluir auditoria com filtros server-side, retencao, alertas e politicas por tenant.
- Hardening de seguranca: CORS, rate limit, politica de sessao, cookies, headers e backup de credenciais.
- Observabilidade: logs estruturados, monitoramento de uptime, alertas e painel simples de saude.
- Backup/restauracao testada, rotina de release e rollback.
- Evoluir CD para producao via GitHub Actions, com ambiente separado, secrets proprios, aprovacao de release, imagem versionada, health check, rollback controlado e registro de release.
- Painel Atenza dono do SaaS para tenants, planos, pagamentos, bloqueios e controle de inadimplencia.
- Evoluir Comercial > Contratos com filtros e ordenacoes por status, integracao operacional, valor crescente e valor decrescente.
- Criar central de relatorios operacionais e comerciais com filtros semanal, mensal e anual, incluindo visitas tecnicas, visitas nao realizadas, reagendamentos, propostas finalizadas, propostas nao finalizadas e geracao de PDF para impressao.
- Criar pesquisa global do sistema, limitada pelas permissoes do usuario, permitindo localizar OS, agendamentos, clientes, contratos, propostas, certificados, telas e funcionalidades, com pre-visualizacao ao digitar.
- Consolidar perfil ADM/administrador do tenant com acesso total as funcionalidades permitidas ao cliente, gestao granular de usuarios, papeis, perfis, permissoes, resets de senha e auditoria de acesso, permitindo que o administrador defina o que cada papel pode fazer. Exemplo Ciperprag: Aline pode atuar como comercial e administradora, acumulando papeis conforme decisao do tenant.
- Criar grupos/equipes de usuarios gerenciados pelo administrador, como grupo comercial ou equipe operacional, permitindo incluir/remover membros, delegar tarefas e organizar responsabilidades.
- Aprofundar o `/dashboard` adaptativo por perfil/contexto com graficos, estados vazios especificos, indicadores por tecnico/equipe e visao do administrador Atenza/SaaS. A base de cards, atalhos e alertas por permissao ja foi iniciada.
- Planejar e implementar login com Google como opcao futura de autenticacao SaaS, mantendo login interno por e-mail/senha como base. A integracao deve respeitar tenant, dominio permitido, convite/primeiro acesso, associacao com usuario existente e auditoria de login.
- Implementar matriz visual de permissoes por modulo, permitindo que o administrador do tenant marque o que cada papel pode executar em Comercial, Operacional e Financeiro. Padrao sugerido: Comercial cuida de clientes, catalogo de produtos/servicos, propostas, contratos e parametros comerciais; Operacional cuida de agenda, OS, equipes, evidencias, tags/equipamentos, certificados e historico operacional sem visualizar valores comerciais/negociacao; Financeiro cuida de medicoes, envio de NF, acompanhamento de cobranca, pagamento e baixa manual no ERP, sem substituir contas a receber do ERP.
- Executar auditoria UI/UX formal por fluxo e perfil, medindo quantidade de cliques, clareza de estados vazios, hierarquia de menus, acentuacao, responsividade, contraste, risco de confusao entre modulos e complexidade percebida por usuarios da Ciperprag.
- Evoluir a identidade visual com uso leve e intencional de glassmorphism/morphism em areas de orientacao, cards de contexto e estados vazios, sem prejudicar contraste, leitura ou performance. Incluir botao dedicado para alternar modo claro/escuro, com preferencia persistida por usuario/dispositivo e sem misturar esse controle com a parametrizacao documental do tenant.
- Revisar aproveitamento de espaco de tela e responsividade em todos os modulos, reduzindo areas vazias, excesso de altura, rolagens desnecessarias e melhorando comportamento em notebook, desktop grande, tablet e mobile.
- Revisar os cards do bloco "Fluxo recomendado" no Dashboard, corrigindo distorcao visual, alinhamento dos indicadores numericos, largura dos cards, quebra de texto e responsividade em telas menores.
- Revisar todos os fluxos de abertura de telas, dialogs, drawers e modais para eliminar sensacao de tela criada por cima de outra, padronizando quando usar pagina, modal, drawer lateral, wizard ou painel contextual.
- Reorganizar a arquitetura de informacao por modulo Comercial, Operacional e Financeiro, garantindo que cada tela tenha um objetivo claro, nomes consistentes, caminho de volta evidente e separacao correta de informacoes sensiveis como valores comerciais.
- Avaliar se a alocacao semanal deve permanecer em Equipes e veiculos como apoio visual ou migrar/integrar ao modulo Agendamentos, ja que a programacao operacional principal deve nascer no fluxo de agendamento.
- Validar em navegador real apos deploy que o favicon Atenza substituiu caches antigos do Chrome; se necessario, documentar instrucao de limpeza de favicon/cache ou aplicar estrategia de asset versionado para cache busting.

## Gate final de aceite externo da Etapa 8

Antes de encerrar a Etapa 8, o Tarcisio deve conduzir uma rodada completa com usuarios da Ciperprag, usando o roteiro consolidado de homologacao e registrando evidencias no documento de teste. A rodada deve cobrir:

- Administracao: login, usuarios, papeis, permissoes, identidade visual e numeracao.
- Comercial: clientes, catalogo de servicos, proposta, minuta e contrato.
- Operacional: agenda, equipe/veiculo, OS, encerramento, fotos, tags, certificados e historico.
- Financeiro operacional: medicao, status de envio de NF, acompanhamento de pagamento e baixa manual no ERP.
- Documentos: proposta, minuta/contrato, OS, certificado, relatorio e medicao, incluindo logo parametrizada, acentuacao, paginacao e leitura dos PDFs.
- Isolamento SaaS: tenant Ciperprag, tenant demonstracao e tenant sem logo, sem vazamento de dados ou assets.

O aceite externo deve classificar cada item como aprovado, aprovado com observacao, reprovado ou nao testado. Itens reprovados bloqueiam o encerramento; observacoes sem impacto no aceite permanecem vinculadas ao backlog da Etapa 8.

## Itens explicitamente postergados

Todos os itens abaixo estao alocados na Etapa 8:

- SMTP/e-mails transacionais usando remetente padrao da plataforma, preferencialmente `noreply@atenza.digital`, para convite de usuario, reset de senha, confirmacao/solicitacao de alteracao de e-mail e avisos operacionais. Futuramente permitir remetente/domino do tenant quando houver configuracao validada de DNS, SPF, DKIM e DMARC.
- Estoque simples.
- Help center e onboarding guiado.
- Renomear fisicamente a pasta local do projeto.
- Minha conta e politica visual de senha, incluindo visualizar dados do proprio perfil, redefinir senha, solicitar/alterar e-mail com confirmacao por e-mail transacional da Atenza (`noreply@atenza.digital`) conforme politica do tenant e validar permissoes de autogerenciamento.

## Controle de backlog

- Total de itens mapeados apos atualizacao de UI/UX, fluxo, complemento de medicao e assistencia comercial: 49.
- Total de itens remanescentes: 41.
- Etapa 7: 5 itens.
- Etapa 8: 37 itens.
- Itens fora de etapa: 0.
