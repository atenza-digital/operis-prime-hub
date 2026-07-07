# Execucao E2E de Homologacao - 2026-07-07

Ambiente: Homologacao

URL: http://89.116.214.65:3010

Versao: `0.6.0`

## Objetivo

Validar o fluxo principal do Atenza FieldOps com foco em aderencia operacional da Ciperprag:

`proposta -> contrato -> agendamento -> OS -> encerramento -> certificado -> medicao -> acompanhamento ate ERP -> recorrencia`

## Resultado executivo

Status geral: Em execucao

Responsavel pela validacao: A definir

Observacao geral: preencher durante a rodada assistida com a equipe usuaria.

## Checklist de execucao

| Ordem | Area | Passo | Resultado esperado | Status | Evidencia |
| --- | --- | --- | --- | --- | --- |
| 01 | Comercial | Criar proposta | Proposta com cliente, itens, valores, vigencia e condicoes | Pendente |  |
| 02 | Comercial | Imprimir proposta | Documento visualmente adequado e legivel | Pendente |  |
| 03 | Comercial | Aprovar proposta | Status aprovado habilita gerar contrato | Pendente |  |
| 04 | Comercial | Gerar contrato | Contrato vigente nasce da proposta aprovada | Pendente |  |
| 05 | Comercial | Sincronizar operacional | Itens do contrato ficam disponiveis para agenda com saldo | Pendente |  |
| 06 | Operacional | Criar agendamento | Somente contrato vigente com saldo aparece | Pendente |  |
| 07 | Operacional | Definir equipe e veiculo | Tecnicos, veiculo, local e tags ficam registrados | Pendente |  |
| 08 | Operacional | Gerar OS | OS herda dados do agendamento e contrato | Pendente |  |
| 09 | Operacional | Imprimir OS | Documento adequado para equipe de campo | Pendente |  |
| 10 | Operacional | Encerrar OS | Retorno de campo registra data, quantidade, tag e fotos | Pendente |  |
| 11 | Qualidade | Gerar certificado | Certificado aparece quando servico permite emissao | Pendente |  |
| 12 | Qualidade | Validar QR Code | Rota publica confirma os dados do certificado | Pendente |  |
| 13 | Historico | Consultar cliente | Servicos com e sem certificado aparecem no historico | Pendente |  |
| 14 | Medicao | Gerar medicao por periodo | OS encerradas entram na medicao e baixam saldo | Pendente |  |
| 15 | Medicao | Atualizar NF/pagamento | Kanban acompanha conferencia, NF, cobranca e baixa manual no ERP | Pendente |  |
| 16 | Recorrencia | Confirmar sugestao | Novo agendamento e criado a partir da recorrencia | Pendente |  |

## Pontos de atencao para a equipe

- O fluxo deve ser simples o suficiente para o usuario entender o proximo passo sem treinamento longo.
- Se algum passo exigir contorno manual, registrar como divergencia.
- Se a tela estiver correta tecnicamente, mas confusa para o usuario, registrar como melhoria de UX.
- Conferir formato brasileiro em datas, horas, moeda e acentuacao.
- Conferir se documentos estao coerentes com dados do cliente, contrato, OS e medicao.

## Registro de divergencias

| ID | Area | Passo | Descricao | Severidade | Evidencia | Acao recomendada | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| HML-E2E-001 |  |  |  |  |  |  | Aberto |

## Evidencias esperadas

- Print da proposta criada.
- PDF ou print da proposta impressa.
- Print do contrato vigente gerado.
- Print do agendamento com saldo operacional.
- PDF da OS impressa.
- Print do encerramento com evidencias.
- PDF ou print do certificado.
- Print da validacao publica do QR Code.
- PDF da medicao.
- Print do kanban/status de acompanhamento da medicao.
- Print da sugestao de recorrencia confirmada.

## Conclusao da rodada

Resultado final: Pendente

Itens aprovados: 0

Itens com ajuste necessario: 0

Decisao: Aguardando execucao assistida.
