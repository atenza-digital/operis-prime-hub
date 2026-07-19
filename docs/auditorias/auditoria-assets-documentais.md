# Auditoria de assets documentais

Atualizado em: 2026-07-19

## Escopo

Esta auditoria verifica a origem de logos, icones, brasoes, selos, assinaturas e cores usados nos documentos emitidos pelo Atenza FieldOps. A regra de produto e que documentos do tenant usem somente ativos documentais do proprio tenant, vindos de configuracao ou snapshot documental, sem fallback fixo da Ciperprag, de outro cliente ou da Atenza.

## Resultado automatico

- Renderizadores ativos com padroes proibidos: nao.
- Arquivo estatico com marcas Ciperprag classificado como referencia historica: `src/template_certificado_preenchido.html`.
- A geracao tri-tenant completa ainda fica pendente para a etapa de hardening SaaS/R2, porque depende de seeds isoladas e armazenamento versionado de arquivos.

## Tipografia documental

- Fonte padrao dos documentos emitidos: Montserrat local.
- Pesos obrigatorios disponiveis: 400, 500, 600 e 700.
- Carregamento: `document.fonts.ready` + `document.fonts.load` antes da impressao.
- Numeros, codigos, datas e valores: Montserrat com `font-variant-numeric: tabular-nums lining-nums`, sem fonte monoespacada.
- Validacao pos-PDF: `scripts/validate-document-pdf-fonts.py` bloqueia `NotoSans`, `Arial`, `Roboto`, `Times`, `Consolas`, `Liberation Sans` e qualquer fonte nao Montserrat nos PDFs validados.

## Matriz documental

| Tipo de documento | Template/renderizador | Logo usada | Campo de configuracao | Origem do arquivo | Fallback | Isolamento por tenant | Snapshot | Teste executado | Resultado | Pendencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Propostas | ProposalReferencePrint / ProposalDocumentPrint | documental do tenant ou fallback textual | companyConfig.certificadoConfig.documentLogoLightUrl \| logoPrincipalUrl \| logoUrl | src/pages/comercial/Contratos.tsx | SVG textual com iniciais/nome da empresa emissora | sem fallback de outro tenant nos renderizadores ativos | parcial; snapshot de asset completo pendente | inspecao estatica sem padroes proibidos no renderizador ativo | parcialmente parametrizado | Persistir snapshot imutavel dos assets e executar matriz tri-tenant completa. |
| Contratos e minutas | ContractReferencePrint | documental do tenant ou fallback textual | companyConfig.certificadoConfig.documentLogoLightUrl \| logoPrincipalUrl \| logoUrl | src/pages/comercial/Contratos.tsx | SVG textual com iniciais/nome da empresa emissora | sem fallback de outro tenant nos renderizadores ativos | parcial; snapshot de asset completo pendente | inspecao estatica sem padroes proibidos no renderizador ativo | parcialmente parametrizado | Parametrizar clausulas, condicoes comerciais e snapshot de assets por revisao. |
| Ordens de Servico | buildOsPrintHtml | documental do tenant ou fallback textual | companyConfig.certificadoConfig.documentLogoLightUrl \| logoPrincipalUrl \| logoUrl | src/lib/osPrint.ts | Bloco textual com nome da empresa emissora | sem fallback de outro tenant nos renderizadores ativos | parcial; snapshot de asset completo pendente | inspecao estatica sem padroes proibidos no renderizador ativo | hardcoded e corrigido | Salvar versao/hash do asset documental usado na emissao da OS. |
| Certificados | imprimirCertificado | documental do tenant ou fallback textual | certificadoConfig + snapshot: documentLogoLightUrl, brandIconUrl, seloInstitucionalUrl, assinaturaUrl, cores | src/components/CertificadoImpressao.tsx | Marca textual do emissor; blocos condicionais sem espaco vazio quando desabilitados | sem fallback de outro tenant nos renderizadores ativos | parcial; snapshot de asset completo pendente | inspecao estatica sem padroes proibidos no renderizador ativo | hardcoded e corrigido | Persistir PDF/hash server-side e validar QR impresso em multiplos aparelhos. |
| Medicoes | MeasurementPrintSaas | documental do tenant ou fallback textual | companyConfig.certificadoConfig.documentLogoLightUrl \| logoPrincipalUrl \| logoUrl; snapshot issueCity/issueState/issuedAt/timezone/revisao | src/pages/Medicao.tsx | Iniciais da empresa emissora | sem fallback de outro tenant nos renderizadores ativos | snapshot inclui cidade, UF, data, timezone e revisao; assets completos pendentes | inspecao estatica sem padroes proibidos no renderizador ativo | hardcoded e corrigido | Persistir snapshot completo de asset, hash do arquivo e storage R2. |
| Relatorios tecnicos | buildTechnicalReportHtml | documental do tenant ou fallback textual | companyConfig.certificadoConfig.documentLogoLightUrl \| logoPrincipalUrl \| logoUrl | src/lib/technicalReportPrint.ts | Bloco textual com nome da empresa emissora | sem fallback de outro tenant nos renderizadores ativos | parcial; snapshot de asset completo pendente | inspecao estatica sem padroes proibidos no renderizador ativo | hardcoded e corrigido | Persistir snapshot de asset, assinatura e selos por relatorio. |
| Laudos | pendente | pendente | previsto: identidade documental do tenant | nao implementado | previsto: textual sem imagem quebrada | pendente | pendente | inspecao estatica sem padroes proibidos no renderizador ativo | pendente | Criar familia documental de laudos quando entrar no escopo funcional. |
| Documentos historicos | referencia estatica preenchida | documental do tenant ou fallback textual | nao aplicavel ao fluxo ativo | src/template_certificado_preenchido.html | nao aplicavel | sem fallback de outro tenant nos renderizadores ativos | parcial; snapshot de asset completo pendente | inspecao estatica: referencia historica: asset fixo logo_ciperprag, referencia historica: asset fixo assinatura_certificado, referencia historica: asset fixo icone_lateral_certificado, referencia historica: asset fixo brasao_prefeitura | parcialmente parametrizado | Mover referencias estaticas para pasta de fixtures/documentacao ou substituir por snapshots versionados. |

## Separacao esperada de ativos

- Favicon global da plataforma: Atenza.
- Marca da plataforma: Atenza FieldOps.
- Topo do menu expandido: logo de interface do tenant.
- Menu recolhido: icone do tenant ou favicon da plataforma como fallback neutro.
- Documentos emitidos: logo documental do tenant.
- Brasoes e selos: ativos auxiliares parametrizados por tenant, documento, servico/categoria e validade opcional.
- Assinatura: configuracao do responsavel documental, separada de logo.
- Cor primaria documental: configuracao do tenant aplicada apenas quando a familia documental permitir.

## Arquivos alterados nesta rodada

- `src/pages/Medicao.tsx`
- `scripts/render-measurement-evidence.mjs`
- `src/components/CertificadoImpressao.tsx`
- `src/lib/osPrint.ts`
- `src/lib/technicalReportPrint.ts`
- `src/pages/comercial/Contratos.tsx`
- `src/pages/comercial/Configuracoes.tsx`
- `src/components/AppLayout.tsx`
- `src/components/ComercialLayout.tsx`
- `src/pages/AlterarSenha.tsx`
- `scripts/audit-document-assets.mjs`

## Pendencias controladas

- Implementar storage R2 com buckets/prefixos por ambiente e tenant, MIME type, limite de tamanho, nomes nao previsiveis, hash e versao de arquivo.
- Persistir em snapshot documental: tenant emissor, logo documental usada, cores, selos, assinatura, versao/hash dos assets e configuracoes aplicadas.
- Gerar matriz tri-tenant completa: Ciperprag, Empresa demonstracao e tenant sem identidade visual.
- Mover o certificado preenchido estatico para fixtures/referencias para evitar confusao com renderizador ativo.
- Criar familia de laudos quando o escopo funcional entrar em execucao.
