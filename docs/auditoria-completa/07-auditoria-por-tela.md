# Auditoria por tela

Evidencias visuais: `docs/auditoria-completa/evidencias/playwright/`

| Tela | Rota | Avaliacao | Severidade principal |
| --- | --- | --- | --- |
| Login | `/login` | Deve manter marca Atenza, sem logo fixa de tenant no acesso padrao. Favicon precisa ser Atenza. | Alto |
| Dashboard | `/` | Melhorou, mas precisa ser adaptado por perfil e evitar mostrar valores para operacional. | Medio |
| Agendamentos | `/agendar` | Fluxo central correto, mas precisa detalhar clique no calendario, filtros e proximo passo. | Alto |
| Ordens de servico | `/ordens` | Essencial para campo; precisa revisar textos, encoding, acoes e documentos. | Alto |
| Certificados | `/certificados` | Deve separar emitir, validar e consultar historico; certificado tem evolucoes pendentes. | Alto |
| Medicao | `/medicao` | Escopo correto para financeiro operacional; precisa garantir nao duplicidade e status claros. | Alto |
| Equipes e veiculos | `/equipes` | Deve focar cadastro; alocacao semanal e apoio, nao agenda oficial. | Medio |
| Auditoria de anexos | `/auditoria-anexos` | Tela densa, provavelmente melhor em Administracao/Qualidade. | Medio |
| Clientes | `/comercial/clientes` | Cadastro base correto; precisa microcopy para locais, contatos, tags e equipamentos. | Medio |
| Servicos | `/comercial/servicos` | Muitos campos tecnicos; precisa descricoes simples e upload de POP pronto. | Alto |
| Propostas e contratos | `/comercial/contratos` | Fluxo correto em conceito, mas proposta e contrato precisam ficar ainda mais claros como documentos distintos. | Alto |
| Parametros do tenant | `/comercial/configuracoes` | Muito longo e posicionado no modulo errado; precisa agrupar por Identidade, Documentos, Numeracao, Assinaturas. | Alto |
| Usuarios e perfis | `/usuarios` | Base existe; falta experiencia de matriz granular por modulo e sessoes ativas. | Alto |
| Eventos de auditoria | `/auditoria-eventos` | Muito densa, precisa filtros server-side e exportacao controlada. | Medio |
| Validar certificado | `/validar-certificado/:hash` | Boa direcao para antifraude; precisa snapshot imutavel/PDF server-side e tratamento de revogado/vencido. | Critico |

## Observacoes tela a tela

- Telas com muitos campos devem usar secoes colapsaveis ou wizard.
- Acoes de salvar devem indicar claramente o proximo passo.
- Tabelas precisam padronizar paginacao e filtros.
- Mensagens de erro devem explicar o motivo e como resolver.
- Estados vazios devem guiar: "cadastre o cliente", "crie proposta", "gere contrato", "agende".
- Mobile deve priorizar tarefas de campo, nao todas as telas administrativas.

