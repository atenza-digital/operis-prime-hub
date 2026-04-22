// ============================================================
// App Store — localStorage-based state management
// ============================================================

export interface AgendamentoApp {
  id: string;
  clienteId?: string;
  clienteNome: string;
  clienteCnpj: string;
  contratoId: string;
  servico: string;
  tipo: 'sanitario' | 'manutencao';
  dataAgendada: string;
  localExecucao: string;
  tags?: string;
  observacao?: string;
  status: 'agendado' | 'os_gerada' | 'encerrado' | 'cancelado';
  osId?: string;
  createdAt: string;
}

export interface OSApp {
  id: string;
  numero: string;
  agendamentoId?: string;
  clienteId?: string;
  clienteNome: string;
  clienteCnpj: string;
  clienteEndereco?: string;
  clienteLogoUrl?: string;
  contratoId: string;
  servico: string;
  tipo: 'sanitario' | 'manutencao';
  tecnicoNome: string;
  tecnicoCpf?: string;
  tecnicoDataAdmissao?: string;
  localExecucao: string;
  tags?: string;
  dataEmissao: string;
  dataExecucao?: string;
  quantidade: number;
  unidade: string;
  status: 'aberta' | 'encerrada';
  fotos: string[];  // base64
  certificadoHash?: string;
}

export interface ProdutoQuimicoDetalhado {
  nome: string;
  grupoQuimico?: string;
  qtUso?: string;
  diluente?: string;
  volAplicado?: string;
  combate?: string;
  antidoto?: string;
}

export interface CertificadoApp {
  id: string;
  hash: string;
  numero: string;
  osId: string;
  osNumero?: string;
  clienteId?: string;
  clienteNome: string;
  clienteCnpj: string;
  clienteEndereco?: string;
  clienteLogoUrl?: string;
  contratoId: string;
  servico: string;
  tecnicoNome: string;
  localExecucao: string;
  dataExecucao: string;
  // fotos NÃO são salvas aqui — buscar via osId para economizar quota
  emitidoEm: string;
  validadeDias: number;
  produtosQuimicos?: string[];
  produtosDetalhados?: ProdutoQuimicoDetalhado[];
}

// ---- Storage helpers ----
const KEYS = {
  agendamentos: 'cp_agendamentos',
  ordens: 'cp_ordens',
  certificados: 'cp_certificados',
  osCounter: 'cp_os_counter',
  certCounter: 'cp_cert_counter',
};

function load<T>(key: string, def: T): T {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : def; }
  catch { return def; }
}
function save<T>(key: string, v: T) { localStorage.setItem(key, JSON.stringify(v)); }

// ---- Agendamentos ----
export const getAgendamentos = (): AgendamentoApp[] => load(KEYS.agendamentos, []);
export const saveAgendamentos = (list: AgendamentoApp[]) => save(KEYS.agendamentos, list);
export function addAgendamento(ag: AgendamentoApp) {
  saveAgendamentos([...getAgendamentos(), ag]);
}
export function updateAgendamento(id: string, updates: Partial<AgendamentoApp>) {
  saveAgendamentos(getAgendamentos().map(a => a.id === id ? { ...a, ...updates } : a));
}
export function removeAgendamento(id: string) {
  saveAgendamentos(getAgendamentos().filter(a => a.id !== id));
}

// ---- Ordens de Serviço ----
export const getOrdens = (): OSApp[] => load(KEYS.ordens, []);
export const saveOrdens = (list: OSApp[]) => save(KEYS.ordens, list);
export function addOrdem(os: OSApp) {
  saveOrdens([...getOrdens(), os]);
}
export function updateOrdem(id: string, updates: Partial<OSApp>) {
  saveOrdens(getOrdens().map(o => o.id === id ? { ...o, ...updates } : o));
}
export function getOrdemById(id: string): OSApp | undefined {
  return getOrdens().find(o => o.id === id);
}

// ---- Certificados ----
export const getCertificados = (): CertificadoApp[] => load(KEYS.certificados, []);
export const saveCertificados = (list: CertificadoApp[]) => save(KEYS.certificados, list);
export function addCertificado(cert: CertificadoApp) {
  saveCertificados([...getCertificados(), cert]);
}
export function getCertificadoByHash(hash: string): CertificadoApp | undefined {
  return getCertificados().find(c => c.hash === hash);
}

// ---- Sequencials ----
export function nextOSNumber(): string {
  const n = load(KEYS.osCounter, 2675) + 1;
  save(KEYS.osCounter, n);
  return `OS-${n}`;
}
export function nextCertNumber(): string {
  const n = load(KEYS.certCounter, 7296) + 1;
  save(KEYS.certCounter, n);
  return `${n}/${new Date().getFullYear()}`;
}
export function generateHash(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let h = 'HSH-' + new Date().getFullYear() + '-';
  for (let i = 0; i < 4; i++) h += chars[Math.floor(Math.random() * chars.length)];
  return h;
}

// ---- Date helpers ----
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
