# Preparacao da matriz tri-tenant

Gerado em: 19/07/2026.

## Objetivo

Preparar a base de homologacao para validar isolamento SaaS sem depender apenas da Ciperprag.

## Script criado

- Comando: `npm run saas:prepare-tri-tenant`.
- Arquivo: `scripts/prepare-tri-tenant-validation.mjs`.
- Modo padrao: dry-run, sem gravar no banco.
- Modo de escrita: `node --env-file-if-exists=.env scripts/prepare-tri-tenant-validation.mjs --apply` ou `TRI_TENANT_APPLY=true npm run saas:prepare-tri-tenant`.
- Usuarios: nao sao criados por padrao; usar `--with-users` apenas quando a validacao humana de login por tenant for necessaria.

## Tenants preparados

| Tenant | Finalidade | Identidade visual | Dados |
| --- | --- | --- | --- |
| `empresa-demonstracao` | Validar outro tenant com identidade propria | Logo documental, logo de sidebar, icone e cor documental ficticios | Empresa Demonstracao de Servicos Tecnicos LTDA |
| `tenant-sem-logo` | Validar fallback neutro sem assets | Sem logo, sem icone e sem cor documental customizada | Tenant Sem Identidade Visual LTDA |

## Itens configurados por tenant

- Registro em `tenants`.
- Registro em `empresa_config`.
- Registro em `numeracao_config`.
- Oito perfis padrao por tenant.
- Permissoes padrao vinculadas aos perfis.

## Validacao local

- `node --check scripts/prepare-tri-tenant-validation.mjs`: aprovado.
- `npm run saas:prepare-tri-tenant`: dry-run aprovado.
- Aplicacao local com `--apply`: aprovada.
- `npm run saas:tri-tenant`: avaliou `ciperprag`, `empresa-demonstracao` e `tenant-sem-logo`.
- Resultado local: 0 falhas bloqueantes e 1 alerta controlado por falta de assets documentais na Ciperprag local.

## Proxima validacao

Aplicar o preparador na VPS de homologacao apos publicacao via CI/CD e rodar `npm run saas:tri-tenant` novamente. O esperado na VPS e 0 falhas bloqueantes e 0 alertas, porque a Ciperprag ja possui assets configurados na base de homologacao.
