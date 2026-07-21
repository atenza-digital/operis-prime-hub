# Plano de Entrega

## Regra geral

A entrega começa pelo P0 Ciperprag. O P1 entra apenas como fundação necessária para tornar o P0 seguro, auditável, isolado e preparado para produção SaaS. O P2 só deve iniciar após validação do P0.

## Sequência P0

| Ordem | Etapa | Resultado esperado | Evidência obrigatória |
| --- | --- | --- | --- |
| 1 | Propostas | Proposta gerada, enviada, aprovada e convertida em contrato/minuta | PDF, print, comparação com referência, teste de fluxo |
| 2 | Contratos e minutas | Contrato criado a partir de proposta aprovada ou modelo do cliente | PDF, matriz de origem, contrato disponível para agendamento |
| 3 | Agendamentos | Serviço agendado com contrato, item, equipe, veículo e recorrência | Teste E2E, print calendário, validação de saldo |
| 4 | Ordens de Serviço | OS gerada, impressa, encerrada e com evidências | PDF, fotos, assinatura, teste de numeração |
| 5 | Certificados | Certificado gerado com QR Code, hash, fotos e validação pública | PDF, rota pública, teste de validação |
| 6 | Relatórios técnicos | Relatório técnico gerado a partir de OS/evidências | PDF e comparação com referência |
| 7 | Medições | Medição consolidada por período, sem duplicidade e com status financeiro simples | PDF, teste de bloqueio de duplicidade, kanban/status |

## Matriz mínima de testes P0

- Proposta com um serviço.
- Proposta com múltiplos serviços.
- Proposta aprovada gerando contrato.
- Contrato vigente liberando agendamento.
- Agendamento com equipe, veículo, local e item de contrato.
- OS gerada a partir de agendamento.
- OS encerrada com fotos, tags e assinatura.
- Certificado gerado somente para serviço permitido.
- Validação pública do certificado por QR Code/hash.
- Relatório técnico com evidências.
- Medição por período.
- Tentativa de medição duplicada.
- Perfil operacional tentando acessar valores comerciais.
- Isolamento de tenant.
- Upload/download de anexo em storage seguro.

## Critério para encerrar P0

O P0 só pode ser considerado concluído quando:

- A matriz de testes estiver executada.
- Os documentos de homologação forem gerados.
- Os documentos forem comparados com as referências da Ciperprag.
- Evidências forem registradas.
- O relatório de prontidão for produzido.
- O resultado for apresentado para validação do dono do produto.

