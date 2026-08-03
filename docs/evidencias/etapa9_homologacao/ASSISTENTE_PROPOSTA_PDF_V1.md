# Assistente de proposta por PDF - Versao 1

## Entrega

Foi implementado um fluxo assistido para reduzir a digitacao na criacao de propostas:

1. O usuario seleciona um PDF de referencia dentro de `Comercial > Contratos e Propostas`.
2. O backend valida o arquivo como PDF, tamanho e assinatura do conteudo.
3. O PDF e enviado temporariamente para a API da OpenAI, somente pelo backend.
4. O modelo devolve um rascunho estruturado com cliente, servicos, quantidades, valores, frequencias, locais, escopo e condicoes.
5. O backend reconcilia cliente e servicos com os cadastros ativos do tenant. Nenhum ID desconhecido e aceito para gravacao.
6. A interface preenche o formulario para revisao. A proposta so e criada quando o usuario confirma o salvamento.
7. O PDF de referencia pode ser anexado ao registro da proposta, com hash e storage conforme a politica documental do tenant.

## Protecoes

- `OPENAI_API_KEY` nunca e enviado ao navegador.
- A funcionalidade e opt-in por `OPENAI_PROPOSAL_ASSIST_ENABLED=true`.
- O arquivo remoto temporario e excluido da OpenAI ao final da analise.
- O resultado e sempre um rascunho e exibe campos pendentes/avisos para revisao.
- Servicos fora do catalogo ativo sao bloqueados no backend.
- O contexto enviado a API contem somente os campos necessarios de clientes e servicos do tenant autenticado.
- A solicitacao e registrada na auditoria sem salvar o conteudo do PDF ou o prompt.

## Configuracao

No ambiente de homologacao, configurar os secrets/variaveis no servidor, nunca no frontend:

```env
OPENAI_PROPOSAL_ASSIST_ENABLED=true
OPENAI_API_KEY=<chave-do-projeto-openai>
OPENAI_MODEL=gpt-4o-mini
```

Sem a chave ou com a funcionalidade desabilitada, o fluxo atual de criacao manual continua funcionando e a interface informa que a assistencia esta indisponivel.

## Validacao pendente

- Configurar a chave no ambiente de homologacao por secret seguro.
- Testar com os PDFs reais enviados pela Ciperprag, incluindo proposta com varios servicos e tabela extensa.
- Confirmar custos, politica de dados e limites do projeto OpenAI antes de uso recorrente.
- Validar leitura de PDF escaneado; quando o conteudo nao for legivel, o sistema deve manter campos pendentes para revisao humana.
