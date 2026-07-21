# Preflight R2 em homologacao

## Resultado local

- Tenant avaliado: `ciperprag`.
- Provider ativo: `database`.
- Anexos pendentes para migracao: 30.
- Distribuicao: 30 registros no banco e 0 registros em R2.
- Lote piloto planejado: entidade `os`, categoria `foto`, limite de 5 registros.
- O preflight e somente leitura e nao alterou arquivos nem registros.
- Relatorio detalhado: `docs/evidencias/etapa8_infra_saas/R2_READINESS_2026-07-19.md`.

## Bloqueios para o dry-run na VPS

- O workflow `Storage R2 Migration Homologacao` existe na branch de trabalho, mas ainda nao esta disponivel na branch padrao `main`.
- O GitHub exige revisao/aprovacao para entrada do PR #4 na `main`.
- Os secrets `HOMOLOG_R2_BUCKET_DOCUMENTS`, `HOMOLOG_R2_ACCOUNT_ID`, `HOMOLOG_R2_ACCESS_KEY_ID` e `HOMOLOG_R2_SECRET_ACCESS_KEY` ainda nao estao cadastrados no ambiente `homologation`.

## Regra de seguranca

Nenhuma migracao `apply` foi executada. O fluxo continuara bloqueando o `apply` ate que o workflow esteja publicado na `main`, os secrets estejam configurados e o primeiro lote mantenha a copia no banco (`keep_database_copy=true`).

## Proxima execucao

1. Aprovar o PR #4 conforme a politica do repositorio.
2. Cadastrar os quatro secrets R2 no ambiente `homologation`, sem expor valores em logs ou documentos.
3. Executar o workflow em `dry-run` com `ciperprag`, `os`, `foto`, limite 5.
4. Validar o preflight e somente entao executar o lote piloto `apply` mantendo copia no banco.
