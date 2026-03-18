export interface Contrato {
  id: string;
  cliente: string;
  cnpj: string;
  servico: string;
  tipo: "sanitario" | "manutencao";
  contratado: number;
  executado: number;
  unidade: string;
  status: "ativo" | "pendente" | "vencido";
  ultimaExecucao: string;
  validadeDias: number;
  tags?: string[];
  produtosQuimicos?: string[];
  epis?: string[];
  riscos?: string[];
}

export interface Agendamento {
  id: string;
  contratoId: string;
  cliente: string;
  servico: string;
  dataAgendada: string;
  diasParaVencer: number;
}

export interface OrdemServico {
  id: string;
  contratoId: string;
  cliente: string;
  servico: string;
  tecnico: string;
  dataExecucao: string;
  fotos: string[];
  certificadoHash?: string;
}

export const contratos: Contrato[] = [
  {
    id: "CT-001",
    cliente: "Komatsu Brasil International LTDA",
    cnpj: "02.336.124/0009-25",
    servico: "Coleta e Análise de Bebedouros",
    tipo: "sanitario",
    contratado: 14,
    executado: 1,
    unidade: "itens",
    status: "ativo",
    ultimaExecucao: "2026-02-15",
    validadeDias: 30,
    tags: ["BEB-01", "BEB-02", "BEB-03", "BEB-04", "BEB-05"],
    produtosQuimicos: ["Hipoclorito de Sódio 2,5%", "Ácido Peracético 0,2%"],
    epis: ["Máscara PFF2", "Luva Nitrílica", "Óculos de Proteção", "Avental Impermeável"],
    riscos: ["Risco Químico", "Risco Biológico"],
  },
  {
    id: "CT-002",
    cliente: "Komatsu Brasil International LTDA",
    cnpj: "02.336.124/0009-25",
    servico: "Controle Integrado de Pragas",
    tipo: "sanitario",
    contratado: 12,
    executado: 4,
    unidade: "visitas",
    status: "ativo",
    ultimaExecucao: "2026-03-01",
    validadeDias: 30,
    tags: ["ARM-01", "ARM-02", "ARM-03"],
    produtosQuimicos: ["Gel Inseticida Maxforce", "Raticida Brodifacoum 0,005%"],
    epis: ["Máscara PFF2", "Luva Nitrílica", "Bota de Segurança"],
    riscos: ["Risco Químico", "Risco Biológico"],
  },
  {
    id: "CT-003",
    cliente: "Komatsu Brasil International LTDA",
    cnpj: "02.336.124/0009-25",
    servico: "Manutenção Civil Predial",
    tipo: "manutencao",
    contratado: 100,
    executado: 32,
    unidade: "horas",
    status: "ativo",
    ultimaExecucao: "2026-03-10",
    validadeDias: 0,
  },
  {
    id: "CT-004",
    cliente: "Metalúrgica Sigma S.A.",
    cnpj: "11.222.333/0001-44",
    servico: "Desratização e Desinsetização",
    tipo: "sanitario",
    contratado: 6,
    executado: 6,
    unidade: "visitas",
    status: "vencido",
    ultimaExecucao: "2026-01-20",
    validadeDias: 30,
    tags: ["EST-01", "EST-02"],
    produtosQuimicos: ["Cipermetrina 25% CE", "Raticida em Bloco Parafinado"],
    epis: ["Máscara PFF2", "Luva Nitrílica", "Macacão Tyvek"],
    riscos: ["Risco Químico"],
  },
  {
    id: "CT-005",
    cliente: "Hospital São Lucas",
    cnpj: "55.666.777/0001-88",
    servico: "Higienização de Caixas D'Água",
    tipo: "sanitario",
    contratado: 4,
    executado: 2,
    unidade: "limpezas",
    status: "ativo",
    ultimaExecucao: "2026-02-28",
    validadeDias: 180,
    tags: ["CX-01", "CX-02", "CX-03"],
    produtosQuimicos: ["Hipoclorito de Sódio 2,5%"],
    epis: ["Máscara PFF2", "Luva Nitrílica", "Cinto de Segurança", "Capacete"],
    riscos: ["Risco Químico", "Risco de Queda"],
  },
];

export const proximosAgendamentos: Agendamento[] = [
  {
    id: "AG-001",
    contratoId: "CT-004",
    cliente: "Metalúrgica Sigma S.A.",
    servico: "Desratização e Desinsetização",
    dataAgendada: "2026-03-20",
    diasParaVencer: -57,
  },
  {
    id: "AG-002",
    contratoId: "CT-001",
    cliente: "Komatsu Brasil International LTDA",
    servico: "Coleta e Análise de Bebedouros",
    dataAgendada: "2026-03-17",
    diasParaVencer: -1,
  },
  {
    id: "AG-003",
    contratoId: "CT-002",
    cliente: "Komatsu Brasil International LTDA",
    servico: "Controle Integrado de Pragas",
    dataAgendada: "2026-03-31",
    diasParaVencer: 13,
  },
];

export const licencas = {
  alvara: "00060/2025",
  cr02: "1611984/2025",
  anvisa: "3.09876.2",
  vigilanciaSanitaria: "VSP-2025-4432",
  responsavelTecnico: "Dr. Carlos Mendes - CRQ 04.123.456",
  empresa: "CIPERPRAG Controle de Pragas e Serviços LTDA",
  cnpj: "12.345.678/0001-90",
};

export const tecnicos = [
  "João Silva",
  "Pedro Oliveira",
  "Marcos Santos",
  "Rafael Almeida",
];
