# Validação da agenda — visões mensal e anual

## Escopo

Implementação do item transferido da Etapa 7 para a Etapa 8 após a aprovação funcional do Tarcísio. A agenda mantém a lista operacional para semana e todos, e passa a oferecer duas visões dedicadas.

## Entregue

- Visão mensal em calendário de segunda a domingo.
- Eventos exibidos dentro do dia, com cliente, serviço e status.
- Clique no evento abre o detalhe existente do agendamento.
- Mais de três eventos no mesmo dia são resumidos com contador adicional.
- Visão anual com os 12 meses, volume por mês e status encontrados.
- Clique em um mês da visão anual abre o calendário mensal correspondente.
- Filtros de ano, mês, status e cliente preservados.
- Visual responsivo com rolagem horizontal controlada no calendário em telas menores.

## Evidências visuais

- Mensal: `docs/evidencias/etapa7_homologacao/prints_visuais/agenda-visao-mensal.png`
- Anual: `docs/evidencias/etapa7_homologacao/prints_visuais/agenda-visao-anual.png`

## Testes

- `npx eslint src/pages/Agendamento.tsx`: aprovado.
- `npm run build`: aprovado.
- `npm test -- --run`: aprovado.
- `npm run homologation:visual-check`: aprovado, com login de homologação criado temporariamente e banco local Docker.
- O roteiro visual confirmou a presença de `Visão anual` e `Calendário mensal` após alternância pelo seletor de período.

## Situação

Implementação validada localmente. A publicação em homologação e o smoke público devem ser concluídos antes de reduzir o backlog da Etapa 8.
## Publicacao em homologacao

- Commit publicado: `083f645`.
- Workflow CI/CD: `29872074746` concluido com sucesso.
- Smoke publico: `https://fieldops-homologacao.atenza.digital/login` respondeu HTTP 200 e exibiu a marca Atenza FieldOps.
