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
- `smoke-vps-api.md`: verificacao tecnica da API publicada na VPS.
- `execucao-tecnica-e2e-vps.md`: execucao automatizada de escrita do fluxo principal na VPS.

## Auditoria tecnica

Execute quando quiser conferir rapidamente a coerencia da base de homologacao:

```bash
npm run audit:e2e
```

O comando nao altera dados. Ele gera um resumo com contagens por status e pontos que precisam ser verificados no fluxo.

## Smoke da VPS

Execute antes de liberar uma rodada de teste para usuarios:

```bash
npm run homologation:smoke-vps
```

O comando valida login, endpoints protegidos, bootstrap com dados reais e validacao de certificado na URL publicada.

## E2E tecnico de escrita

Execute quando precisar validar o fluxo principal criando dados reais de homologacao:

```bash
npm run homologation:e2e-vps
```

O comando cria uma rodada identificavel com prefixo `E2E`, passando por proposta, contrato, agendamento, OS, encerramento, certificado, medicao e recorrencia quando o servico escolhido permitir.

## Observacoes

- Prints devem ocultar dados sensiveis se forem enviados fora do ambiente interno.
- Toda divergencia deve ser registrada tambem no roteiro `docs/cliente/ROTEIRO_HOMOLOGACAO_E2E.md`.
- Evidencias aprovadas podem ser promovidas depois para `docs/validados`.
