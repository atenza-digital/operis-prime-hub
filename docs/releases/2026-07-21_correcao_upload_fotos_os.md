# Correção de encerramento de OS — upload de fotos

## Diagnóstico

O endpoint de encerramento da OS recebia as fotos originais em Base64. O proxy Nginx da homologação possui limite padrão de corpo de requisição; quando a imagem ultrapassava esse limite, a resposta era `HTTP 413 Request Entity Too Large` em HTML. O frontend convertia essa resposta em uma mensagem genérica: `Erro na API`.

## Correção

- Fotos selecionadas no encerramento são redimensionadas para no máximo 1600 px no maior lado.
- As imagens são convertidas para JPEG e comprimidas antes do envio.
- O formulário continua aceitando até três fotos e preserva a visualização das evidências.
- Respostas HTTP 413 agora exibem uma orientação clara ao usuário.
- O backend continua validando MIME, tamanho, quantidade e persistência imutável das evidências.

## Evidência

- Teste direto em homologação com corpo de 2 MB reproduziu `HTTP 413` no proxy.
- `npm test -- --run`: 25 testes aprovados.
- `npm run lint`: 0 erros e 1 aviso preexistente de Fast Refresh.
- `npm run build`: aprovado.
- `node --check server/index.mjs`: aprovado.

## Validação manual pendente

Após o deploy, encerrar uma OS com uma foto original de celular e confirmar que a OS é encerrada sem o erro genérico. Repetir com três fotos e confirmar que os anexos aparecem na OS, no relatório e no certificado quando aplicável.
