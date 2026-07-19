# Validacao tri-tenant de isolamento SaaS

Gerado em: 19/07/2026, 20:57
Modo: somente leitura

## Resultado

- Tenants avaliados: 1.
- Falhas bloqueantes: 0.
- Alertas: 2.
- Status tecnico: APROVADO COM ALERTAS CONTROLADOS.

## Tenants avaliados

| Slug | Nome | Status | Empresa config | Assets | Comportamento visual |
| --- | --- | --- | --- | --- | --- |
| ciperprag | Ciperprag | ativo | sim | 0 | fallback neutro |

## Contagens por tenant

| Tenant | Tabela | Total |
| --- | --- | --- |
| ciperprag | clientes | 6 |
| ciperprag | contratos_templates | 10 |
| ciperprag | agendamentos | 5 |
| ciperprag | ordens_servico | 7 |
| ciperprag | certificados | 6 |
| ciperprag | medicoes | 2 |
| ciperprag | evidencias_anexos | 26 |

## Achados

| Severidade | Escopo | Mensagem | Detalhes |
| --- | --- | --- | --- |
| alerta | tri-tenant | Base ainda nao possui tres tenants para matriz completa. | {"tenantsEncontrados":1,"tenantsAvaliados":"ciperprag"} |
| alerta | ciperprag | Tenant Ciperprag sem assets documentais configurados. | {} |

## Criterios verificados

- Tenants selecionados para matriz Ciperprag + ate dois tenants nao-Ciperprag quando existirem.
- Registros de tabelas SaaS escopadas sem `tenant_id`.
- Configuracao visual documental sem vazamento de Ciperprag para outro tenant.
- Chaves R2/plano R2 com prefixo por ambiente/tenant/entidade/categoria/hash.
- Chaves de storage repetidas entre tenants.
- Snapshots e metadados de documentos sem dados/assets de outro tenant.

## Observacao

Quando a base possuir apenas o tenant Ciperprag, a auditoria aprova a infraestrutura existente e registra alerta operacional para criar os tenants de demonstracao e sem identidade visual antes da validacao SaaS final.
