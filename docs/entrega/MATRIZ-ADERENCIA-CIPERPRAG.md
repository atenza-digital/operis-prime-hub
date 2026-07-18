# Matriz de Aderência Ciperprag

Status possíveis: não iniciado, em implementação, implementado, testado, validado, bloqueado.

| Etapa | Tema | Referência principal | Situação atual | Lacunas críticas | Status |
| --- | --- | --- | --- | --- | --- |
| P0.1 | Propostas | `proposta roço e manutendcao de jardim Komatsu.pdf`, `proposta contrato.pdf`, planilhas de preço | Campos estruturados, status comercial, descrições comerciais por item, PDF preview e matriz de origem criados | Validar aprovação/conversão em contrato, snapshot, storage R2 e comparação final com referência | em implementação |
| P0.2 | Contratos e minutas | `MINUTA..docx`, proposta aprovada | Referência catalogada | Separar proposta, minuta e contrato; permitir modelo do cliente; amarrar contrato ao saldo e agendamento | não iniciado |
| P0.3 | Agendamentos | Fluxo operacional Ciperprag e contratos vigentes | Parcial no sistema | Revisar UX, saldo por item, equipe, veículo, recorrência e bloqueio por contrato inválido | não iniciado |
| P0.4 | Ordens de Serviço | `ordem de serviço 2413 - fabrica (1).pdf` | Referência renderizada | Revisar campos dinâmicos, numeração automática, fechamento, anexos, fotos, tags, assinatura e impressão | não iniciado |
| P0.5 | Certificados | `CERTIFICADO TECNOSONDA TAG 02 BEBEDOURO.pdf` | Referência renderizada | Ajustar aderência visual, fotos dinâmicas até 3, QR Code, hash, rota pública e snapshot | não iniciado |
| P0.6 | Relatórios técnicos | `frelatorio de pulga escritorio.pdf` | Referência renderizada | Criar/validar modelo parametrizável, evidências, conclusão, plano de ação e assinatura | não iniciado |
| P0.7 | Medições | `medição GD Infra junho 2026 (2).xlsx` e layout já aprovado anteriormente | Referência catalogada; layout moderno aprovado anteriormente deve ser preservado | Garantir que não haja regressão, evitar duplicidade, acompanhar NF/pagamento/cobrança sem virar ERP | não iniciado |

## Fundação aplicada dentro do P0

| Fundação | Quando entra | Objetivo | Status |
| --- | --- | --- | --- |
| Tenant e isolamento | Desde P0.1 | Evitar hardcode Ciperprag e preparar SaaS | não iniciado |
| Permissões backend | Desde P0.1 | Bloquear acesso por perfil, especialmente valores para Operacional | não iniciado |
| RLS PostgreSQL | Antes da validação P0 | Garantir isolamento real no banco | não iniciado |
| R2 por ambiente | Ao implementar documentos/anexos | Armazenar PDFs, anexos, fotos e snapshots com isolamento | não iniciado |
| Auditoria | Durante P0 | Registrar ações críticas de documentos, status e anexos | não iniciado |
| Motor de documentos | Desde P0.1 | Versionar templates e snapshots por tenant/documento | não iniciado |
| Tratamento de erros | Durante P0 | Mensagens claras e seguras para usuários | não iniciado |
| Testes e evidências | Em cada etapa P0 | Provar aderência e evitar regressão | em implementação |
