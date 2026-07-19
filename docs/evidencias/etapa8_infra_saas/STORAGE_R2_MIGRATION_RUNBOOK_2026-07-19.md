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

1. Configurar `DOCUMENT_STORAGE_PROVIDER=r2` e credenciais R2 no ambiente de homologacao.
2. Rodar dry-run com lote pequeno.
3. Rodar `--apply --keep-database-copy --limit=3`.
4. Validar download dos anexos migrados pela tela/API.
5. Rodar novo lote sem `--keep-database-copy`.
6. Conferir `storage_provider`, `storage_key`, hash e ausencia de conteudo base64 nos itens migrados.
7. Repetir por categoria ate zerar pendencias.
