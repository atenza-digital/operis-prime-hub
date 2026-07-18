# Responsividade e acessibilidade

## Testes executados

Foram capturadas telas em:

- Desktop: 1440x900.
- Tablet: 834x1112.
- Mobile: 390x844.

Resultados em: `docs/auditoria-completa/evidencias/playwright/exploratory-results.json`

## Achados

| ID | Achado | Severidade |
| --- | --- | --- |
| RESP-01 | A experiencia mobile existe, mas ainda nao parece otimizada para uso de campo. | Alto |
| RESP-02 | Telas administrativas carregam muitos campos no mobile, especialmente parametros do tenant. | Medio |
| RESP-03 | A navegacao mobile precisa priorizar a tarefa atual e reduzir ruido. | Medio |
| RESP-04 | Nao ha evidencia de testes com teclado/leitor de tela. | Alto |
| RESP-05 | Contraste dos textos do menu lateral ja foi apontado pelo usuario e ainda precisa padrao final. | Medio |
| RESP-06 | Alvos de clique e formularios de OS/campo precisam ser validados em celular real. | Alto |

## Prioridade mobile por funcionalidade

| Funcao | Prioridade mobile |
| --- | --- |
| Consultar agenda | Alta |
| Abrir OS atribuida | Alta |
| Checklist | Alta |
| Fotos/evidencias | Alta |
| Assinatura | Alta |
| Certificado | Media |
| Medicao | Baixa/media |
| Proposta/contrato | Baixa/media |
| Parametros do tenant | Baixa |
| Usuarios/perfis | Baixa |

## Criterios WCAG 2.2 AA a validar

- Contraste minimo em menu, badges e botoes.
- Foco visivel em todos os campos e botoes.
- Navegacao por teclado sem armadilhas em modais.
- Labels associadas aos campos.
- Mensagens de erro lidas por tecnologia assistiva.
- Tamanho minimo de alvo clicavel.
- Nao depender apenas de cor para status.

