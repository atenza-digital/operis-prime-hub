# Plano de execucao

## Etapa 0 - Bloqueadores

Objetivo: remover riscos que impedem producao e confundem homologacao.

Escopo:

- Corrigir favicon e separacao plataforma x tenant.
- Sanear encoding no codigo e dados.
- Criar teste multi-tenant/IDOR.
- Garantir que operacional nao veja valores.
- Bloquear duplicidade de medicao.

Dependencias: decisao sobre favicon/white-label e acesso a dados para saneamento.

Criterios de aceite:

- Testes automatizados passando.
- Varredura sem mojibake.
- Dois tenants testados.
- Nenhum valor comercial em perfil operacional.

## Etapa 1 - Integridade e fundacao

Objetivo: estabilizar regras, estados, permissoes e contratos de API.

Escopo:

- Matriz final de estados.
- Regras de cancelamento/reabertura.
- Permissoes por modulo.
- Reset/sessoes de usuarios.
- Validacoes backend para fluxo principal.

Testes:

- API permissions.
- E2E fluxo principal.
- Testes de borda de saldo, contrato vencido e medicao.

## Etapa 2 - Arquitetura de informacao

Objetivo: deixar o sistema compreensivel.

Escopo:

- Menu por modulo.
- Dashboard independente.
- Accordion de menu.
- Parametros em Administracao.
- Decisao sobre certificados/historico e auditoria de anexos.
- Nomes de menu, topbar e pagina padronizados.

Testes:

- Checagem visual por perfil.
- Roteiro de navegacao sem instrucao externa.

## Etapa 3 - Design system

Objetivo: evitar ajustes tela a tela sem padrao.

Escopo:

- PageHeader.
- Cards.
- Tabelas.
- Formularios.
- Badges.
- Estados vazios.
- Dialog/drawer/wizard.
- Skeletons e transicoes.

Testes:

- Regressao visual.
- Contraste e foco.

## Etapa 4 - Jornadas principais

Objetivo: amadurecer produto para teste assistido.

Escopo:

- Comercial: proposta, aceite e contrato.
- Operacional: agenda, OS, campo e encerramento.
- Qualidade: certificado, historico e evidencias.
- Financeiro: medicao, NF, cobranca, pagamento e ERP.
- Recorrencia.

Testes:

- E2E real com dados de homologacao.
- PDFs/prints de documentos para aprovacao visual.

## Etapa 5 - SaaS operacional

Objetivo: preparar produto vendavel e administravel pela Atenza.

Escopo:

- Painel Atenza.
- Tenants, planos, pagamentos, suspensao e reativacao.
- Provisionamento.
- Storage.
- Observabilidade.
- Backup/restore.

Testes:

- Criar tenant novo.
- Suspender tenant.
- Exportar dados.
- Restore em ambiente seguro.

## Etapa 6 - Responsividade e acessibilidade

Objetivo: validar uso real em campo e escritorio.

Escopo:

- Agenda e OS mobile-first.
- Fotos, checklist e assinatura.
- Tablet para supervisao.
- Desktop para comercial/admin/financeiro.
- WCAG 2.2 AA.

Testes:

- Celular real.
- Teclado.
- Zoom.
- Leitor de tela basico.

## Etapa 7 - Regressao e preparacao para producao

Objetivo: fechar release candidate.

Escopo:

- CI/CD producao.
- Checklist de release.
- Rollback.
- Documentacao do suporte.
- Manual admin tenant.
- Manual Atenza operador SaaS.

Testes:

- E2E completo.
- Security regression.
- Performance baseline.
- Deploy homologacao -> producao.

