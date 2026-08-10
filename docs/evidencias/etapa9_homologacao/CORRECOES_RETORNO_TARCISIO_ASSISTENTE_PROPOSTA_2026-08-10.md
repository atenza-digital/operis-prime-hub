# Correcoes ATZ-01 e ATZ-02 - Assistente de proposta

## Origem

Retorno registrado no relatorio `Relatorio_de_Testes_Atenza_FieldOps_07-08-2026.docx`, enviado pelo Tarcisio.

## Correcoes aplicadas

- ATZ-01: cada leitura de PDF agora possui um identificador e um `AbortController` proprio. Ao abrir outra proposta, selecionar outro arquivo ou fechar o dialogo, a leitura anterior e cancelada e nao pode sobrescrever a tela atual.
- ATZ-01: a leitura possui limite de 90 segundos no navegador e no servidor. Ao exceder o limite, a interface informa o motivo e orienta tentar novamente com um PDF menor ou mais legivel.
- ATZ-01: foi incluido o botao `Cancelar analise` para permitir que o usuario encerre uma leitura manualmente.
- ATZ-02: propostas passaram a exibir separadamente o valor mensal estimado e o valor total estimado do contrato, calculado como valor mensal multiplicado pela vigencia em meses.

## Evidencias tecnicas

- Testes especificos: 4 aprovados.
- Suite completa: 33 testes aprovados em 6 arquivos.
- Build de producao: aprovado.
- Sintaxe do servidor: aprovada com `node --check server/proposal-ai.mjs`.
- Lint dos arquivos alterados: aprovado.

## Revalidacao manual

1. Abrir `https://fieldops-homologacao.atenza.digital/login` e entrar com o usuario de homologacao.
2. Acessar `Comercial > Contratos e propostas > Nova proposta`.
3. Selecionar um PDF, iniciar a leitura e fechar a proposta ou abrir outra antes da conclusao. Confirmar que nenhum dado da leitura anterior aparece na nova proposta.
4. Repetir a leitura com tres propostas consecutivas, confirmando que cada rascunho corresponde ao PDF selecionado.
5. Alterar a vigencia e os itens da proposta. Confirmar que o valor mensal e o valor total estimado do contrato atualizam automaticamente.
6. Registrar o resultado no roteiro de regressao, incluindo prints quando houver divergencia.

## Status

Correcao tecnica concluida. Aguardando revalidacao manual do Tarcisio em homologacao.
