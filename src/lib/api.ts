export interface ContatoCliente {
  nome: string;
  cargo: string;
  funcao?: "operacional" | "financeiro" | "contratos" | "tecnico" | "emergencia" | "outro";
  telefone: string;
  email: string;
  principal: boolean;
  observacoes?: string;
}

export interface ClienteLocalExecucao {
  id?: string;
  clienteId?: string;
  nome: string;
  endereco?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  observacoes?: string;
  ativo: boolean;
}

export interface ClienteEquipamento {
  id?: string;
  clienteId?: string;
  localId?: string;
  tag: string;
  descricao?: string;
  tipo?: string;
  setor?: string;
  observacoes?: string;
  ativo: boolean;
}

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
  logoUrl?: string;
  ativo: boolean;
  contatos: ContatoCliente[];
  locaisExecucao: ClienteLocalExecucao[];
  equipamentos: ClienteEquipamento[];
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
  checklistItens: string[];
  exigeFoto: boolean;
  exigeAssinatura: boolean;
  permiteNaoExecucao: boolean;
  popId?: string;
  popCodigo?: string;
  popTitulo?: string;
  popVersao?: string;
  popStatus?: "rascunho" | "ativo" | "inativo";
  popObjetivo?: string;
  popAplicacao?: string;
  popResponsabilidades?: string[];
  popMateriais?: string[];
  popAprovadoPor?: string;
  popAprovadoEm?: string;
  ativo: boolean;
}

export interface Contrato {
  id: string;
  clienteId?: string;
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
  valorUnitario?: number;
  tags?: string[];
  produtosQuimicos?: string[];
  epis?: string[];
  riscos?: string[];
  locais?: string[];
}

export interface AgendamentoApp {
  id: string;
  clienteId?: string;
  clienteNome: string;
  clienteCnpj: string;
  contratoId: string;
  servico: string;
  tipo: "sanitario" | "manutencao";
  dataAgendada: string;
  localExecucao: string;
  tags?: string;
  observacao?: string;
  tecnicosIds?: string[];
  tecnicosNomes?: string[];
  veiculoId?: string;
  veiculoDescricao?: string;
  status: "agendado" | "os_gerada" | "encerrado" | "cancelado";
  osId?: string;
  createdAt: string;
}

export interface EvidenciaAnexoApp {
  id: string;
  entidadeTipo: "os" | "certificado" | "medicao" | "servico_pop" | "cliente" | "contrato";
  entidadeId: string;
  categoria: "evidencia" | "foto" | "documento" | "pop_aprovado" | "pdf_historico" | "outro";
  nomeArquivo: string;
  mimeType?: string;
  tamanhoBytes?: number;
  conteudoBase64?: string;
  downloadUrl?: string;
  url?: string;
  metadados?: Record<string, unknown>;
  hashSha256?: string;
  imutavel?: boolean;
  criadoEm: string;
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
  tipo: "sanitario" | "manutencao";
  tecnicoNome: string;
  tecnicoCpf?: string;
  tecnicoDataAdmissao?: string;
  equipeTecnicosIds?: string[];
  equipeTecnicosNomes?: string[];
  veiculoId?: string;
  veiculoDescricao?: string;
  localExecucao: string;
  tags?: string;
  tagEquipamentoServico?: string;
  observacao?: string;
  dataEmissao: string;
  dataExecucao?: string;
  quantidade: number;
  unidade: string;
  status: "aberta" | "encerrada";
  fotos: string[];
  evidencias?: EvidenciaAnexoApp[];
  certificadoHash?: string;
  checklistRespostas?: Array<{ item: string; concluido: boolean; observacao?: string }>;
  naoExecutada?: boolean;
  motivoNaoExecucao?: string;
  snapshotDados?: Record<string, unknown>;
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
  emitidoEm: string;
  validadeDias: number;
  produtosQuimicos?: string[];
  produtosDetalhados?: Array<Record<string, string>>;
  snapshotDados?: Record<string, unknown>;
  status?: "emitido" | "revogado";
  revogadoEm?: string | null;
  motivoRevogacao?: string | null;
}

export interface CertificateVerification {
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
  emitidoEm: string;
  validadeDias: number;
  validadeAte?: string | null;
  status: "valid" | "expired";
  produtosQuimicos?: string[];
  produtosDetalhados?: Array<Record<string, string>>;
  snapshotDados?: Record<string, unknown>;
  certificateStatus?: "emitido" | "revogado";
  revogadoEm?: string | null;
  motivoRevogacao?: string | null;
  tagEquipamentoServico?: string;
  quantidade?: number;
  unidade?: string;
  fotos?: string[];
}

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
  diaSemana: number;
  cliente: string;
  servico: string;
  turno: "manha" | "tarde" | "integral";
}

export interface ContratoServico {
  servicoId: string;
  quantidade: number;
  valorUnitario: number;
  frequencia: string;
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

export interface EmpresaConfig {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  email: string;
  logoUrl?: string;
  alvara: string;
  cr02: string;
  anvisa: string;
  vigilanciaSanitaria: string;
  responsavelTecnico: string;
  responsavelExecucao: string;
  cargoResponsavel: string;
  certificadoValidadePadraoDias: number;
  certificadoTextoLegal?: string;
  certificadoTextoFixacao?: string;
  telefoneEmergencia?: string;
  medicaoFormaPagamentoPadrao?: string;
  medicaoLocalEntregaPadrao?: string;
}

export interface NumeracaoConfig {
  propostaFormato: string;
  propostaUltimo: number;
  contratoFormato: string;
  contratoUltimo: number;
  osFormato: string;
  osUltimo: number;
  certificadoFormato: string;
  certificadoUltimo: number;
  medicaoFormato: string;
  medicaoUltimo: number;
}

export interface RecorrenciaSuggestionApp {
  id: string;
  clienteId?: string;
  clienteNome: string;
  clienteCnpj: string;
  contratoId: string;
  servico: string;
  tipo: "sanitario" | "manutencao";
  localExecucao: string;
  tags?: string;
  observacao?: string;
  tecnicosIds?: string[];
  tecnicosNomes?: string[];
  veiculoId?: string;
  veiculoDescricao?: string;
  suggestedDate: string;
  sourceAgendamentoId?: string;
  sourceOsId: string;
  status: "pendente" | "confirmada" | "dispensada";
  createdAt: string;
}

export interface MedicaoItemApp {
  id?: number;
  osId: string;
  osNumero?: string;
  contratoId?: string;
  servico: string;
  dataExecucao: string;
  quantidade: number;
  unidade?: string;
  valorUnitario: number;
  valorTotal: number;
}

export interface MedicaoApp {
  id: string;
  numero: string;
  clienteId?: string;
  clienteNome: string;
  clienteCnpj?: string;
  clienteEndereco?: string;
  periodoInicio: string;
  periodoFim: string;
  status: "emitida" | "cancelada";
  total: number;
  formaPagamento?: string;
  localEntrega?: string;
  snapshotDados?: Record<string, unknown>;
  criadoEm: string;
  itens: MedicaoItemApp[];
}

export interface BootstrapData {
  companyConfig: EmpresaConfig | null;
  numberingConfig: NumeracaoConfig | null;
  clients: Cliente[];
  services: ServicoCatalogo[];
  contracts: Contrato[];
  schedules: AgendamentoApp[];
  orders: OSApp[];
  certificates: CertificadoApp[];
  technicians: Tecnico[];
  vehicles: Veiculo[];
  allocations: AlocacaoSemanal[];
  contractTemplates: ContratoTemplate[];
  recurrenceSuggestions: RecorrenciaSuggestionApp[];
  measurements: MedicaoApp[];
}

const AUTH_TOKEN_KEY = "ciperprag_hub_auth_token";

export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  status: string;
  senhaTemporaria: boolean;
  ultimoLoginEm?: string;
  tenant: {
    id: string;
    slug: string;
    nome: string;
  };
  perfis: Array<{ codigo: string; nome: string }>;
  permissoes: string[];
}

export interface AuthSession {
  token: string;
  expiresAt: string;
  user: AuthUser;
}

export interface RoleApp {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  sistema: boolean;
  permissoes: string[];
}

export interface UserApp {
  id: string;
  nome: string;
  email: string;
  status: "ativo" | "convidado" | "bloqueado" | "inativo";
  ultimoLoginEm?: string | null;
  criadoEm?: string;
  atualizadoEm?: string;
  perfis: Array<{ codigo: string; nome: string }>;
}

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
    ...init,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Erro na API" }));
    if (response.status === 428 && window.location.pathname !== "/alterar-senha") {
      window.location.assign("/alterar-senha");
    }
    if (response.status === 401 && !path.startsWith("/auth/login")) {
      clearAuthToken();
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }
    throw new Error(error.error || "Erro na API");
  }
  return response.json();
}

export async function fetchAttachmentBlob(id: string, download = false) {
  const token = getAuthToken();
  const response = await fetch(`/api/attachments/${encodeURIComponent(id)}/download${download ? "?download=1" : ""}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Erro ao carregar anexo" }));
    throw new Error(error.error || "Erro ao carregar anexo");
  }
  return {
    blob: await response.blob(),
    fileName: response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? `${id}.bin`,
    hashSha256: response.headers.get("x-document-hash-sha256"),
  };
}

export const addDays = (dateStr: string, days: number) => {
  const date = new Date(`${dateStr}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
};

export const getBootstrap = () => api<BootstrapData>("/bootstrap");
export const login = (payload: { email: string; password: string }) =>
  api<{ ok: boolean } & AuthSession>("/auth/login", { method: "POST", body: JSON.stringify(payload) });
export const getCurrentUser = () => api<{ ok: boolean; user: AuthUser }>("/auth/me");
export const logout = () => api<{ ok: boolean }>("/auth/logout", { method: "POST" });
export const changePassword = (payload: { currentPassword: string; newPassword: string }) =>
  api<{ ok: boolean; user: AuthUser }>("/auth/change-password", { method: "POST", body: JSON.stringify(payload) });
export const getRoles = () => api<{ ok: boolean; roles: RoleApp[] }>("/roles");
export const getUsers = () => api<{ ok: boolean; users: UserApp[] }>("/users");
export const saveUser = (payload: { id?: string; nome: string; email: string; status: UserApp["status"]; perfilCodigos: string[] }) =>
  api<{ ok: boolean; user: UserApp; temporaryPassword?: string }>("/users", { method: "POST", body: JSON.stringify(payload) });
export const resetUserPassword = (id: string) =>
  api<{ ok: boolean; temporaryPassword: string }>(`/users/${id}/reset-password`, { method: "POST" });
export const saveClient = (payload: Partial<Cliente>) => api("/clients", { method: "POST", body: JSON.stringify(payload) });
export const saveService = (payload: Partial<ServicoCatalogo>) => api("/services", { method: "POST", body: JSON.stringify(payload) });
export const saveTechnician = (payload: Partial<Tecnico>) => api("/technicians", { method: "POST", body: JSON.stringify(payload) });
export const saveVehicle = (payload: Partial<Veiculo>) => api("/vehicles", { method: "POST", body: JSON.stringify(payload) });
export const saveAllocation = (payload: Partial<AlocacaoSemanal>) => api("/allocations", { method: "POST", body: JSON.stringify(payload) });
export const saveCompanyConfig = (payload: EmpresaConfig) => api("/company-config", { method: "PATCH", body: JSON.stringify(payload) });
export const saveNumberingConfig = (payload: NumeracaoConfig) => api("/numbering-config", { method: "PATCH", body: JSON.stringify(payload) });
export const saveContractTemplate = (payload: Partial<ContratoTemplate>) => api("/contract-templates", { method: "POST", body: JSON.stringify(payload) });
export const generateContractFromProposal = (id: string) => api(`/contract-templates/${id}/generate-contract`, { method: "POST" });
export const saveSchedule = (payload: Partial<AgendamentoApp>) => api("/agendamentos", { method: "POST", body: JSON.stringify(payload) });
export const updateSchedule = (id: string, payload: Partial<AgendamentoApp>) => api(`/agendamentos/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const generateOrderFromSchedule = (id: string, tecnicoNome: string) => api(`/agendamentos/${id}/gerar-os`, { method: "POST", body: JSON.stringify({ tecnicoNome }) });
export const updateOrder = (id: string, payload: Partial<OSApp>) => api(`/orders/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const closeOrder = (id: string, payload: { dataExecucao: string; quantidade: number; tagEquipamentoServico?: string; fotos: string[]; checklistRespostas?: OSApp["checklistRespostas"]; naoExecutada?: boolean; motivoNaoExecucao?: string }) =>
  api<{ ok: boolean; certificateHash?: string }>(`/orders/${id}/encerrar`, { method: "POST", body: JSON.stringify(payload) });
export const generateCertificateForOrder = (id: string) => api<{ ok: boolean; hash: string }>(`/orders/${id}/certificado`, { method: "POST" });
export const getCertificateVerification = (hash: string) =>
  api<{ ok: boolean; certificate: CertificateVerification; verifiedAt: string }>(`/certificates/${encodeURIComponent(hash)}`);
export const updateRecurrenceSuggestion = (id: string, action: "confirm" | "dismiss") =>
  api(`/recurrence-suggestions/${id}`, { method: "PATCH", body: JSON.stringify({ action }) });
export const generateMeasurement = (payload: { clienteNome: string; dataInicio: string; dataFim: string }) =>
  api<{ ok: boolean; measurement: MedicaoApp }>("/measurements/generate", { method: "POST", body: JSON.stringify(payload) });
export const cancelMeasurement = (id: string) =>
  api<{ ok: boolean }>(`/measurements/${id}/cancel`, { method: "PATCH" });
