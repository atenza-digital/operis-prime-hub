# Smoke do dominio de homologacao

Ambiente: https://fieldops-homologacao.atenza.digital  
Executado em: 18/07/2026, 21:31 America/Fortaleza  
Imagem publicada: `atenza-fieldops:homologacao-p0-medicoes-229f0d6`

## Resultado

Status geral: Aprovado para disponibilidade publica.

## Verificacoes executadas

| Verificacao | Resultado |
| --- | --- |
| `GET /login` | HTTP 200 |
| `GET /medicao` | HTTP 200 |
| `GET /api/health` | `{"ok":true}` |
| Container VPS | `atenza-fieldops:homologacao-p0-medicoes-229f0d6` em execucao |
| Logs recentes do container | Sem erro de inicializacao; API ouvindo na porta interna |

## Observacao sobre smoke profundo

Os scripts `npm run homologation:smoke-vps` e `npm run audit:e2e` dependem de conexao direta ao PostgreSQL pela maquina local para preparar usuario tecnico e consultar dados. Nesta rodada, a conexao local com `89.116.214.65:5432` retornou timeout.

Isso nao indica indisponibilidade da aplicacao publicada, pois o health publico e as rotas do frontend responderam corretamente. A validacao profunda com banco deve ser repetida quando o acesso direto ao banco estiver disponivel ou adaptada para rodar por job interno na VPS/CI com rede liberada.

## Encaminhamento

- Manter a validacao humana no dominio oficial.
- Repetir smoke profundo antes do aceite final do P0.
- Avaliar mover os scripts de smoke/auditoria para execucao no CI/CD com acesso controlado ao banco de homologacao.
