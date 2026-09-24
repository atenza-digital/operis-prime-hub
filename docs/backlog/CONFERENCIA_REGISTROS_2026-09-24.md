# Conferência operacional da homologação

Coleta oficial somente leitura em 24/09/2026, 13:59, tenant Ciperprag. Origem: [CI/CD 36030487719](https://github.com/atenza-digital/operis-prime-hub/actions/runs/36030487719), versão `35c138b065b15b7b50ee73f97cafc3abf6bcbaf7`. Relatório integral no artefato `auditoria-operacional-35c138b065b15b7b50ee73f97cafc3abf6bcbaf7`, em Markdown e JSON; retenção de 30 dias.

## O que significavam os quatro itens

Eram quatro categorias com ocorrências, não quatro registros com erro. A consulta encontrou 18 registros distribuídos nessas categorias. Uma etapa ainda não realizada não prova defeito de software.

| Categoria | Quantidade | Classificação e ação |
| --- | --- | --- |
| Proposta aprovada sem minuta identificada | 1 | Não aplicável: minutas desativadas na Ciperprag. Não gerar documento. |
| Minutas aprovadas sem contrato identificado | 3 | Não aplicável: contratos desativados. Preservar histórico. |
| Agendamentos em aberto sem OS | 6 | Conferir planejamento e datas; não gerar OS nem cancelar automaticamente. |
| OS encerradas sem medição vinculada | 8 | Conferir necessidade de medição, período e valores; não presumir faturamento pendente ou obrigatório. |

Os vínculos proposta/minuta/contrato nesta auditoria são heurísticos, identificados por texto de observações. Não constituem prova definitiva de ausência documental.

## Registros identificados

A proposta é `E2E-PROP-MT335YM1`. As minutas são `MIN-136/2026`, `MIN-139/2026` e `MIN-142/2026`. Não é necessário habilitar esses recursos para concluir o fluxo atual da Ciperprag.

| Agendamento | Data agendada | Conferência sugerida em 24/09/2026 |
| --- | --- | --- |
| AG-MT35AIB4 | 19/09/2026 | Data passada: verificar se teste, atendimento pendente, remarcado ou cancelado. |
| AG-MT35A62N | 20/09/2026 | Data passada: verificar se teste, atendimento pendente, remarcado ou cancelado. |
| AG-MU1QE10O | 14/10/2026 | Data futura: pode permanecer em planejamento. |
| AG-MT22LPKA | 15/02/2027 | Data futura: conferir se intencional. |
| AG-MU1QUJXA | 13/03/2027 | Data futura: conferir se intencional. |
| AG-MU2P30JC | 13/03/2027 | Data futura: conferir se intencional; mesma data não prova duplicidade. |

| OS sem medição vinculada | Execução registrada |
| --- | --- |
| OS-2679 | 21/08/2026 |
| OS-2687 | 19/08/2026 |
| OS-2688 | 20/08/2026 |
| OS-2689 | 21/08/2026 |
| OS-2690 | 14/09/2026 |
| OS-2691 | 14/09/2026 |
| OS-2693 | 14/09/2026 |
| OS-2697 | 15/09/2026 |

Todas as oito OS estão encerradas e com `nao_executada=false`. Isso não comprova que sejam faturáveis, tenham preço negociado ou devam receber medição. A operação deve confirmar quais são testes, quais precisam de medição e quais seguem outra condição comercial.

## Integridade verificada

- Zero contratos vigentes sem item operacional sincronizado.
- Zero OS encerradas sem snapshot de encerramento.
- Zero certificados emitidos sem documento histórico imutável vinculado.

Esses resultados se limitam às consultas executadas e ao momento da coleta. Não são uma declaração de ausência de todos os defeitos possíveis.

## Validação da publicação

- CI/CD concluído com sucesso, sem acesso SSH direto fora do workflow.
- 67 testes unitários, lint, typecheck e build aprovados.
- Fluxo operacional autenticado pela URL pública: atividades, fotos, baixa de estoque, certificados individuais, medição, concorrência e imutabilidade.
- Interface desktop/mobile: incluir, salvar, recarregar e remover atividade; catálogo de estoque carregado.
- Oito PDFs/dez páginas gerados em homologação e conferidos: Montserrat incorporada, PDF Tagged, metadados, conteúdo e ausência de páginas vazias.
- Logo da OS à esquerda e proporcional, verificada automaticamente no PDF e visualmente nas páginas renderizadas.
- Seis QR Codes de autenticação decodificados por software, com URL de homologação e código correspondente ao impresso. Foi necessário usar leitor independente ZXing em códigos não detectados pelo OpenCV; isso não comprova compatibilidade com todos os celulares. Teste físico/A4 e dois aparelhos pendentes.

O artefato `homologacao-aline-35c138b065b15b7b50ee73f97cafc3abf6bcbaf7` contém os PDFs, PNGs e resultados. A amostra usa tenant isolado e dados sintéticos, identificados como teste; não é certificado comercial de um cliente real. Os QR Codes grandes no campo de fotos são imagens distintas de teste, não o QR de autenticação do canto superior direito.

Não foram executados nesta rodada o E2E comercial legado opcional, a validação física em impressora/celulares ou o aceite humano. PR #26 ainda depende de revisão formal. Nenhum registro da Ciperprag foi excluído ou alterado para zerar esta auditoria. O [backlog atual](STATUS_ATUAL.md) mantém as demais frentes abertas.
