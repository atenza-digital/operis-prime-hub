# Sistema Visual de Documentos — Versão 1

Este padrão fica congelado como base visual dos documentos do Atenza FieldOps após a aprovação da proposta `proposta-ciperprag-padrao-v5-ritmo.pdf`.

## Diretrizes Congeladas

- Formato base: A4 retrato, com suporte previsto para A4 paisagem.
- Tipografia documental: Montserrat 400, 500, 600 e 700, carregada a partir dos arquivos locais em `src/assets/fonts/documentos/montserrat`.
- Cabeçalho: logo dinâmica do tenant, identificação do documento, versão e data na primeira página.
- Rodapé: identificação do documento, versão e paginação `Página X de Y`.
- Cores: cor primária parametrizada pelo tenant somente para documentos quando necessário, com texto institucional em tom escuro neutro. Esta decisão não obriga a interface a seguir a cor do tenant nesta fase.
- Margens: 18 mm laterais e 16 mm superior/inferior.
- Seções: numeração sequencial, título com linha inferior e hierarquia consistente.
- Parágrafos narrativos: texto justificado, recuo de primeira linha e espaçamento confortável.
- Listas: itens independentes, sem concatenação por ponto e vírgula.
- Tabelas: cabeçalho contrastante, linhas com respiro e totais destacados.
- Quadros: metadados, observações e resumo com bordas discretas.
- Assinaturas: bloco independente, inteiro, com área livre para assinatura manual e suporte futuro a assinatura eletrônica.
- Paginação: não comprimir conteúdo para reduzir páginas; evitar páginas vazias ou apenas com cabeçalho/rodapé.
- PDF: texto selecionável, idioma `pt-BR`, metadados preenchidos e PDF marcado quando suportado pelo gerador.

## Elementos Compartilhados

Os elementos reutilizáveis estão em `src/components/documentos/DocumentVisualSystem.tsx`:

- `DOCUMENT_VISUAL_SYSTEM_VERSION`
- `DocumentHeader`
- `DocumentFooter`
- `DocumentSectionTitle`
- `DocumentMetadataBox`
- `DocumentObservationBox`
- `DocumentSignatureBlock`
- `documentPageClass`
- `documentPageStyle`

## Famílias Documentais

Cada família documental deve reutilizar a mesma linguagem visual, sem copiar obrigatoriamente a distribuição interna da proposta:

- Propostas comerciais.
- Contratos e minutas.
- Ordens de serviço.
- Certificados com QR Code e hash.
- Relatórios técnicos com fotos e evidências.
- Medições e acompanhamento.

## Suportes Previstos

- Documentos curtos e extensos.
- Tabelas continuadas.
- QR Code e hash.
- Fotos e evidências.
- Assinaturas.
- Documentos com ou sem aceite.
- Parametrização por tenant: logo, cor primária documental quando aplicável, dados da empresa, filial emissora, responsável e metadados.

## Regra de Evolução

Após este congelamento, alterações visuais subjetivas só devem ser feitas mediante solicitação explícita. Ajustes técnicos, dados dinâmicos, acessibilidade, metadados, correções gramaticais e prevenção de quebras continuam permitidos.
