# Evidência — visibilidade de valores por perfil

Data: 12/08/2026  
Ambiente: desenvolvimento local com Docker/PostgreSQL  
Escopo: `AF-P0-004`

## Regra aplicada

- Usuários com `contratos.manage` recebem valores unitários de contratos e propostas.
- Usuários sem `contratos.manage`, incluindo operação, não recebem `valorUnitario` no bootstrap.
- Usuários com `medicoes.manage` recebem total e valores das medições.
- Usuários sem `medicoes.manage` recebem somente a estrutura operacional da medição, sem `total`, `valorUnitario` ou `valorTotal`.
- A regra é aplicada no backend, antes da resposta de `/api/bootstrap`; ocultar campos somente na interface não é considerado suficiente.

## Implementação

- `server/commercial-visibility.mjs` centraliza as decisões de visibilidade.
- `server/index.mjs` sanitiza `contracts`, `contractTemplates` e `measurements` conforme as permissões da sessão.
- O tenant e os registros históricos não são alterados; apenas a projeção entregue ao perfil é filtrada.

## Testes

- Operação sem `contratos.manage`: valores de contratos/propostas removidos.
- Comercial com `contratos.manage`: valores preservados.
- Operação sem `medicoes.manage`: totais e valores de medição removidos.
- Financeiro com `medicoes.manage`: valores preservados.

Resultado: aprovado na suíte automatizada, com 3 cenários de visibilidade adicionados.

## Limites conhecidos

- A matriz granular de permissões por módulo continua sendo uma evolução administrativa do backlog.
- A homologação externa deve confirmar que nenhum usuário operacional possui, por engano, uma permissão comercial ou financeira.
- O deploy de homologação deve ocorrer somente pelo workflow de CI/CD após aprovação/revisão do PR.
