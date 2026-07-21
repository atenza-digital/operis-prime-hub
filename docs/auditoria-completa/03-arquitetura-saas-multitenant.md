# Arquitetura SaaS e multi-tenant

## Estado atual confirmado

- Existe tabela `tenants`.
- Usuarios pertencem a um tenant.
- Perfis e permissoes sao associados ao tenant.
- Sessoes possuem `tenant_id`.
- Muitos endpoints usam `req.auth.user.tenant.id`.
- Varias tabelas operacionais possuem `tenant_id`.
- `/api/public/tenant-context` resolve tenant por slug/query/header/host.
- Login aceita `tenantSlug`.
- Sidebar e documentos usam parte da configuracao do tenant.

## Fragilidades para producao SaaS

| ID | Fragilidade | Evidencia | Risco |
| --- | --- | --- | --- |
| MT-01 | Schema ainda se chama `ciperprag_hub` | `server/db.mjs`, migrations | Produto parece acoplado ao tenant inicial. |
| MT-02 | Backfills assumem `slug = 'ciperprag'` | migrations historicas | Novo tenant nao nasce por fluxo generico. |
| MT-03 | Sem RLS/policies no banco | migrations sem `ROW LEVEL SECURITY` | Erro de query pode vazar dados entre tenants. |
| MT-04 | Sem teste automatizado de IDOR | suite atual tem 11 smoke tests | Risco nao comprovado em endpoints por ID. |
| MT-05 | Favicon/asset global pode usar marca Ciperprag | `index.html` apontando `/favicon.png` | Confusao de marca SaaS. |
| MT-06 | Arquivos/anexos em base64 no banco | `evidencias_anexos.conteudo_base64` | Escalabilidade, backup e custo. |
| MT-07 | Sem plano/assinatura/suspensao | backlog, ausencia de endpoints | Nao ha operacao SaaS comercial completa. |
| MT-08 | Sem admin global Atenza implementado | rotas atuais focam tenant | Suporte e governanca limitados. |

## Pontos positivos

- O padrao `tenant_id = req.auth.user.tenant.id` esta presente em muitos endpoints.
- `assertTenantWrite` reduz risco de update silencioso em tenant errado.
- Download de anexos valida tenant e permissao.
- Certificado publico e isolado por hash, sem expor bootstrap.
- Auditoria registra tenant, usuario, IP e user agent em acoes relevantes.
- Login tem token opaco armazenado com hash no banco.

## Consultas com revisao manual recomendada

Arquivo: `docs/auditoria-completa/evidencias/tenant-scope-suspeitos.json`

| Trecho | Avaliacao |
| --- | --- |
| Geracao de hash de certificado sem tenant | Aceitavel se hash for globalmente unico, mas deve ser decisao explicita. |
| `usuario_perfis` sem `tenant_id` | Depende de validacao anterior de usuario e perfil; recomendavel constraint ou checagem extra. |
| Updates de medicao/OS | Falso positivo revisado: usam `tenant_id` no `WHERE`. |
| Contratos sincronizados | Falso positivo revisado: usam tenant/template. |

## Recomendacao de arquitetura

1. Manter tenant no nivel de aplicacao.
2. Adicionar testes automatizados de IDOR para cada endpoint com ID.
3. Avaliar RLS no PostgreSQL para tabelas criticas.
4. Criar provisionamento generico de tenant, sem backfill Ciperprag.
5. Separar storage de anexos por tenant em filesystem controlado ou objeto externo.
6. Criar painel Atenza para tenants, planos, status, bloqueio e auditoria global.
7. Definir politica de favicon: Atenza global ou white-label apenas em dominio dedicado.

