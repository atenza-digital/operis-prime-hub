# Roteiro de Homologacao E2E - Atenza FieldOps

Ambiente: Homologacao

URL: http://89.116.214.65:3010

Versao base: `0.6.0`

## Objetivo

Validar se o fluxo principal esta logico, simples e aderente ao uso real da Ciperprag:

`proposta -> contrato -> agendamento -> OS -> encerramento -> certificado -> medicao -> acompanhamento ate ERP -> recorrencia`

## Regras da homologacao

- Testar somente na base de homologacao.
- Registrar print, numero do documento e passo do roteiro quando encontrar divergencia.
- Nao considerar uma etapa aprovada se o usuario precisou adivinhar o proximo passo.
- Validar dados em formato brasileiro: data, hora, moeda, acentuacao e nomes.
- Confirmar se a orientacao contextual da tela ajudou ou se ficou confusa.

## Perfis recomendados para teste

- Comercial: proposta, contrato, cliente, servico/produto e modelo do cliente.
- Operacional: agendamento, equipe, veiculo, OS, encerramento e recorrencia.
- Responsavel tecnico/qualidade: certificado, evidencias, QR Code e historico.
- Medicao/administrativo: consolidacao de OS, NF enviada, cobranca, pagamento e baixa manual no ERP.

## Fluxo 1 - Comercial: proposta ate contrato

### Objetivo

Confirmar que o usuario consegue iniciar pelo comercial, enviar proposta e liberar o contrato para operacao.

### Passos

1. Acessar Comercial > Clientes e confirmar que o cliente de teste existe.
2. Acessar Comercial > Servicos e confirmar que os servicos/produtos usados na proposta existem.
3. Acessar Comercial > Contratos.
4. Clicar em `Nova Proposta`.
5. Selecionar cliente, servicos/produtos, quantidades, valores, vigencia e forma de pagamento.
6. Salvar como rascunho ou enviado.
7. Imprimir/visualizar a proposta.
8. Alterar o status para `Aprovado`.
9. Clicar em `Gerar contrato`.
10. Confirmar que o contrato gerado ficou `Vigente`.
11. Confirmar que o contrato aparece como integrado/liberado para operacional.

### Criterios de aceite

- A proposta deixa claro cliente, itens, valores, vigencia e condicoes.
- O contrato nao precisa ser recriado manualmente quando a proposta e aprovada.
- O contrato gerado cria itens operacionais para agenda.
- O usuario entende quando deve usar `Contrato do cliente`.

## Fluxo 2 - Contrato do cliente

### Objetivo

Validar o caminho alternativo quando o cliente possui modelo proprio de contrato.

### Passos

1. Acessar Comercial > Contratos.
2. Clicar em `Contrato do cliente`.
3. Selecionar cliente, itens contratados, quantidades, valores e vigencia.
4. Confirmar que o status inicial e `Vigente`.
5. Salvar.
6. Confirmar que os itens aparecem para agendamento com saldo operacional.

### Criterios de aceite

- O usuario entende que este caminho substitui a proposta quando ja existe contrato do cliente.
- O contrato vigente libera agenda sem exigir acao duplicada.

## Fluxo 3 - Agendamento operacional

### Objetivo

Confirmar que apenas contratos vigentes e com saldo operacional aparecem para agendamento.

### Passos

1. Acessar Agendamentos.
2. Ler as orientacoes da tela.
3. Selecionar cliente.
4. Selecionar contrato/servico.
5. Confirmar que o seletor mostra o saldo operacional.
6. Definir data.
7. Definir local de execucao.
8. Selecionar tags/equipamentos quando houver.
9. Selecionar tecnicos.
10. Selecionar veiculo quando aplicavel.
11. Salvar agendamento.
12. Gerar OS a partir do agendamento.
13. Imprimir a via da equipe.

### Criterios de aceite

- Nao deve ser possivel agendar item sem saldo.
- A equipe entende que o proximo passo e gerar/imprimir OS.
- Tecnicos, veiculo, local e tags chegam preenchidos na OS.

## Fluxo 4 - OS de campo

### Objetivo

Confirmar que a OS guia o retorno de campo e gera base para historico, certificado e medicao.

### Passos

1. Acessar Ordens de Servico.
2. Localizar a OS gerada.
3. Imprimir a OS.
4. Abrir a OS e conferir cliente, contrato, servico, tecnico, equipe, local e tag.
5. Clicar em `Encerrar OS`.
6. Informar data de execucao.
7. Informar quantidade executada.
8. Selecionar tag/equipamento atendido quando houver.
9. Preencher checklist quando houver.
10. Anexar ate 3 fotos.
11. Encerrar OS.

### Criterios de aceite

- O encerramento nao e burocratico.
- Fotos ficam vinculadas ao historico.
- OS encerrada entra para certificado quando aplicavel.
- OS encerrada entra para medicao do periodo.

## Fluxo 5 - Certificado e historico

### Objetivo

Validar certificado, QR Code, consulta publica e historico de servicos.

### Passos

1. Acessar Certificados e Historico.
2. Conferir se a OS encerrada aparece como pendente quando o servico permite certificado.
3. Gerar certificado.
4. Imprimir/visualizar o certificado.
5. Conferir dados dinamicos: cliente, CNPJ, servico, OS, tecnico, local, data, tag, fotos e produtos quando houver.
6. Ler o QR Code ou abrir a rota publica de validacao.
7. Confirmar se os dados da validacao batem com o certificado.
8. Acessar a aba Historico.
9. Confirmar que servicos com e sem certificado aparecem no historico.

### Criterios de aceite

- O certificado deve parecer institucional e aderente ao modelo aprovado.
- QR Code deve facilitar validacao contra fraude.
- Historico nao deve esconder servicos sem certificado.

## Fluxo 6 - Medicao e acompanhamento ate ERP

### Objetivo

Confirmar que a medicao consolida OS encerradas e acompanha NF/pagamento sem substituir o ERP.

### Passos

1. Acessar Medicao.
2. Ler as orientacoes sobre medicao operacional e ERP.
3. Selecionar cliente.
4. Selecionar periodo.
5. Confirmar que aparecem apenas OS encerradas, nao medidas e dentro do periodo.
6. Gerar medicao.
7. Imprimir/visualizar PDF da medicao.
8. Atualizar status para `Aguardando NF`.
9. Informar numero da NF e data de envio.
10. Atualizar status para `NF enviada`.
11. Atualizar status para `Aguardando pagamento` se necessario cobrar.
12. Atualizar status para `Pago no ERP` quando a baixa manual for feita no ERP.

### Criterios de aceite

- A tela nao deve parecer contas a receber completo.
- Deve ficar claro que o ERP continua dono da baixa financeira formal.
- A medicao deve permitir acompanhar clientes que precisam de cobranca.

## Fluxo 7 - Recorrencia

### Objetivo

Validar se servicos recorrentes sugerem novo agendamento apos conclusao.

### Passos

1. Encerrar uma OS de servico com recorrencia.
2. Voltar ao Dashboard ou Agendamentos.
3. Verificar se aparece sugestao de recorrencia.
4. Confirmar a sugestao.
5. Conferir se novo agendamento foi criado na agenda.

### Criterios de aceite

- A sugestao deve ser clara e facil de confirmar ou dispensar.
- O novo agendamento deve reiniciar o fluxo operacional sem retrabalho.

## Matriz de aceite

| Area | Item | Resultado esperado | Status | Observacao |
| --- | --- | --- | --- | --- |
| Comercial | Proposta | Proposta criada, impressa e aprovada | Pendente |  |
| Comercial | Contrato por proposta | Contrato vigente gerado e integrado | Pendente |  |
| Comercial | Contrato do cliente | Contrato vigente libera saldo operacional | Pendente |  |
| Operacional | Agendamento | Contrato com saldo aparece e gera agenda | Pendente |  |
| Operacional | OS | OS gerada, impressa e encerrada com evidencias | Pendente |  |
| Qualidade | Certificado | Certificado gerado com QR Code e dados corretos | Pendente |  |
| Qualidade | Historico | Historico lista servicos com e sem certificado | Pendente |  |
| Medicao | Consolidacao | OS encerradas entram na medicao por periodo | Pendente |  |
| Medicao | Acompanhamento | NF/pagamento/ERP acompanhados corretamente | Pendente |  |
| Operacional | Recorrencia | Novo agendamento sugerido e confirmado | Pendente |  |

## Registro de divergencias

| ID | Area | Passo | Descricao | Evidencia | Severidade | Responsavel | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| HML-001 |  |  |  |  |  |  | Aberto |

## Classificacao de severidade

- Alta: impede continuar o fluxo ou gera documento incorreto.
- Media: confunde o usuario, mas existe contorno seguro.
- Baixa: ajuste visual, texto, acento ou melhoria de conveniencia.

