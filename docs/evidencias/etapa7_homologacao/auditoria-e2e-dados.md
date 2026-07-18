# Auditoria de Homologacao E2E

Ambiente: Homologacao
Tenant: Ciperprag (ciperprag)
Gerado em: 18/07/2026, 10:59

## Resumo de consistencia

| Verificacao | Status | Total |
| --- | --- | --- |
| Propostas aprovadas sem minuta gerada identificada | Verificar | 1 |
| Minutas aprovadas sem contrato final gerado identificado | OK | 0 |
| Contratos vigentes sem item operacional sincronizado | Verificar | 1 |
| Agendamentos em aberto sem OS gerada | Verificar | 4 |
| OS encerradas sem snapshot de encerramento | Verificar | 6 |
| OS encerradas sem medicao vinculada | Verificar | 6 |
| Certificados emitidos sem documento historico imutavel | Verificar | 5 |

## Contagens por area

### contratos_templates

| tipo | status | total |
| --- | --- | --- |
| contrato | vigente | 4 |
| minuta | aprovado | 2 |
| proposta | aprovado | 2 |
| proposta | em_negociacao | 1 |
| proposta | enviado | 1 |

### contratos

| status | total |
| --- | --- |
| ativo | 7 |
| vencido | 1 |

### agendamentos

| status | total |
| --- | --- |
| agendado | 4 |
| encerrado | 1 |

### ordens_servico

| status | total |
| --- | --- |
| encerrada | 7 |

### certificados

| status | total |
| --- | --- |
| emitido | 6 |

### medicoes

| status | financeiro_status | total |
| --- | --- | --- |
| emitida | nf_enviada | 1 |

### recorrencia_sugestoes

| status | total |
| --- | --- |
| confirmada | 1 |

### evidencias_anexos

| entidade_tipo | categoria | total |
| --- | --- | --- |
| certificado | pdf_historico | 1 |
| medicao | pdf_historico | 1 |
| minuta | documento | 1 |
| minuta | pdf_historico | 1 |
| os | foto | 19 |
| os | pdf_historico | 1 |
| proposta | pdf_historico | 1 |

## Como usar

- Use os itens com status `Verificar` como fila de validacao durante a homologacao.
- Este relatorio nao altera dados e nao substitui o teste manual do usuario.
- Divergencias encontradas devem ser registradas no roteiro e acompanhadas ate resolucao.
