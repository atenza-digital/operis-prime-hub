# Catalogo de regras de negocio

## Comercial

| ID | Descricao | Origem | Modulo | Entidades | Perfis | Pre-condicoes | Resultado | Excecoes | Validacoes | Status | Evidencia | Configuravel por tenant | Duvidas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RN-COM-001 | Cliente deve existir antes de proposta, contrato, agendamento ou OS. | Regra geral | Comercial | Cliente | Comercial/admin | Dados minimos do cliente | Cliente disponivel no fluxo | Cliente inativo | CNPJ/nome/endereco conforme regra | Parcial | `/api/clients` | Parcial | Campos obrigatorios por segmento |
| RN-COM-002 | Servicos/produtos devem alimentar proposta, contrato, OS e certificado. | Regra geral | Comercial | Servico, POP | Comercial/qualidade | Servico ativo | Catalogo reutilizavel | Servico avulso | Nome, unidade, certificado, POP | Parcial | `/api/services` | Sim | Como tratar servico especifico |
| RN-COM-003 | POP, EPI e normas devem ser claros para usuarios nao tecnicos. | Auditoria | Comercial | Servico, POP | Comercial/qualidade | Campo tecnico visivel | Ajuda contextual | Cliente sem POP | Microcopy e anexos | Planejada | feedback cliente | Sim | Formatos de upload |

## Contratos

| ID | Descricao | Origem | Modulo | Entidades | Perfis | Pre-condicoes | Resultado | Excecoes | Validacoes | Status | Evidencia | Configuravel por tenant | Duvidas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RN-CTR-001 | Proposta aprovada pode gerar contrato. | Regra geral | Comercial | Proposta, contrato | Comercial | Proposta com cliente e itens | Contrato criado | Contrato do cliente | Status aprovado | Parcial | `/api/contract-templates/:id/generate-contract` | Parcial | Aceite formal |
| RN-CTR-002 | Contrato vigente deve liberar saldo operacional. | Regra geral | Comercial/Operacional | Contrato, saldo | Comercial/operacional | Contrato vigente | Agenda pode usar item | Sem saldo/vencido | Quantidade e executado | Parcial | sync operacional | Sim | Regra de cancelamento |
| RN-CTR-003 | Valores comerciais nao devem ser visiveis a perfis sem permissao. | Decisao confirmada | Comercial | Contrato | Operacional | Perfil sem valor | Ocultar valores | Admin/comercial/financeiro | API e UI | Implementado | `server/commercial-visibility.mjs`, `/api/bootstrap` | Sim por permissao | Validar matriz final |

## Agendamento

| ID | Descricao | Origem | Modulo | Entidades | Perfis | Pre-condicoes | Resultado | Excecoes | Validacoes | Status | Evidencia | Configuravel por tenant | Duvidas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RN-AGE-001 | Nao agendar sem contrato vigente e saldo operacional. | Regra geral | Operacional | Agendamento, contrato | Operacional | Contrato ativo com saldo | Agendamento criado | Reagendamento autorizado | Status/saldo | Parcial | `/api/agendamentos` | Sim | Tratamento de saldo reservado |
| RN-AGE-002 | Agendamento deve carregar equipe, veiculo, local e tag para OS. | Regra geral | Operacional | Agenda, OS | Operacional | Dados selecionados | OS preenchida | Dados a definir | Campos obrigatorios por servico | Parcial | `/api/agendamentos/:id/gerar-os` | Sim | Obrigatoriedade por tenant |
| RN-AGE-003 | Recorrencia deve sugerir novo agendamento apos conclusao. | Regra geral | Operacional | OS, recorrencia | Operacional | Servico recorrente | Sugestao pendente | Usuario descarta | Data sugerida | Parcial | `/api/recurrence-suggestions/:id` | Sim | Formula por frequencia |

## Ordem de servico

| ID | Descricao | Origem | Modulo | Entidades | Perfis | Pre-condicoes | Resultado | Excecoes | Validacoes | Status | Evidencia | Configuravel por tenant | Duvidas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RN-OS-001 | OS nasce a partir de agendamento. | Regra geral | Operacional | Agendamento, OS | Operacional | Agendamento existente | OS gerada | OS avulsa futura | Agendamento/tenant | Parcial | `/api/agendamentos/:id/gerar-os` | Sim | OS avulsa sera permitida? |
| RN-OS-002 | Encerramento deve registrar data, quantidade, checklist e evidencias obrigatorias. | Regra geral | Operacional | OS, evidencia | Operacional/campo | OS gerada | OS encerrada | Nao executada | Obrigatorios por servico | Parcial | `/api/orders/:id/encerrar` | Sim | Obrigatorios por segmento |
| RN-OS-003 | OS nao executada deve registrar motivo. | Regra geral | Operacional | OS | Operacional | Permite nao execucao | Status/flag registrado | Bloqueado por tenant | Motivo obrigatorio | Parcial | servico permite nao execucao | Sim | Efeito no saldo |
| RN-OS-004 | Correcao/reabertura de OS deve ser auditada. | Regra geral | Operacional | OS, audit log | Admin/operacional | OS encerrada | Alteracao rastreada | Documento emitido | Confirmacao reforcada | Planejada | auditoria | Sim | Quem pode reabrir |

## Certificado

| ID | Descricao | Origem | Modulo | Entidades | Perfis | Pre-condicoes | Resultado | Excecoes | Validacoes | Status | Evidencia | Configuravel por tenant | Duvidas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RN-CER-001 | Certificado so pode ser emitido para servico elegivel. | Regra geral | Qualidade | Servico, OS, certificado | Qualidade/admin | OS encerrada e servico elegivel | Certificado emitido | Revogacao | `geraCertificado` | Parcial | `/api/orders/:id/certificado` | Sim | Certificado manual? |
| RN-CER-002 | Certificado deve ter hash e QR Code publico. | Regra geral | Qualidade | Certificado | Qualidade/publico | Certificado emitido | Validacao publica | Revogado/vencido | Hash unico | Parcial | `/api/certificates/:hash` | Nao/tema sim | URL publica final |
| RN-CER-003 | Fotos do certificado devem vir das evidencias da OS, ate limite configurado. | Requisito configuravel | Qualidade | OS, anexo | Qualidade | Fotos anexadas | Fotos no certificado | Sem fotos | Tipo e quantidade | Parcial | CertificadoImpressao | Sim | Limite por tenant |
| RN-CER-004 | Revogacao/reemissao deve preservar historico. | Regra geral | Qualidade | Certificado | Admin/qualidade | Certificado emitido | Status revogado/reemitido | Erro operacional | Motivo obrigatorio | Planejada | migrations status | Sim | Modelo juridico |

## Medicao

| ID | Descricao | Origem | Modulo | Entidades | Perfis | Pre-condicoes | Resultado | Excecoes | Validacoes | Status | Evidencia | Configuravel por tenant | Duvidas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RN-MED-001 | Medicao consolida OS encerradas por cliente e periodo. | Regra geral | Financeiro | OS, medicao | Financeiro | OS encerrada | Medicao gerada | OS cancelada | Periodo/cliente/status | Parcial | `/api/measurements/generate` | Sim | Agrupar por contrato? |
| RN-MED-002 | Mesma OS nao deve entrar em duas medicoes ativas. | Regra geral | Financeiro | OS, medicao_itens | Financeiro | OS ja medida | Bloqueio/alerta | Medicao cancelada | Unicidade logica | Implementado | `ux_medicao_itens_tenant_os_ativa`, `/api/measurements/generate` | Nao | Regra de cancelamento definida |
| RN-MED-003 | Medicao acompanha NF/pagamento sem substituir ERP. | Confirmada | Financeiro | Medicao | Financeiro | Medicao emitida | Status financeiro operacional | Cancelada | Status permitido | Parcial | `/api/measurements/:id/financial` | Sim | Nomes finais dos status |

## SaaS

| ID | Descricao | Origem | Modulo | Entidades | Perfis | Pre-condicoes | Resultado | Excecoes | Validacoes | Status | Evidencia | Configuravel por tenant | Duvidas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RN-SAA-001 | Cada requisicao autenticada deve operar no tenant do usuario. | Regra geral | SaaS | Todas | Todos | Sessao valida | Dados isolados | Publico certificado | `tenant_id` | Parcial | server/index.mjs | Nao | RLS ou app-only |
| RN-SAA-002 | Identidade global e Atenza; identidade tenant e configuravel. | Confirmada | SaaS/branding | Tenant, config | Todos | Tenant configurado | Marca correta | White-label dedicado | Assets e metadados | Parcial | auditoria | Sim | Politica de dominio |
| RN-SAA-003 | Tenant suspenso deve ter acesso controlado/bloqueado. | Regra geral | SaaS | Tenant, usuario | Atenza/admin | Status suspenso | Bloqueio/aviso | Acesso suporte | Status tenant | Ausente | migrations tenant status | Sim por plano | Regra comercial |

