# Ajustes da validacao Aline - 24/09/2026

## Escopo entregue

- OS sem nome/CPF/data de admissao no cabecalho; colaborador permanece no bloco de assinatura.
- Atividades independentes adicionaveis, editaveis e removiveis antes do encerramento, com servico, quantidade, local livre, equipamento, checklist, fotos e consumo por item.
- Certificados individuais por atividade executada habilitada para emissao, sem copiar fotos entre equipamentos.
- Listas de documentos com ordenacao decrescente; certificados nao revertem mais a ordem recebida da API.
- Encerramento e geracao de OS idempotentes, inclusive com requisicoes concorrentes. Saldo contratual e estoque bloqueados durante a transacao.
- Medicao por atividade, preservando precos da execucao; numeracao isolada por tenant.
- PDFs novos de OS, certificado e medicao usam os renderizadores documentais compartilhados, Montserrat local incorporada, tags e metadados UTF-8.
- Arquivos emitidos sao persistidos e baixados sem recalcular o documento com dados atuais. PDFs antigos nao sao sobrescritos.
- Configuracao visual existente do tenant nao e substituida automaticamente no deploy.
- Relatorios tecnicos incluem atividades e todas as fotos individualizadas; snapshots financeiros nao sao expostos ao operacional.
- Locais automaticos herdam o tenant do cliente. A inicializacao corrige apenas os locais deterministicos criados pela rotina antiga, sem substituir locais manuais.
- OS usa a empresa emissora tambem no texto de recebimento; medicao mantem a ultima linha junto do total, evitando cabecalho de tabela sem itens.

## Testes reproduziveis

1. `npm ci`, `npm run lint`, `npm run typecheck`, `npm test -- --run`, `npm run build`.
2. `npm run test:server-pdf` valida Montserrat, metadados e arvore semantica.
3. `npm run test:operational-flow` cria tenant QA isolado. Com `OPERATIONAL_TEST_UI=1`, valida tambem desktop/mobile e acesso ao estoque. Ao terminar, desativa o tenant e o usuario temporario, preservando evidencias.
4. `python scripts/validate-operational-pdfs.py <pasta>` inspeciona fontes incorporadas/subset, paginas sem conteudo, idioma, tags, metadados e paginacao, e renderiza todas as paginas.

O fluxo cobre cinco equipamentos, fotos distintas, bloqueios de saldo e quantidade, repeticao concorrente, reemissao individual, agendamento avulso e imutabilidade apos alteracao cadastral.

## Homologacao

Publicacao somente pelo workflow `Deploy Homologacao VPS`. O workflow repete o teste pela URL publica, coleta os PDFs e prints da aplicacao implantada e publica o artefato `homologacao-aline-<commit>`.

O merge em main continua sujeito a revisao formal. O workflow pode validar uma branch em homologacao sem remover a protecao de main.

## Compatibilidade

A migracao 030 adiciona atividades e identificacao por certificado/item medido. O indice de medicao conserva o nome reconhecido pela versao anterior, para permitir inicializacao durante rollback. Arquivos emitidos e snapshots anteriores ficam preservados.

Certificados legados sem evidencia separada por equipamento nao sao redistribuidos automaticamente: e necessario registrar uma execucao individualizada. Imagens documentais server-side devem ser uploads incorporados; referencias externas nao sao acessadas pelo renderizador.

Validacao fisica de impressao e leitura por aparelhos continua sendo uma etapa humana. Os testes tecnicos nao substituem a conferencia da Aline sobre os dados de campo.
