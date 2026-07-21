# Validacao tri-tenant de isolamento SaaS

Gerado em: 19/07/2026, 21:42
Modo: somente leitura

## Resultado

- Tenants avaliados: 3.
- Falhas bloqueantes: 0.
- Alertas: 0.
- Status tecnico: APROVADO.

## Tenants avaliados

| Slug | Nome | Status | Empresa config | Assets | Comportamento visual |
| --- | --- | --- | --- | --- | --- |
| ciperprag | Ciperprag | ativo | sim | 2 | configurado |
| empresa-demonstracao | Empresa Demonstracao | ativo | sim | 4 | configurado |
| tenant-sem-logo | Tenant Sem Logo | ativo | sim | 0 | fallback neutro |

## Contagens por tenant

| Tenant | Tabela | Total |
| --- | --- | --- |
| ciperprag | clientes | 8 |
| ciperprag | contratos_templates | 16 |
| ciperprag | agendamentos | 13 |
| ciperprag | ordens_servico | 16 |
| ciperprag | certificados | 10 |
| ciperprag | medicoes | 5 |
| ciperprag | evidencias_anexos | 40 |
| empresa-demonstracao | clientes | 0 |
| empresa-demonstracao | contratos_templates | 0 |
| empresa-demonstracao | agendamentos | 0 |
| empresa-demonstracao | ordens_servico | 0 |
| empresa-demonstracao | certificados | 0 |
| empresa-demonstracao | medicoes | 0 |
| empresa-demonstracao | evidencias_anexos | 0 |
| tenant-sem-logo | clientes | 0 |
| tenant-sem-logo | contratos_templates | 0 |
| tenant-sem-logo | agendamentos | 0 |
| tenant-sem-logo | ordens_servico | 0 |
| tenant-sem-logo | certificados | 0 |
| tenant-sem-logo | medicoes | 0 |
| tenant-sem-logo | evidencias_anexos | 0 |

## Achados

| Severidade | Escopo | Mensagem | Detalhes |
| --- | --- | --- | --- |
_Sem registros._

## Criterios verificados

- Tenants selecionados para matriz Ciperprag + ate dois tenants nao-Ciperprag quando existirem.
- Registros de tabelas SaaS escopadas sem `tenant_id`.
- Configuracao visual documental sem vazamento de Ciperprag para outro tenant.
- Chaves R2/plano R2 com prefixo por ambiente/tenant/entidade/categoria/hash.
- Chaves de storage repetidas entre tenants.
- Snapshots e metadados de documentos sem dados/assets de outro tenant.

## Observacao

Quando a base possuir apenas o tenant Ciperprag, a auditoria aprova a infraestrutura existente e registra alerta operacional para criar os tenants de demonstracao e sem identidade visual antes da validacao SaaS final.
