# Validação técnica da medição P0.7

Arquivo PDF: `docs/evidencias/etapa7_homologacao/medicoes/med-validacao-2026-a4-retrato.pdf`

Render PDF: `docs/evidencias/etapa7_homologacao/medicoes/med-validacao-2026-pdf-render.png`

Screenshot da tela: `docs/evidencias/etapa7_homologacao/medicoes/med-validacao-2026-tela.png`

## Resultado

- Formato: A4 retrato.
- Páginas reais do PDF: 1.
- PDF marcado: sim (`Tagged: yes`).
- Texto selecionável: sim.
- Fonte documental: Montserrat local incorporada ao PDF.
- Fontes detectadas no PDF: `Montserrat-Regular`, `Montserrat-Medium`, `Montserrat-SemiBold`, `Montserrat-Bold`.
- Fontes de fallback proibidas: não detectadas (`NotoSans`, `Arial`, `Roboto`, `Times`, `Consolas` e `Liberation Sans` ausentes).
- Página vazia ou quase vazia: não encontrada.
- Assinaturas e rastreabilidade: permanecem na mesma página do total geral no cenário de 5 itens.
- Código da medição: `MED-VALIDACAO/2026` permanece em uma única linha.
- Local/data antes das assinaturas: `Parauapebas - PA, 19 de julho de 2026.`
- Rastreabilidade visível: `MED-VALIDACAO/2026 • Revisão 1 • Página 1 de 1`.
- IDs técnicos completos: não aparecem no rodapé visível; ficam restritos a banco, auditoria e metadados.

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
- Logo documental: resolvida por `documentLogoLightUrl`/`logoPrincipalUrl`/`logoUrl` do tenant ou snapshot, sem fallback fixo de outro tenant.

## Validações executadas

- `node scripts/audit-document-assets.mjs`
- `npm run lint`
- `npm run test`
- `npm run build`
- `node scripts/render-measurement-evidence.mjs` contra frontend local atualizado em `http://127.0.0.1:8091`
- `pdfinfo` no PDF gerado
- `python scripts/validate-document-pdf-fonts.py docs/evidencias/etapa7_homologacao/medicoes/med-validacao-2026-a4-retrato.pdf`
- Renderização do PDF em PNG via `pdftoppm`
- Inspeção visual do PNG renderizado
- Extração de texto com `pypdf`

## Evidência de fontes

Verificação equivalente ao `pdffonts`, via `pypdf`, retornou:

```json
{
  "fonts": [
    "AAAAAA+Montserrat-Bold",
    "BAAAAA+Montserrat-SemiBold",
    "CAAAAA+Montserrat-Regular",
    "DAAAAA+Montserrat-Medium"
  ],
  "normalizedFonts": [
    "Montserrat-Bold",
    "Montserrat-Medium",
    "Montserrat-Regular",
    "Montserrat-SemiBold"
  ],
  "ok": true,
  "errors": []
}
```

O script de geração aguarda `document.fonts.ready`, carrega explicitamente os pesos 400, 500, 600 e 700 de Montserrat e interrompe a emissão caso algum peso não esteja disponível.

## Observações

- A evidência foi gerada pela tela real de Medição no ambiente local de desenvolvimento.
- A variável global `DATABASE_URL` da sessão apontava para a VPS e foi limpa durante a geração para usar o Postgres local do Docker (`127.0.0.1:5432`).
- A proteção contra duplicidade foi reforçada no banco por `tenant_id + os_id`, evitando sombreamento entre medições ativas do mesmo tenant.
- Infraestrutura de produção, como PDF server-side definitivo, R2 imutável, revisão/substituição completa e matriz tri-tenant com assets versionados, permanece planejada na etapa de hardening SaaS.
