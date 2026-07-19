# Validação técnica da medição P0.7

Arquivo PDF: `docs/evidencias/etapa7_homologacao/medicoes/med-validacao-2026-a4-retrato.pdf`

Render PDF: `docs/evidencias/etapa7_homologacao/medicoes/med-validacao-2026-pdf-render-1.png`

Screenshot da tela: `docs/evidencias/etapa7_homologacao/medicoes/med-validacao-2026-tela.png`

## Resultado

- Formato: A4 retrato.
- Páginas reais do PDF: 1.
- PDF marcado: sim (`Tagged: yes`).
- Texto selecionável: sim.
- Página vazia ou quase vazia: não encontrada.
- Assinaturas e rastreabilidade: permanecem na mesma página do total geral no cenário de 5 itens.

## Checks do complemento de medição

- Indicador `Quantidade total`: removido.
- Indicadores exibidos: `OS consolidadas`, `Itens medidos`, `Total geral`.
- Composição por unidade: `3 serviços • 1 visita • 10 horas`.
- Pluralização: sem `item(ns)` e sem soma indevida de unidades diferentes.
- Medição parcial: badge `Parcial até 19/07/2026`.
- Responsável documental: `Aline Vieira`, vindo do snapshot/configuração da medição de validação.
- Usuário de homologação/Atenza: não aparece como responsável no PDF.
- Texto `Gerado pelo Atenza FieldOps`: não aparece no documento.
- Condição de pagamento: usa texto da medição/contrato da amostra, sem hardcode de boleto obrigatório.

## Observações

- A evidência foi gerada pela tela real de Medição no ambiente local de desenvolvimento, com frontend atual em `http://127.0.0.1:8091`.
- A proteção contra duplicidade foi reforçada no banco por `tenant_id + os_id`, evitando sombreamento entre medições ativas do mesmo tenant.
- Os itens de infraestrutura de produção, como PDF server-side definitivo, R2 imutável, revisão/substituição completa e permissões granulares por valor, permanecem planejados na etapa de fundação/hardening.
