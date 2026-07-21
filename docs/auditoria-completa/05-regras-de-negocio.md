# Regras de negocio e estados

## Estados principais identificados

| Entidade | Estados atuais / esperados |
| --- | --- |
| Tenant | `ativo`, `suspenso`, `inativo` |
| Usuario | `ativo`, `convidado`, `bloqueado`, `inativo` |
| Agendamento | `agendado`, `os_gerada`, `encerrado`, `cancelado` |
| OS | aberta/gerada, encerrada, nao executada, possivel cancelada/reaberta futura |
| Certificado | `emitido`, `revogado` |
| Medicao | `emitida`, `cancelada` |
| Financeiro da medicao | `em_conferencia`, `aguardando_nf`, `nf_enviada`, `aguardando_pagamento`, `pago_no_erp`, `pendente_cliente`, `cancelada` |
| Recorrencia | `pendente`, confirmada/descartada esperada |
| POP | `rascunho`, `ativo`, `inativo` |

## Regras confirmadas ou parcialmente implementadas

- Proposta aprovada pode gerar contrato.
- Contrato comercial pode sincronizar contrato operacional.
- Agenda deve usar contratos vigentes/ativos com saldo.
- OS pode ser gerada a partir de agendamento.
- OS encerrada pode gerar certificado quando servico permitir.
- Certificado tem hash e rota publica.
- Medicao consolida OS por periodo.
- Acompanhamento financeiro e apenas operacional, nao substitui ERP.
- Recorrencia gera sugestao de novo agendamento.

## Regras que precisam de validacao forte

| ID | Regra | Risco |
| --- | --- | --- |
| RN-01 | Nao agendar sem contrato vigente e saldo | Alto, pode gerar execucao sem cobertura contratual. |
| RN-02 | Cancelamento de OS devolve ou nao saldo | Alto, impacto em medicao e contrato. |
| RN-03 | Medicao nao pode duplicar OS | Critico, impacto financeiro. |
| RN-04 | Certificado apenas para servico elegivel | Critico, impacto tecnico/juridico. |
| RN-05 | OS nao encerra sem evidencias obrigatorias | Alto, impacto operacional. |
| RN-06 | Alteracoes posteriores preservam snapshot | Critico, impacto de auditoria. |
| RN-07 | Valores nao aparecem para operacional | Critico, confidencialidade comercial. |
| RN-08 | Datas/fusos usam formato brasileiro e timezone correto | Medio/alto, evita erro de agenda e medicao. |

## Matriz de estados recomendada

| Fluxo | Estado inicial | Estado intermediario | Estado final | Retorno/correcao |
| --- | --- | --- | --- | --- |
| Proposta | Rascunho | Enviada / em negociacao | Aprovada / recusada | Revisao com nova versao |
| Contrato | Rascunho | Vigente | Encerrado / cancelado / vencido | Aditivo / substituicao |
| Agendamento | Agendado | OS gerada | Encerrado / cancelado | Reagendar |
| OS | Gerada | Em campo | Encerrada / nao executada | Reabrir com auditoria |
| Certificado | Elegivel | Emitido | Valido / vencido / revogado | Reemitir com vinculo |
| Medicao | Em preparacao | Emitida | Paga no ERP / cancelada | Cancelar e gerar nova |

