# QA - Matriz de Triagem de Divergências P0

- Arquivo final: `docs/cliente/relatorios_homologacao/Matriz_Triagem_Divergencias_Homologacao_P0_v1.0.xlsx`.
- Builder: `docs/evidencias/etapa7_homologacao/matriz_triagem_divergencias/build-triage-matrix.mjs`.
- Abas: `Resumo`, `Triagem`, `Critérios` e `Referências`.
- Objetivo: consolidar o retorno do roteiro preenchido pelo Tarcísio/equipe e classificar cada ocorrência como correção P0 obrigatória, Etapa 8, melhoria futura, dúvida de uso ou não procede.
- Listas suspensas: perfil, resultado, severidade, frente P0, classificação, status, bloqueio P0 e responsável.
- Fórmulas de resumo: total de ocorrências, abertas, em análise, resolvidas, reprovadas, ressalvas, críticas, P0 obrigatório, Etapa 8, melhoria futura, bloqueios e itens sem dono.
- Render visual: `matriz-triagem-resumo.png`, `matriz-triagem-triagem.png` e `matriz-triagem-criterios.png`.
- Verificação estrutural: XLSX contém 4 planilhas, sem erro literal de fórmula (`#REF!`, `#DIV/0!`, `#VALUE!`, `#NAME?`, `#N/A`) e sem marcadores de encoding quebrado.
- Observação técnica: a renderização PNG foi executada uma vez para QA visual; no builder versionado ela fica opcional via `RENDER_QA=1` porque o renderizador do runtime no Windows gera os PNGs, mas encerra com código nativo após a renderização.
