# Guia de Homologacao Operacional

Ambiente: Homologacao

URL: https://fieldops-homologacao.atenza.digital/login

## Objetivo

Validar o fluxo operacional do Atenza FieldOps usando os dados de homologacao da Ciperprag.

## Roteiro completo

Para homologacao ponta a ponta, usar tambem:

- `docs/cliente/ROTEIRO_HOMOLOGACAO_E2E.md`

Esse roteiro detalha os testes por area: Comercial, Operacional, Certificados/Historico e Medicao.

## Fluxo recomendado

1. Acessar a plataforma e confirmar que o badge `Homologacao` esta visivel.
2. Criar ou revisar proposta comercial.
3. Aprovar proposta e gerar contrato, ou cadastrar contrato do cliente quando houver modelo proprio.
4. Confirmar que o contrato vigente liberou saldo operacional para agenda.
5. Fazer agendamento com equipe, veiculo, local e tags/equipamentos.
6. Gerar OS a partir do agendamento.
7. Imprimir/visualizar a OS para equipe de campo.
8. Encerrar OS com data, quantidade, tag quando houver e evidencias.
9. Conferir se certificado e historico foram atualizados quando o servico permitir certificado.
10. Conferir medicao com base no periodo do servico executado.
11. Atualizar acompanhamento da medicao: NF enviada, aguardando pagamento, cobrar cliente quando necessario e pago no ERP.
12. Confirmar sugestao de recorrencia quando aplicavel.

## Pontos de atencao

- Homologacao nao deve ser usada como producao.
- Divergencias em OS, certificado, contrato, proposta ou medicao devem ser registradas com print e numero do documento.
- Alteracoes visuais nos documentos devem ser validadas por PNG antes de aprovacao.
- O financeiro formal permanece no ERP; no Atenza FieldOps a medicao serve para acompanhamento operacional, NF, cobranca e baixa manual no ERP.
