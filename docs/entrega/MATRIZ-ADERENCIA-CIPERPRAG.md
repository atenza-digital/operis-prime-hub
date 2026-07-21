# Matriz de Aderência Ciperprag

Status possíveis: não iniciado, em implementação, implementado, testado, validado, bloqueado.

| Etapa | Tema | Referência principal | Situação atual | Lacunas críticas | Status |
| --- | --- | --- | --- | --- | --- |
| P0.1 | Propostas | `proposta roço e manutendcao de jardim Komatsu.pdf`, `proposta contrato.pdf`, planilhas de preço | Fluxo comercial com proposta, status, layout documental aprovado como base, snapshot histórico, hash e auditoria | Validação humana final da aderência visual e PDF server-side/R2 na fundação P1 | testado |
| P0.2 | Contratos e minutas | `MINUTA..docx`, proposta aprovada | Fluxo separado entre proposta, minuta/modelo do cliente e contrato; contrato vigente sincroniza itens operacionais | Parametrização avançada de cláusulas e motor documental server-side na fundação P1 | testado |
| P0.3 | Agendamentos | Fluxo operacional Ciperprag e contratos vigentes | Agenda usa contrato vigente, saldo operacional, equipe, veículo, recorrência e continuidade do fluxo | Melhorias visuais avançadas de calendário/mês/semana ficam em P2 após validação do P0 | testado |
| P0.4 | Ordens de Serviço | `ordem de serviço 2413 - fabrica (1).pdf` | OS gerada a partir de agendamento, impressão, encerramento, evidências, tags, assinatura e até 3 fotos | Validação humana final do PDF e saneamento definitivo de seeds antigos | testado |
| P0.5 | Certificados | `CERTIFICADO TECNOSONDA TAG 02 BEBEDOURO.pdf` | Certificado A4 paisagem com Montserrat, QR Code, hash, validação pública, fotos dinâmicas e identidade parametrizável | Teste físico de leitura de QR Code em aparelhos reais e hash imutável server-side final em P1 | testado |
| P0.6 | Relatórios técnicos | `frelatorio de pulga escritorio.pdf` | Tela `/relatorios-tecnicos`, filtros e emissão a partir da OS, sem expor valores comerciais | Validação humana visual e eventual ajuste fino de texto técnico por serviço | testado |
| P0.7 | Medições | `medição GD Infra junho 2026 (2).xlsx` e layout aprovado | Medição por período com bloqueio de OS já medida, PDF aprovado, kanban/status de NF, pagamento e baixa manual no ERP | Teste humano de duplicidade e conferência do fluxo financeiro leve | testado |

## Fundação aplicada dentro do P0

| Fundação | Quando entra | Objetivo | Status |
| --- | --- | --- | --- |
| Tenant e isolamento | Desde P0.1 | Evitar hardcode Ciperprag e preparar SaaS | parcial avançado |
| Permissões backend | Desde P0.1 | Bloquear acesso por perfil, especialmente valores para Operacional | parcial avançado |
| RLS PostgreSQL | Antes da validação P0 | Garantir isolamento real no banco | planejado P1 |
| R2 por ambiente | Ao implementar documentos/anexos | Armazenar PDFs, anexos, fotos e snapshots com isolamento | planejado P1 |
| Auditoria | Durante P0 | Registrar ações críticas de documentos, status e anexos | parcial avançado |
| Motor de documentos | Desde P0.1 | Versionar templates e snapshots por tenant/documento | parcial |
| Tratamento de erros | Durante P0 | Mensagens claras e seguras para usuários | parcial |
| Testes e evidências | Em cada etapa P0 | Provar aderência e evitar regressão | em implementação |
