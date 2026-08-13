# Retorno Aline - implementacao local

Data: 12/08/2026
Ambiente: Docker local, banco `atenza_local`, schema `ciperprag_hub`

## Entregas implementadas

- Produtos e estoque persistidos por tenant.
- Entradas, saidas, ajustes, devolucoes e perdas com saldo anterior/posterior.
- Baixa de produtos informados no encerramento da OS, vinculada a OS e servico.
- Produtos previstos relacionados ao cadastro de servicos.
- Frequencia individual por item na estimativa da proposta; `120 dias` nao e tratado como mensal.
- Multiplos enderecos por atividade, um por linha, preservados no snapshot.
- Assistente de PDF com cobertura declarada e pendencias de interpretacao.

## Evidencias tecnicas

- `node --check server/index.mjs server/db.mjs server/proposal-ai.mjs`: aprovado.
- `npx tsc --noEmit --pretty false`: aprovado.
- `npx vitest run --pool=threads --maxWorkers=1`: 8 arquivos, 41 testes aprovados.
- `npm run build`: aprovado.
- `ensureDatabaseShape()` no PostgreSQL local: tabelas `produtos_estoque`, `estoque_movimentacoes` e `servicos_catalogo_produtos` criadas/confirmadas.
- Contagem inicial local: 0 produtos, 0 movimentos e 0 vinculos; nenhum dado de teste foi inserido automaticamente.

## Limites conhecidos

- A leitura completa e deterministica de tabelas do PDF e a preservacao do PDF original como anexo imutavel ainda precisam de uma etapa propria.
- A selecao de locais cadastrados diretamente na atividade/agendamento ainda deve substituir o texto livre na validacao final.
- A publicacao em homologacao deve ocorrer pelo CI/CD apos revisao do PR e smoke autenticado.
