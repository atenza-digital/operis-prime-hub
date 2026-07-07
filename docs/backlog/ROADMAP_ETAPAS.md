# Roadmap por Etapas - Atenza FieldOps

Este arquivo e o mapa canonico do backlog. Nenhum item deve ficar solto fora das etapas abaixo.

## Resumo atual

- Versao de homologacao: `0.6.0`.
- Etapa atual: Etapa 7 de 8 em andamento.
- Proxima etapa recomendada: continuar Etapa 7 de 8 - QA, testes E2E e homologacao guiada.
- Itens de backlog mapeados apos o fechamento da Etapa 6: 35.
- Itens de backlog remanescentes apos inicio da Etapa 7: 34.
- Itens fora de etapa: 0.

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

Backlog da Etapa 7: 9 itens.

- Executar E2E manual e documentado: proposta -> contrato -> contrato operacional -> agenda -> OS -> encerramento -> certificado -> medicao -> recorrencia.
- Evoluir testes automatizados de smoke routes para E2E de fluxo com acoes e validacoes de dados.
- Validar multi-tenant com tenant generico e tenant Ciperprag, incluindo documentos sem logo.
- Validar proposta aprovada gerando contrato com snapshot dos itens aprovados e trilha de aceite.
- Validar numeração automatica de OS, proposta, contrato, certificado e medicao.
- Validar datas, horas, moeda e acentuacao em formato brasileiro.
- Validar anexos, downloads, hashes e documentos historicos na tela de auditoria.
- Validar fluxo de recorrencia apos conclusao de agendamento.
- Validar UX com usuarios: quantidade de cliques, mensagens, estados vazios e confirmacoes.
- Validar OS usando tags/equipamentos cadastrados e registrar melhorias de usabilidade.

## Etapa 8 de 8 - Producao, governanca SaaS e hardening

Status: planejada.

Objetivo:

- Preparar o Atenza FieldOps para operacao SaaS, com producao separada de homologacao, governanca de tenants, hardening tecnico, PDFs finais e operacao assistida.

Backlog da Etapa 8: 23 itens.

- Separar formalmente ambientes de homologacao e producao, incluindo identidade visual evidente para evitar uso errado.
- Implementar PDF server-side binario final de OS, certificado, medicao, proposta e contrato com renderizacao fiel aos templates aprovados.
- Persistir PDF final como anexo imutavel com hash real, snapshot completo e versao do template.
- Criar templates versionados em tabela propria por tenant e por tipo documental.
- Criar historico de versoes de templates/documentos na interface.
- Criar backfill controlado para documentos antigos.
- Implementar storage externo ou filesystem controlado para anexos/documentos, reduzindo base64 no banco.
- Adicionar validacao de arquivo/antivirus antes de aceitar uploads em producao.
- Criar editor visual/guiado de certificado por tenant.
- Persistir imagens documentais por tenant: logo, arte de fundo, selo, assinatura e rodape.
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
- Painel Atenza dono do SaaS para tenants, planos, pagamentos, bloqueios e controle de inadimplencia.

## Itens explicitamente postergados

Todos os itens abaixo estao alocados na Etapa 8:

- SMTP/e-mails transacionais.
- Estoque simples.
- Help center e onboarding guiado.
- Renomear fisicamente a pasta local do projeto.
- Minha conta e politica visual de senha.

## Controle de backlog

- Total de itens mapeados apos fechamento da Etapa 6: 35.
- Total de itens remanescentes: 32.
- Etapa 7: 9 itens.
- Etapa 8: 23 itens.
- Itens fora de etapa: 0.
