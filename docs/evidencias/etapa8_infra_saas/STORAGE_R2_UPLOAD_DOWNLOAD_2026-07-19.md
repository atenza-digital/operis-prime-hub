# Storage R2 real com fallback - Etapa 8

Data: 19/07/2026

## Escopo

Implementar a primeira versao real de upload/download de anexos no Cloudflare R2, mantendo compatibilidade com a homologacao atual e sem expor arquivos por URL publica direta.

## Base tecnica

- R2 usa endpoint S3 compativel no formato `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.
- A integracao usa AWS SDK for JavaScript v3 com `S3Client`, `PutObjectCommand` e `GetObjectCommand`, conforme documentacao oficial da Cloudflare.
- O endpoint de download do FieldOps continua autenticado e checa permissoes antes de ler o arquivo.

Referencias oficiais:

- https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/
- https://developers.cloudflare.com/r2/api/s3/api/

## O que foi implementado

- Dependencia `@aws-sdk/client-s3` adicionada.
- `server/storage.mjs` passou a:
  - resolver provider ativo a partir de `DOCUMENT_STORAGE_PROVIDER`;
  - exigir bucket, account id, access key e secret key para ativar R2;
  - enviar conteudo para R2 quando configurado;
  - retornar fallback para banco quando R2 nao estiver pronto ou falhar;
  - ler objeto R2 pelo backend para download autenticado.
- `server/index.mjs` passou a usar a camada central de storage para:
  - PDFs historicos imutaveis;
  - HTMLs historicos imutaveis;
  - arquivo original de minuta do cliente;
  - fotos/evidencias de encerramento de OS.
- A rota `/api/attachments/:id/download` passou a:
  - manter compatibilidade com anexos antigos no banco;
  - ler do R2 quando `storage_provider = r2`;
  - registrar auditoria antes de entregar o arquivo;
  - manter `X-Document-Hash-Sha256`;
  - informar `X-Storage-Provider`.

## Decisao de seguranca

- Nao foram versionados segredos.
- Sem credenciais completas, o sistema permanece em `database`, mesmo quando existe bucket planejado.
- Se o upload R2 falhar, o anexo permanece gravado no banco e os metadados registram `storageUpload = fallback_database`.
- O usuario nunca acessa diretamente o objeto R2; o backend aplica autenticacao, permissao e tenant antes de entregar o conteudo.

## Pendencias

- Configurar credenciais reais do bucket em homologacao quando a conta R2 estiver liberada para este projeto.
- Executar teste real de upload/download no bucket de homologacao.
- Criar rotina de migracao dos anexos ja existentes em base64 no banco.
- Validar isolamento tri-tenant com Ciperprag, tenant demonstracao e tenant sem logo.
