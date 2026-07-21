# Retorno do Tarcísio — Revalidação v1.5

## Identificação

- Validador: Tarcísio Lucas
- Data: 21/07/2026
- Ambiente: `https://fieldops-homologacao.atenza.digital`
- Roteiro: `Roteiro_Validacao_Regressao_Atenza_FieldOps_Tarcisio_v1.5.pdf`

## Resultado geral

O validador marcou que a Etapa 7 pode ser encerrada. A rodada confirmou os principais ajustes publicados, mas deixou duas ocorrências de melhoria para tratamento rastreável antes do fechamento administrativo definitivo.

## Itens validados

| ID | Área | Resultado |
| --- | --- | --- |
| RET-01 | Dashboard e cards do fluxo recomendado | Aprovado |
| RET-02 | Ordenação dos contratos mais recentes | Aprovado |
| RET-03 | Assinaturas da proposta | Reprovado: ao gerar uma nova proposta, o problema de assinatura ainda ocorre |
| RET-04 | Detalhes do agendamento | Aprovado com ressalva: exibir também equipe e veículo na visualização das informações |
| RET-05 | Certificados por TAG | Aprovado |
| RET-06 | Consistência dos certificados com a OS | Aprovado |
| RET-07 | QR Code em tela e em papel A4 | Aprovado |

## Ocorrências abertas

### HML-RET-03 — Assinatura da nova proposta

O Tarcísio informou que o bug de assinatura continua ao gerar uma nova proposta. Deve ser reproduzido criando uma proposta nova, abrindo o PDF e verificando a página de aceite, com as duas assinaturas na mesma linha, alinhadas e sem corte.

### HML-RET-04 — Visualização da agenda

Além do detalhe de equipe e veículo no agendamento, foi solicitado evoluir a agenda para permitir visualização mensal e anual. A solicitação permanece classificada como melhoria de UX da agenda e continua alocada no roadmap, sem bloquear o aceite funcional informado pelo validador.

## Evidência positiva

O QR Code foi lido em tela e em papel A4 por dois leitores Samsung. Foi registrada a URL pública `https://fieldops-homologacao.atenza.digital/validar-certificado/72UJ-HJKV`, confirmando a validação pública do certificado correspondente.

## Próxima decisão técnica

1. Reproduzir e corrigir HML-RET-03, pois é uma divergência funcional no documento comercial.
2. Avaliar HML-RET-04 como melhoria de agenda, preservando os filtros já existentes e adicionando as visualizações solicitadas de forma coerente.
3. Após a correção da assinatura, solicitar uma última confirmação do PDF da proposta e então encerrar formalmente a Etapa 7.
