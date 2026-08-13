# Entrega tecnica - estoque, importacao PDF, locais e documentos

Data: 13/08/2026
Ambiente de desenvolvimento: Docker/PostgreSQL configurado no projeto
Ambiente alvo: homologacao via GitHub Actions

## Entregue

- Estoque por tenant com produtos, saldo minimo, movimentacoes auditadas e baixa de saida vinculada a OS/servico.
- Smoke transacional executado com entrada de 12 unidades, saida de 3 unidades, saldo final 9 e limpeza automatica.
- Extracao local deterministica de texto e tabelas delimitadas do PDF, antes da assistencia da OpenAI.
- PDF original de referencia persistido com conteudo, hash SHA-256, texto, paginas, tabelas e cobertura.
- Endpoint autenticado para baixar o PDF original preservado.
- Locais cadastrados do cliente selecionaveis no agendamento e propagados para OS e recorrencia.
- Historico/relatorio de consumo por periodo, produto e OS, com resumo por tipo de movimento.
- Renderizacao server-side com Chromium e persistencia dos documentos historicos como `application/pdf`, hash e `imutavel = TRUE`.

## Evidencias tecnicas

| Verificacao | Resultado |
| --- | --- |
| TypeScript | Aprovado |
| ESLint | Aprovado, 1 warning preexistente de Fast Refresh |
| Vitest | 41 testes aprovados |
| Extracao deterministica | 4 paginas, 2 tabelas, 10 linhas no PDF de referencia |
| Renderizador server-side | Assinatura `%PDF-` e 30.881 bytes no teste local |
| Smoke de estoque | Aprovado no tenant `ciperprag`; saldo 9; 2 movimentos; limpeza concluida |
| Build Vite | Aprovado |

## Pendencias de aceite

- Executar o smoke dentro do container da homologacao por meio da pipeline apos o PR ser revisado e entrar na branch de deploy.
- Conferir visualmente os PDFs server-side de OS, proposta, contrato, certificado e medicao contra as referencias aprovadas.
- Revalidar com Tarcisio/Aline os fluxos de estoque, importacao de PDF, selecao de locais e relatorio de consumo.

## Observacao

O deploy deve continuar sendo feito exclusivamente pelo workflow de CI/CD. Nenhuma alteracao foi aplicada diretamente na VPS nesta rodada.
