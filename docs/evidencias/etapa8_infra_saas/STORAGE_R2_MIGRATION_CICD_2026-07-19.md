# CI/CD para migracao R2 em homologacao

Data: 19/07/2026

## Objetivo

Permitir executar a migracao de anexos antigos para Cloudflare R2 pela esteira do GitHub Actions, sem acesso manual direto na VPS e com dry-run como comportamento padrao.

## Workflow criado

Arquivo: `.github/workflows/storage-r2-migration-homologation.yml`

Nome no GitHub Actions: `Storage R2 Migration Homologacao`

## Entradas manuais

- `mode`: `dry-run` ou `apply`.
- `tenant`: slug do tenant.
- `entity_type`: filtro opcional por entidade.
- `category`: filtro opcional por categoria.
- `limit`: tamanho maximo do lote.
- `keep_database_copy`: manter copia em `conteudo_base64` apos upload R2.

## Secrets esperados

O workflow reutiliza os secrets de SSH ja existentes:

- `HOMOLOG_VPS_HOST`
- `HOMOLOG_VPS_USER`
- `HOMOLOG_VPS_SSH_PRIVATE_KEY`
- `HOMOLOG_VPS_PORT`

Para executar `apply`, tambem exige:

- `HOMOLOG_R2_BUCKET_DOCUMENTS`
- `HOMOLOG_R2_ACCOUNT_ID`
- `HOMOLOG_R2_ACCESS_KEY_ID`
- `HOMOLOG_R2_SECRET_ACCESS_KEY`

## Protecoes

- `dry-run` nao altera dados.
- `apply` e bloqueado se os secrets R2 nao estiverem completos.
- O primeiro `apply` exige `keep_database_copy=true`, evitando remover base64 do banco antes de validacao manual dos downloads.
- O script roda dentro do container `atenza-fieldops`, usando a mesma rede e credenciais de banco da aplicacao.
- A esteira executa `storage:r2-readiness` antes da migracao, registrando provider ativo, credenciais, bucket e pendencias reais.
- A esteira executa `storage:r2-verify` depois da migracao, validando leitura dos objetos R2, hash SHA-256, tamanho e fallback no banco.

## Estado atual verificado

O container atual da VPS possui variaveis de Postgres, mas ainda nao possui variaveis R2. Portanto, a migracao real para R2 ainda nao deve ser executada.

## Dry-run na VPS

Executado dry-run dentro do container `atenza-fieldops`, sem `apply`, com `tenant=ciperprag` e `limit=3`.

Resumo de pendencias reais em homologacao:

- `certificado/pdf_historico`: 10 anexos.
- `medicao/pdf_historico`: 3 anexos.
- `os/foto`: 23 anexos.
- `os/pdf_historico`: 4 anexos.

Provider reportado pelo script:

- solicitado: `database`;
- ativo: `database`;
- bucket: nao configurado;
- R2 pronto: `false`.

Nenhum dado foi alterado.

Proxima acao segura: configurar os quatro secrets R2 no ambiente `homologation`, executar `dry-run` pelo workflow e depois um lote pequeno com `apply` mantendo copia no banco.

## Atualizacao da esteira

Atualizado em 19/07/2026 para incluir validacao automatica antes e depois da migracao:

1. Preflight R2 (`storage:r2-readiness`).
2. Migracao em `dry-run` ou `apply` (`storage:migrate-r2`).
3. Verificacao pos-migracao (`storage:r2-verify`).

Estado dos secrets no GitHub nesta verificacao: apenas os secrets da VPS estao cadastrados. Ainda faltam `HOMOLOG_R2_BUCKET_DOCUMENTS`, `HOMOLOG_R2_ACCOUNT_ID`, `HOMOLOG_R2_ACCESS_KEY_ID` e `HOMOLOG_R2_SECRET_ACCESS_KEY`.
