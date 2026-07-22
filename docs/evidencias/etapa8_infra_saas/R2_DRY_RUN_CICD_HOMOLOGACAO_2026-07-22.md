# Dry-run oficial de storage R2 em homologacao

Data: 22/07/2026
Ambiente: `homologation`
Tenant: `ciperprag`
Workflow: `Storage R2 Migration Homologacao`
Execucao: [GitHub Actions - run 29882003045](https://github.com/atenza-digital/operis-prime-hub/actions/runs/29882003045)
Commit executado: `dce81077c85ff7cd17126f06d34c270d40ed453b`

## Configuracao

- Conta Cloudflare/R2 consultada via MCP remoto autenticado.
- Bucket de homologacao: `atenza-hml-files`.
- Token R2 criado com permissao de objetos somente no bucket de homologacao.
- Secrets configurados no ambiente GitHub `homologation`, sem valores registrados em arquivos ou logs:
  - `HOMOLOG_R2_ACCOUNT_ID`
  - `HOMOLOG_R2_BUCKET_DOCUMENTS`
  - `HOMOLOG_R2_ACCESS_KEY_ID`
  - `HOMOLOG_R2_SECRET_ACCESS_KEY`

## Resultado

- Workflow: sucesso.
- Provider efetivo: `r2`.
- Readiness R2: `sim`.
- Modo executado: `dry-run`.
- Registros R2 avaliados: `0`.
- Falhas: `0`.
- Arquivos migrados: `0`.
- Copia no banco: preservada; nenhuma escrita de migracao foi executada.

## Decisao

O pipeline ja reconhece o R2 de homologacao e o bloqueio de credenciais foi resolvido. O `apply` permanece deliberadamente postergado para um lote piloto pequeno, com `keep_database_copy=true`, seguido de verificacao de download e hash antes da ampliacao.

## Seguranca

Nenhum valor de credencial, chave secreta ou token foi registrado neste documento, no repositorio ou nos logs do workflow.
