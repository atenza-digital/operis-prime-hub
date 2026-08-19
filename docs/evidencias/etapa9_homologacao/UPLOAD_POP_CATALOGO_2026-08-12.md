# Evidencia - ajuda e upload de POP no catalogo

Data: 2026-08-12
Ambiente: desenvolvimento/local; nao publicado nesta rodada
Escopo: AF-P1-005 / RN-COM-003

## Entregue

- A tela Comercial > Servicos explica em linguagem simples que POP significa Procedimento Operacional Padrao e qual sua finalidade.
- O cadastro de servico permite anexar um POP pronto em PDF, DOCX, ODT, PNG ou JPG.
- O upload usa a politica `servico_pop.pop_aprovado` configuravel no tenant.
- O backend valida MIME declarado, MIME do Data URL, assinatura magica do arquivo e tamanho maximo.
- O arquivo e salvo como anexo imutavel do POP, com SHA-256, metadados de seguranca, plano de storage e auditoria.
- Se o servico ainda nao possuir POP estruturado, o upload cria um POP minimo vinculado ao catalogo para que o usuario nao precise preencher tudo manualmente.
- O catalogo exibe o nome e o prefixo do hash dos arquivos anexados ao POP ativo.

## Fluxo esperado

1. Abrir Comercial > Servicos.
2. Criar ou editar um servico.
3. No bloco POP versionado, escolher o arquivo pronto.
4. Salvar o servico.
5. Reabrir os detalhes do servico e conferir o arquivo e o hash exibidos.
6. Conferir o anexo na Auditoria de anexos, com entidade `servico_pop` e categoria `pop_aprovado`.

## Protecoes

- O endpoint exige `servicos.manage`.
- O servico e o anexo sao sempre consultados pelo `tenant_id` do usuario.
- Arquivo com extensao/MIME divergente, assinatura invalida ou tamanho acima da politica e rejeitado.
- O historico nao e apagado quando um novo arquivo e anexado.
- Antivirus/quarentena continua como pendencia de hardening, registrada nos metadados sem bloquear o rollout atual.

## Homologacao pendente

Validar com usuario comercial/admin: PDF real, DOCX real, arquivo acima do limite, arquivo renomeado com MIME incorreto, tenant sem permissao e consulta do anexo na auditoria.
