## Plano de Implementação

### 1. Configurações da Empresa (`/comercial/configuracoes`)
- Logo da Ciperprag (upload e exibição em todos os documentos/headers)
- Nome fantasia, razão social, CNPJ, endereço, telefone, email
- Dados de licenças (ANVISA, Vigilância Sanitária, CR.02, Alvará)
- Responsável técnico

### 2. Configuração de Numeração (`/comercial/configuracoes`)
- Formato de numeração para Propostas (ex: `PC-{SEQ}/{ANO}`)
- Formato de numeração para Contratos (ex: `CT-{SEQ}/{ANO}`)
- Último número gerado, sequencial automático

### 3. Fluxo Proposta → Contrato (`/comercial/contratos`)
- Status da proposta: Rascunho → Enviada → Aprovada → Contrato Gerado
- Ao aprovar proposta, botão "Gerar Contrato" cria um contrato vinculado
- Geração de PDF da proposta e do contrato (documentos formatados)

### 4. Clientes visíveis no Operacional
- Compartilhar dados de `comercialData` no módulo operacional
- Exibir info do cliente (contatos, CNPJ) nas telas de OS, Histórico, Medição

### 5. Gestão de Equipes (`/equipes`)
- Cadastro de técnicos/equipes (nome, função, disponibilidade)
- Visão semanal de alocação (quem está onde, qual serviço)
- Dimensionamento: quantidade de serviços por equipe/semana

### 6. Cadastros Auxiliares
- **Técnicos/Colaboradores**: nome, CPF, cargo, admissão
- **Veículos**: placa, modelo (para alocação)
- **Produtos Químicos**: catálogo centralizado
- **EPIs**: catálogo centralizado
- **Normas Regulamentadoras**: referência

### Ordem de execução sugerida:
1. Configurações da empresa (base para tudo)
2. Numeração + fluxo proposta→contrato + PDFs
3. Clientes no operacional
4. Gestão de equipes + cadastros auxiliares
