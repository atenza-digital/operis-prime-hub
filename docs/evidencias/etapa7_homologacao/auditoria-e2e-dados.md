# Auditoria de Homologacao E2E

Ambiente: Homologacao
Tenant: Ciperprag (ciperprag)
Gerado em: 19/07/2026, 09:58

## Resumo de consistencia

| Verificacao | Status | Total |
| --- | --- | --- |
| Propostas aprovadas sem minuta gerada identificada | OK | 0 |
| Minutas aprovadas sem contrato final gerado identificado | OK | 0 |
| Contratos vigentes sem item operacional sincronizado | OK | 0 |
| Agendamentos em aberto sem OS gerada | OK | 0 |
| OS encerradas sem snapshot de encerramento | OK | 0 |
| OS encerradas sem medicao vinculada | OK | 0 |
| Certificados emitidos sem documento historico imutavel | OK | 0 |

## Contagens por area

### contratos_templates

| tipo | status | total |
| --- | --- | --- |
| contrato | vigente | 10 |
| proposta | encerrado | 5 |
| proposta | enviado | 1 |

### contratos

| status | total |
| --- | --- |
| ativo | 20 |
| vencido | 1 |

### agendamentos

| status | total |
| --- | --- |
| cancelado | 3 |
| encerrado | 5 |
| os_gerada | 5 |

### ordens_servico

| status | total |
| --- | --- |
| aberta | 5 |
| encerrada | 11 |

### certificados

| status | total |
| --- | --- |
| emitido | 10 |

### medicoes

| status | financeiro_status | total |
| --- | --- | --- |
| cancelada | cancelada | 2 |
| emitida | em_conferencia | 1 |
| emitida | nf_enviada | 1 |
| emitida | pago_no_erp | 1 |

### recorrencia_sugestoes

| status | total |
| --- | --- |
| confirmada | 3 |
| dispensada | 1 |

### evidencias_anexos

| entidade_tipo | categoria | total |
| --- | --- | --- |
| certificado | pdf_historico | 10 |
| medicao | pdf_historico | 3 |
| os | foto | 23 |
| os | pdf_historico | 4 |

## Como usar

- Use os itens com status `Verificar` como fila de validacao durante a homologacao.
- Este relatorio nao altera dados e nao substitui o teste manual do usuario.
- Divergencias encontradas devem ser registradas no roteiro e acompanhadas ate resolucao.
