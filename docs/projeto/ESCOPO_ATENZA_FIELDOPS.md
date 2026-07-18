# Escopo mestre - Atenza FieldOps

## 1. Identificacao do produto

Nome: Atenza FieldOps  
Proprietaria: Atenza Solucoes Digitais  
Tipo: plataforma SaaS multi-tenant para gestao de operacoes de campo  
Tenant atual de homologacao: Ciperprag  
Status: homologacao evolutiva, ainda nao pronto para producao SaaS  

O Atenza FieldOps nao e um sistema exclusivo da Ciperprag. A Ciperprag e o tenant usado para validar o produto, documentos, fluxo operacional e aderencia inicial ao mercado.

## 2. Visao geral

O produto conecta o ciclo comercial, operacional e de medicao de empresas que executam servicos tecnicos em campo. A plataforma organiza clientes, servicos, propostas, contratos, saldos operacionais, agendamentos, equipes, ordens de servico, evidencias, certificados, historico, medicao e recorrencia.

## 3. Problema que resolve

Empresas de servicos tecnicos costumam operar com informacoes espalhadas em planilhas, documentos manuais, mensagens, PDFs e sistemas financeiros separados. Isso gera perda de rastreabilidade, dificuldade de provar execucao, retrabalho na medicao e falta de visibilidade entre comercial, operacao e administracao.

## 4. Publico-alvo

- Empresas de controle de pragas, limpeza tecnica, manutencao, higienizacao, inspecao, coleta, facilities e servicos recorrentes.
- Times comerciais que criam propostas e contratos.
- Times operacionais que agendam, alocam equipes e geram OS.
- Equipes de campo que executam atividades, coletam assinatura e registram evidencias.
- Responsaveis tecnicos ou qualidade que validam certificados.
- Administrativo/medicao que consolida servicos para faturamento no ERP.
- Atenza como operadora SaaS.

## 5. Tipos de empresas atendidas

- Empresas com contratos recorrentes.
- Empresas que precisam gerar OS e evidencias.
- Empresas que emitem certificados, relatorios ou documentos tecnicos.
- Empresas que medem servicos executados por periodo.
- Empresas que precisam separar comercial, campo, qualidade e financeiro operacional.

## 6. Proposta de valor

Do contrato ao campo. Do campo ao certificado.

O sistema reduz perda de informacao entre venda e execucao, organiza a equipe de campo, preserva evidencias, gera documentos padronizados e facilita a medicao dos servicos prestados.

## 7. Premissas confirmadas

- Atenza FieldOps e a identidade global da plataforma.
- O favicon global deve usar identidade Atenza.
- A logo do tenant pode aparecer no topo do menu lateral e documentos.
- A identidade autenticada do tenant nao altera a propriedade da plataforma.
- Particularidades de clientes devem ser parametrizaveis, opcionais ou extensoes controladas.
- Nao devem existir regras fixas por nome, ID ou codigo de tenant.
- A medicao nao substitui o ERP financeiro.

## 8. Objetivos funcionais

- Cadastrar clientes, contatos, locais e equipamentos.
- Cadastrar servicos/produtos e dados tecnicos.
- Criar propostas e contratos.
- Gerar saldo operacional por contrato.
- Agendar visitas com equipe, veiculo e local.
- Gerar e imprimir/disponibilizar OS.
- Encerrar OS com checklist, quantidade, tag e evidencias.
- Emitir certificados quando o servico permitir.
- Validar certificados publicamente por QR Code/hash.
- Consultar historico de servicos.
- Gerar medicao por periodo.
- Acompanhar NF, cobranca, pagamento e baixa manual no ERP.
- Sugerir recorrencia.
- Gerenciar usuarios, perfis e permissoes.
- Auditar acoes e anexos.

## 9. Objetivos nao funcionais

- Multi-tenant seguro.
- Interface responsiva para escritorio e campo.
- Acessibilidade progressiva ate WCAG 2.2 AA.
- Documentos rastreaveis.
- Auditoria de acoes sensiveis.
- Deploy controlado em homologacao e producao.
- Backup, restore, logs e observabilidade.
- Performance adequada para multiplos tenants.

## 10. Atores e perfis

| Ator | Papel |
| --- | --- |
| Admin global Atenza | Gerencia tenants, suporte, planos e operacao SaaS. |
| Suporte Atenza | Apoia clientes sem assumir regras do tenant. |
| Admin do tenant | Configura empresa, usuarios, permissoes e documentos. |
| Comercial | Clientes, propostas, contratos e servicos/produtos. |
| Operacional | Agenda, OS, equipe, veiculo, encerramento e recorrencia. |
| Tecnico de campo | Consulta/execucao de OS, fotos, checklist e assinatura. |
| Qualidade/responsavel tecnico | Certificados, evidencias e historico. |
| Medicao/administrativo | Medicao, NF, cobranca, pagamento e baixa no ERP. |
| Auditor/leitura | Consulta historico, anexos e eventos conforme permissao. |

## 11. Modulos

| Modulo | Status atual | Observacao |
| --- | --- | --- |
| Acesso | Parcial | Login interno existe; recuperacao por e-mail/Google planejada. |
| Dashboard | Parcial | Existe; precisa adaptar melhor por perfil. |
| Comercial | Parcial | Clientes, servicos, propostas e contratos existem. |
| Operacional | Parcial | Agenda, OS, equipe, certificados e anexos existem. |
| Financeiro operacional | Parcial | Medicao e acompanhamento ate ERP existem. |
| Administracao do tenant | Parcial | Usuarios/perfis existem; granularidade precisa evoluir. |
| Administracao global Atenza | Ausente | Necessaria para SaaS comercial. |
| Documentos | Parcial | Layouts existem; PDF server-side e templates versionados pendentes. |
| Auditoria | Parcial | Eventos e anexos existem; precisa hardening e filtros server-side. |

## 12. Funcionalidades por modulo

### Acesso

Implementado:

- Login por e-mail, senha e tenant.
- Troca obrigatoria de senha temporaria.
- Sessao autenticada.

Planejado:

- Recuperacao por e-mail noreply Atenza.
- Login com Google.
- Sessao ativa e revogacao pela interface.

### Comercial

Implementado:

- Clientes.
- Servicos/produtos.
- Propostas e contratos.
- Geracao de contrato a partir de proposta.
- Contrato do cliente como caminho alternativo.

Planejado:

- Biblioteca de clausulas por tenant.
- Fluxo formal de aceite.
- Assinatura digital/eletronica.
- Regras de visibilidade de valores por perfil.

### Operacional

Implementado:

- Agendamento.
- Equipe e veiculos.
- Geracao de OS.
- Encerramento de OS.
- Fotos/evidencias.
- Certificados e historico.
- Recorrencia.

Planejado:

- Experiencia mobile de campo.
- Checklist guiado por servico.
- Reabertura/correcao auditada.
- Selecao obrigatoria de tag/equipamento quando aplicavel.

### Financeiro operacional

Implementado:

- Medicao.
- Status de NF/cobranca/pagamento/baixa ERP.

Planejado:

- Regra antifraude para duplicidade de OS em medicao.
- PDF server-side e historico de versoes da medicao.

### Administracao

Implementado:

- Usuarios.
- Perfis.
- Auditoria.
- Parametros do tenant parcialmente.

Planejado:

- Matriz visual de permissoes por modulo.
- Assinaturas por usuario/perfil documental.
- Configuracao de planos e recursos por tenant.

## 13. Entidades principais

Tenant, usuario, perfil, permissao, cliente, contato, local, equipamento/tag, servico/produto, POP, proposta, contrato, contrato operacional, agendamento, tecnico, veiculo, OS, evidencia, certificado, medicao, item de medicao, recorrencia e audit log.

## 14. Jornadas ponta a ponta

Fluxo principal:

```text
Cliente/servico -> Proposta -> Contrato -> Saldo operacional -> Agendamento -> OS -> Campo -> Encerramento -> Certificado/Historico -> Medicao -> ERP -> Recorrencia
```

Jornadas planejadas para producao:

- Provisionar tenant.
- Primeiro acesso do admin.
- Configurar identidade, documentos e numeracao.
- Criar usuarios e papeis.
- Executar fluxo comercial-operacional-financeiro.
- Auditar documentos e eventos.
- Suspender/cancelar tenant.
- Exportar dados.

## 15. Regras confirmadas

- Ciperprag e tenant de homologacao, nao identidade global.
- Operacional nao deve ver valores comerciais quando nao autorizado.
- Medicao acompanha NF/pagamento, mas nao substitui ERP.
- Logo e dados documentais devem vir do tenant.
- Proposta e contrato sao documentos distintos.
- Certificado deve ter QR Code/hash de validacao.

## 16. Regras inferidas

- Todo servico recorrente gera sugestao de novo agendamento apos encerramento.
- Toda OS encerrada pode entrar em medicao, se estiver no periodo.
- Servico com `geraCertificado` permite certificado.
- Fotos do certificado vêm das evidencias da OS.
- POP pode alimentar checklist e OS.

## 17. Decisoes pendentes

- Favicon sempre Atenza ou tenant apenas em dominio white-label?
- Certificados e historico juntos ou separados?
- Auditoria de anexos em Operacional, Qualidade ou Administracao?
- Tecnico de campo usa mobile nesta fase?
- Assinatura documental por usuario, perfil ou tenant?
- Parametros do tenant ficam em Administracao ou modulo Configuracoes?

## 18. Integracoes

Implementado:

- PostgreSQL.
- Docker.
- GitHub Actions para homologacao.

Planejado:

- E-mail noreply Atenza.
- Google login.
- Storage externo/filesystem controlado.
- ERP apenas como baixa manual inicialmente.
- Possiveis integrações futuras via API.

## 19. Geracao e armazenamento de documentos

Implementado:

- HTML/CSS imprimivel.
- QR Code de certificado.
- Anexos historicos e hashes iniciais.

Planejado:

- PDF server-side.
- Templates versionados.
- Snapshot imutavel.
- Historico de versoes.
- Storage por tenant.

## 20. Arquitetura SaaS e multi-tenant

Implementado:

- Tabela `tenants`.
- `tenant_id` em varias entidades.
- Login por tenant.
- Permissoes por perfil.

Planejado:

- Provisionamento generico.
- Admin global Atenza.
- Plano/assinatura/suspensao.
- Testes automatizados de IDOR.
- Avaliar RLS no banco.

## 21. Personalizacao por tenant

Implementado parcial:

- Logo.
- Cores.
- Dados da empresa.
- Numeracao.
- Certificado/configuracao documental.

Planejado:

- Assinaturas por papel.
- Claúsulas e textos por tenant.
- Templates documentais versionados.
- Assets documentais por storage.

## 22. Seguranca e auditoria

Implementado:

- Senha com hash scrypt.
- Sessao opaca com token hash.
- Bloqueio por tentativas.
- Auditoria de acoes.
- Permissoes no backend.

Planejado:

- Rate limit.
- Politicas de CORS e headers.
- RLS ou testes IDOR.
- Antivirus/validacao de arquivos.
- Sessoes ativas e revogacao.

## 23. Responsividade

Desktop e tablet estao aceitaveis para homologacao. Mobile precisa priorizar tarefas de campo: agenda, OS, checklist, fotos e assinatura.

## 24. Acessibilidade

Ainda precisa validacao WCAG 2.2 AA: contraste, foco, teclado, labels, leitores de tela e tamanho de alvos.

## 25. Desempenho

O sistema funciona em homologacao, mas `/api/bootstrap` concentra muitos dados. Para escala, deve evoluir para endpoints granulares, cache e paginacao.

## 26. Observabilidade

Planejado: logs estruturados, health dashboard, alertas, uptime, backup e restore testado.

## 27. Restricoes tecnicas

- Schema ainda nomeado `ciperprag_hub`.
- Alguns dados/arquivos ainda trazem Ciperprag como fallback.
- Base64 no banco para anexos nao e ideal em escala.
- Documentos ainda dependem parcialmente de impressao local.

## 28. Fora do escopo atual

- Contas a pagar/receber completo.
- ERP financeiro interno.
- Folha de pagamento.
- Estoque completo.
- CRM completo fora do fluxo de proposta/contrato.
- Aplicativo mobile nativo.

## 29. Riscos conhecidos

- Encoding corrompido.
- Multi-tenant sem teste forte.
- Fluxos confusos para usuario nao tecnico.
- Documentos sem PDF final server-side.
- Tenant Ciperprag contaminando identidade global.

## 30. Criterios gerais para producao

- Dois tenants testados sem vazamento.
- Encoding corrigido.
- Favicon global Atenza.
- Documentos finais server-side com hash.
- Testes E2E do fluxo principal.
- Backup/restore validado.
- Monitoramento ativo.
- Permissoes por perfil validadas.
- UX principal aprovada por usuarios reais.

