# Backlog atual do Atenza FieldOps

Reconciliado em 24/09/2026. Este documento prevalece sobre os status e contagens dos backlogs históricos. Não é uma nova lista paralela: reúne as frentes existentes por resultado e evidência.

## Critério de conclusão

Implementado não significa aceito pelo cliente. Publicado em homologação não significa liberado em produção. Aprovação técnica não substitui teste físico, aceite externo ou revisão formal do PR. Não há uma contagem atual confiável equivalente aos antigos “37 itens”: havia sobreposição, entregas já realizadas e decisões antigas.

## Entregue tecnicamente

| Frente | Situação comprovada | Evidência / validação ainda necessária |
| --- | --- | --- |
| OS com múltiplas atividades | Inclusão, edição, remoção, serviços, locais, TAGs, fotos e consumo por atividade; cabeçalho sem funcionário/CPF | `scripts/test-operational-flow.mjs`; aceite externo das atividades reais |
| Certificado por equipamento | Emissão individual, fotos próprias, cliente/serviço consistentes, QR/hash, revogação e reemissão individual | Cinco equipamentos e três serviços testados; impressão A4 e dois celulares pendentes |
| Identidade documental | Assets do tenant preservados no deploy; logos proporcionais, marca-d'água lateral e assinatura configurada | PDFs conferidos; não confundir dados sintéticos de QA com cadastro real da Ciperprag |
| Estoque básico e consumo | Cadastro, movimentos, saldo, baixa transacional e consulta por período/OS | Smoke publicado e catálogo carregado; conferir com o perfil real da Aline |
| Agendamento avulso | Serviço do catálogo sem contrato, local livre e geração de OS sem duplicação | Teste autenticado em homologação; regras contratuais continuam válidas quando há contrato |
| Medição por atividade | Itens e valores preservados, bloqueios de duplicidade e continuidade da tabela | Medição de cinco itens testada; matriz extensa permanece abaixo |
| PDFs de OS/certificado/medição | Renderizador compartilhado, Montserrat local, tags, metadados e arquivo imutável | Oito PDFs/dez páginas na publicação `35c138b`; não sobrescrever históricos |
| Ordenação e falhas repetidas | Documentos recentes primeiro; repetição de fechamento/emissão não repete consumo | Testes e inspeção do fluxo; aceite da navegação real pendente |
| Locais automáticos por tenant | Inicialização e reparo dos locais automáticos respeitam a empresa do cliente | Auditoria tri-tenant da publicação `f1f332b`: zero falhas/alertas |
| Propostas por PDF | Extração determinística, original preservado, assistência de IA como rascunho revisável | Código e testes existentes; regressão comercial completa na versão atual pendente |
| Comercial configurável | Contratos/minutas e valor mensal podem ficar desabilitados por tenant sem excluir históricos | Testes das flags; Ciperprag não deve ser obrigada a gerar esses documentos |
| Relatórios, POP e permissões | Tela de relatórios, evidências por atividade, upload de POP e filtragem de valores no backend | Testes existentes e código; revisão externa por perfil e relatório continua necessária |

Publicação de referência: https://github.com/atenza-digital/operis-prime-hub/actions/runs/36030487719 (`35c138b`, sucesso). PR: https://github.com/atenza-digital/operis-prime-hub/pull/26.

Validação desta publicação: 67 testes unitários, lint, typecheck, build, smoke de estoque/anexos, fluxo operacional pela URL pública, interface desktop/mobile e oito PDFs/dez páginas. Seis QR Codes lidos por software; impressão e dois aparelhos continuam pendentes. O E2E comercial legado opcional não foi executado nesta rodada.

## Fechamento desta rodada

| ID | Pendência | Situação / próximo passo |
| --- | --- | --- |
| HML-01 | Logo da OS alinhada à margem esquerda interna | Publicada e validada em PDF gerado em homologação: posição e proporção verificadas automaticamente e nas duas páginas renderizadas. Título centralizado e número à direita preservados. Não altera PDFs históricos. |
| HML-02 | Detalhar ocorrências da auditoria operacional | Concluído o diagnóstico: uma proposta e três minutas não aplicáveis às regras atuais; seis agendamentos e oito OS para conferência operacional. Zero ocorrências nos três controles de integridade consultados. Ver `CONFERENCIA_REGISTROS_2026-09-24.md`; a decisão sobre os registros continua com a operação. |
| HML-03 | Aceite da Aline/Tarcísio | Novas atividades, cinco equipamentos com fotos diferentes, estoque, medição, ordenação e impressão/QR físico. |
| HML-04 | Regressão comercial/documental completa | Repetir importação/proposta, perfis e relatórios. Testar contratos/minutas em tenant que habilite esses recursos, não ativá-los na Ciperprag. |
| HML-05 | Revisão formal do PR #26 | Continua exigida para merge em main; não bloqueia teste da branch publicada em homologação. |

## Evoluções e preparação para produção

As frentes abaixo não devem ser anunciadas como concluídas pela última rodada operacional.

| ID | Frente | Estado e limite do que já existe |
| --- | --- | --- |
| EVO-01 | Produção e operação | Separação definitiva de ambientes, política de release, rollback e evidência atual de restauração precisam de aceite. Workflow de homologação/backup não equivale a produção liberada. |
| EVO-02 | Isolamento e permissões | Filtros por tenant e auditoria de relações existem. RLS no PostgreSQL e matriz ampla de acesso cruzado por API/perfil permanecem como aprofundamento; auditoria SQL não prova todos os endpoints. |
| EVO-03 | Storage R2 | Integração, piloto e lotes anteriores documentados. Ampliar migração e validar restauração/estabilidade antes de remover cópias do banco; não tratar como “R2 ainda não existe”. |
| EVO-04 | Uploads seguros | Validações de tipo/tamanho existem. Antivírus, quarentena efetiva e inspeção profunda de formatos compactados continuam previstos. |
| EVO-05 | Cláusulas e textos comerciais | Biblioteca versionada de cláusulas/condições e parametrização completa dos blocos; preservar contratos/minutas desativados na Ciperprag. |
| EVO-06 | Templates e assinaturas | Histórico/editor guiado por família e tenant, assinatura eletrônica e papéis documentais avançados; upload de assinatura atual não equivale a assinatura eletrônica. |
| EVO-07 | Medição extensa | Matriz de 1/5/15/30/100 itens, condições incompatíveis por contrato e revisão/substituição formal precisam de cobertura específica. |
| EVO-08 | Estoque avançado | Lotes, validade, inventário, transferências e múltiplos almoxarifados; não confundir com estoque básico já entregue. |
| EVO-09 | Comunicação e conta | SMTP transacional, convite/reset por e-mail, Minha conta/troca de e-mail e login Google; troca de senha atual não cobre toda essa frente. |
| EVO-10 | Administração SaaS | Painel Atenza de tenants, planos, suspensão, suporte e integração futura com Atenza Hub. |
| EVO-11 | UX e tema | Botão dedicado claro/escuro, revisão de parâmetros, modais, agenda e experiência de campo. A presença de estilos dark não comprova alternância completa. |
| EVO-12 | Acessibilidade | Navegação por teclado, leitor de tela, contraste e validação ampla; PDF Tagged não comprova conformidade completa PDF/UA. |
| EVO-13 | Observabilidade e auditoria | Alertas, monitoramento, retenção, paginação/filtros server-side e suporte escalável; healthcheck e logs básicos já existem. |
| EVO-14 | Evoluções posteriores | Offline/PWA, onboarding/help center, qualificações e vencimentos de equipes, manutenção avançada e portal externo. Não bloqueiam o aceite dos ajustes atuais. |

## Fontes e reconciliação

- Implementação: `server/index.mjs`, `server/order-activities.mjs`, `server/render-pdf.mjs`, `server/customer-locations.mjs`, `src/App.tsx`, páginas dos módulos e testes.
- Validação: `docs/VALIDACAO_ALINE_2026-09-24.md`, testes operacionais, artefatos de homologação e CI do PR #26.
- Histórico: `ROADMAP_ETAPAS.md`, `../projeto/BACKLOG_ATENZA_FIELDOPS.md`, `../projeto/backlog-atenza-fieldops.json` e `../entrega/BACKLOG-CONSOLIDADO.md`. Seus números, prioridades e status antigos não são a posição atual.
- Padrão vigente dos documentos: Montserrat. Menções antigas a Noto Sans não constituem uma nova orientação.
- Nenhuma pendência foi encerrada por ausência de reclamação. Aceites humanos e evidências de produção permanecem explícitos.
