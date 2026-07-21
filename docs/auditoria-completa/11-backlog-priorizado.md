# Backlog consolidado priorizado

## Observacao

Este backlog consolida achados da auditoria. Ele nao substitui o roadmap atual sem sua aprovacao; serve como proposta de reorganizacao e priorizacao.

## Achados priorizados

| ID | Titulo | Categoria | Severidade | Esforco | Criterio de aceite |
| --- | --- | --- | --- | --- | --- |
| BLQ-01 | Validar isolamento multi-tenant com dois tenants | SaaS | Bloqueador | M | Testes provam que IDs cruzados retornam 403/404. |
| BLQ-02 | Corrigir encoding no codigo e dados | Conteudo | Bloqueador | M | Nenhuma tela/documento com `Ã`, `Â`, `??` indevido. |
| BLQ-03 | Definir marca plataforma vs tenant | SaaS/branding | Bloqueador | P | Favicon Atenza e tenant so em contexto autenticado/documental. |
| BLQ-04 | Criar regra de valores invisiveis ao operacional | Seguranca funcional | Bloqueador | M | Payload e UI nao exibem valores sem permissao. |
| BLQ-05 | Definir e testar duplicidade de medicao | Regra negocio | Bloqueador | M | Mesma OS nao entra em duas medicoes ativas. |
| CRT-01 | PDF server-side e snapshot imutavel | Documentos | Critico | G | PDF salvo como anexo com hash/template/snapshot. |
| CRT-02 | Provisionamento generico de tenant | SaaS | Critico | G | Novo tenant nasce sem scripts Ciperprag. |
| CRT-03 | Painel Atenza SaaS | SaaS | Critico | G | Gerir tenants, plano, status, bloqueio e suporte. |
| CRT-04 | Storage seguro de anexos | Seguranca | Critico | G | Upload fora do banco com validacao e limite. |
| CRT-05 | Permissoes por perfil e modulo | Acesso | Critico | M | Admin configura papeis granularmente. |
| CRT-06 | Revogacao/reemissao de certificado | Documentos | Critico | M | Certificado revogado fica publico como revogado. |
| ALT-01 | Reorganizar menu e IA | UX | Alto | M | Menu por modulo, Dashboard independente, accordion. |
| ALT-02 | Padrao de pagina/modal/drawer/wizard | UX | Alto | M | Guia aplicado nos principais fluxos. |
| ALT-03 | Melhorar transicoes sem flicker | Performance UX | Alto | M | Troca de rota sem fallback tela inteira. |
| ALT-04 | Agendamento com detalhes e filtros maduros | Operacional | Alto | M | Calendario mostra detalhes, filtros e proximo passo. |
| ALT-05 | OS mobile/campo | Operacional | Alto | G | Tecnico consegue checklist/foto/assinatura no celular. |
| ALT-06 | POP simples + upload de POP pronto | Servicos | Alto | M | Cliente pode cadastrar estrutura ou anexar POP existente. |
| ALT-07 | Parametros do tenant em Administracao | IA | Alto | P | Tela movida/renomeada e agrupada. |
| ALT-08 | Certificados e historico: decidir separacao | Produto | Alto | M | Fluxo de emissao e consulta sem ambiguidade. |
| ALT-09 | Testes E2E da jornada principal | QA | Alto | M | Proposta -> medicao coberta em teste. |
| ALT-10 | Auditoria de anexos com filtros server-side | Escala | Alto | M | Tela suporta volume sem carregar tudo. |
| ALT-11 | Numeracao automatica validada | Regras | Alto | P | OS/proposta/contrato/certificado/medicao seguem ultimo numero. |
| MED-01 | Estados vazios e microcopy por termo tecnico | Conteudo | Medio | P | POP/EPI/norma/saldo/medicao explicados. |
| MED-02 | Dashboard adaptado por perfil | UX | Medio | M | Cards e atalhos mudam conforme permissao. |
| MED-03 | Responsividade por tarefa | UX | Medio | M | Campo priorizado no mobile; admin desktop-first. |
| MED-04 | Sessoes ativas e reset de senha na UI | Acesso | Medio | M | Admin ve sessoes e revoga acesso. |
| MED-05 | Biblioteca de clausulas por tenant | Comercial | Medio | G | Clausulas versionadas configuraveis. |
| MED-06 | Assinatura por usuario/perfil documental | Documentos | Medio | M | Responsavel comercial/tecnico/emissor configuravel. |
| MED-07 | Busca global por permissao | UX | Medio | G | Localiza OS, cliente, contrato, certificado. |
| MED-08 | Relatorios operacionais/comerciais | Produto | Medio | G | Relatorios com filtros e exportacao. |
| MED-09 | Observabilidade e health dashboard | Operacao | Medio | M | Logs, uptime, alertas. |
| MED-10 | Backup/restore testado | Operacao | Medio | M | Restore validado em ambiente seguro. |
| MED-11 | Acessibilidade WCAG 2.2 AA | Acessibilidade | Medio | M | Teclado, foco, contraste e labels validados. |
| MED-12 | Reabertura/correcao auditada | Regras | Medio | G | OS/medicao/certificado corrigiveis com trilha. |
| MED-13 | Tenant generico sem Ciperprag | SaaS | Medio | M | Ambiente demo neutro validado. |
| MED-14 | Paginacao e densidade em telas longas | UX | Medio | M | Parametros/auditoria/anexos sem excesso visual. |
| BAI-01 | React Router future flags | Tecnico | Baixo | P | Warnings tratados. |
| BAI-02 | Componentes legados/subutilizados | Tecnico | Baixo | P | Remover ou integrar. |
| BAI-03 | Ajustes de iconografia e contraste fino | Visual | Baixo | P | Padrao documentado. |
| BAI-04 | Morphismo leve e consistente | Visual | Baixo | P | Aplicado apenas onde agrega contexto. |
| BAI-05 | Tooltips adicionais | Conteudo | Baixo | P | Sem excesso instrutivo. |

## Quantidade

- Total de achados: 41.
- Bloqueadores: 5.
- Criticos: 6.
- Altos: 11.
- Medios: 14.
- Baixos: 5.

