# Checagem Visual - Dashboard e Medicao

Data: 17/07/2026

## Objetivo

Validar visualmente os ajustes recentes da Etapa 7:

- Dashboard Operacional com lista de contratos mais compacta e expansivel.
- Tela de Medicao com painel visivel para a medicao selecionada.

## Publicacao

Status: publicada na VPS de homologacao.

- Container publicado: `atenza-fieldops`.
- Imagem publicada: `atenza-fieldops:20260717-visual-etapa7`.
- Container anterior preservado para rollback: `atenza-fieldops-prev-20260717-visual-etapa7`.
- Health check interno na VPS: aprovado em `/api/health`.
- Rotas verificadas internamente na VPS: `/api/health`, `/login` e `/medicao`.

## Checagem visual

Status: aprovada via tunel SSH para a VPS.

O acesso externo direto por IP/porta apresentou timeout neste ambiente local, entao a validacao visual foi feita por tunel SSH para a aplicacao publicada na VPS.

Prints gerados:

- `docs/evidencias/etapa7_homologacao/prints_visuais/dashboard-checagem-visual.png`
- `docs/evidencias/etapa7_homologacao/prints_visuais/medicao-checagem-visual.png`

## Resultado

- Dashboard carregou com dados reais de homologacao.
- Lista de Contratos em Execucao exibiu resumo compacto, priorizacao e botao `Ver todos`.
- Tela de Medicao exibiu o painel `Medicao selecionada` apos acionar `Ver`.
- O painel de Medicao apresentou acoes de `Imprimir PDF`, `Acompanhar` e `Limpar selecao`.

## Comando preparado para repetir

```bash
npm run homologation:visual-check
```

## Observacao

Nenhuma senha foi gravada neste relatorio.
