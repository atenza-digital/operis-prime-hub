// Dados detalhados de produtos químicos para o certificado
export interface ProdutoQuimico {
  nome: string;
  grupoQuimico: string;
  qtUso: string;
  diluente: string;
  volAplicado: string;
  combate: string;
  antidoto: string;
}

export const produtosDetalhados: Record<string, ProdutoQuimico> = {
  'Gel Inseticida Maxforce': {
    nome: 'Gel Inseticida Maxforce',
    grupoQuimico: 'Fipronil',
    qtUso: '5 g',
    diluente: 'Pronto uso',
    volAplicado: '5 g',
    combate: 'Desinsetização (baratas)',
    antidoto: 'Tratamento sintomático',
  },
  'Raticida Brodifacoum 0,005%': {
    nome: 'Raticida Brodifacoum 0,005%',
    grupoQuimico: 'Cumarínicos',
    qtUso: '200 g',
    diluente: 'Pronto uso',
    volAplicado: '150 g',
    combate: 'Desratização',
    antidoto: 'Vitamina K1 e tratamento sintomático',
  },
  'Cipermetrina 25% CE': {
    nome: 'Cipermitrina high-cis',
    grupoQuimico: 'Piretróides',
    qtUso: '100 ml',
    diluente: 'Água',
    volAplicado: '18 litros',
    combate: 'Desinsetização',
    antidoto: 'Anti-histamínico e tratamento sintomático',
  },
  'Raticida em Bloco Parafinado': {
    nome: 'Difetialona',
    grupoQuimico: 'Benzotiopiranonas',
    qtUso: '200 gramas',
    diluente: 'Pronto uso',
    volAplicado: '150 gramas',
    combate: 'Desratização',
    antidoto: 'Vitamina K1 e tratamento sintomático',
  },
  'Hipoclorito de Sódio 2,5%': {
    nome: 'Hipoclorito de Sódio 2,5%',
    grupoQuimico: 'Halogenados',
    qtUso: '200 ml',
    diluente: 'Água',
    volAplicado: '10 litros',
    combate: 'Desinfecção/higienização',
    antidoto: 'Tratamento sintomático',
  },
  'Ácido Peracético 0,2%': {
    nome: 'Ácido Peracético 0,2%',
    grupoQuimico: 'Oxidantes',
    qtUso: '50 ml',
    diluente: 'Água',
    volAplicado: '5 litros',
    combate: 'Desinfecção',
    antidoto: 'Tratamento sintomático',
  },
  'Dicloroisocianurato Sódico Di-hidratado': {
    nome: 'Dicloroisocianurato Sódico',
    grupoQuimico: 'Halogenados',
    qtUso: '5 g',
    diluente: 'Água',
    volAplicado: '5 litros',
    combate: 'Desinfecção',
    antidoto: 'Tratamento sintomático',
  },
  'Lambda-cyhalohtrin': {
    nome: 'Lambda-cyhalohtrin',
    grupoQuimico: 'Piretróides',
    qtUso: '50 ml',
    diluente: 'Óleo mineral',
    volAplicado: '5 litros',
    combate: 'Termonebulização (fumace)',
    antidoto: 'Anti-histamínico e tratamento sintomático',
  },
  'Bactericida para serpentina': {
    nome: 'Bactericida para serpentina',
    grupoQuimico: 'Quaternário de amônio',
    qtUso: '100 ml',
    diluente: 'Água',
    volAplicado: '2 litros',
    combate: 'Higienização ar-condicionado',
    antidoto: 'Tratamento sintomático',
  },
};

export function getProdutoDetalhado(nome: string): ProdutoQuimico {
  return produtosDetalhados[nome] || {
    nome,
    grupoQuimico: '—',
    qtUso: '—',
    diluente: '—',
    volAplicado: '—',
    combate: '—',
    antidoto: 'Tratamento sintomático',
  };
}
