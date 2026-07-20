# Runbook de migracao de anexos para R2 - Etapa 8

Data: 19/07/2026

## Objetivo

Permitir migracao controlada dos anexos antigos que ainda estao em `conteudo_base64` no banco para Cloudflare R2, sem interromper a homologacao e sem executar escrita acidental.

## Script

Arquivo: `scripts/migrate-attachments-to-r2.mjs`

Comando:

```powershell
npm run storage:migrate-r2
```

Por padrao, o comando executa `dry-run` e nao altera dados.

## Parametros

- `--tenant=ciperprag`: tenant alvo. Padrao: `ciperprag`.
- `--entity-type=os`: filtro opcional por entidade.
- `--category=foto`: filtro opcional por categoria.
- `--limit=50`: tamanho maximo do lote.
- `--apply`: aplica a migracao.
- `--keep-database-copy`: envia para R2, mas mantem `conteudo_base64` como copia temporaria.

Tambem e possivel usar variaveis de ambiente para CI/CD ou VPS:

- `STORAGE_MIGRATION_TENANT`
- `STORAGE_MIGRATION_ENTITY_TYPE`
- `STORAGE_MIGRATION_CATEGORY`
- `STORAGE_MIGRATION_LIMIT`
- `STORAGE_MIGRATION_APPLY=true`
- `STORAGE_MIGRATION_KEEP_DATABASE_COPY=true`

## Protecoes

- `--apply` e bloqueado se `DOCUMENT_STORAGE_PROVIDER` nao estiver como `r2`.
- `--apply` e bloqueado se bucket, account id, access key e secret key R2 nao estiverem completos.
- Sem `--apply`, o script apenas lista resumo e candidatos.
- Quando a migracao aplica com sucesso, o arquivo passa a ficar em `storage_provider = r2`.
- Por padrao, apos upload R2 bem-sucedido, `conteudo_base64` e limpo para reduzir peso do banco.
- Com `--keep-database-copy`, o conteudo antigo permanece no banco durante rollout assistido.
- Hash SHA-256, metadados e permissao de download pelo backend sao preservados.

## Dry-run local executado

Ambiente: Docker local com Postgres `atenza_local`.

Resultado resumido:

- `certificado/pdf_historico`: 1 anexo candidato.
- `medicao/pdf_historico`: 1 anexo candidato.
- `minuta/documento`: 1 anexo candidato.
- `minuta/pdf_historico`: 1 anexo candidato.
- `os/foto`: 20 anexos candidatos.
- `os/pdf_historico`: 1 anexo candidato.
- `proposta/pdf_historico`: 1 anexo candidato.

## Status de homologacao

Foi tentado dry-run contra o banco configurado no `.env`, mas a conexao direta ao PostgreSQL da VPS retornou timeout em `89.116.214.65:5432`. Nenhum dado foi alterado.

Para executar em homologacao com seguranca, usar preferencialmente o workflow/runner ou a propria VPS com acesso de rede ao banco e variaveis R2 configuradas.

## Sequencia recomendada para aplicar

1. Cadastrar no GitHub os secrets `HOMOLOG_R2_BUCKET_DOCUMENTS`, `HOMOLOG_R2_ACCOUNT_ID`, `HOMOLOG_R2_ACCESS_KEY_ID` e `HOMOLOG_R2_SECRET_ACCESS_KEY` no ambiente `homologation`.
2. Rodar o workflow `Storage R2 Migration Homologacao` em `dry-run`, com `tenant=ciperprag`, `entity_type=os`, `category=foto`, `limit=3` e `keep_database_copy=true`.
3. Conferir no log o preflight `storage:r2-readiness`, validando que `Provider ativo` esta como `r2` e `R2 pronto` como `sim`.
4. Rodar o mesmo workflow em `apply`, mantendo `keep_database_copy=true` e `limit=3`.
5. Conferir no log o `storage:r2-verify`, validando leitura real dos objetos R2, hash SHA-256, tamanho e ausencia de falhas.
6. Validar download dos anexos migrados pela tela/API, incluindo OS, certificado/relatorio que use essas fotos e auditoria de anexos.
7. Repetir novo lote pequeno por categoria. Somente depois da validacao funcional, avaliar remover `conteudo_base64` dos proximos lotes.
8. Repetir por categoria ate zerar pendencias.
