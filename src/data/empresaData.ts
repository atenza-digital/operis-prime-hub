export interface EmpresaConfig {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  email: string;
  logoUrl: string;
  alvara: string;
  cr02: string;
  anvisa: string;
  vigilanciaSanitaria: string;
  responsavelTecnico: string;
  responsavelExecucao: string;
  cargoResponsavel: string;
}

export interface NumeracaoConfig {
  propostaFormato: string;   // e.g. "PC-{SEQ}/{ANO}"
  propostaUltimo: number;
  contratoFormato: string;   // e.g. "CT-{SEQ}/{ANO}"
  contratoUltimo: number;
  osFormato: string;          // e.g. "OS-{SEQ}"
  osUltimo: number;
}

export const empresaConfig: EmpresaConfig = {
  razaoSocial: "CIPERPRAG Controle de Pragas e Serviços LTDA",
  nomeFantasia: "Ciperprag",
  cnpj: "15.722.292/0001-43",
  endereco: "Rua Tiradentes 190, centro Rondon do Pará",
  telefone: "(94) 99258-2761",
  email: "adm@ciperprag.com",
  logoUrl: "",
  alvara: "00060/2025",
  cr02: "1611984/2025",
  anvisa: "3.09876.2",
  vigilanciaSanitaria: "VSP-2025-4432",
  responsavelTecnico: "Dr. Carlos Mendes - CRQ 04.123.456",
  responsavelExecucao: "Aline Vieira",
  cargoResponsavel: "Diretora/Gerente de Negócios/Resp. Técnica",
};

export const numeracaoConfig: NumeracaoConfig = {
  propostaFormato: "PC-{SEQ}/{ANO}",
  propostaUltimo: 50,
  contratoFormato: "CT-{SEQ}/{ANO}",
  contratoUltimo: 125,
  osFormato: "OS-{SEQ}",
  osUltimo: 2675,
};

export function gerarNumero(formato: string, sequencial: number): string {
  const ano = new Date().getFullYear();
  return formato
    .replace("{SEQ}", String(sequencial))
    .replace("{ANO}", String(ano));
}
