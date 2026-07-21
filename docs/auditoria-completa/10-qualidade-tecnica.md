# Qualidade tecnica e desempenho percebido

## Resultado dos comandos

| Comando | Resultado |
| --- | --- |
| `npm run lint` | Aprovado |
| `npm run test` | Aprovado, 11 testes |

## Pontos tecnicos observados

| ID | Achado | Severidade |
| --- | --- | --- |
| TEC-01 | `Suspense` global causa sensacao de recarregamento entre telas autenticadas. | Alto |
| TEC-02 | `/api/bootstrap` carrega muitos dominios de uma vez. | Medio |
| TEC-03 | Documentos ainda usam `window.print()` em partes do fluxo. | Alto |
| TEC-04 | Arquivos base64 no banco afetam escala. | Alto |
| TEC-05 | Alguns componentes/telas sao grandes e acumulam muita responsabilidade. | Medio |
| TEC-06 | `ComercialLayout`, `OSGerar`, `Historico` e `Visualizador` existem mas parecem legados/subutilizados. | Baixo/medio |
| TEC-07 | Testes atuais sao smoke de rotas, nao fluxos completos. | Alto |
| TEC-08 | React Router emite future flag warnings nos testes. | Baixo |

## Recomendacoes tecnicas

- Quebrar `Suspense` por area e manter layout persistente.
- Usar prefetch de chunks ao passar/clicar no menu.
- Introduzir React Query com `staleTime`, invalidades por entidade e endpoints mais granulares.
- Criar testes E2E com Playwright para fluxo completo.
- Criar testes API para permissao, tenant e IDOR.
- Extrair builders de documentos para servico server-side.
- Criar storage de anexos.
- Separar componentes de formulario complexos por dominio.

