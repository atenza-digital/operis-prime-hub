# Documentação Completa do Sistema Ciperprag Hub

## 1. Resumo do Projeto

O Ciperprag Hub é um sistema web operacional e comercial criado para centralizar o ciclo de atendimento da Ciperprag: cadastro comercial, contratos, agendamentos, emissão de Ordens de Serviço, execução em campo, encerramento com evidências, emissão de certificados, histórico do cliente, recorrência de serviços e geração de medição.

O sistema não possui tela de login. O controle de acesso deve ser feito externamente, por infraestrutura, rede, proxy, VPN, painel de hospedagem ou outro mecanismo definido pela empresa. A aplicação assume que o usuário que acessou a URL já tem permissão para operar.

O projeto usa dados persistidos em PostgreSQL, no schema `ciperprag_hub`. A interface não deve depender de dados locais/mock para operação. A API carrega os dados do banco e entrega ao frontend principalmente por meio do endpoint `/api/bootstrap`.

URL de produção usada atualmente:

```text
http://89.116.214.65:3010/
```

Objetivo principal:

```text
Transformar a operação de serviços da Ciperprag em um fluxo digital rastreável:
Comercial -> Contrato -> Agendamento -> OS -> Execução -> Encerramento -> Certificado/Histórico -> Medição -> Recorrência.
```

## 2. Visão Geral do Fluxo Operacional

O fluxo esperado do sistema é:

1. Cadastrar cliente, serviço e contrato/proposta na área Comercial.
2. Criar um agendamento operacional a partir de um contrato.
3. Informar data, local, equipe técnica, veículo e observações.
4. Gerar uma Ordem de Serviço a partir do agendamento.
5. Imprimir a OS para a equipe de campo.
6. A equipe executa o serviço e retorna com a OS preenchida e fotos.
7. Encerrar a OS no sistema informando data de execução, quantidade realizada, tag de equipamento, quando aplicável, e até 3 fotos.
8. Ao encerrar, o sistema baixa o saldo do contrato.
9. Se o serviço permitir certificado, o sistema gera ou permite gerar certificado.
10. O certificado recebe hash antifraude e QR Code para validação pública.
11. O histórico mostra todos os serviços encerrados, com ou sem certificado.
12. A medição consolida OS encerradas por cliente e intervalo de datas.
13. Se houver recorrência, o sistema sugere novo agendamento.
14. Ao confirmar a recorrência, o novo agendamento volta para a agenda e reinicia o fluxo.

## 3. Tecnologias Utilizadas

### 3.1 Frontend

- React 18.
- TypeScript.
- Vite.
- React Router.
- TanStack React Query.
- Tailwind CSS.
- Componentes baseados em Radix UI/shadcn.
- Lucide React para ícones.
- Sonner e toaster para notificações.
- Geração de documentos imprimíveis via HTML/CSS e `window.print()`.
- QR Code com biblioteca `qrcode`.

### 3.2 Backend

- Node.js 22.
- Express 5.
- PostgreSQL via pacote `pg`.
- API REST JSON.
- CORS habilitado.
- Limite de payload JSON de 15 MB para permitir fotos em base64.

### 3.3 Banco de Dados

- PostgreSQL.
- Schema principal: `ciperprag_hub`.
- Banco configurado por variáveis de ambiente:

```text
DATABASE_URL
PGHOST
PGPORT
PGDATABASE
PGUSER
PGPASSWORD
PGSSL
```

Quando `DATABASE_URL` existe, ela tem prioridade. Caso contrário, o sistema usa `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` e `PGPASSWORD`.

### 3.4 Deploy

- Docker multi-stage.
- Build frontend com `npm run build`.
- Runtime Node servindo API e arquivos estáticos da pasta `dist`.
- Porta interna padrão: `80`.
- Porta externa atualmente usada na VPS: `3010`.

## 4. Estrutura do Projeto

Principais diretórios:

```text
src/
  components/
  components/ui/
  pages/
  pages/comercial/
  lib/
  data/
  assets/
server/
  index.mjs
  db.mjs
database/
  ciperprag_hub_postgres.sql
  2026-04-23_ciperprag_hub_api_compat.sql
docs/
```

Arquivos principais:

```text
src/App.tsx
```

Define as rotas da aplicação.

```text
src/components/AppLayout.tsx
```

Layout operacional com menu lateral, topo, responsividade e navegação principal.

```text
src/components/ComercialLayout.tsx
```

Layout da área comercial.

```text
src/lib/api.ts
```

Tipagens do frontend e funções de chamada à API.

```text
server/index.mjs
```

Servidor Express, endpoints REST e regras de negócio.

```text
server/db.mjs
```

Conexão PostgreSQL, transações e rotina de compatibilidade/shape do banco.

```text
src/components/CertificadoImpressao.tsx
```

Geração do certificado imprimível usando o template HTML dinâmico.

```text
src/lib/osPrint.ts
```

Geração/impressão da Ordem de Serviço.

```text
src/template_certificado_dinamico.html
```

Template visual oficial usado para gerar certificados.

## 5. Rotas do Frontend

### 5.1 Área Operacional

```text
/
```

Dashboard operacional.

```text
/agendar
```

Agendamentos, criação de novos agendamentos, confirmação de recorrência e geração de OS a partir do agendamento.

```text
/ordens
```

Gestão de Ordens de Serviço: listar, buscar, filtrar, ver, imprimir, editar e encerrar OS.

```text
/os-finalizar
```

Aponta para a mesma tela de Ordens de Serviço.

```text
/certificados
```

Certificados emitidos, certificados pendentes e histórico de serviços encerrados.

```text
/historico
```

Rota existente no app, voltada ao histórico.

```text
/medicao
```

Geração de medição por cliente e período.

```text
/equipes
```

Quadro semanal, cadastro de técnicos, veículos e alocações.

```text
/visualizar
```

Rota auxiliar de visualização.

```text
/validar-certificado
/validar-certificado/:hash
```

Página pública de validação antifraude do certificado.

### 5.2 Área Comercial

```text
/comercial/clientes
```

Cadastro e gestão de clientes.

```text
/comercial/servicos
```

Catálogo de serviços e regras técnicas.

```text
/comercial/contratos
```

Propostas, contratos, valores, itens e impressão.

```text
/comercial/configuracoes
```

Dados da empresa, logo, licenças e numeração.

## 6. Navegação e UI/UX

### 6.1 Menu Operacional

O layout operacional possui menu lateral preto com a logo da Ciperprag no topo. O menu é dividido em grupos:

- Operacional.
- Equipes.
- Comercial.

Itens operacionais:

- Dashboard.
- Agendamentos.
- Ordens de Serviço.
- Certificados e Histórico.
- Medição.

Item de equipes:

- Quadro Semanal.

Itens comerciais:

- Clientes.
- Serviços.
- Contratos.
- Configurações.

O menu pode ser recolhido no desktop. Em telas menores, o menu abre como painel lateral móvel.

### 6.2 Topo

O topo mostra:

- Área atual.
- Página atual.
- Descrição curta da tela.
- Atalhos operacionais em telas largas.

O sistema não exibe usuário logado nem ícone de notificação, pois não há autenticação interna.

### 6.3 Layout Comercial

A área comercial tem cabeçalho próprio, menu horizontal e botão para voltar ao Operacional. Também apresenta cards de navegação entre:

- Clientes.
- Serviços.
- Contratos.
- Configurações.

### 6.4 Responsividade

O sistema foi ajustado para evitar rolagem horizontal indevida em desktop e mobile. Telas comerciais e operacionais usam cards, grids responsivos e menus adaptáveis.

## 7. API do Sistema

### 7.1 Saúde

```http
GET /api/health
```

Valida se a API está ativa e se consegue consultar o banco.

Resposta esperada:

```json
{ "ok": true }
```

### 7.2 Bootstrap Geral

```http
GET /api/bootstrap
```

Retorna praticamente todos os dados necessários para o frontend:

- Configurações da empresa.
- Configuração de numeração.
- Clientes.
- Serviços.
- Contratos.
- Agendamentos.
- Ordens de Serviço.
- Certificados.
- Técnicos.
- Veículos.
- Alocações.
- Propostas/contratos comerciais.
- Sugestões de recorrência.

Esse endpoint é o principal carregamento de dados da aplicação.

### 7.3 Certificado Público

```http
GET /api/certificates/:hash
```

Busca certificado pelo hash antifraude.

Retorna:

- Dados do certificado.
- Status de validade.
- Data/hora de verificação.
- Dados complementares da OS, como tag, quantidade, unidade e fotos.

Se o hash não existir, retorna 404.

### 7.4 Clientes

```http
POST /api/clients
```

Cria ou atualiza cliente.

Persistências:

- `clientes`.
- `contatos_cliente`.

Comportamento:

- Se receber `id`, atualiza.
- Se não receber `id`, cria um novo ID.
- Remove e recria os contatos do cliente para manter consistência.

### 7.5 Serviços

```http
POST /api/services
```

Cria ou atualiza serviço do catálogo.

Campos importantes:

- Nome.
- Tipo: `sanitario` ou `manutencao`.
- Unidade.
- Recorrência em dias.
- Se gera certificado.
- Validade do certificado.
- Produtos químicos.
- EPIs.
- Riscos.
- Normas aplicáveis.
- Procedimentos.
- Status ativo/inativo.

### 7.6 Técnicos

```http
POST /api/technicians
```

Cria ou atualiza técnico.

Campos:

- Nome.
- CPF.
- Cargo.
- Data de admissão.
- Telefone.
- Ativo/inativo.

### 7.7 Veículos

```http
POST /api/vehicles
```

Cria ou atualiza veículo.

Campos:

- Placa.
- Modelo.
- Ano.
- Ativo/inativo.

### 7.8 Alocações Semanais

```http
POST /api/allocations
```

Cria alocação semanal de técnico, cliente, serviço, turno e veículo opcional.

### 7.9 Configurações da Empresa

```http
PATCH /api/company-config
```

Atualiza dados institucionais:

- Razão social.
- Nome fantasia.
- CNPJ.
- Endereço.
- Telefone.
- E-mail.
- Logo.
- Alvará.
- CR.02.
- ANVISA.
- Vigilância Sanitária.
- Responsável técnico.
- Responsável pela execução.
- Cargo do responsável.

Esses dados alimentam documentos e telas.

### 7.10 Configurações de Numeração

```http
PATCH /api/numbering-config
```

Atualiza formatos e últimos números de:

- Propostas.
- Contratos.
- Ordens de Serviço.

Os formatos usam:

```text
{SEQ}
{ANO}
```

Exemplo:

```text
PROP-{SEQ}/{ANO}
CT-{SEQ}/{ANO}
OS-{SEQ}/{ANO}
```

### 7.11 Contratos e Propostas

```http
POST /api/contract-templates
```

Cria ou atualiza proposta/contrato comercial.

Persistências:

- `contratos_templates`.
- `contratos_templates_servicos`.

Comportamento:

- Salva cabeçalho do documento.
- Remove e recria os serviços vinculados ao template.
- Calcula valores no frontend a partir dos itens.

```http
POST /api/contract-templates/:id/generate-contract
```

Gera contrato a partir de uma proposta aprovada.

Comportamento:

- Incrementa sequência de contrato.
- Cria novo registro do tipo `contrato`.
- Copia serviços da proposta original.
- Define status como `vigente`.

### 7.12 Agendamentos

```http
POST /api/agendamentos
```

Cria ou atualiza agendamento.

Campos relevantes:

- Cliente.
- CNPJ.
- Contrato.
- Serviço.
- Tipo de serviço.
- Data agendada.
- Local de execução.
- Tags.
- Observação.
- Técnicos designados.
- Veículo designado.
- Status.

```http
PATCH /api/agendamentos/:id
```

Atualiza agendamento existente.

### 7.13 Geração de OS

```http
POST /api/agendamentos/:id/gerar-os
```

Gera uma Ordem de Serviço a partir do agendamento.

Comportamento:

- Busca agendamento.
- Busca contrato.
- Busca cliente.
- Busca técnico líder.
- Incrementa numeração de OS.
- Cria registro em `ordens_servico`.
- Atualiza agendamento para status `os_gerada`.
- Grava `os_id` no agendamento.

### 7.14 Atualização de OS

```http
PATCH /api/orders/:id
```

Atualiza dados editáveis da OS:

- Técnico responsável.
- Local de execução.
- Observação.

### 7.15 Encerramento de OS

```http
POST /api/orders/:id/encerrar
```

Encerra a Ordem de Serviço.

Payload principal:

- Data de execução.
- Quantidade executada.
- Tag do equipamento atendido.
- Fotos em base64, até 3.

Comportamento:

1. Busca a OS.
2. Busca contrato vinculado.
3. Busca serviço no catálogo.
4. Busca cliente.
5. Atualiza OS para `encerrada`.
6. Grava data de execução, quantidade, tag e fotos.
7. Atualiza saldo do contrato:
   - Soma a quantidade executada em `executado`.
   - Atualiza `ultima_execucao`.
   - Marca contrato como `vencido` quando executado atinge ou supera contratado.
8. Atualiza agendamento para `encerrado`, se houver.
9. Gera certificado automaticamente se:
   - Serviço está marcado como `gera_certificado`, ou
   - Tipo da OS é `sanitario`.
10. Cria sugestão de recorrência se houver recorrência configurada.

### 7.16 Geração Manual de Certificado

```http
POST /api/orders/:id/certificado
```

Gera certificado para uma OS encerrada que ainda não possui certificado.

Comportamento:

- Gera hash único.
- Gera número do certificado.
- Insere em `certificados`.
- Atualiza OS com `certificado_hash`.

### 7.17 Recorrência

```http
PATCH /api/recurrence-suggestions/:id
```

Ações aceitas:

```json
{ "action": "confirm" }
```

ou:

```json
{ "action": "dismiss" }
```

Quando confirmado:

- Cria novo agendamento com os dados da sugestão.
- Status da sugestão vira `confirmada`.

Quando dispensado:

- Status da sugestão vira `dispensada`.

## 8. Banco de Dados

### 8.1 Schema

O schema usado é:

```sql
ciperprag_hub
```

### 8.2 Tabelas Principais

#### `empresa_config`

Armazena dados institucionais da Ciperprag:

- Razão social.
- Nome fantasia.
- CNPJ.
- Endereço.
- Telefone.
- E-mail.
- Logo.
- Alvará.
- CR.02.
- ANVISA.
- Vigilância Sanitária.
- Responsável técnico.
- Responsável pela execução.
- Cargo.

Usada em:

- Configurações.
- Certificados.
- Propostas/contratos impressos.
- Documentos operacionais.

#### `numeracao_config`

Controla formatos e sequenciais:

- Propostas.
- Contratos.
- OS.

Campos de formato aceitam `{SEQ}` e `{ANO}`.

#### `clientes`

Cadastro mestre de clientes:

- ID.
- Razão social.
- Nome fantasia.
- CNPJ.
- Inscrição estadual.
- Endereço.
- Bairro.
- Município.
- UF.
- CEP.
- Logo.
- Ativo.

#### `contatos_cliente`

Contatos vinculados ao cliente:

- Nome.
- Cargo.
- Telefone.
- E-mail.
- Principal.

#### `tecnicos`

Cadastro de técnicos:

- Nome.
- CPF.
- Cargo.
- Data de admissão.
- Telefone.
- Ativo.

#### `veiculos`

Cadastro de veículos:

- Placa.
- Modelo.
- Ano.
- Ativo.

#### `alocacoes_semanais`

Quadro semanal:

- Técnico.
- Veículo opcional.
- Dia da semana.
- Cliente.
- Serviço.
- Turno: `manha`, `tarde` ou `integral`.

#### `servicos_catalogo`

Catálogo técnico/comercial dos serviços:

- Nome.
- Tipo: `sanitario` ou `manutencao`.
- Descrição.
- Unidade.
- Recorrência em dias.
- Se gera certificado.
- Validade do certificado.
- Produtos químicos.
- EPIs.
- Riscos.
- Normas aplicáveis.
- Procedimentos.
- Ativo.

#### `contratos`

Contratos operacionais utilizados no agendamento e na medição:

- Cliente.
- CNPJ.
- Serviço.
- Tipo.
- Quantidade contratada.
- Quantidade executada.
- Unidade.
- Status.
- Última execução.
- Validade/recorrência.
- Valor unitário.
- Tags.
- Produtos químicos.
- EPIs.
- Riscos.
- Locais de execução.

#### `agendamentos`

Agenda operacional:

- Contrato.
- Cliente.
- CNPJ.
- Serviço.
- Tipo.
- Data agendada.
- Local de execução.
- Tags.
- Observação.
- Técnicos.
- Veículo.
- Status.
- OS gerada.

Status possíveis:

```text
agendado
os_gerada
encerrado
cancelado
```

#### `ordens_servico`

Ordens de Serviço:

- Número.
- Agendamento.
- Cliente.
- CNPJ.
- Endereço.
- Logo do cliente.
- Contrato.
- Serviço.
- Tipo.
- Técnico líder.
- CPF.
- Data de admissão.
- Equipe técnica.
- Veículo.
- Local.
- Tags.
- Tag do equipamento atendido.
- Observação.
- Data de emissão.
- Data de execução.
- Quantidade.
- Unidade.
- Status.
- Fotos.
- Hash do certificado.

Status possíveis:

```text
aberta
encerrada
```

#### `certificados`

Certificados emitidos:

- ID.
- Hash único.
- Número.
- OS.
- Número da OS.
- Cliente.
- CNPJ.
- Endereço.
- Logo do cliente.
- Contrato.
- Serviço.
- Técnico.
- Local.
- Data de execução.
- Data/hora de emissão.
- Validade em dias.
- Produtos químicos.
- Produtos detalhados.

#### `recorrencia_sugestoes`

Sugestões de novo agendamento geradas após encerramento de OS:

- Cliente.
- Contrato.
- Serviço.
- Tipo.
- Local.
- Tags.
- Observação.
- Técnicos.
- Veículo.
- Data sugerida.
- Agendamento origem.
- OS origem.
- Status.

Status:

```text
pendente
confirmada
dispensada
```

#### `contratos_templates`

Propostas e contratos comerciais:

- Número.
- Cliente.
- Tipo: `contrato` ou `proposta`.
- Vigência.
- Forma de pagamento.
- Prazo de pagamento.
- Status.
- Data de criação.
- Observações.

Status:

```text
rascunho
enviado
aprovado
vigente
encerrado
```

#### `contratos_templates_servicos`

Itens de proposta/contrato:

- Template.
- Serviço.
- Quantidade.
- Valor unitário.
- Frequência.

### 8.3 Rotina de Compatibilidade do Banco

Na inicialização, `server/db.mjs` executa `ensureDatabaseShape()`.

Essa rotina:

- Cria schema se não existir.
- Adiciona colunas novas em tabelas existentes.
- Ajusta constraints de status.
- Normaliza status antigos de agendamento.
- Cria tabelas de certificados e recorrência.
- Migra certificados antigos quando havia `certificado_hash` em OS.

Isso reduz risco de a aplicação quebrar caso o banco tenha sido criado com script anterior.

## 9. Módulos Funcionais

## 9.1 Dashboard

Rota:

```text
/
```

Função:

Apresentar visão resumida da operação.

Mostra:

- Contratos ativos.
- Agendamentos pendentes.
- OS abertas.
- Certificados emitidos.
- Contratos em execução.
- Progresso de consumo dos contratos.
- Saldo contratual.
- Status dos contratos.
- Próximos agendamentos.
- Sugestões de recorrência pendentes.
- Atalhos para os principais fluxos.

Alertas:

- Contratos vencidos ou sem saldo aparecem como atenção.

Origem dos dados:

```text
GET /api/bootstrap
```

## 9.2 Agendamentos

Rota:

```text
/agendar
```

Função:

Planejar visitas e iniciar o fluxo operacional.

### 9.2.1 Criar Agendamento

Campos obrigatórios:

- Cliente.
- Contrato/serviço.
- Data.
- Local de execução.

Campos complementares:

- Equipe designada.
- Veículo designado.
- Observação.

Regras:

- O cliente precisa estar ativo.
- Após escolher cliente, o sistema filtra contratos do cliente.
- Após escolher contrato, o sistema mostra locais do contrato, se existirem.
- Se contrato possuir EPIs/riscos e for sanitário, a tela mostra alertas técnicos.
- O botão criar só fica habilitado com campos obrigatórios preenchidos.

Ao salvar:

- Cria registro em `agendamentos`.
- Status inicial: `agendado`.
- Grava equipe e veículo, se escolhidos.

### 9.2.2 Lista de Agendamentos

Mostra cards com:

- Status.
- Tipo: sanitário ou manutenção.
- Cliente.
- Serviço.
- Data.
- Vencido ou em quantos dias.
- Local.
- Técnicos.
- Veículo.

Filtros:

- Todos.
- Agendado.
- OS Gerada.
- Encerrado.
- Cancelado.
- Busca por cliente.

### 9.2.3 Gerar OS a partir de Agendamento

Disponível para agendamentos com status `agendado`.

Ao clicar:

1. Abre modal.
2. Mostra cliente, serviço, local e equipe.
3. Permite escolher técnico líder.
4. Mostra EPIs obrigatórios se existirem.
5. Gera OS.
6. Atualiza agendamento para `os_gerada`.
7. Exibe número da OS criada.
8. Permite imprimir a via da equipe.

## 9.3 Ordens de Serviço

Rota:

```text
/ordens
```

Função:

Gerenciar a execução em campo.

### 9.3.1 Listagem

Mostra:

- Total de OS.
- OS abertas.
- OS encerradas.
- Busca por número, cliente, serviço ou técnico.
- Filtro por status.

Cada card mostra:

- Número da OS.
- Data de emissão.
- Status.
- Cliente.
- Serviço.
- Técnico líder.
- Equipe.
- Local.
- Hash de certificado, se existir.

### 9.3.2 Ver OS

Abre detalhes da OS:

- Número.
- Status.
- Cliente.
- Serviço.
- Técnico líder.
- Equipe.
- Local.
- Tag de equipamento.
- Emissão.
- Execução.
- Quantidade.
- Certificado.
- Fotos de evidência.

### 9.3.3 Imprimir OS

Gera documento de Ordem de Serviço em HTML/CSS e chama impressão do navegador.

O modelo busca ficar próximo ao PDF de referência enviado pelo usuário, com layout compacto para a equipe de campo.

Dados dinâmicos usados:

- Número da OS.
- Cliente.
- CNPJ.
- Serviço.
- Contrato.
- Local.
- Veículo.
- Técnico líder.
- Equipe.
- Observação.
- Dados técnicos e campos de execução.

### 9.3.4 Editar OS

Para OS aberta, permite alterar:

- Técnico responsável.
- Local de execução.

### 9.3.5 Encerrar OS

Para OS aberta, permite informar:

- Data de execução.
- Quantidade.
- Tag do equipamento atendido.
- Até 3 fotos de evidência.

Ao encerrar:

- OS vira `encerrada`.
- Contrato recebe baixa da quantidade executada.
- Agendamento vira `encerrado`.
- Pode gerar certificado automaticamente.
- Pode criar sugestão de recorrência.

## 9.4 Certificados e Histórico

Rota:

```text
/certificados
```

Função:

Gerenciar certificados emitidos e histórico de serviços encerrados.

### 9.4.1 Certificados Pendentes

Mostra OS encerradas sem certificado.

Permite:

- Gerar certificado manualmente.

Observação:

Quando o serviço gera certificado automaticamente no encerramento, ele já aparece como certificado emitido.

### 9.4.2 Aba Certificados

Mostra certificados com:

- Hash.
- Status: válido, a vencer ou vencido.
- Cliente.
- Serviço.
- Data de execução.
- Técnico.
- Local.

Filtros:

- Todos.
- Válidos.
- A vencer.
- Vencidos.
- Cliente.
- Busca por hash, cliente ou serviço.

Ações:

- Imprimir PDF.
- Compartilhar texto do certificado.

### 9.4.3 Aba Histórico

Mostra todas as OS encerradas, com ou sem certificado.

Cada item mostra:

- Número da OS.
- Se tem certificado.
- Cliente.
- Serviço.
- Data.
- Técnico.
- Local.

Objetivo:

Permitir rastrear tudo que o cliente já realizou, mesmo quando o serviço não gera certificado.

## 9.5 Validação Pública de Certificado

Rotas:

```text
/validar-certificado
/validar-certificado/:hash
```

Função:

Permitir que qualquer pessoa valide a autenticidade de um certificado usando o código/hash ou QR Code.

Fluxo:

1. Usuário lê o QR Code impresso no certificado.
2. O QR Code abre `/validar-certificado/:hash`.
3. A página consulta `/api/certificates/:hash`.
4. Se encontrar o certificado, mostra os dados oficiais.
5. O usuário compara dados da tela com o documento impresso.

Dados exibidos:

- Código do certificado.
- Número do certificado.
- Ordem de serviço.
- Cliente.
- CNPJ.
- Serviço.
- Local de execução.
- Técnico responsável.
- Data de execução.
- Emissão.
- Validade.
- Tag do equipamento.
- Status de validade.
- Data/hora da última verificação.

Regra antifraude:

O certificado só deve ser considerado autêntico quando o código e os dados exibidos na página pública coincidirem com o documento apresentado.

## 9.6 Medição

Rota:

```text
/medicao
```

Função:

Consolidar serviços executados para faturamento/medição.

Entrada:

- Cliente.
- Data inicial.
- Data final.

Regras:

- Considera apenas OS com status `encerrada`.
- Filtra por cliente.
- Filtra por data de execução, ou data de emissão se execução não existir.
- Busca valor unitário no contrato.
- Calcula total por item:

```text
quantidade executada x valor unitário
```

Saída:

- Número de medição gerado em tela.
- Dados do cliente.
- Período.
- Tabela de itens.
- Quantidade.
- Valor unitário.
- Valor total.
- Total da medição.

Ação:

- Gerar medição.
- Imprimir PDF via impressão do navegador.

Observação:

A medição é gerada para impressão, mas o código atual não cria uma tabela persistente de medições fechadas. Ela é calculada a partir das OS encerradas.

## 9.7 Equipes

Rota:

```text
/equipes
```

Função:

Gerenciar técnicos, veículos e quadro semanal.

### 9.7.1 Quadro Semanal

Mostra técnicos ativos nas linhas e dias úteis nas colunas.

Dias exibidos:

- Segunda.
- Terça.
- Quarta.
- Quinta.
- Sexta.
- Sábado.

Cada alocação mostra:

- Cliente.
- Serviço.
- Turno.
- Veículo, se houver.

Turnos:

- Manhã.
- Tarde.
- Integral.

### 9.7.2 Técnicos

Permite:

- Cadastrar técnico.
- Editar técnico.
- Ativar/inativar.

Campos:

- Nome.
- CPF.
- Cargo.
- Data de admissão.
- Telefone.
- Ativo.

### 9.7.3 Veículos

Permite:

- Cadastrar veículo.
- Editar veículo.
- Ativar/inativar.

Campos:

- Placa.
- Modelo.
- Ano.
- Ativo.

## 9.8 Clientes

Rota:

```text
/comercial/clientes
```

Função:

Cadastro mestre de clientes.

Campos:

- Razão social.
- Nome fantasia.
- CNPJ.
- Inscrição estadual.
- Endereço.
- Bairro.
- Município.
- UF.
- CEP.
- Contatos.
- Status ativo/inativo.

Contatos:

- Nome.
- Cargo.
- Telefone.
- E-mail.
- Principal.

Regras:

- Razão social e CNPJ são obrigatórios.
- Um cliente pode ter múltiplos contatos.
- Ao salvar, contatos são regravados para o cliente.

## 9.9 Serviços

Rota:

```text
/comercial/servicos
```

Função:

Definir o catálogo de serviços usado por contratos, agendamentos, OS e certificados.

Campos:

- Nome.
- Tipo.
- Descrição.
- Unidade.
- Recorrência em dias.
- Validade do certificado.
- Gera certificado.
- Serviço ativo.
- Produtos químicos.
- EPIs obrigatórios.
- Riscos.
- Normas aplicáveis.
- Procedimentos.

Regras importantes:

- Nome e unidade são obrigatórios.
- Se `geraCertificado` estiver marcado, o encerramento da OS pode gerar certificado automaticamente.
- Se `recorrenciaDias` for maior que zero, o encerramento cria sugestão de recorrência.
- Produtos químicos alimentam o certificado.
- EPIs e riscos aparecem no agendamento/geração da OS para orientar a equipe.

## 9.10 Contratos e Propostas

Rota:

```text
/comercial/contratos
```

Função:

Gerenciar propostas e contratos comerciais.

Campos do documento:

- Número.
- Tipo: contrato ou proposta.
- Status.
- Cliente.
- Vigência.
- Prazo de pagamento.
- Data de criação.
- Forma de pagamento.
- Serviços.
- Quantidade.
- Valor unitário.
- Frequência.
- Observações.

Status:

- Rascunho.
- Enviado.
- Aprovado.
- Vigente.
- Encerrado.

Ações:

- Criar proposta.
- Criar contrato.
- Editar.
- Imprimir.
- Gerar contrato a partir de proposta aprovada.

Regras:

- Número e cliente são obrigatórios.
- Cada proposta/contrato pode ter múltiplos serviços.
- O total é calculado por soma dos subtotais:

```text
quantidade x valor unitário
```

## 9.11 Configurações

Rota:

```text
/comercial/configuracoes
```

Função:

Centralizar dados usados nos documentos e padrões do sistema.

### 9.11.1 Identidade Visual

Permite alterar logo da empresa.

A logo é armazenada como Data URL/base64 no banco e usada em documentos e no topo do sistema quando aplicável.

### 9.11.2 Dados da Empresa

Campos:

- Razão social.
- Nome fantasia.
- CNPJ.
- Telefone.
- E-mail.
- Endereço.
- Responsável pela execução.
- Cargo.

### 9.11.3 Licenças e Registros

Campos:

- Alvará.
- CR.02.
- ANVISA.
- Vigilância Sanitária.
- Responsável técnico.

### 9.11.4 Numeração

Configura:

- Propostas.
- Contratos.
- Ordens de Serviço.

Mostra preview do próximo número.

## 10. Documentos Gerados

## 10.1 Ordem de Serviço

Arquivo responsável:

```text
src/lib/osPrint.ts
```

Chamado por:

- Agendamento, após gerar OS.
- Tela de Ordens de Serviço.

Objetivo:

Gerar via impressa para equipe de campo.

Dados dinâmicos:

- OS.
- Cliente.
- CNPJ.
- Contrato.
- Serviço.
- Local.
- Técnico.
- Equipe.
- Veículo.
- Observações.
- Dados técnicos.

Impressão:

- Abre nova janela.
- Renderiza HTML.
- Chama `window.print()`.

## 10.2 Certificado

Arquivo responsável:

```text
src/components/CertificadoImpressao.tsx
```

Template:

```text
src/template_certificado_dinamico.html
```

Dados dinâmicos:

- Logo Ciperprag.
- Brasão.
- Assinatura.
- Ícone lateral.
- Cliente.
- CNPJ.
- Endereço.
- Local de execução.
- Data de início.
- Validade.
- Produtos químicos.
- Licenças.
- Texto do certificado.
- Fotos.
- QR Code.
- Hash.
- URL de validação.

QR Code:

Gera URL:

```text
/validar-certificado/:hash
```

Regra:

O QR Code deve permitir a validação do certificado em página pública, reduzindo risco de falsificação.

## 10.3 Medição

Arquivo/tela responsável:

```text
src/pages/Medicao.tsx
```

Modelo:

- Documento HTML renderizado na própria tela.
- Impressão pelo navegador.

Dados:

- Cliente.
- Endereço.
- Período.
- OS encerradas.
- Serviço.
- Número da OS.
- Data.
- Quantidade.
- Valor unitário.
- Valor total.
- Total geral.

## 10.4 Contrato/Proposta Comercial

Arquivo/tela responsável:

```text
src/pages/comercial/Contratos.tsx
```

Modelo:

- HTML imprimível.

Dados:

- Dados da empresa.
- Dados do contratante.
- Serviços.
- Quantidade.
- Frequência.
- Valor unitário.
- Subtotal.
- Total.
- Condições comerciais.
- Assinaturas.

## 11. Regras de Negócio Principais

### 11.1 Status de Agendamento

```text
agendado
```

Agendamento criado, ainda sem OS.

```text
os_gerada
```

OS foi gerada a partir do agendamento.

```text
encerrado
```

OS associada foi encerrada.

```text
cancelado
```

Agendamento cancelado.

### 11.2 Status de OS

```text
aberta
```

OS criada e ainda não finalizada.

```text
encerrada
```

Serviço executado e registrado no sistema.

### 11.3 Baixa de Contrato

Quando uma OS é encerrada:

```text
contrato.executado = contrato.executado + quantidade executada
```

Se executado atingir ou ultrapassar contratado:

```text
status = vencido
```

Caso contrário:

```text
status = ativo
```

### 11.4 Certificado Automático

O sistema gera certificado ao encerrar a OS quando:

```text
servico.gera_certificado = true
```

ou:

```text
ordem.tipo = sanitario
```

### 11.5 Certificado Manual

Se uma OS encerrada não tiver certificado, a tela de Certificados permite gerar manualmente.

### 11.6 Validade de Certificado

Se `validade_dias` for zero, o certificado é tratado como válido/indeterminado.

Se houver validade:

```text
validade_final = data_execucao + validade_dias
```

Status:

- Válido.
- A vencer.
- Vencido.

### 11.7 Recorrência

Ao encerrar OS:

1. O sistema consulta `recorrencia_dias` do serviço.
2. Se não houver, usa `validade_dias` do contrato.
3. Se o valor for maior que zero, cria sugestão em `recorrencia_sugestoes`.
4. Data sugerida:

```text
data_execucao + recorrencia_dias
```

### 11.8 Fotos

O encerramento da OS permite até 3 fotos.

As fotos são armazenadas em base64 no campo `fotos` da OS.

Impacto:

- Facilita protótipo e operação simples.
- Pode aumentar tamanho do banco com uso intenso.
- Em evolução futura, pode ser melhor armazenar arquivos em storage e guardar apenas URLs.

## 12. Segurança e Controle de Acesso

O sistema não possui autenticação interna.

Isso foi uma decisão funcional do projeto, pois o controle será feito de outra forma.

Consequências:

- Não há login.
- Não há sessão de usuário.
- Não há perfil/permissão por tela dentro da aplicação.
- Não há auditoria por usuário.

Recomendação para produção:

- Proteger por VPN, proxy autenticado, firewall ou painel de acesso.
- Usar HTTPS.
- Restringir IPs se possível.
- Não expor banco PostgreSQL publicamente sem controle.
- Criar backup periódico do banco.

## 13. Variáveis de Ambiente

Principais variáveis:

```text
PORT
NODE_ENV
DATABASE_URL
PGHOST
PGPORT
PGDATABASE
PGUSER
PGPASSWORD
PGSSL
```

Exemplo de produção:

```text
NODE_ENV=production
PORT=80
PGHOST=89.116.214.65
PGPORT=5432
PGDATABASE=atenza
PGUSER=root
PGPASSWORD=********
```

## 14. Como Rodar Localmente

Instalar dependências:

```bash
npm install
```

Rodar frontend e API juntos:

```bash
npm run dev
```

Rodar apenas frontend:

```bash
npm run dev:web
```

Rodar apenas API:

```bash
npm run dev:api
```

Build de produção:

```bash
npm run build
```

Iniciar API em modo produção:

```bash
npm run start
```

## 15. Deploy com Docker

O Dockerfile possui três etapas:

1. `deps`: instala dependências.
2. `build`: gera frontend em `dist`.
3. `runtime`: instala dependências de produção, copia `dist` e `server`.

Build:

```bash
docker build -t ciperprag-hub:latest .
```

Run:

```bash
docker run -d \
  --name ciperprag-hub \
  --restart unless-stopped \
  -p 3010:80 \
  -e PORT=80 \
  -e NODE_ENV=production \
  -e PGHOST=89.116.214.65 \
  -e PGPORT=5432 \
  -e PGDATABASE=atenza \
  -e PGUSER=root \
  -e PGPASSWORD='********' \
  ciperprag-hub:latest
```

Health check:

```text
http://89.116.214.65:3010/api/health
```

## 16. Fluxos Detalhados de Uso

## 16.1 Fluxo Comercial Inicial

1. Acessar `/comercial/clientes`.
2. Cadastrar cliente.
3. Adicionar contatos.
4. Acessar `/comercial/servicos`.
5. Cadastrar serviços, definindo se geram certificado e recorrência.
6. Acessar `/comercial/contratos`.
7. Criar proposta ou contrato.
8. Adicionar serviços, quantidades e valores.
9. Marcar status da proposta.
10. Se proposta for aprovada, gerar contrato.

Resultado:

Dados comerciais ficam disponíveis para operação.

## 16.2 Fluxo de Agendamento

1. Acessar `/agendar`.
2. Selecionar cliente.
3. Selecionar contrato/serviço.
4. Informar data.
5. Selecionar local.
6. Selecionar técnicos.
7. Selecionar veículo.
8. Informar observações.
9. Criar agendamento.

Resultado:

Agendamento aparece na lista como `agendado`.

## 16.3 Fluxo de Geração de OS

1. Em `/agendar`, localizar agendamento.
2. Clicar em `Gerar OS`.
3. Confirmar técnico líder.
4. Clicar em gerar.
5. Sistema cria a OS.
6. Sistema muda agendamento para `os_gerada`.
7. Usuário pode imprimir a via da equipe.

Resultado:

OS aparece em `/ordens` como `aberta`.

## 16.4 Fluxo de Campo

1. Equipe recebe OS impressa.
2. Executa serviço no local.
3. Preenche informações necessárias fora do sistema.
4. Registra fotos/evidências.
5. Retorna com dados para lançamento.

Resultado:

Administrativo pode encerrar OS.

## 16.5 Fluxo de Encerramento de OS

1. Acessar `/ordens`.
2. Filtrar OS abertas.
3. Clicar em `Encerrar OS`.
4. Informar data de execução.
5. Informar quantidade executada.
6. Informar tag do equipamento, se houver.
7. Anexar até 3 fotos.
8. Confirmar encerramento.

Resultado:

- OS fica encerrada.
- Contrato recebe baixa.
- Agendamento fica encerrado.
- Certificado pode ser criado.
- Recorrência pode ser sugerida.

## 16.6 Fluxo de Certificado

1. Acessar `/certificados`.
2. Ver certificados emitidos.
3. Se houver OS pendente, clicar em gerar certificado.
4. Clicar em imprimir PDF.
5. Sistema gera certificado no template oficial.
6. Certificado inclui QR Code e hash.

Resultado:

Documento pode ser entregue ao cliente.

## 16.7 Fluxo de Validação Antifraude

1. Cliente ou fiscal lê QR Code.
2. Abre página pública de validação.
3. Sistema consulta o hash.
4. Exibe dados oficiais.
5. Usuário compara com o certificado apresentado.

Resultado:

Se os dados coincidirem, o certificado é autêntico.

## 16.8 Fluxo de Histórico

1. Acessar `/certificados`.
2. Entrar na aba `Histórico`.
3. Filtrar por cliente ou buscar por dados.
4. Ver todos os serviços encerrados.

Resultado:

Usuário consegue saber tudo que foi executado para um cliente, com ou sem certificado.

## 16.9 Fluxo de Medição

1. Acessar `/medicao`.
2. Selecionar cliente.
3. Informar data inicial.
4. Informar data final.
5. Sistema lista OS encerradas no período.
6. Clicar em gerar medição.
7. Conferir total.
8. Imprimir PDF.

Resultado:

Documento de medição fica pronto para envio/faturamento.

## 16.10 Fluxo de Recorrência

1. Encerrar OS de serviço com recorrência.
2. Sistema cria sugestão de novo agendamento.
3. A sugestão aparece em `/agendar` e no dashboard.
4. Usuário pode confirmar ou dispensar.
5. Ao confirmar, novo agendamento é criado.

Resultado:

O fluxo operacional reinicia automaticamente na agenda.

## 17. Pontos de Atenção e Limitações Atuais

### 17.1 Sem Login Interno

É necessário controle externo.

### 17.2 Medição Não Persistida

A medição é calculada e impressa, mas não há tabela de medições fechadas no banco.

Recomendação futura:

- Criar tabela `medicoes`.
- Criar tabela `medicao_itens`.
- Gravar número, período, cliente, total e itens.

### 17.3 Fotos em Base64 no Banco

Funciona para operação simples, mas pode pesar no banco.

Recomendação futura:

- Salvar fotos em storage.
- Guardar URL no banco.

### 17.4 Auditoria

Sem login, não há trilha por usuário.

Recomendação futura:

- Criar logs técnicos.
- Registrar data/hora das ações críticas.
- Se houver autenticação externa integrada, gravar usuário.

### 17.5 Exclusões

O sistema atual foca em criar/editar e mudar status. Não há fluxo amplo de exclusão de registros pela interface.

### 17.6 Carga Geral via Bootstrap

O `/api/bootstrap` simplifica o frontend, mas à medida que o banco crescer pode ficar pesado.

Recomendação futura:

- Paginar listas grandes.
- Criar endpoints específicos por tela.
- Cachear dados estáticos.

### 17.7 Validação de Dados

Há validações básicas no frontend, mas seria bom reforçar no backend:

- CNPJ.
- Datas.
- Quantidades.
- Limite de fotos.
- Tipos de status.
- Campos obrigatórios por endpoint.

### 17.8 HTTPS

Produção deve usar HTTPS para proteger dados e validação de certificado.

## 18. Melhorias Recomendadas para Evolução

Prioridade alta:

- Persistir medições.
- Adicionar logs/auditoria.
- Implementar backup automático do banco.
- Proteger URL por HTTPS.
- Revisar exposição do PostgreSQL.
- Adicionar validações robustas no backend.

Prioridade média:

- Melhorar cadastro operacional de contratos reais, além dos templates comerciais.
- Criar tela específica para editar contratos operacionais e saldo.
- Implementar upload de fotos para storage.
- Criar paginação/filtros server-side.
- Criar exportação PDF mais controlada com motor dedicado.

Prioridade baixa:

- Dashboard com gráficos.
- Calendário mensal.
- Notificações internas.
- Templates customizáveis de OS/certificado.
- Relatórios gerenciais.

## 19. Glossário

OS:

Ordem de Serviço.

Certificado:

Documento gerado após execução de serviço, com QR Code e hash para validação.

Hash:

Código único antifraude do certificado.

Medição:

Consolidação de serviços executados em um período para faturamento.

Recorrência:

Sugestão automática de novo agendamento baseada em periodicidade do serviço ou contrato.

Contrato operacional:

Registro em `contratos` usado para agendamento, saldo, unidade, valor e medição.

Template comercial:

Registro em `contratos_templates` usado para proposta/contrato comercial imprimível.

## 20. Versionamento e Ambientes

A base atual deve ser considerada de homologação. Ela serve para validação funcional, testes com usuários e evolução controlada antes da criação de uma base de produção separada.

O sistema deve manter versionamento explícito em código e exibir ambiente/versão na interface. Nesta etapa inicial, a aplicação passa a identificar a versão como `Homologação v0.1.0`, permitindo que equipe, cliente e suporte saibam exatamente qual build está sendo validada.

Além do texto da versão, a interface deve diferenciar visualmente homologação e produção. A homologação usa um badge amarelo de alerta com o texto `Homologação`, visível no login e nas áreas internas, para evitar que usuários confundam testes com operação real.

Quando a produção for criada, o ambiente deverá ter banco próprio, variáveis próprias, backup próprio e versionamento compatível com o histórico homologado.

## 21. Autenticação Interna

O sistema passa a usar login interno da plataforma com e-mail e senha. O acesso às telas operacionais e comerciais deve exigir sessão ativa.

Rotas públicas:

- `/login`
- `/validar-certificado`
- `/validar-certificado/:hash`
- `/api/health`
- `/api/certificates/:hash`
- `/api/auth/login`

Rotas privadas:

- dashboard
- agendamentos
- ordens de serviço
- certificados e histórico
- medição
- equipes
- comercial
- endpoints de cadastro, edição, encerramento e emissão

O backend usa hash de senha antes de gravar no banco e armazena sessões na tabela `usuario_sessoes`. O token de sessão é enviado pelo frontend no cabeçalho `Authorization: Bearer`.

Para criar ou redefinir o primeiro administrador, deve ser usado o script:

```bash
ADMIN_EMAIL="admin@empresa.com.br" ADMIN_PASSWORD="senha-segura" ADMIN_NAME="Administrador" npm run auth:create-admin
```

Senhas não devem ser gravadas em SQL, documentação, repositório ou mensagens de deploy.

## 22. Backlog SaaS Atenza

Esta seção registra itens estratégicos que devem ser implementados antes da operação comercial do produto como SaaS, mas que podem ser tratados ao final da evolução funcional inicial.

Gestão do dono do SaaS:

- Criar painel administrativo da Atenza para gerenciar tenants/clientes.
- Permitir ativar, suspender e inativar empresas contratantes.
- Controlar planos, limites, módulos contratados e recursos liberados por tenant.
- Controlar pagamentos, vencimentos, inadimplência, bloqueio por atraso e reativação.
- Registrar dados comerciais do cliente SaaS, responsável financeiro, contato técnico e histórico de atendimento.
- Criar trilha de auditoria para ações feitas pela Atenza sobre tenants.
- Diferenciar permissões de administrador Atenza e administrador da empresa cliente.
- Preparar faturamento/integração futura com gateway de pagamento ou emissão manual assistida.
- Criar alertas internos para contratos SaaS próximos do vencimento ou clientes inadimplentes.
- Definir processo de backup, exportação e encerramento de conta por tenant.

Este backlog deve permanecer visível até ser transformado em épicos/tarefas de produto.

## 23. Resumo Executivo Final

O Ciperprag Hub é uma aplicação web de gestão operacional e comercial para empresas de serviços, especialmente voltada à rotina da Ciperprag. O sistema centraliza cadastros comerciais, contratos, serviços, equipes, veículos, agendamentos, Ordens de Serviço, certificados, histórico e medição.

Na prática, ele transforma o processo manual em um fluxo rastreável: o usuário cadastra clientes e serviços, cria contratos/propostas, agenda uma visita, define equipe e veículo, gera a OS, imprime a via para campo, encerra a OS com quantidade executada, tag de equipamento e fotos, baixa o saldo do contrato, gera certificado quando aplicável, permite validação antifraude por QR Code e consolida as OS encerradas em uma medição por período.

O projeto usa React no frontend, Express no backend e PostgreSQL como banco de dados. A aplicação está preparada para rodar em Docker na VPS e possui login interno por e-mail e senha para proteger as áreas operacionais e comerciais.

O maior valor do sistema é integrar operação e documentação em um único fluxo: o que foi vendido, agendado, executado, certificado e medido passa a ficar conectado no banco, reduzindo retrabalho, perda de informação e risco de certificado falso.
