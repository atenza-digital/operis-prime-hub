# Jornadas ponta a ponta

## Matriz resumida das jornadas

| ID | Jornada | Ponto inicial | Responsavel | Status |
| --- | --- | --- | --- | --- |
| J01 | Criacao/provisionamento do tenant | Painel Atenza | Atenza | Pendente |
| J02 | Primeiro acesso admin | Login | Admin tenant | Parcial |
| J03 | Configuracao inicial | Parametros do tenant | Admin tenant | Parcial |
| J04 | Usuarios, perfis e permissoes | Usuarios e perfis | Admin tenant | Parcial |
| J05 | Cadastro de cliente, locais, contatos e tags | Clientes | Comercial/admin | Parcial |
| J06 | Cadastro/versionamento de servicos | Servicos | Comercial/qualidade | Parcial |
| J07 | Proposta comercial | Contratos e Propostas | Comercial | Parcial |
| J08 | Aprovacao e contrato | Contratos e Propostas | Comercial/admin | Parcial |
| J09 | Liberacao de saldo operacional | Geracao de contrato | Sistema | Parcial |
| J10 | Agendamento | Agendamentos | Operacional | Parcial |
| J11 | Alocacao de equipe/veiculo | Agendamento/Equipes | Operacional | Confuso |
| J12 | Geracao e impressao da OS | Agendamentos/OS | Operacional | Parcial |
| J13 | Execucao e encerramento da OS | Ordens de servico | Operacional/campo | Parcial |
| J14 | Certificado e validacao publica | Certificados | Qualidade/tecnico | Parcial |
| J15 | Historico | Certificados e historico | Operacional/qualidade | Parcial |
| J16 | Medicao e acompanhamento ate ERP | Medicao | Financeiro operacional | Parcial |
| J17 | Auditoria de acoes e anexos | Auditorias | Admin/auditor | Parcial |
| J18 | Cancelamento/correcao/reabertura | Varias telas | Admin/responsavel | Pendente/parcial |
| J19 | Suspensao/cancelamento do tenant | Painel Atenza | Atenza | Pendente |
| J20 | Exportacao de dados do tenant | Painel Atenza | Atenza/admin | Pendente |

## Jornada principal recomendada

1. Comercial cadastra/valida cliente.
2. Comercial cadastra/valida servicos/produtos.
3. Comercial cria proposta.
4. Cliente aprova proposta.
5. Sistema gera contrato comercial e contratos operacionais com saldo.
6. Operacional agenda servico com contrato vigente e saldo.
7. Operacional define equipe, veiculo, local, tag/equipamento e observacoes.
8. Sistema gera OS.
9. OS e impressa ou disponibilizada ao campo.
10. Campo executa e retorna checklist, assinatura e evidencias.
11. Operacional encerra OS.
12. Sistema baixa saldo.
13. Sistema libera certificado quando servico permitir.
14. Qualidade/tecnico emite certificado.
15. Historico registra servicos com e sem certificado.
16. Financeiro operacional gera medicao por periodo.
17. Financeiro registra NF enviada, cobranca, pagamento e baixa manual no ERP.
18. Sistema sugere recorrencia quando aplicavel.

## Becos sem saida e friccoes encontradas

| Jornada | Problema | Impacto |
| --- | --- | --- |
| Configuracao inicial | Parametros do tenant esta dentro de Comercial | Admin pode nao encontrar configuracoes globais. |
| Dashboard | "Inicio" agrupa apenas Dashboard | Menu fica artificial e ocupa espaco. |
| Equipes | Alocacao semanal dentro de cadastro de equipes | Usuario pode achar que agenda real ocorre ali. |
| Certificados/historico | Conceitos misturados em uma tela | Usuario pode nao entender diferenca entre emitir e consultar historico. |
| Auditoria de anexos | Aparece no operacional | Pode poluir fluxo cotidiano; talvez seja qualidade/admin. |
| Documentos | Impressao local via browser em parte dos fluxos | Variacao por navegador e menor rastreabilidade final. |
| Encoding | Textos corrompidos | Usuario perde confianca e documentos ficam ruins. |

## Tratamento de excecoes que precisa amadurecer

- Cancelamento de agendamento antes/depois de OS.
- OS gerada por engano.
- OS encerrada com quantidade errada.
- Reabertura de OS.
- Certificado emitido incorretamente.
- Revogacao/substituicao de certificado.
- Medicao cancelada ou parcialmente paga.
- Contrato vencido com agendamento futuro.
- Servico sem saldo suficiente.
- Tenant suspenso tentando acessar sistema.

