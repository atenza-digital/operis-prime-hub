# Evidências de Teste

## Ciclo 2026-07-17

### Evidências geradas

- Inventário dos anexos: `docs/entrega/referencias/INVENTARIO-ANEXOS-CIPERPRAG.md`.
- Inventário estruturado: `docs/entrega/referencias/inventario-anexos-ciperprag.json`.
- Renders PNG de PDFs de referência: `docs/entrega/referencias/renders/`.

### Arquivos catalogados

- `CERTIFICADO TECNOSONDA TAG 02 BEBEDOURO.pdf`.
- `proposta roço e manutendcao de jardim Komatsu.pdf`.
- `proposta roço e manutendcao de jardim Komatsu.docx`.
- `MINUTA..docx`.
- `frelatorio de pulga escritorio.pdf`.
- `planilha preco pmoc.xlsx`.
- `planilhas de preco por obra.canteiro.xlsx`.
- `proposta contrato.pdf`.
- `planilhas de preco por obra.canteiro (1).xlsx`.
- `medição GD Infra junho 2026 (2).xlsx`.
- `ordem de serviço 2413 - fabrica (1).pdf`.

### Validação executada

- Extração de metadados de PDF, DOCX e XLSX.
- Renderização visual das primeiras páginas dos PDFs principais.
- Normalização de nomes com acento para evitar falha de leitura por composição Unicode.
- Build frontend executado com sucesso: `npm run build`.
- Lint executado com sucesso: `npm run lint`.

### Ajuste funcional validado

- P0.1 Propostas: ampliado ciclo de status comercial para incluir `em_negociacao`, `recusado` e `cancelado`.
- Banco: criada migração `database/migrations/019_commercial_proposal_statuses.sql`.
- Banco: migração 019 aplicada com sucesso no banco configurado pelo `.env`; constraint `contratos_templates_status_check` validada.
- Frontend/API types: tipos atualizados para aceitar os novos status.
- Dashboard: contagem de propostas em negociação passa a considerar propostas com status `em_negociacao`.
- P0.1 Propostas: adicionados campos estruturados de proposta (`titulo`, `objeto`, `validade_dias`, `modalidade`, `locais_execucao`, `escopo_tecnico`, `condicoes_comerciais`).
- P0.1 Propostas: adicionadas descrições/unidades comerciais por item em `contratos_templates_servicos`.
- P0.1 Propostas: criada proposta de homologação `CIPER-KOM-ROCO-JARD-001/2026`.
- Evidência visual: `docs/evidencias/p0-propostas/p0-propostas-lista-komatsu-v4.png`.
- PDF preview: `docs/evidencias/p0-propostas/p0-proposta-komatsu-preview-v4.pdf`.
- Render do PDF: `docs/evidencias/p0-propostas/p0-proposta-komatsu-preview-v4-1.png`.
- Validação visual manual: acentuação da primeira página corrigida e itens comerciais aparecem com descrições distintas.

### Validação ainda pendente

- Testes automatizados.
- Testes E2E.
- Testes de isolamento por tenant.
- Testes de RLS.
- Testes de upload/download em R2.
- Comparação visual automática dos documentos gerados contra referências.

## Smoke técnico P0.1 - proposta aprovada para contrato

Executado em ambiente local com API isolada na porta `3025`.

Resultado validado:

- Proposta criada via `/api/contract-templates`.
- Proposta atualizada para status `aprovado` via `/api/contract-templates`.
- Contrato gerado via `/api/contract-templates/:id/generate-contract`.
- Contrato retornou como `tipo = contrato` e `status = vigente`.
- `descricaoComercial` e `unidadeComercial` foram copiadas para o contrato.
- Sincronização operacional retornou `created = 1`, `updated = 0`, `skipped = false`.

Identificadores do smoke:

- Proposta: `PROP-P0-MRPGDZ4I/2026`.
- Contrato: `CT-126/2026`.
- Contrato ID: `TPL-MRPGDZS49588`.

Complemento de UX implementado:

- Ações rápidas de proposta adicionadas na listagem: enviar, aprovar, recusar e gerar contrato quando aprovada.

## Smoke técnico P0.1 - snapshot histórico da proposta

Executado em ambiente local com API isolada na porta `3026`, usando o perfil comercial de homologação e uma proposta existente do tenant `ciperprag`.

Resultado validado:

- Login autenticado com permissão `contratos.manage`.
- Emissão via `/api/contract-templates/:id/issue-document`.
- Anexo gravado com `entidade_tipo = proposta`, `categoria = pdf_historico` e `imutavel = true`.
- Hash SHA-256 do conteúdo e hash SHA-256 do snapshot registrados.
- Template registrado como `proposta-comercial`, versão `p0-ciperprag-v1`.
- Provedor efetivo registrado como `database`; campos de R2 ficaram preparados para a próxima camada de armazenamento.
- Download autenticado retornou HTTP `200` e `text/html`.

Identificadores da evidência:

- Proposta: `PROP-P0-MRPGDZ4I/2026`.
- Anexo histórico: `DOC-MRPHB3C6`.
- Hash do conteúdo: `ddabcc79140ee6fb31bf0f72a422e8a912be6a30bfd730fe04d6da9b6d1cbc38`.
- Hash do snapshot: `9b7d28d20bdb937c55c93df2d500676d7fc26a87f4149565a88a9927539b1831`.

## Smoke técnico P0.2 - minuta do cliente para contrato

Executado em ambiente local com API isolada na porta `3027`, utilizando uma minuta de homologação e o perfil comercial.

Resultado validado:

- Minuta criada com `tipo = minuta` e `status = aprovado`.
- Snapshot histórico gravado com `entidade_tipo = minuta`.
- Template registrado como `minuta-contrato-cliente`, versão `p0-ciperprag-v1`.
- Contrato gerado pela mesma minuta com numeração automática `CT-127/2026`.
- Sincronização operacional retornou `created = 1`, `updated = 0`, `skipped = false`.

Identificadores da evidência:

- Minuta: `MIN-P0-MRPIHYMA/2026` (`TPL-MRPIHYNNC0F5`).
- Snapshot da minuta: `DOC-MRPIHYU5`.
- Contrato gerado: `CT-127/2026` (`TPL-MRPIHYWGCC2A`).

## Smoke técnico P0.2 - arquivo original da minuta

Executado em ambiente local com API isolada na porta `3029`, usando o perfil comercial de homologação.

Resultado validado:

- Upload aceito pelo endpoint protegido de origem da minuta.
- Arquivo vinculado ao tenant e à entidade `minuta`.
- Validação de MIME e limite de 8 MB aplicada.
- Hash SHA-256 persistido no anexo imutável e retornado no download.
- Auditoria registrada para a ação de upload.
- Download autenticado retornou HTTP `200` com o mesmo hash do upload.

Identificadores da evidência:

- Anexo original: `SRC-MRPJ7VFG`.
- Arquivo de smoke: `minuta-cliente-teste.pdf`.
- Tamanho: `35` bytes.
- Hash SHA-256: `8dd65ad79e99e5b895768bb4067cb732aec9a4c2ccc1c4304e97c0eb065bbe99`.
- Provedor efetivo: `database` na homologação.
