# Auditoria de Homologacao E2E

Ambiente: Homologacao
Tenant: Ciperprag (ciperprag)
Gerado em: 07/07/2026, 11:50

## Resumo de consistencia

| Verificacao | Status | Total |
| --- | --- | --- |
| Propostas aprovadas sem contrato gerado identificado | OK | 0 |
| Contratos vigentes sem item operacional sincronizado | Verificar | 1 |
| Agendamentos em aberto sem OS gerada | Verificar | 5 |
| OS encerradas sem snapshot de encerramento | Verificar | 7 |
| OS encerradas sem medicao vinculada | Verificar | 2 |
| Certificados emitidos sem documento historico imutavel | Verificar | 7 |

## Contagens por area

### contratos_templates

| tipo | status | total |
| --- | --- | --- |
| contrato | vigente | 4 |
| proposta | aprovado | 3 |
| proposta | enviado | 1 |

### contratos

| status | total |
| --- | --- |
| ativo | 7 |
| vencido | 1 |

### agendamentos

| status | total |
| --- | --- |
| agendado | 5 |
| encerrado | 2 |
| os_gerada | 3 |

### ordens_servico

| status | total |
| --- | --- |
| aberta | 3 |
| encerrada | 8 |

### certificados

| status | total |
| --- | --- |
| emitido | 8 |

### medicoes

| status | financeiro_status | total |
| --- | --- | --- |
| emitida | em_conferencia | 1 |
| emitida | nf_enviada | 1 |

### recorrencia_sugestoes

| status | total |
| --- | --- |
| confirmada | 2 |

### evidencias_anexos

| entidade_tipo | categoria | total |
| --- | --- | --- |
| certificado | pdf_historico | 1 |
| medicao | pdf_historico | 2 |
| os | foto | 20 |
| os | pdf_historico | 1 |

## Como usar

- Use os itens com status `Verificar` como fila de validacao durante a homologacao.
- Este relatorio nao altera dados e nao substitui o teste manual do usuario.
- Divergencias encontradas devem ser registradas no roteiro e acompanhadas ate resolucao.
