import { repairMojibake } from "@/lib/repairMojibake";

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
  produtosDetalhados?: Array<{
    nome?: string;
    grupoQuimico?: string;
    qtUso?: string;
    diluente?: string;
    volAplicado?: string;
    combate?: string;
    antidoto?: string;
  }>;
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
  produtosEstoque?: Array<{
    produtoId: string;
    produtoNome?: string;
    produtoCodigo?: string;
    quantidadePrevista: number;
    unidade?: string;
  }>;
  ativo: boolean;
}

export interface ProdutoEstoqueApp {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  unidade: string;
  quantidadeAtual: number;
  estoqueMinimo: number;
  ativo: boolean;
  atualizadoEm?: string;
  movimentos: Array<{
    id: string;
    tipo: "entrada" | "saida" | "ajuste" | "devolucao" | "perda";
    quantidade: number;
    saldoAnterior: number;
    saldoPosterior: number;
    osId?: string | null;
    servicoId?: string | null;
    observacao?: string | null;
    criadoEm?: string;
  }>;
}

export interface Contrato {
  id: string;
  contratoTemplateId?: string;
  contratoTemplateServicoId?: number;
  servicoCatalogoId?: string;
  numeroComercial?: string;
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
  vigenciaInicio?: string;
  vigenciaFim?: string;
  validadeDias: number;
  valorUnitario?: number;
  frequencia?: string;
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
  contratoId?: string | null;
  servicoCatalogoId?: string | null;
  servico: string;
  tipo: "sanitario" | "manutencao";
  dataAgendada: string;
  localExecucao: string;
  localId?: string;
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
  entidadeTipo: "os" | "certificado" | "medicao" | "servico_pop" | "cliente" | "contrato" | "proposta" | "minuta";
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
  snapshotHashSha256?: string;
  templateCodigo?: string;
  templateVersao?: string;
  storageProvider?: string;
  storageBucket?: string;
  storageKey?: string;
  storageEtag?: string;
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
  contratoId?: string | null;
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
  contratoId?: string | null;
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
  substituidoPorId?: string | null;
  substituiCertificadoId?: string | null;
  fotos?: string[];
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
  status: "valid" | "expired" | "revoked";
  produtosQuimicos?: string[];
  produtosDetalhados?: Array<Record<string, string>>;
  snapshotDados?: Record<string, unknown>;
  certificateStatus?: "emitido" | "revogado";
  revogadoEm?: string | null;
  motivoRevogacao?: string | null;
  substituidoPorId?: string | null;
  substituiCertificadoId?: string | null;
  tagEquipamentoServico?: string;
  quantidade?: number;
  unidade?: string;
  fotos?: string[];
  documento?: {
    nomeArquivo?: string;
    hashSha256?: string;
    snapshotHashSha256?: string;
    templateCodigo?: string;
    templateVersao?: string;
    criadoEm?: string;
  } | null;
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
  id?: number;
  servicoId: string;
  quantidade: number;
  valorUnitario: number;
  frequencia: string;
  descricaoComercial?: string;
  unidadeComercial?: string;
  enderecoAtividade?: string;
  enderecosAtividade?: string[];
  localIds?: string[];
  contratoOperacionalId?: string;
  contratoOperacionalStatus?: "ativo" | "pendente" | "vencido";
  contratoOperacionalExecutado?: number;
}

export interface ContratoTemplate {
  id: string;
  numero: string;
  clienteId: string;
  tipo: "contrato" | "proposta" | "minuta";
  servicos: ContratoServico[];
  vigenciaMeses: number;
  formaPagamento: string;
  prazoPagamentoDias: number;
  status: "rascunho" | "enviado" | "em_negociacao" | "aprovado" | "recusado" | "cancelado" | "vigente" | "encerrado";
  dataCriacao: string;
  observacoes: string;
  titulo?: string;
  objeto?: string;
  validadeDias?: number;
  modalidade?: string;
  locaisExecucao?: string[];
  escopoTecnico?: string;
  condicoesComerciais?: string;
  issueCity?: string;
  issueState?: string;
  issuedAt?: string;
  timezone?: string;
  issuingBranchId?: string;
  operacionalizado?: boolean;
  contratosOperacionaisIds?: string[];
  sourcePdfImportId?: string;
}

export interface ProposalAssistDraft {
  clienteId: string;
  clienteNome: string;
  titulo: string;
  objeto: string;
  modalidade: string;
  validadeDias: number;
  locaisExecucao: string[];
  escopoTecnico: string[];
  condicoesComerciais: string[];
  servicos: Array<{
    servicoId: string;
    servicoNome: string;
    quantidade: number;
    valorUnitario: number;
    frequencia: string;
    enderecoAtividade: string;
  }>;
  observacoes: string[];
  coberturaDocumento?: {
    paginasAnalisadas: number | null;
    tabelasEncontradas: number;
    itensExtraidos: number;
    regrasFrequencia: string[];
    camposNaoInterpretados: string[];
  };
  sourceImportId?: string;
  originalPdfHashSha256?: string;
  confianca: "alta" | "media" | "baixa";
  camposPendentes: string[];
  avisos: string[];
}

export interface EmpresaConfig {
  tenantSlug?: string;
  tenantNome?: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  email: string;
  logoUrl?: string;
  corPrimaria?: string;
  corSecundaria?: string;
  corDestaque?: string;
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
  commercialConfig?: {
    allowContractGeneration?: boolean;
    allowMinutaGeneration?: boolean;
    showMonthlyContractValue?: boolean;
  };
  certificadoConfig?: {
    templateCodigo?: string;
    templateVersao?: string;
    titulo?: string;
    subtitulo?: string;
    tipo?: string;
    brandIconUrl?: string;
    sidebarLogoDarkUrl?: string;
    documentLogoLightUrl?: string;
    logoPrincipalUrl?: string;
    logoInterfaceUrl?: string;
    arteFundoUrl?: string;
    seloInstitucionalUrl?: string;
    assinaturaUrl?: string;
    assinaturaModo?: "imagem" | "linha" | "ocultar" | "obrigatoria";
    assinaturaDocumentos?: Record<string, "imagem" | "linha" | "ocultar" | "obrigatoria">;
    medicaoResponsavelNome?: string;
    medicaoResponsavelCargo?: string;
    medicaoAssinaturaUrl?: string;
    medicaoAssinaturaModo?: "imagem" | "linha" | "ocultar";
    corPrimaria?: string;
    corSecundaria?: string;
    corDestaque?: string;
    publicBaseUrl?: string;
    exibirQrCode?: boolean;
    exibirFotos?: boolean;
    limiteFotos?: number;
    exibirProdutosQuimicos?: boolean;
    responsavelTecnico?: string;
    cargoResponsavel?: string;
    registroProfissional?: string;
    cit?: string;
    rodapeLinhas?: string[];
    licencas?: Array<{ titulo?: string; valor?: string }>;
    textoLegalPadrao?: string;
    textoTecnicoPorServico?: Record<string, string>;
    uploadPolicies?: Record<string, {
      maxFiles?: number;
      maxBytes?: number;
      allowedMimeTypes?: string[];
      securityScan?: {
        required?: boolean;
        provider?: string;
        quarantineMode?: string;
        blockingMode?: string;
      };
    }>;
  };
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
  contratoId?: string | null;
  servicoCatalogoId?: string | null;
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

export type MedicaoFinanceiroStatus =
  | "em_conferencia"
  | "emitida"
  | "enviada_ao_cliente"
  | "aceita"
  | "aguardando_nf"
  | "nf_registrada"
  | "nf_enviada"
  | "aguardando_pagamento"
  | "paga"
  | "pago_no_erp"
  | "pendente_cliente"
  | "cancelada"
  | "substituida";

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
  financeiroStatus?: MedicaoFinanceiroStatus;
  nfNumero?: string | null;
  nfEnviadaEm?: string | null;
  pagamentoPrevistoEm?: string | null;
  pagoNoErpEm?: string | null;
  financeiroObservacao?: string | null;
  financeiroAtualizadoEm?: string | null;
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
  stockProducts: ProdutoEstoqueApp[];
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
  attachments: EvidenciaAnexoApp[];
}

const AUTH_TOKEN_KEY = "atenza_fieldops_auth_token";
const LEGACY_AUTH_TOKEN_KEY = "ciperprag_hub_auth_token";

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
    logoUrl?: string | null;
    brandIconUrl?: string | null;
    logoInterfaceUrl?: string | null;
  };
  perfis: Array<{ codigo: string; nome: string }>;
  permissoes: string[];
}

export interface AuthSession {
  token: string;
  expiresAt: string;
  user: AuthUser;
}

export interface PublicTenantContext {
  slug: string;
  nome: string;
  logoUrl?: string | null;
  brandIconUrl?: string | null;
  logoInterfaceUrl?: string | null;
  corPrimaria?: string | null;
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

export interface AuditLogApp {
  id: number;
  entidadeTipo: string;
  entidadeId?: string | null;
  acao: string;
  resumo?: string | null;
  dadosAntes?: Record<string, unknown> | null;
  dadosDepois?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
  criadoEm: string;
  usuario?: {
    nome?: string | null;
    email?: string | null;
  } | null;
}

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(LEGACY_AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
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
    const isPayloadTooLarge = response.status === 413;
    const error = await response.json().catch(() => ({
      error: isPayloadTooLarge
        ? "As fotos excedem o limite de envio. Reduza a quantidade ou o tamanho das imagens e tente novamente."
        : `Erro na API (HTTP ${response.status})`,
    }));
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

const SKIP_TEXT_REPAIR_KEYS = new Set([
  "conteudoBase64",
  "contentBase64",
  "fotos",
  "logoUrl",
  "clienteLogoUrl",
  "downloadUrl",
  "url",
  "hash",
  "hashSha256",
  "snapshotHashSha256",
  "storageKey",
  "storageEtag",
  "token",
]);

function repairBootstrapText<T>(value: T, key = ""): T {
  if (typeof value === "string") {
    return (SKIP_TEXT_REPAIR_KEYS.has(key) ? value : repairMojibake(value)) as T;
  }

  if (Array.isArray(value)) {
    if (SKIP_TEXT_REPAIR_KEYS.has(key)) return value;
    return value.map((item) => repairBootstrapText(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => [
        entryKey,
        repairBootstrapText(entryValue, entryKey),
      ]),
    ) as T;
  }

  return value;
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

export const getBootstrap = async () => repairBootstrapText(await api<BootstrapData>("/bootstrap"));
export const getPublicTenantContext = (tenantSlug?: string | null) => {
  const search = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : "";
  return api<{ ok: boolean; tenant: PublicTenantContext | null }>(`/public/tenant-context${search}`);
};
export const login = (payload: { email: string; password: string; tenantSlug?: string | null }) =>
  api<{ ok: boolean } & AuthSession>("/auth/login", { method: "POST", body: JSON.stringify(payload) });
export const getCurrentUser = () => api<{ ok: boolean; user: AuthUser }>("/auth/me");
export const logout = () => api<{ ok: boolean }>("/auth/logout", { method: "POST" });
export const changePassword = (payload: { currentPassword: string; newPassword: string }) =>
  api<{ ok: boolean; user: AuthUser }>("/auth/change-password", { method: "POST", body: JSON.stringify(payload) });
export const getRoles = () => api<{ ok: boolean; roles: RoleApp[] }>("/roles");
export const getUsers = () => api<{ ok: boolean; users: UserApp[] }>("/users");
export const getAuditLogs = (params: {
  search?: string;
  entityType?: string;
  action?: string;
  entityId?: string;
  user?: string;
  ip?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
} = {}) => {
  const search = new URLSearchParams();
  if (params.search) search.set("search", params.search);
  if (params.entityType && params.entityType !== "todos") search.set("entityType", params.entityType);
  if (params.action && params.action !== "todas") search.set("action", params.action);
  if (params.entityId) search.set("entityId", params.entityId);
  if (params.user) search.set("user", params.user);
  if (params.ip) search.set("ip", params.ip);
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);
  if (params.limit) search.set("limit", String(params.limit));
  const queryString = search.toString();
  return api<{ ok: boolean; logs: AuditLogApp[] }>(`/audit-logs${queryString ? `?${queryString}` : ""}`);
};
export const registerAuditEvidence = (payload: {
  action: "copy" | "export";
  auditLogId?: number;
  origin?: string;
  format?: string;
  totalEventos?: number;
  filters?: Record<string, unknown>;
  justification?: string;
}) => api<{ ok: boolean }>("/audit-logs/evidence", { method: "POST", body: JSON.stringify(payload) });
export const saveUser = (payload: { id?: string; nome: string; email: string; status: UserApp["status"]; perfilCodigos: string[] }) =>
  api<{ ok: boolean; user: UserApp; temporaryPassword?: string }>("/users", { method: "POST", body: JSON.stringify(payload) });
export const resetUserPassword = (id: string) =>
  api<{ ok: boolean; temporaryPassword: string }>(`/users/${id}/reset-password`, { method: "POST" });
export const saveClient = (payload: Partial<Cliente>) => api("/clients", { method: "POST", body: JSON.stringify(payload) });
export const saveService = (payload: Partial<ServicoCatalogo>) => api("/services", { method: "POST", body: JSON.stringify(payload) });
export const getStockProducts = () => api<{ ok: boolean; products: ProdutoEstoqueApp[] }>("/stock/products");
export const saveStockProduct = (payload: Partial<ProdutoEstoqueApp>) => api<{ ok: boolean; id: string }>("/stock/products", { method: "POST", body: JSON.stringify(payload) });
export const createStockMovement = (payload: {
  produtoId: string;
  tipo: ProdutoEstoqueApp["movimentos"][number]["tipo"];
  quantidade: number;
  osId?: string;
  servicoId?: string;
  observacao?: string;
}) => api<{ ok: boolean; movement: { id: string; saldoPosterior: number } }>("/stock/movements", { method: "POST", body: JSON.stringify(payload) });
export interface StockReportMovement {
  id: string;
  produtoId: string;
  codigo: string;
  produtoNome: string;
  unidade: string;
  tipo: ProdutoEstoqueApp["movimentos"][number]["tipo"];
  quantidade: number;
  saldoAnterior: number;
  saldoPosterior: number;
  osId?: string | null;
  osNumero?: string | null;
  servicoId?: string | null;
  servicoNome?: string | null;
  observacao?: string | null;
  criadoEm?: string;
}
export const getStockReport = (params: { dateFrom?: string; dateTo?: string; productId?: string; osId?: string } = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => value && search.set(key, value));
  const queryString = search.toString();
  return api<{
    ok: boolean;
    filters: Record<string, string | null>;
    movements: StockReportMovement[];
    summary: Array<{ produtoId: string; produtoNome: string; unidade: string; entradas: number; saidas: number; ajustes: number; perdas: number; devolucoes: number; movimentos: number }>;
  }>(`/stock/report${queryString ? `?${queryString}` : ""}`);
};
export const uploadServicePopFile = (id: string, payload: { fileName: string; mimeType: string; contentBase64: string }) => api<{
  ok: boolean;
  attachment: { id: string; fileName: string; mimeType: string; bytes: number; hashSha256: string; popId: string };
}>(`/services/${encodeURIComponent(id)}/pop-file`, { method: "POST", body: JSON.stringify(payload) });
export const saveTechnician = (payload: Partial<Tecnico>) => api("/technicians", { method: "POST", body: JSON.stringify(payload) });
export const saveVehicle = (payload: Partial<Veiculo>) => api("/vehicles", { method: "POST", body: JSON.stringify(payload) });
export const saveAllocation = (payload: Partial<AlocacaoSemanal>) => api("/allocations", { method: "POST", body: JSON.stringify(payload) });
export const saveCompanyConfig = (payload: EmpresaConfig) => api("/company-config", { method: "PATCH", body: JSON.stringify(payload) });
export const saveNumberingConfig = (payload: NumeracaoConfig) => api("/numbering-config", { method: "PATCH", body: JSON.stringify(payload) });
export const saveContractTemplate = (payload: Partial<ContratoTemplate>) => api<{
  ok: boolean;
  id: string;
  operationalSync?: { created: number; updated: number; disabled: number; skipped: boolean };
}>("/contract-templates", { method: "POST", body: JSON.stringify(payload) });
export const generateContractFromProposal = (id: string) => api<{
  ok: boolean;
  id: string;
  numero: string;
  operationalSync?: { created: number; updated: number; disabled: number; skipped: boolean };
}>(`/contract-templates/${id}/generate-contract`, { method: "POST" });
export const generateMinutaFromProposal = (id: string) => api<{
  ok: boolean;
  id: string;
  numero: string;
}>(`/contract-templates/${id}/generate-minuta`, { method: "POST" });
export const issueContractTemplateDocument = (id: string) => api<{
  ok: boolean;
  snapshotHashSha256: string | null;
  attachment: Pick<EvidenciaAnexoApp, "id" | "hashSha256" | "snapshotHashSha256" | "templateCodigo" | "templateVersao" | "storageProvider">;
}>(`/contract-templates/${id}/issue-document`, { method: "POST" });
export const uploadContractTemplateSourceFile = (id: string, payload: { fileName: string; mimeType: string; contentBase64: string }) => api<{
  ok: boolean;
  attachment: { id: string; fileName: string; mimeType: string; bytes: number; hashSha256: string };
}>(`/contract-templates/${id}/source-file`, { method: "POST", body: JSON.stringify(payload) });
export const generateProposalFromPdf = (
  payload: { fileName: string; mimeType: string; contentBase64: string },
  signal?: AbortSignal,
) => api<{
  ok: boolean;
  draft: ProposalAssistDraft;
  meta: { fileName: string; bytes: number; model: string; arquivoTemporario: boolean };
}>("/contract-templates/proposal-assist", { method: "POST", body: JSON.stringify(payload), signal });
export const saveSchedule = (payload: Partial<AgendamentoApp>) => api("/agendamentos", { method: "POST", body: JSON.stringify(payload) });
export const updateSchedule = (id: string, payload: Partial<AgendamentoApp>) => api(`/agendamentos/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const generateOrderFromSchedule = (id: string, tecnicoNome: string) => api(`/agendamentos/${id}/gerar-os`, { method: "POST", body: JSON.stringify({ tecnicoNome }) });
export const updateOrder = (id: string, payload: Partial<OSApp>) => api(`/orders/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const closeOrder = (id: string, payload: { dataExecucao: string; quantidade: number; tagEquipamentoServico?: string; fotos: string[]; checklistRespostas?: OSApp["checklistRespostas"]; naoExecutada?: boolean; motivoNaoExecucao?: string; produtosUtilizados?: Array<{ produtoId: string; quantidade: number }> }) =>
  api<{ ok: boolean; certificateHash?: string; certificateHashes?: string[] }>(`/orders/${id}/encerrar`, { method: "POST", body: JSON.stringify(payload) });
export const generateCertificateForOrder = (id: string) => api<{ ok: boolean; hash: string; hashes?: string[] }>(`/orders/${id}/certificado`, { method: "POST" });
export const revokeCertificate = (id: string, motivo: string) => api<{ ok: boolean; id: string; status: "revogado" }>(`/certificates/${encodeURIComponent(id)}/revoke`, { method: "PATCH", body: JSON.stringify({ motivo }) });
export const reissueCertificate = (id: string, motivo: string) => api<{ ok: boolean; oldId: string; replacementId: string; hash: string; hashes?: string[] }>(`/certificates/${encodeURIComponent(id)}/reissue`, { method: "POST", body: JSON.stringify({ motivo }) });
export const getCertificateVerification = (hash: string) =>
  api<{ ok: boolean; certificate: CertificateVerification; verifiedAt: string }>(`/certificates/${encodeURIComponent(hash)}`);
export const updateRecurrenceSuggestion = (id: string, action: "confirm" | "dismiss") =>
  api(`/recurrence-suggestions/${id}`, { method: "PATCH", body: JSON.stringify({ action }) });
export const generateMeasurement = (payload: { clienteNome: string; dataInicio: string; dataFim: string }) =>
  api<{ ok: boolean; measurement: MedicaoApp }>("/measurements/generate", { method: "POST", body: JSON.stringify(payload) });
export const updateMeasurementFinancial = (id: string, payload: {
  financeiroStatus: MedicaoFinanceiroStatus;
  nfNumero?: string | null;
  nfEnviadaEm?: string | null;
  pagamentoPrevistoEm?: string | null;
  pagoNoErpEm?: string | null;
  financeiroObservacao?: string | null;
}) =>
  api<{ ok: boolean; financeiroStatus: MedicaoFinanceiroStatus }>(`/measurements/${id}/financial`, { method: "PATCH", body: JSON.stringify(payload) });
export const cancelMeasurement = (id: string) =>
  api<{ ok: boolean }>(`/measurements/${id}/cancel`, { method: "PATCH" });
