# Status da Entrega

## Nota de status atual

- P0.3 Agendamentos: tecnicamente validada em ambiente local/Docker.
- Smoke E2E local aprovado em `http://127.0.0.1:3001`, com proposta -> minuta -> contrato final -> agendamento -> OS -> encerramento -> certificado -> medição -> acompanhamento financeiro operacional -> recorrência.
- Evidência: `docs/evidencias/etapa7_homologacao/execucao-tecnica-e2e.md`.
- Auditoria de dados: `docs/evidencias/etapa7_homologacao/auditoria-e2e-dados.md`, com 6 pontos legados para saneamento antes da próxima rodada ampla.
- Progresso técnico do P0: 57%.
- Progresso global P0/P1/P2: 16%.
- Próxima etapa sugerida: manter P0.5 Certificados em validação assistida com o Tarcísio e avançar internamente para P0.6 Relatórios técnicos, sem publicar em produção.
- P0.4 em validação técnica: impressão da OS pela agenda foi unificada no gerador centralizado, edição da OS recebeu campo de tag/equipamento e a renderização do documento passou a reparar acentuação legada de EPIs/procedimentos.
- Evidência visual P0.4: `docs/evidencias/qa_fluxo_visual/os-atual.pdf`, `docs/evidencias/qa_fluxo_visual/os-atual-page-1.png` e `docs/evidencias/qa_fluxo_visual/os-atual-page-2.png`.
- P0.5 Certificados: evidências visuais geradas para Ciperprag com produtos, Ciperprag com até 3 fotos da OS, outro tenant com logo própria e outro tenant sem logo.
- Roteiro de validação assistida de certificados para o Tarcísio criado em `docs/cliente/ROTEIRO_VALIDACAO_CERTIFICADOS_TARCISIO.docx`, com checklist, URL de homologação, perfil recomendado e imagens de referência.
- Evidências auxiliares do roteiro: `docs/cliente/qa_roteiro_certificados/ROTEIRO_VALIDACAO_CERTIFICADOS_TARCISIO.pdf` e PNGs renderizados em `docs/cliente/qa_roteiro_certificados`.

Atualizado em: 2026-07-18

## Situação atual

- Programa: P0 Ciperprag iniciado.
- Etapa atual: P0.5 Certificados.
- Status da etapa: validação visual assistida preparada; aguardando retorno do Tarcísio sobre certificados e validações anteriores.
- P0 concluído: 0 de 7 etapas validadas pelo cliente.
- P0 em andamento: 5 de 7 etapas técnicas.

## Atualizacao de validacao - snapshot comercial

- Status da etapa: validacao final antes do fechamento.
- Snapshot historico de proposta/contrato implementado no anexo imutavel, com hash SHA-256 do conteudo, hash do snapshot, codigo/versao do template e auditoria da emissao.
- Migracao `023_document_storage_proposal_snapshots.sql` aplicada, permitindo anexos da entidade `proposta` e metadados de provedor, bucket, chave e ETag.
- Emissao versionada ligada ao fluxo de impressao: o sistema so abre a impressao apos registrar o snapshot historico.
- Plano de chave R2 preparado por ambiente/tenant/entidade, mantendo o provedor efetivo como `database` nesta homologacao.
- Smoke de emissao validou proposta existente, login do perfil comercial, registro imutavel e download autenticado do snapshot.
- P0.2 iniciado: tipo `minuta` adicionado ao fluxo comercial para modelos recebidos do cliente, com versionamento historico e conversao controlada em contrato.
- Smoke de P0.2 validou minuta aprovada, snapshot `minuta-contrato-cliente`, geracao de contrato `CT-127/2026` e sincronizacao de item para o operacional.
- Migracao `024_contract_minuta_type.sql` aplicada no banco configurado pelo `.env`, ampliando os tipos comerciais e de anexos para `minuta`.
- P1/P2: não iniciados, exceto fundações que poderão entrar dentro do P0 quando necessárias.

## Atualização P0.3 - Agendamentos

- Status da etapa: tecnicamente validada em ambiente local/Docker, aguardando validação assistida de UX e retorno do Tarcísio sobre o roteiro comercial.
- Smoke E2E local aprovado em `http://127.0.0.1:3001`, cobrindo proposta criada/aprovada, minuta gerada/aprovada, contrato final vigente, contrato operacional, agendamento, OS, encerramento, certificado, medição, acompanhamento financeiro operacional e recorrência.
- Evidência da rodada: `docs/evidencias/etapa7_homologacao/execucao-tecnica-e2e.md`.
- Auditoria de dados gerada em `docs/evidencias/etapa7_homologacao/auditoria-e2e-dados.md`, com 6 pontos legados para saneamento: proposta antiga sem minuta, contrato seed sem sincronização operacional, agendamentos antigos sem OS, OS antigas sem snapshot/medição e certificados seed sem PDF histórico imutável.
- Observação técnica: a API local só subiu corretamente quando `DATABASE_URL` global foi limpo e `PGHOST=127.0.0.1` foi informado explicitamente, pois o ambiente da sessão possui variável global apontando para a VPS.
- Regra de origem reforçada: a agenda só deve aceitar contratos finais vigentes, vinculados a `contratos_templates.tipo = contrato`, com status vigente e saldo operacional positivo.
- Backend passou a bloquear criação/edição de agendamento quando o contrato operacional não tiver saldo, não estiver ativo ou não vier de contrato final vigente.
- Geração de OS passou a revalidar contrato final vigente e saldo operacional antes de criar a ordem de serviço.
- Confirmação de recorrência também passou a validar contrato final vigente e saldo, evitando que sugestões antigas burlem a regra do fluxo.
- Tela de Agendamentos passou a listar apenas contratos operacionais vinculados ao contrato final e exibir orientação clara quando não houver saldo disponível.
- Fluxo comercial ajustado para proposta aprovada gerar minuta, minuta aprovada gerar contrato final e somente contrato final vigente liberar saldo operacional.
- Textos visíveis do Comercial saneados contra mojibake e falta de acentuação antes da validação assistida.

## Percentual

Atualizacao do proximo passo:

1. Aguardar retorno do Tarcísio sobre P0.1/P0.2 no roteiro comercial.
2. Finalizar P0.3 com smoke completo: contrato final vigente -> agendamento -> geração de OS.
3. Capturar evidências de agenda/OS quando o controlador visual estiver disponível ou por validação manual assistida.
4. Avançar para P0.4 Ordens de Serviço após validar que o agendamento está recebendo apenas contratos corretos.

O upload efetivo para R2, PDF server-side e versionamento de arquivos binarios permanecem previstos na fundacao de armazenamento do P1; a etapa atual ja garante snapshot historico e trilha de auditoria no banco.

O item de validacao visual automatizada pelo navegador foi mantido no backlog de Observabilidade/QA porque o controlador nao foi disponibilizado nesta sessao.

- Progresso validado do P0: 0% pelo cliente final.
- Progresso técnico do P0: 35% (P0.1 Propostas e P0.2 Contratos/minutas tecnicamente implementados, P0.3 Agendamentos iniciado com bloqueios de contrato final vigente e saldo).
- Progresso global P0/P1/P2: 12%.

## Atualização do próximo passo sugerido

1. Concluir smoke de P0.3 em ambiente local usando usuário de homologação e contrato final vigente.
2. Preparar a etapa P0.4 Ordens de Serviço para revisar impressão, abertura, encerramento, anexos, fotos e relação com certificados.
3. Incorporar o retorno do Tarcísio antes de considerar P0.1/P0.2 fechadas.

O upload original de minuta está funcional na homologação, mas usa `database` como provedor de armazenamento. R2 privado, PDF server-side e versionamento binário efetivo continuam planejados para P1.

## Smoke complementar P0.2

- Upload do arquivo original da minuta validado na API local na porta `3029`.
- Anexo imutável: `SRC-MRPJ7VFG`.
- Hash SHA-256: `8dd65ad79e99e5b895768bb4067cb732aec9a4c2ccc1c4304e97c0eb065bbe99`.
- Download autenticado retornou HTTP `200` com o mesmo hash.

## Entregue neste ciclo

- Anexos Ciperprag catalogados.
- PDFs de referência renderizados em PNG para comparação visual.
- Escopo P0 corrigido e registrado.
- Backlog consolidado por etapa P0/P1/P2.
- Plano de entrega criado.
- Matriz de aderência inicial criada.
- Status do ciclo comercial de propostas ampliado para rascunho, enviada, em negociação, aprovada, recusada, cancelada, vigente e encerrada.
- Migração `019_commercial_proposal_statuses.sql` criada e aplicada no banco configurado pelo `.env`.
- Migrações `020_contract_template_proposal_details.sql`, `021_ciperprag_homologation_text_cleanup.sql` e `022_contract_template_service_commercial_descriptions.sql` criadas e aplicadas no banco local configurado.
- Proposta de homologação Komatsu/Ciperprag criada para validação visual local.
- PDF preview da proposta gerado em `docs/evidencias/p0-propostas/p0-proposta-komatsu-preview-v4.pdf`.
- PNG renderizado da primeira página gerado em `docs/evidencias/p0-propostas/p0-proposta-komatsu-preview-v4-1.png`.
- Matriz de origem de dados de propostas criada.
- Ações rápidas de proposta adicionadas na listagem: enviar, aprovar, recusar e gerar contrato quando aprovada.
- Smoke técnico local validou proposta criada, aprovada, convertida em contrato vigente e operacionalizada.

## Próximo passo sugerido

Executar P0.1 Propostas:

1. Criar snapshot/versionamento da proposta emitida.
2. Validar armazenamento seguro em R2 quando o motor de documentos entrar.
3. Fazer comparação visual final com referências Ciperprag.
4. Após validação, fechar P0.1 e avançar para P0.2 Contratos e minutas.
