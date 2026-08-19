# Backup e restore de homologacao - Etapa 8

Data: 19/08/2026
Ambiente: `https://fieldops-homologacao.atenza.digital`
Workflow: `.github/workflows/backup-restore-homologation.yml`

## Implementacao publicada

- PR #15 (`db4f036`): suporte a `DATABASE_URL` ou variaveis `PG*` reais do container.
- PR #16 (`a675416`): cliente `postgres:17-alpine`, compativel com o servidor PostgreSQL 17.9.
- PR #17 (`f5fab28`): remocao do pipe fragil com `head` sob `pipefail`.
- Todos os PRs passaram pelos checks de CI antes do merge via politica administrativa da organizacao.

## Evidencias de execucao

- Backup oficial: [run 32315042653](https://github.com/atenza-digital/operis-prime-hub/actions/runs/32315042653)
  - Resultado: `success`.
  - SHA-256: `ee15986e12d97e6255be89b7b3f8ea8bd5e599a5958e5e03925ee6dfc9fe6216`.
  - TOC do dump: 1434 entradas.
  - Origem confirmada: PostgreSQL 17.9; `pg_dump` 17.11.
- Verificacao do backup: [run 32315092213](https://github.com/atenza-digital/operis-prime-hub/actions/runs/32315092213)
  - Resultado: `success`.
  - SHA-256 conferido com `sha256sum -c`.
  - Lista do dump: 1445 entradas.
- Restore isolado: [run 32315136068](https://github.com/atenza-digital/operis-prime-hub/actions/runs/32315136068)
  - Resultado: `success`.
  - Banco temporario: `atenza_restore_20260819T235346Z`.
  - Tabelas restauradas no schema `ciperprag_hub`: 33.
  - Tenants restaurados: 3.
  - Marcador: `RESTORE_RESULT=passed`.

## Garantias verificadas

- O banco principal de homologacao nao foi sobrescrito.
- O restore foi feito em banco temporario e removido pelo cleanup da propria rotina.
- O arquivo de backup, o checksum e os metadados foram protegidos com permissao `600` no VPS.
- A operacao foi executada pela esteira do GitHub Actions, sem SSH manual.

## Status

Item concluido para homologacao. A rotina de producao ainda deve possuir secrets, ambiente, politica de aprovacao e janela de restauracao proprios.
