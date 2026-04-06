export interface Tecnico {
  id: string;
  nome: string;
  cpf: string;
  cargo: string;
  dataAdmissao: string;
  telefone: string;
  ativo: boolean;
}

export interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  ano: number;
  ativo: boolean;
}

export interface AlocacaoSemanal {
  id: string;
  tecnicoId: string;
  veiculoId?: string;
  diaSemana: number; // 0=dom, 1=seg...6=sab
  cliente: string;
  servico: string;
  turno: "manha" | "tarde" | "integral";
}

export const tecnicos: Tecnico[] = [
  { id: "TEC-001", nome: "João Silva", cpf: "123.456.789-00", cargo: "Técnico Sanitário", dataAdmissao: "2022-03-15", telefone: "(94) 99111-1111", ativo: true },
  { id: "TEC-002", nome: "Pedro Oliveira", cpf: "234.567.890-11", cargo: "Técnico Sanitário", dataAdmissao: "2023-01-10", telefone: "(94) 99222-2222", ativo: true },
  { id: "TEC-003", nome: "Marcos Santos", cpf: "345.678.901-22", cargo: "Técnico de Manutenção", dataAdmissao: "2021-08-20", telefone: "(94) 99333-3333", ativo: true },
  { id: "TEC-004", nome: "Rafael Almeida", cpf: "456.789.012-33", cargo: "Técnico Sanitário", dataAdmissao: "2024-05-01", telefone: "(94) 99444-4444", ativo: true },
];

export const veiculos: Veiculo[] = [
  { id: "VEI-001", placa: "QRA-1234", modelo: "Fiat Fiorino", ano: 2023, ativo: true },
  { id: "VEI-002", placa: "QRB-5678", modelo: "Renault Kangoo", ano: 2022, ativo: true },
  { id: "VEI-003", placa: "QRC-9012", modelo: "VW Saveiro", ano: 2024, ativo: true },
];

export const alocacoesMock: AlocacaoSemanal[] = [
  { id: "AL-001", tecnicoId: "TEC-001", veiculoId: "VEI-001", diaSemana: 1, cliente: "Komatsu", servico: "Coleta de Bebedouros", turno: "manha" },
  { id: "AL-002", tecnicoId: "TEC-001", veiculoId: "VEI-001", diaSemana: 1, cliente: "Komatsu", servico: "Controle de Pragas", turno: "tarde" },
  { id: "AL-003", tecnicoId: "TEC-002", veiculoId: "VEI-002", diaSemana: 1, cliente: "Metalúrgica Sigma", servico: "Desratização", turno: "integral" },
  { id: "AL-004", tecnicoId: "TEC-003", veiculoId: "VEI-003", diaSemana: 2, cliente: "Komatsu", servico: "Manutenção Civil", turno: "integral" },
  { id: "AL-005", tecnicoId: "TEC-001", veiculoId: "VEI-001", diaSemana: 3, cliente: "Hospital São Lucas", servico: "Higienização Cx. D'Água", turno: "manha" },
  { id: "AL-006", tecnicoId: "TEC-004", diaSemana: 3, cliente: "G-Maia", servico: "Controle de Pragas", turno: "integral" },
  { id: "AL-007", tecnicoId: "TEC-002", veiculoId: "VEI-002", diaSemana: 4, cliente: "Tecnosonda", servico: "CIP + Bebedouros", turno: "integral" },
  { id: "AL-008", tecnicoId: "TEC-003", veiculoId: "VEI-003", diaSemana: 5, cliente: "MIP", servico: "Manutenção Civil", turno: "manha" },
];
