# Readiness de Produção

## Status geral

Não pronto para produção.

O sistema está em evolução de homologação e precisa concluir o P0 Ciperprag com testes, evidências e validação antes de qualquer avanço comercial amplo.

## Bloqueios de produção

- P0 ainda não validado.
- Isolamento por tenant ainda precisa ser comprovado com RLS e testes.
- Permissões backend ainda precisam ser auditadas.
- Storage R2 ainda precisa ser isolado por ambiente/tenant/entidade.
- Motor de documentos precisa garantir templates versionados e snapshots imutáveis.
- QR Code/hash real ainda precisa ser validado nos certificados.
- Testes automatizados e E2E ainda precisam cobrir o fluxo completo.
- Homologação e produção precisam ficar separadas por banco, buckets, variáveis e credenciais.
- A migração `019_commercial_proposal_statuses.sql` foi aplicada no banco configurado pelo `.env`; antes de produção, repetir em ambiente produtivo separado quando existir.
- As migrações 020, 021 e 022 foram aplicadas no banco local configurado. Antes de produção, repetir em ambiente produtivo separado e validar tenant/encoding.
- Propostas ainda precisam de snapshot imutável, template versionado e storage R2 antes de readiness de produção.

Atualização: propostas já possuem snapshot histórico imutável, hash de conteúdo, hash de snapshot, template versionado e auditoria. O upload efetivo no R2 e o PDF server-side continuam pendentes para o P1.

## Critérios mínimos para liberar produção

- P0 completo e validado.
- Matriz de testes executada.
- Documentos de homologação gerados e comparados.
- Segurança de tenant validada.
- Permissões por perfil validadas.
- Backups e recuperação definidos.
- Deploy reproduzível.
- Monitoramento e logs mínimos configurados.
- Relatório de prontidão aprovado.
