# Configuracao comercial por tenant - 2026-08-12

## Objetivo

Permitir que cada empresa SaaS defina se pode gerar novas minutas, novos contratos e se valores mensais devem aparecer em documentos contratuais, sem remover registros historicos nem retirar os recursos da plataforma.

## Regra aplicada

- Tenant `ciperprag`: novos contratos e minutas desativados por padrao; valores mensais de contratos nao exibidos.
- Outros tenants: recursos permanecem ativos por padrao para manter compatibilidade.
- Configuracao explicita salva pelo administrador sempre prevalece sobre o fallback.
- Registros historicos continuam consultaveis, editaveis conforme permissao e imprimiveis.
- A regra e aplicada no frontend e novamente no backend, impedindo contorno por chamada direta a API.

## Alteracoes tecnicas

- Nova coluna `empresa_config.commercial_config` em JSONB, criada de forma idempotente por `ensureDatabaseShape`.
- Bootstrap passa a retornar `companyConfig.commercialConfig`.
- Tela de Configuracoes recebeu o grupo `Disponibilidade comercial` por tenant.
- A tela de Contratos e Propostas oculta novas acoes de minuta/contrato quando desativadas.
- O editor oculta valores de documentos contratuais quando `showMonthlyContractValue=false`.
- A impressao de contratos/minutas omite os blocos monetarios quando a politica do tenant estiver desativada.
- Endpoints protegidos: criacao/alteracao para tipo restrito, geracao de minuta e geracao de contrato.

## Verificacoes

- Build Vite: aprovado.
- Sintaxe de `server/index.mjs`, `server/db.mjs` e `server/commercial-config.mjs`: aprovada.
- Testes automatizados: 7 arquivos, 36 testes aprovados.
- Banco local: coluna confirmada nos tenants `ciperprag`, `empresa-demonstracao` e `tenant-sem-logo`.
- Nenhum documento ou registro historico foi excluido.

## Homologacao pendente

1. Entrar em Configuracoes como administrador da Ciperprag e confirmar as tres opcoes desativadas.
2. Confirmar que Nova Proposta continua disponivel.
3. Confirmar que contratos/minutas historicos continuam visiveis.
4. Tentar gerar minuta/contrato por interface e confirmar bloqueio orientativo.
5. Repetir a verificacao em um tenant de demonstracao para confirmar que os recursos permanecem ativos.
