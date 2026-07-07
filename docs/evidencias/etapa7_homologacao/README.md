# Evidencias - Etapa 7 Homologacao Guiada

Esta pasta deve concentrar prints, PDFs, observacoes e resultados da homologacao ponta a ponta.

## Padrao de nomes

Use nomes curtos e numerados:

- `01-proposta-criada.png`
- `02-contrato-gerado.png`
- `03-agendamento-com-saldo.png`
- `04-os-impressa.pdf`
- `05-os-encerrada-evidencias.png`
- `06-certificado-validacao-qr.png`
- `07-medicao-acompanhamento.png`
- `08-recorrencia-confirmada.png`

## Fluxo coberto

`proposta -> contrato -> agenda -> OS -> encerramento -> certificado -> medicao -> recorrencia`

## Arquivos de controle

- `EXECUCAO_E2E_2026-07-07.md`: ficha de execucao da rodada assistida.
- `auditoria-e2e-dados.md`: relatorio tecnico gerado pelo comando `npm run audit:e2e`.

## Auditoria tecnica

Execute quando quiser conferir rapidamente a coerencia da base de homologacao:

```bash
npm run audit:e2e
```

O comando nao altera dados. Ele gera um resumo com contagens por status e pontos que precisam ser verificados no fluxo.

## Observacoes

- Prints devem ocultar dados sensiveis se forem enviados fora do ambiente interno.
- Toda divergencia deve ser registrada tambem no roteiro `docs/cliente/ROTEIRO_HOMOLOGACAO_E2E.md`.
- Evidencias aprovadas podem ser promovidas depois para `docs/validados`.
