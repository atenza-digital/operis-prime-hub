# Perfis e permissoes

## Evidencia coletada

Arquivo: `docs/auditoria-completa/evidencias/api-bootstrap-summary.json`

Resumo local:

- Perfis retornados pela API: 8.
- Usuarios retornados pela API: 1.
- Usuario de teste: administrador local.
- Permissoes usadas em rotas/endpoints: 13 grupos identificados.

## Permissoes vistas no frontend/backend

- `dashboard.view`
- `agenda.manage`
- `os.manage`
- `os.close`
- `certificados.manage`
- `medicoes.manage`
- `equipes.manage`
- `clientes.manage`
- `servicos.manage`
- `contratos.manage`
- `configuracoes.manage`
- `usuarios.manage`
- `auditoria.view`

## Matriz recomendada

| Papel | Comercial | Operacional | Financeiro operacional | Admin tenant | Auditoria | Plataforma Atenza |
| --- | --- | --- | --- | --- | --- | --- |
| Admin global Atenza | Nao aplicavel | Nao aplicavel | Nao aplicavel | Suporte | Global | Total |
| Suporte Atenza | Leitura assistida | Leitura assistida | Leitura assistida | Apoio | Leitura | Parcial |
| Admin tenant | Total no tenant | Total no tenant | Total no tenant | Total | Total do tenant | Nao |
| Comercial | Clientes, servicos, propostas, contratos | Sem valores operacionais sensiveis | Nao | Nao | Limitado | Nao |
| Operacional | Leitura sem valores, se necessario | Agenda, OS, equipes, evidencias | Nao | Nao | Limitado | Nao |
| Tecnico de campo | Nao | OS atribuidas, checklist, fotos, assinatura | Nao | Nao | Nao | Nao |
| Financeiro operacional | Leitura de contratos necessaria para medicao | Leitura de OS encerradas | Medicao, NF, cobranca, pagamento, baixa ERP | Nao | Limitado | Nao |
| Qualidade/auditor | Leitura tecnica | Certificados, historico, anexos | Nao | Nao | Auditoria de documentos | Nao |
| Somente leitura | Leitura limitada | Leitura limitada | Leitura limitada se permitido | Nao | Nao | Nao |

## Achados

| ID | Achado | Severidade |
| --- | --- | --- |
| PERF-01 | A matriz conceitual existe, mas a interface ainda nao guia o admin a montar papeis de forma granular por modulo. | Alto |
| PERF-02 | Sem usuario tecnico de campo testado; experiencia mobile/campo fica hipotese. | Alto |
| PERF-03 | Operacional nao deve ver valores de contrato; precisa teste e regra explicita em API/frontend. | Critico |
| PERF-04 | Usuario-perfil nao tem `tenant_id` na tabela de juncao; depende de validacoes anteriores. | Medio |
| PERF-05 | Faltam sessoes ativas, revogacao visual e historico de reset acessivel ao admin. | Medio |

## Criterios de aceite futuros

- Cada rota protegida deve ter teste com usuario sem permissao.
- Cada endpoint sensivel deve negar token sem permissao, mesmo que botao esteja oculto.
- Admin deve conseguir criar papel por modulo e permissao.
- Operacional nao deve receber valores financeiros no payload quando nao tiver permissao.
- Tecnico de campo deve ver apenas OS atribuidas, se esse perfil for aprovado.

