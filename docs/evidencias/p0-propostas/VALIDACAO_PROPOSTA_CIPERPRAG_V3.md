# Validacao visual - Proposta Ciperprag v4

Data: 2026-07-17.
Ambiente: local/preview (`http://127.0.0.1:4173`).
Publicacao: nao publicada na VPS.
Commit: nao realizado.

## Resultado

- Proposta comercial renderizada em A4 com 3 paginas.
- Cabecalho com logo dinamica do tenant sem distorcao, dados legais e contato alinhados a direita.
- Removida duplicidade visual do nome fantasia no cabecalho.
- Titulo do documento centralizado.
- Corpo documental em Noto Sans com base de 12px; secoes principais em 14px; titulo principal em 16px.
- Rodape repetido com empresa, CNPJ, tipo documental e pagina.
- Acentuacao preservada quando os dados chegam integros da API/banco.
- Estrutura aproximada ao padrao Ciperprag: titulo formal, tabela de identificacao, secoes tecnicas, proposta comercial, condicoes, premissas e assinaturas.
- Corrigido comportamento que criava grande area em branco por posicionamento incorreto do rodape.
- Recuo aplicado em paragrafos corridos e conteudo redistribuido para melhor aproveitamento da pagina 2.

## Arquivos gerados

- PDF: `docs/evidencias/p0-propostas/proposta-ciperprag-padrao-v4.pdf`.
- Render pagina 1: `docs/evidencias/p0-propostas/proposta-ciperprag-padrao-v4-page-1.png`.
- Render pagina 2: `docs/evidencias/p0-propostas/proposta-ciperprag-padrao-v4-page-2.png`.
- Render pagina 3: `docs/evidencias/p0-propostas/proposta-ciperprag-padrao-v4-page-3.png`.

## Observacao de dados

Dados ja gravados com `??` no banco nao podem ser reconstruidos automaticamente pelo frontend. A validacao final com dados reais exige saneamento dos cadastros/seed de homologacao antes do teste assistido.
