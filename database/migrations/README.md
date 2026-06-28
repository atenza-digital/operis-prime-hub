# Migrações do Ciperprag Hub

Esta pasta concentra as migrações versionadas do banco a partir da evolução do MVP para produção/SaaS.

## Regras

- Execute as migrações em ordem numérica.
- Revise cada migração antes de aplicar em produção.
- Faça backup do banco antes de qualquer migração estrutural.
- Prefira mudanças aditivas e compatíveis com dados existentes.
- Não remova colunas/tabelas críticas sem migração de dados, janela de rollback e aprovação.
- Toda mudança de schema relevante deve ter um arquivo novo nesta pasta.

## Estado Atual

O projeto ainda possui a rotina `ensureDatabaseShape()` em `server/db.mjs`, criada para compatibilidade do MVP. Ela continua útil como proteção temporária, mas a evolução de produção deve migrar gradualmente para scripts versionados nesta pasta.

## Migração Inicial

`001_saas_foundation.sql` cria a fundação SaaS sem bloquear o fluxo atual:

- `tenants`
- `usuarios`
- `perfis`
- `permissoes`
- `perfil_permissoes`
- `usuario_perfis`
- `audit_logs`
- tenant inicial `ciperprag`
- perfis mínimos
- permissões iniciais
- colunas `tenant_id` nas tabelas existentes quando elas existirem
- índices por `tenant_id`

Esta migração não ativa login, não bloqueia endpoints e não altera regras funcionais existentes. Ela prepara o banco para as próximas etapas.

## Ambientes e Versão

A base atual deve ser tratada como homologação. A produção será criada em base separada quando o fluxo estiver validado.

O sistema deve manter versionamento explícito no código e exibir ambiente/versão na interface, para facilitar suporte, validação com usuários e rastreio de mudanças entre homologação e produção.

## Aplicação Manual

Exemplo:

```sql
\i database/migrations/001_saas_foundation.sql
```

No DBeaver, abra o arquivo, confira o banco/schema de destino e execute em uma transação controlada.
