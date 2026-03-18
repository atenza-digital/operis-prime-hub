export interface Cliente {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual?: string;
  endereco: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  contatos: ContatoCliente[];
  logoUrl?: string;
  ativo: boolean;
}

export interface ContatoCliente {
  nome: string;
  cargo: string;
  telefone: string;
  email: string;
  principal: boolean;
}

export interface ServicoCatalogo {
  id: string;
  nome: string;
  tipo: "sanitario" | "manutencao";
  descricao: string;
  unidade: string;
  recorrenciaDias: number;
  geraCertificado: boolean;
  validadeCertificadoDias: number;
  produtosQuimicos: string[];
  epis: string[];
  riscos: string[];
  normasAplicaveis: string[];
  procedimentos: string[];
  ativo: boolean;
}

export interface ContratoTemplate {
  id: string;
  numero: string;
  clienteId: string;
  tipo: "contrato" | "proposta";
  servicos: ContratoServico[];
  vigenciaMeses: number;
  formaPagamento: string;
  prazoPagamentoDias: number;
  status: "rascunho" | "enviado" | "aprovado" | "vigente" | "encerrado";
  dataCriacao: string;
  observacoes: string;
}

export interface ContratoServico {
  servicoId: string;
  quantidade: number;
  valorUnitario: number;
  frequencia: string;
}

// --- MOCK DATA ---

export const clientes: Cliente[] = [
  {
    id: "CLI-001",
    razaoSocial: "Komatsu Brasil International LTDA",
    nomeFantasia: "Komatsu",
    cnpj: "02.336.124/0009-25",
    inscricaoEstadual: "15.432.789-0",
    endereco: "Av. Serra Arqueada S/N, QD QNC 205",
    bairro: "Nova Carajás",
    municipio: "Parauapebas",
    uf: "PA",
    cep: "68.515-000",
    contatos: [
      { nome: "Sophia Machado", cargo: "Gestora de Contratos", telefone: "(94) 99123-4567", email: "sophia@komatsu.com.br", principal: true },
      { nome: "Carlos Ferreira", cargo: "Coord. Facilities", telefone: "(94) 99234-5678", email: "carlos.f@komatsu.com.br", principal: false },
    ],
    ativo: true,
  },
  {
    id: "CLI-002",
    razaoSocial: "Metalúrgica Sigma S.A.",
    nomeFantasia: "Sigma",
    cnpj: "11.222.333/0001-44",
    endereco: "Rod. PA-275, KM 18",
    bairro: "Distrito Industrial",
    municipio: "Marabá",
    uf: "PA",
    cep: "68.502-100",
    contatos: [
      { nome: "Ricardo Lopes", cargo: "Gerente Operacional", telefone: "(94) 99345-6789", email: "ricardo@sigma.com.br", principal: true },
    ],
    ativo: true,
  },
  {
    id: "CLI-003",
    razaoSocial: "Hospital São Lucas",
    nomeFantasia: "HSL",
    cnpj: "55.666.777/0001-88",
    endereco: "Rua da Saúde, 450",
    bairro: "Centro",
    municipio: "Parauapebas",
    uf: "PA",
    cep: "68.515-200",
    contatos: [
      { nome: "Ana Paula Reis", cargo: "Coord. Hospitalar", telefone: "(94) 99456-7890", email: "ana.paula@hsl.com.br", principal: true },
    ],
    ativo: true,
  },
  {
    id: "CLI-004",
    razaoSocial: "Construtora G-Maia S.A.",
    nomeFantasia: "G-Maia",
    cnpj: "44.555.666/0001-77",
    endereco: "Rua 80 S/N, Quadra 28, Lotes 12-14",
    bairro: "Jardim Canadá",
    municipio: "Parauapebas",
    uf: "PA",
    cep: "68.515-000",
    contatos: [
      { nome: "Vitor Martins", cargo: "Depto. de Compras", telefone: "(94) 99567-8901", email: "vitor@gmaia.com.br", principal: true },
    ],
    ativo: true,
  },
  {
    id: "CLI-005",
    razaoSocial: "MIP Engenharia LTDA",
    nomeFantasia: "MIP",
    cnpj: "33.193.966/0041-45",
    endereco: "Rua Modesto, 149, Sala D",
    bairro: "Nova Canaã",
    municipio: "Canaã dos Carajás",
    uf: "PA",
    cep: "68.356-025",
    contatos: [
      { nome: "Marcio Ferreira da Silva", cargo: "Gestor de Contratos", telefone: "(31) 99954-4705", email: "marcio@mip.com.br", principal: true },
    ],
    ativo: true,
  },
  {
    id: "CLI-006",
    razaoSocial: "Tecnosonda S.A.",
    nomeFantasia: "Tecnosonda",
    cnpj: "08.765.432/0001-99",
    endereco: "Av. Industrial, 1200",
    bairro: "Polo Industrial",
    municipio: "Parauapebas",
    uf: "PA",
    cep: "68.515-300",
    contatos: [
      { nome: "Fernanda Costa", cargo: "Adm. de Contratos", telefone: "(94) 99678-9012", email: "fernanda@tecnosonda.com.br", principal: true },
    ],
    ativo: true,
  },
];

export const servicosCatalogo: ServicoCatalogo[] = [
  {
    id: "SRV-001",
    nome: "Controle Integrado de Pragas (CIP)",
    tipo: "sanitario",
    descricao: "Programa de manejo eficaz de insetos rasteiros/voadores, roedores e pragas urbanas. Inclui diagnóstico, mapeamento, tratamento preventivo/corretivo, monitoramento contínuo e relatórios.",
    unidade: "visitas",
    recorrenciaDias: 30,
    geraCertificado: true,
    validadeCertificadoDias: 30,
    produtosQuimicos: ["Gel Inseticida Maxforce", "Raticida Brodifacoum 0,005%", "Cipermetrina 25% CE", "Raticida em Bloco Parafinado"],
    epis: ["Máscara PFF2", "Luva Nitrílica", "Bota de Segurança", "Macacão Tyvek"],
    riscos: ["Risco Químico", "Risco Biológico"],
    normasAplicaveis: ["RDC ANVISA Nº 18/2000", "Lei Nº 5.882/1994"],
    procedimentos: ["Diagnóstico e mapeamento de focos", "Aplicação de produtos específicos", "Instalação de pontos de iscagem e armadilhas", "Inspeções periódicas", "Emissão de relatórios técnicos"],
    ativo: true,
  },
  {
    id: "SRV-002",
    nome: "Higienização de Caixas D'Água",
    tipo: "sanitario",
    descricao: "Esvaziamento, limpeza mecânica das superfícies internas, desinfecção com produtos específicos e enxágue. Inclui emissão de certificado de limpeza.",
    unidade: "limpezas",
    recorrenciaDias: 180,
    geraCertificado: true,
    validadeCertificadoDias: 180,
    produtosQuimicos: ["Hipoclorito de Sódio 2,5%"],
    epis: ["Máscara PFF2", "Luva Nitrílica", "Cinto de Segurança", "Capacete"],
    riscos: ["Risco Químico", "Risco de Queda"],
    normasAplicaveis: ["NR-33 Espaços Confinados", "NR-35 Trabalho em Altura"],
    procedimentos: ["Esvaziamento do reservatório", "Limpeza mecânica interna", "Desinfecção com hipoclorito", "Enxágue e reenchimento", "Emissão de certificado"],
    ativo: true,
  },
  {
    id: "SRV-003",
    nome: "Coleta e Análise de Bebedouros",
    tipo: "sanitario",
    descricao: "Higienização, desinfecção e coleta de amostras de água para análise laboratorial de potabilidade. Inclui laudo técnico.",
    unidade: "itens",
    recorrenciaDias: 30,
    geraCertificado: true,
    validadeCertificadoDias: 30,
    produtosQuimicos: ["Hipoclorito de Sódio 2,5%", "Ácido Peracético 0,2%", "Dicloroisocianurato Sódico Di-hidratado"],
    epis: ["Máscara PFF2", "Luva Nitrílica", "Óculos de Proteção", "Avental Impermeável"],
    riscos: ["Risco Químico", "Risco Biológico"],
    normasAplicaveis: ["RDC ANVISA Nº 18/2000", "Portaria MS Nº 888/2021"],
    procedimentos: ["Desmontagem do bebedouro", "Limpeza por fricção com esponja", "Desinfecção química", "Coleta de amostra para laboratório", "Emissão de laudo e certificado"],
    ativo: true,
  },
  {
    id: "SRV-004",
    nome: "Manutenção Civil Predial",
    tipo: "manutencao",
    descricao: "Serviços de manutenção predial geral incluindo reparos elétricos, hidráulicos e civis conforme demanda.",
    unidade: "horas",
    recorrenciaDias: 0,
    geraCertificado: false,
    validadeCertificadoDias: 0,
    produtosQuimicos: [],
    epis: ["Capacete", "Luva de Vaqueta", "Bota de Segurança", "Óculos de Proteção"],
    riscos: ["Risco de Queda", "Risco Elétrico"],
    normasAplicaveis: ["NR-10 Eletricidade", "NR-18 Construção Civil", "NR-35 Trabalho em Altura"],
    procedimentos: ["Avaliação técnica do problema", "Execução do reparo", "Teste de funcionamento", "Relatório de serviço"],
    ativo: true,
  },
  {
    id: "SRV-005",
    nome: "Manutenção de Ar-Condicionado (PMOC)",
    tipo: "manutencao",
    descricao: "Plano de Manutenção, Operação e Controle para sistemas de climatização conforme Lei Federal nº 13.589/2018. Inclui preventiva, corretiva e reposição de gás.",
    unidade: "equipamentos",
    recorrenciaDias: 30,
    geraCertificado: false,
    validadeCertificadoDias: 0,
    produtosQuimicos: ["Bactericida para serpentina"],
    epis: ["Máscara PFF2", "Luva Nitrílica", "Óculos de Proteção"],
    riscos: ["Risco Elétrico", "Risco Químico"],
    normasAplicaveis: ["Lei Federal Nº 13.589/2018", "NR-10 Eletricidade"],
    procedimentos: ["Inspeção de filtros e serpentina", "Limpeza de bandeja de condensado", "Verificação elétrica/mecânica", "Reposição de gás refrigerante", "Emissão de relatório PMOC"],
    ativo: true,
  },
  {
    id: "SRV-006",
    nome: "Roçagem e Limpeza de Área",
    tipo: "manutencao",
    descricao: "Serviço de roçagem mecanizada e manual de áreas verdes, limpeza geral de terrenos e pátios.",
    unidade: "m²",
    recorrenciaDias: 30,
    geraCertificado: false,
    validadeCertificadoDias: 0,
    produtosQuimicos: [],
    epis: ["Capacete com viseira", "Protetor auricular", "Luva de Vaqueta", "Perneira", "Bota de Segurança"],
    riscos: ["Risco de Acidente", "Risco Ergonômico"],
    normasAplicaveis: ["NR-12 Máquinas e Equipamentos"],
    procedimentos: ["Sinalização e isolamento da área", "Roçagem mecanizada/manual", "Recolhimento de resíduos", "Limpeza geral"],
    ativo: true,
  },
];

export const contratosTemplates: ContratoTemplate[] = [
  {
    id: "TPL-001",
    numero: "CT-125/2025",
    clienteId: "CLI-006",
    tipo: "contrato",
    servicos: [
      { servicoId: "SRV-001", quantidade: 12, valorUnitario: 480.00, frequencia: "Mensal" },
      { servicoId: "SRV-002", quantidade: 4, valorUnitario: 747.90, frequencia: "Semestral" },
      { servicoId: "SRV-003", quantidade: 14, valorUnitario: 355.00, frequencia: "Mensal" },
      { servicoId: "SRV-005", quantidade: 12, valorUnitario: 150.00, frequencia: "Mensal" },
      { servicoId: "SRV-006", quantidade: 6, valorUnitario: 1200.00, frequencia: "Bimestral" },
    ],
    vigenciaMeses: 12,
    formaPagamento: "Medição mensal - NF/Boleto - 30 dias",
    prazoPagamentoDias: 30,
    status: "vigente",
    dataCriacao: "2025-06-15",
    observacoes: "Contrato com cláusula de reajuste anual pelo IPCA.",
  },
  {
    id: "TPL-002",
    numero: "PC-50/2026",
    clienteId: "CLI-004",
    tipo: "proposta",
    servicos: [
      { servicoId: "SRV-001", quantidade: 12, valorUnitario: 520.00, frequencia: "Mensal" },
      { servicoId: "SRV-002", quantidade: 4, valorUnitario: 747.90, frequencia: "Semestral" },
      { servicoId: "SRV-003", quantidade: 14, valorUnitario: 355.00, frequencia: "Mensal" },
      { servicoId: "SRV-005", quantidade: 24, valorUnitario: 120.00, frequencia: "Mensal" },
    ],
    vigenciaMeses: 12,
    formaPagamento: "A negociar",
    prazoPagamentoDias: 30,
    status: "enviado",
    dataCriacao: "2026-03-03",
    observacoes: "Proposta técnica para Construtora G-Maia - repúblicas e canteiro N5.",
  },
];
