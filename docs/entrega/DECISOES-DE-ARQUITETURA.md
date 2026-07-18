# Decisões de Arquitetura

## Identidade

- A plataforma é Atenza FieldOps.
- A tela de login padrão deve usar identidade Atenza.
- A identidade Ciperprag deve aparecer como tenant, principalmente após login e nos documentos.
- Logos, cores, assinaturas, ícones de fundo e ativos documentais devem vir de configuração do tenant.

## Documentos

- Cada família documental deve ter template versionado.
- Cada emissão deve guardar snapshot imutável dos dados usados.
- O perfil Ciperprag v1 será reproduzido fielmente nos documentos do tenant, usando os arquivos enviados como referência visual primária.
- Não haverá redesign dos documentos de referência: somente Noto Sans, correções gramaticais/ortográficas, ajustes de alinhamento, paginação, legibilidade e adaptação dinâmica dos dados.
- Regras específicas da Ciperprag não devem virar regra global obrigatória do SaaS.
- A interface usa Nortica; documentos e PDFs usam Noto Sans incorporada no bundle, sem depender de fonte instalada no computador.
- Neue Ultra é reservada à marca textual Atenza FieldOps e não deve ser aplicada ao conteúdo de documentos operacionais ou comerciais.
- PDFs devem ser determinísticos, legíveis, sem cortes, sem páginas quase vazias e com cabeçalho/rodapé quando houver quebra.

## Dados e segurança

- Entidades operacionais e comerciais devem carregar `tenant_id`.
- O isolamento deve ser reforçado no banco com RLS antes da prontidão de produção.
- Permissões devem ser aplicadas também no backend, não apenas na interface.
- O perfil Operacional não deve acessar valores comerciais/financeiros.

## Arquivos

- Arquivos devem ser privados por padrão.
- Storage deve separar ambiente, tenant, entidade e versão.
- Downloads devem usar URLs temporárias.
- Hash, metadados, tamanho, extensão e MIME devem ser validados.
- R2 será o alvo de storage para a arquitetura SaaS.

## Financeiro no FieldOps

- O sistema acompanha medição, NF enviada, aguardando pagamento, paga, cobrar e baixada no ERP.
- Contas a pagar, contas a receber e rotinas financeiras completas permanecem no ERP.

## Licenciamento

- O Atenza FieldOps deve consultar status/licença do tenant via Atenza Hub no futuro.
- O FieldOps não deve ser responsável por vender, cobrar ou administrar planos comerciais do SaaS.
