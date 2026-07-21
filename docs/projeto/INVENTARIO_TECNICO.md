# Inventario tecnico - Atenza FieldOps

## Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, React Router, TanStack Query |
| UI | Tailwind CSS, Radix UI/shadcn, Lucide React |
| Backend | Node.js 22, Express 5 |
| Banco | PostgreSQL via `pg` |
| Documentos | HTML/CSS imprimivel, QR Code, anexos historicos |
| Testes | Vitest, Testing Library, Playwright para evidencias |
| Deploy | Docker, GitHub Actions homologacao |

## Estrutura de diretorios

| Caminho | Finalidade |
| --- | --- |
| `src/pages` | Telas principais |
| `src/pages/comercial` | Telas comerciais |
| `src/components` | Layout, componentes e UI |
| `src/lib` | API, formatadores, impressao de OS |
| `src/contexts` | Autenticacao |
| `src/assets` | Logos, imagens e fontes |
| `server` | API Express, auth e banco |
| `database/migrations` | Evolucoes SQL |
| `scripts` | Automacoes de homologacao, evidencias e usuarios |
| `docs` | Documentacao, roadmap e evidencias |

## Aplicacoes e servicos

- Web SPA servida pelo container.
- API Express no mesmo runtime.
- PostgreSQL externo/local conforme `.env`.
- Container local de validacao `atenza-fieldops-local-ux`.
- VPS de homologacao na porta 3010.

## Rotas frontend

Fonte: `docs/auditoria-completa/evidencias/inventario-rotas.json`

| Rota | Componente | Permissao |
| --- | --- | --- |
| `/login` | Login | Publica |
| `/alterar-senha` | AlterarSenha | Publica/autenticada |
| `/validar-certificado` | ValidarCertificado | Publica |
| `/validar-certificado/:hash` | ValidarCertificado | Publica |
| `/` | Dashboard | `dashboard.view` |
| `/agendar` | Agendamento | `agenda.manage` |
| `/os-gerar` | OSGerar | `os.manage` |
| `/ordens` | OrdensServico | `os.manage` |
| `/os-finalizar` | OrdensServico | `os.close` |
| `/historico` | Historico | `certificados.manage` |
| `/medicao` | Medicao | `medicoes.manage` |
| `/auditoria-anexos` | AuditoriaAnexos | `os.manage` |
| `/certificados` | Certificados | `certificados.manage` |
| `/equipes` | Equipes | `equipes.manage` |
| `/visualizar` | Visualizador | `dashboard.view` |
| `/usuarios` | Usuarios | `usuarios.manage` |
| `/auditoria-eventos` | AuditoriaEventos | `auditoria.view` |
| `/comercial/clientes` | Clientes | `clientes.manage` |
| `/comercial/servicos` | Servicos | `servicos.manage` |
| `/comercial/contratos` | Contratos | `contratos.manage` |
| `/comercial/configuracoes` | Configuracoes | `configuracoes.manage` |

## Endpoints

Fonte: `docs/auditoria-completa/evidencias/inventario-endpoints.json`

| Endpoint | Finalidade |
| --- | --- |
| `GET /api/health` | Saude da API |
| `GET /api/certificates/:hash` | Validacao publica de certificado |
| `POST /api/auth/login` | Login |
| `GET /api/public/tenant-context` | Contexto publico do tenant |
| `GET /api/auth/me` | Usuario atual |
| `POST /api/auth/logout` | Logout |
| `POST /api/auth/change-password` | Troca de senha |
| `GET /api/bootstrap` | Carga geral autenticada |
| `GET /api/audit-logs` | Eventos de auditoria |
| `POST /api/audit-logs/evidence` | Evidencia/exportacao de auditoria |
| `GET /api/attachments/:id/download` | Download de anexo |
| `GET /api/roles` | Perfis |
| `GET /api/users` | Usuarios |
| `POST /api/users` | Criar/editar usuario |
| `POST /api/users/:id/reset-password` | Reset de senha |
| `POST /api/clients` | Cliente |
| `POST /api/services` | Servico |
| `POST /api/technicians` | Tecnico |
| `POST /api/vehicles` | Veiculo |
| `POST /api/allocations` | Alocacao |
| `PATCH /api/company-config` | Config empresa/tenant |
| `PATCH /api/numbering-config` | Numeracao |
| `POST /api/contract-templates` | Proposta/contrato |
| `POST /api/contract-templates/:id/generate-contract` | Gerar contrato |
| `POST /api/measurements/generate` | Gerar medicao |
| `PATCH /api/measurements/:id/financial` | Acompanhamento financeiro |
| `PATCH /api/measurements/:id/cancel` | Cancelar medicao |
| `POST /api/agendamentos` | Agendamento |
| `PATCH /api/agendamentos/:id` | Editar agendamento |
| `POST /api/agendamentos/:id/gerar-os` | Gerar OS |
| `PATCH /api/orders/:id` | Editar OS |
| `POST /api/orders/:id/encerrar` | Encerrar OS |
| `POST /api/orders/:id/certificado` | Emitir certificado |
| `PATCH /api/recurrence-suggestions/:id` | Confirmar/descartar recorrencia |

## Tabelas principais

Fonte: migrations e inventario.

- `tenants`
- `usuarios`
- `perfis`
- `permissoes`
- `perfil_permissoes`
- `usuario_perfis`
- `usuario_sessoes`
- `audit_logs`
- `clientes`
- `cliente_locais_execucao`
- `cliente_equipamentos`
- `servicos_catalogo`
- `servico_pops`
- `contratos_templates`
- `contratos_templates_servicos`
- `contratos`
- `agendamentos`
- `ordens_servico`
- `certificados`
- `recorrencia_sugestoes`
- `medicoes`
- `medicao_itens`
- `evidencias_anexos`

## Migrations

Existem 18 migrations numeradas de `001_saas_foundation.sql` a `018_certificate_tenant_config.sql`.

## Jobs e filas

Nao foram identificadas filas ou workers assincronos. Rotinas atuais sao executadas por API/scripts.

## Armazenamento de arquivos

Atual:

- Anexos podem ser armazenados em base64 no banco.
- URLs tambem sao suportadas em `evidencias_anexos`.

Desejado:

- Storage externo/filesystem controlado por tenant.
- Validacao de arquivo e antivirus.

## Autenticacao

- Login interno.
- Hash de senha com `scrypt`.
- Token opaco salvo como hash.
- Sessao com expiracao.
- Bloqueio por tentativas.

## Autorizacao

- Permissoes no backend via `requirePermission`.
- Rotas frontend protegidas por `ProtectedRoute`.
- Falta teste automatizado completo por permissao e IDOR.

## Estrategia multi-tenant

Atual:

- `tenant_id` em muitas tabelas.
- Tenant vindo da sessao do usuario.
- Login pode receber `tenantSlug`.

Pendente:

- Provisionamento generico.
- Painel Atenza.
- Testes multi-tenant.
- Avaliar RLS.

## Variaveis de ambiente

Sem expor segredos:

- `DATABASE_URL`
- `PGHOST`
- `PGPORT`
- `PGDATABASE`
- `PGUSER`
- `PGPASSWORD`
- `PGSSL`
- `SESSION_TTL_HOURS`
- Variaveis de deploy GitHub/VPS configuradas como secrets.

## Testes existentes

- `npm run lint`: aprovado na auditoria.
- `npm run test`: 11 testes smoke aprovados.
- Scripts de homologacao: smoke VPS, E2E VPS, visual check.

## Cobertura conhecida

Coberto parcialmente:

- Render de rotas principais.
- Smoke de API/homologacao.

Nao coberto suficientemente:

- IDOR/multi-tenant.
- Permissoes por perfil.
- Fluxo E2E local automatizado completo.
- Regras de duplicidade de medicao.
- Acessibilidade.
- Performance.

## Debitos tecnicos

- Encoding corrompido.
- Schema nomeado `ciperprag_hub`.
- Base64 no banco.
- `Suspense` global gerando flicker.
- Bootstrap grande.
- Componentes/telas grandes.
- Documentos ainda dependentes de print.

## Tela -> rota -> componente -> endpoint -> entidade -> permissao

| Tela | Rota | Componente | Endpoint principal | Entidade | Permissao |
| --- | --- | --- | --- | --- | --- |
| Login | `/login` | Login | `/api/auth/login` | Usuario/sessao | Publica |
| Dashboard | `/` | Dashboard | `/api/bootstrap` | Varias | `dashboard.view` |
| Agendamentos | `/agendar` | Agendamento | `/api/agendamentos` | Agendamento | `agenda.manage` |
| Ordens de servico | `/ordens` | OrdensServico | `/api/orders/:id/encerrar` | OS | `os.manage`, `os.close` |
| Certificados | `/certificados` | Certificados | `/api/orders/:id/certificado` | Certificado | `certificados.manage` |
| Validar certificado | `/validar-certificado/:hash` | ValidarCertificado | `/api/certificates/:hash` | Certificado | Publica |
| Medicao | `/medicao` | Medicao | `/api/measurements/generate` | Medicao | `medicoes.manage` |
| Equipes e veiculos | `/equipes` | Equipes | `/api/technicians`, `/api/vehicles` | Tecnico/veiculo | `equipes.manage` |
| Clientes | `/comercial/clientes` | Clientes | `/api/clients` | Cliente | `clientes.manage` |
| Servicos | `/comercial/servicos` | Servicos | `/api/services` | Servico/POP | `servicos.manage` |
| Propostas e contratos | `/comercial/contratos` | Contratos | `/api/contract-templates` | Proposta/contrato | `contratos.manage` |
| Parametros do tenant | `/comercial/configuracoes` | Configuracoes | `/api/company-config` | Empresa config | `configuracoes.manage` |
| Usuarios e perfis | `/usuarios` | Usuarios | `/api/users`, `/api/roles` | Usuario/perfil | `usuarios.manage` |
| Eventos de auditoria | `/auditoria-eventos` | AuditoriaEventos | `/api/audit-logs` | Audit log | `auditoria.view` |
| Auditoria de anexos | `/auditoria-anexos` | AuditoriaAnexos | `/api/attachments/:id/download` | Evidencia | `os.manage` |

