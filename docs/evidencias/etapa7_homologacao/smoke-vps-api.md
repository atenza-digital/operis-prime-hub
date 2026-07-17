# Smoke VPS de Homologacao

Ambiente: http://127.0.0.1:3013
Tenant: ciperprag
Executado em: 16/07/2026, 23:42

## Resultado

Status geral: Aprovado

## Endpoints

| Verificacao | Endpoint | HTTP | Resultado |
| --- | --- | --- | --- |
| Health publico | /api/health | 200 | OK |
| Usuario autenticado | /api/auth/me | 200 | OK |
| Bootstrap operacional | /api/bootstrap | 200 | OK |
| Perfis | /api/roles | 200 | OK |
| Usuarios | /api/users | 200 | OK |
| Auditoria | /api/audit-logs?limit=5 | 200 | OK |
| Validacao de certificado | /api/certificates/HSH-2026-5LHS-49YH | 200 | OK |

## Dados carregados no bootstrap

| Area | Quantidade |
| --- | --- |
| clientes | 6 |
| servicos | 6 |
| contratosOperacionais | 18 |
| propostasContratos | 14 |
| agendamentos | 12 |
| ordensServico | 12 |
| certificados | 9 |
| medicoes | 3 |
| recorrencias | 3 |
| anexos | 28 |

## Observacoes

- Este smoke cria/atualiza um usuario tecnico interno apenas para validar a API publicada.
- A senha usada no smoke e aleatoria e nao e persistida em documentacao.
- O teste manual assistido continua necessario para validar UX, documentos e aderencia operacional.
