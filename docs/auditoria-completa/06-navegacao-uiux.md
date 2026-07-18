# Navegacao, arquitetura de informacao e UI/UX

## Achados principais

| ID | Achado | Severidade | Evidencia |
| --- | --- | --- | --- |
| NAV-01 | Grupo `Inicio` contem apenas Dashboard e deve ser removido. | Medio | `src/components/AppLayout.tsx` |
| NAV-02 | Menus de modulo nao recolhem outros ao expandir. | Medio | Screenshot local e codigo com `Set`. |
| NAV-03 | `Parametros do tenant` esta em Comercial, mas e administracao/configuracao. | Alto | Menu atual. |
| NAV-04 | `Auditoria de anexos` aparece como rotina operacional, mas tende a ser qualidade/admin. | Medio | Menu atual. |
| NAV-05 | `Equipes e veiculos` mistura cadastro com alocacao semanal. | Medio | Tela `/equipes`. |
| NAV-06 | Nomes de menu, topbar e titulo de tela nem sempre coincidem. | Medio | Inventario Playwright. |
| NAV-07 | Transicao entre telas tem sensacao de reload/piscada. | Alto | `Suspense` global em `src/App.tsx`. |
| NAV-08 | Algumas telas concentram muitos botoes/campos e precisam padrao de densidade. | Medio | Playwright: auditoria, parametros e ordens. |
| NAV-09 | Padrao pagina/modal/drawer/wizard nao esta formalizado. | Alto | Uso variado de Dialog e telas longas. |
| NAV-10 | Mobile existe, mas nao parece desenhado como experiencia primaria para campo. | Alto | Screenshots mobile. |

## Proposta de menu

| Grupo | Itens |
| --- | --- |
| Dashboard | Dashboard |
| Comercial | Clientes, Servicos, Propostas e contratos |
| Operacional | Agendamentos, Ordens de servico, Certificados, Historico, Equipes e veiculos |
| Financeiro | Medicao |
| Administracao | Usuarios e perfis, Parametros do tenant, Eventos de auditoria, Auditoria de anexos |

Decisao pendente: manter `Certificados` e `Historico` juntos com abas ou separar em duas telas.

## Padrao de interacao recomendado

| Tipo | Quando usar |
| --- | --- |
| Pagina completa | Fluxos complexos, cadastro com muitos campos, proposta/contrato, OS, configuracoes. |
| Modal | Confirmacoes simples e acoes curtas com baixo risco. |
| Drawer lateral | Detalhes rapidos de agendamento, OS, cliente ou certificado sem perder contexto. |
| Wizard | Proposta, contrato, agendamento e encerramento de OS quando houver muitos passos. |
| Edicao inline | Status simples, observacao curta, acompanhamento financeiro. |
| Confirmacao reforcada | Cancelamento, revogacao, exclusao, reabertura, alteracao de documento emitido. |

## Design system recomendado

- `PageHeader` unico para breadcrumb, modulo, titulo, subtitulo e acoes.
- Botoes com hierarquia clara: primaria, secundaria, destrutiva, ghost.
- Badges de status padronizados por entidade.
- Tabelas com filtros acima, acoes no fim e estado vazio claro.
- Cards de metricas com densidade controlada.
- Skeleton local por painel, nunca fallback de tela inteira para troca de rota autenticada.
- Tooltips ou descricoes curtas para termos tecnicos: POP, EPI, norma, medicao, saldo, contrato operacional.
- Scrollbar estilizada consistente.
- Fonte institucional conforme decisao do produto, sem misturar pesos/tamanhos sem regra.

