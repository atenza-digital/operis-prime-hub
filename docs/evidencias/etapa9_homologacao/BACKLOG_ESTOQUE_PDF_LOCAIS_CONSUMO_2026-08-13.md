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
- Corrigir a validacao de acesso de Produtos e estoque: o item nao apareceu no menu Comercial e a rota direta apresentou tela em branco no teste da Aline. A tela deve aparecer para perfis autorizados e exibir mensagem clara para perfis sem permissao.

## Evidencia adicional de homologacao - 19/08/2026

- Rota testada: `/comercial/produtos`.
- Resultado observado: item Produtos e estoque ausente do menu Comercial; acesso direto sem conteudo visivel.
- Regra esperada: o modulo usa a permissao `servicos.manage`, a mesma liberacao do catalogo de Servicos. A ausencia do item em uma versao que exibe Servicos indica build de homologacao desatualizada ou divergencia de permissao.
- Correcao aplicada no codigo: rotas sem permissao agora exibem uma tela de Acesso restrito com orientacao, em vez de deixar a interface em branco.
- Validacao pendente: publicar pelo CI/CD e repetir o teste com o perfil da Aline.

## Observacao

O deploy deve continuar sendo feito exclusivamente pelo workflow de CI/CD. Nenhuma alteracao foi aplicada diretamente na VPS nesta rodada.

## Etapa seguinte - OS e atendimentos avulsos - 19/08/2026

- A OS impressa deixou de repetir `COLABORADOR` e `Data de Admissao` no cabecalho. Tecnico lider, data de execucao, checklist, fotos e demais evidencias continuam no encerramento e no snapshot.
- A agenda agora permite escolher `Servico avulso (sem contrato)` para clientes ativos sem contrato ou sem saldo, sempre usando um servico ativo do catalogo.
- O backend valida cliente e servico por tenant, preserva contratos vigentes com saldo e impede que o atendimento avulso consuma saldo contratual.
- Agendamento avulso pode gerar OS, encerrar OS e criar recorrencia sem contrato quando o servico tiver recorrencia configurada.
- A coluna `servico_catalogo_id` foi adicionada a agendamentos e recorrencias pela migracao `028_avulso_agendamento_servico_catalogo.sql`.
- Commit: `17a85b3`.
- Pipeline CI/CD: `32293207157` - sucesso; deploy feito sem SSH manual.

### Validacao manual pendente

1. Abrir `https://fieldops-homologacao.atenza.digital/agendar` com um cliente sem contrato.
2. Selecionar `Servico avulso (sem contrato)`, escolher servico, data e local, e criar o agendamento.
3. Gerar a OS e imprimir a via; confirmar que o cabecalho nao mostra nome do colaborador nem data de admissao.
4. Encerrar a OS informando tecnico, data, quantidade e evidencias; confirmar que os dados permanecem no encerramento e no documento final.
5. Repetir com um cliente que tenha contrato vigente e saldo, confirmando que o fluxo contratual continua exigindo contrato e saldo.
