# Roadmap por Etapas - Atenza FieldOps

Este arquivo organiza todo o backlog em etapas. Nenhum item deve ficar solto fora deste mapa.

## Etapa 1 de 8 - Correcoes P0 de seguranca e consistencia

Status: concluida no escopo P0 planejado.

- Isolamento por tenant no nucleo operacional.
- Remocao da rota duplicada de certificado.
- Protecao contra escrita silenciosa em tenant incorreto.
- Migracao `013_tenant_scope_measurements_and_documents.sql`.

## Etapa 2 de 8 - Documentacao Atenza e rebranding base

Status: em andamento nesta release.

- Estrutura `docs/*` padrao Atenza.
- Nome de produto: Atenza FieldOps.
- Subtitulo: Gestao de servicos tecnicos, equipes de campo, OS, evidencias, certificados e medicoes.
- Chamada: Do contrato ao campo. Do campo ao certificado.
- Versao e ambiente visiveis na interface.
- Release notes e roteiro de homologacao.

## Etapa 3 de 8 - Integracao comercial para operacional

- Transformar contrato comercial vigente em contrato operacional.
- Vincular itens comerciais ao saldo executavel.
- Definir unidade, valor unitario, recorrencia, locais e tags.
- Evitar duplicidade entre `contratos_templates` e `contratos`.

## Etapa 4 de 8 - Aderencia documental Ciperprag

- Revisar proposta, contrato, OS, certificado e medicao contra modelos originais.
- Gerar PNGs de conferencia sempre que houver mudanca visual em documento.
- Parametrizar textos fixos e campos dinamicos.

## Etapa 5 de 8 - Medicao e acompanhamento financeiro operacional

- Kanban/status da medicao.
- NF enviada, aguardando pagamento, pago/baixado no ERP e pendencias.
- Sem contas a pagar/receber dentro da plataforma.

## Etapa 6 de 8 - PDFs server-side e anexos imutaveis

- PDF server-side para OS, certificado, medicao, proposta e contrato.
- Hash, anexo imutavel e historico de templates.

## Etapa 7 de 8 - QA, testes E2E e homologacao guiada

- E2E comercial -> operacional -> medicao -> recorrencia.
- Teste multi-tenant dedicado.
- Roteiros formais e evidencias em `docs/evidencias`.

## Etapa 8 de 8 - Producao e governanca SaaS

- Separacao homologacao/producao.
- Observabilidade, backup/restauracao, release/rollback.
- Auditoria de dependencias, vulnerabilidades e hardening.
- Painel Atenza para tenants, planos, pagamentos e bloqueios.
