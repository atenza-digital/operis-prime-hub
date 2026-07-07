# Auditoria de Homologacao E2E

Ambiente: Homologacao
Tenant: Ciperprag (ciperprag)
Gerado em: 07/07/2026, 10:23

## Resumo de consistencia

| Verificacao | Status | Total |
| --- | --- | --- |
| Propostas aprovadas sem contrato gerado identificado | OK | 0 |
| Contratos vigentes sem item operacional sincronizado | Verificar | 1 |
| Agendamentos em aberto sem OS gerada | Verificar | 4 |
| OS encerradas sem snapshot de encerramento | Verificar | 7 |
| OS encerradas sem medicao vinculada | Verificar | 2 |
| Certificados emitidos sem documento historico imutavel | Verificar | 7 |

## Contagens por area

### contratos_templates

| tipo | status | total |
| --- | --- | --- |
| contrato | vigente | 1 |
| proposta | enviado | 1 |

### contratos

| status | total |
| --- | --- |
| ativo | 4 |
| vencido | 1 |

### agendamentos

| status | total |
| --- | --- |
| agendado | 4 |
| encerrado | 1 |
| os_gerada | 1 |

### ordens_servico

| status | total |
| --- | --- |
| aberta | 1 |
| encerrada | 7 |

### certificados

| status | total |
| --- | --- |
| emitido | 7 |

### medicoes

| status | financeiro_status | total |
| --- | --- | --- |
| emitida | em_conferencia | 1 |

### recorrencia_sugestoes

| status | total |
| --- | --- |
| confirmada | 1 |

### evidencias_anexos

| entidade_tipo | categoria | total |
| --- | --- | --- |
| medicao | pdf_historico | 1 |
| os | foto | 19 |

## Como usar

- Use os itens com status `Verificar` como fila de validacao durante a homologacao.
- Este relatorio nao altera dados e nao substitui o teste manual do usuario.
- Divergencias encontradas devem ser registradas no roteiro e acompanhadas ate resolucao.
