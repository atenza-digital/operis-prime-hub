# Correção da assinatura da proposta — 21/07/2026

## Escopo

Tratamento da ocorrência HML-RET-03 registrada no retorno de regressão v1.5 do Tarcísio. O visual aprovado da proposta foi preservado; somente a geometria do bloco de assinaturas foi reforçada.

## Ajuste aplicado

- Duas colunas com largura mínima explícita.
- Linhas de assinatura na mesma posição vertical.
- Altura reservada igual para as duas colunas.
- Nome, responsável, cargo e indicação de assinatura dentro de áreas previsíveis.
- Quebra de página bloqueada no bloco completo e em cada coluna.
- Aplicado também ao bloco equivalente de contrato/minuta para evitar a mesma regressão documental.

## Evidência gerada

- PDF: `docs/evidencias/p0-propostas/proposta-ciperprag-padrao-v5-ritmo.pdf`
- Página de aceite em PNG: `docs/evidencias/p0-propostas/proposta-ciperprag-padrao-v5-ritmo-page-4.png`
- Amostra completa: `docs/evidencias/p0-propostas/proposta-ciperprag-padrao-v5-ritmo-full.png`

## Validações

- A proposta foi renderizada novamente no ambiente local de preview.
- O PDF manteve 4 páginas, sem página adicional ou página em branco.
- A página de aceite manteve cidade/data, resumo, duas assinaturas e rodapé.
- Inspeção visual confirmou linhas de assinatura niveladas e sem corte ou sobreposição.
- O script de evidência falha se não houver exatamente duas colunas ou se as linhas/alturas divergirem.
- `npx eslint src/pages/comercial/Contratos.tsx scripts/render-proposal-evidence.mjs`: aprovado.
- `node --check scripts/render-proposal-evidence.mjs`: aprovado.
- `npm test -- --run`: 3 arquivos e 25 testes aprovados.
- `npm run build`: aprovado.
- `git diff --check`: aprovado.

## Situação de homologação

O código está pronto para subir pela pipeline e precisa de uma nova conferência humana do Tarcísio gerando uma proposta nova. A Etapa 7 permanece em validação até essa confirmação final; a melhoria de agenda continua separada no roadmap.
