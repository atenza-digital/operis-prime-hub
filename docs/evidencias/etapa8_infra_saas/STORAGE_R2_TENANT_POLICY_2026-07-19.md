# Política de Storage Documental por Tenant - Etapa 8

Data: 19/07/2026  
Escopo: fundação para anexos, evidências e documentos imutáveis em storage externo/R2.

## Objetivo

Preparar o Atenza FieldOps para migrar anexos e documentos históricos do banco para storage externo por ambiente e tenant, sem quebrar a homologação em andamento.

## O que foi implementado

- Criada a camada `server/storage.mjs`.
- Padronizada a geração de chaves por:
  - ambiente;
  - tenant;
  - tipo da entidade;
  - ID da entidade;
  - categoria do anexo;
  - ano/mês;
  - hash SHA-256;
  - nome seguro do arquivo.
- Mantido o banco como storage ativo em homologação.
- Registrado plano R2 nos metadados dos anexos quando `R2_BUCKET_DOCUMENTS` estiver configurado.
- Aplicado o planejamento de storage em:
  - documentos históricos HTML;
  - PDFs imutáveis quando a geração server-side for habilitada;
  - propostas, contratos e minutas emitidas;
  - arquivo original de minuta do cliente;
  - fotos/evidências de OS;
  - certificado histórico;
  - medição histórica.
- Adicionados testes unitários para evitar regressão de chave/tenant.

## Exemplo de chave planejada

```text
homologacao/tenants/ciperprag/os/os-2677/foto/2026/07/08e597799288ed0b-evidencia-tecnica-01.jpg
```

## Variáveis documentadas

As variáveis abaixo foram incluídas no `.env.example` sem segredos:

```text
RUNTIME_ENV=homologacao
DOCUMENT_STORAGE_PROVIDER=database
R2_BUCKET_DOCUMENTS=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
```

## Decisão de segurança

Mesmo que um bucket R2 esteja informado, o provider ativo continua `database` até a etapa de upload/download real ser implementada e validada. Isso evita registrar `storage_provider = r2` sem o arquivo existir no objeto externo.

Enquanto isso, os metadados recebem:

- `storageProvider`;
- `plannedStorageProvider`;
- `plannedStorageBucket`;
- `plannedStorageKey`;
- `requestedStorageProvider`;
- `storageReady`.

## Pendências

- Implementar upload real para R2 via credenciais por ambiente.
- Implementar download/redirect seguro a partir do objeto externo.
- Definir política de URL assinada ou proxy autenticado por permissão.
- Criar rotina de migração dos anexos já existentes no banco.
- Validar isolamento tri-tenant com Ciperprag, tenant demonstração e tenant sem identidade visual.

