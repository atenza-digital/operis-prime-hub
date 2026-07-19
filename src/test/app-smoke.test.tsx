import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";

const mockUser = {
  id: "user-1",
  nome: "Admin Atenza",
  email: "admin@atenza.digital",
  status: "ativo",
  senhaTemporaria: false,
  tenant: {
    id: "tenant-1",
    slug: "homologacao",
    nome: "Homologacao",
  },
  perfis: [{ codigo: "admin_empresa", nome: "Administrador" }],
  permissoes: [
    "dashboard.view",
    "agenda.manage",
    "os.manage",
    "os.close",
    "certificados.manage",
    "medicoes.manage",
    "equipes.manage",
    "usuarios.manage",
    "auditoria.view",
    "clientes.manage",
    "servicos.manage",
    "contratos.manage",
    "configuracoes.manage",
  ],
};

const bootstrap = {
  companyConfig: null,
  numberingConfig: null,
  clients: [],
  services: [],
  contracts: [],
  schedules: [],
  orders: [],
  certificates: [],
  technicians: [],
  vehicles: [],
  allocations: [],
  contractTemplates: [],
  recurrenceSuggestions: [],
  measurements: [],
  attachments: [],
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockApi() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/api/auth/me")) return jsonResponse({ ok: true, user: mockUser });
    if (url.endsWith("/api/bootstrap")) return jsonResponse(bootstrap);
    if (url.includes("/api/audit-logs")) return jsonResponse({ ok: true, logs: [] });
    return jsonResponse({ error: `Endpoint nao mockado: ${url}` }, 404);
  });
}

function renderAt(path: string, token?: string) {
  window.history.pushState({}, "", path);
  localStorage.clear();
  if (token) localStorage.setItem("atenza_fieldops_auth_token", token);
  return render(<App />);
}

describe("app smoke routes", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockApi());
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
    window.history.pushState({}, "", "/");
  });

  it("renderiza a rota publica de login", async () => {
    renderAt("/login");

    expect(await screen.findByRole("heading", { name: /entrar na plataforma/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
  });

  it("redireciona rota protegida sem sessao para login", async () => {
    renderAt("/auditoria-eventos");

    expect(await screen.findByRole("heading", { name: /entrar na plataforma/i })).toBeInTheDocument();
  });

  it("renderiza dashboard autenticado com bootstrap mockado", async () => {
    renderAt("/", "token-teste");

    expect(await screen.findByText(/painel de operação/i, {}, { timeout: 5000 })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/contratos ativos/i)).toBeInTheDocument());
  });

  it.each([
    ["/agendar", /agendamentos/i],
    ["/ordens", /ordens de serviço/i],
    ["/relatorios-tecnicos", /relatórios técnicos/i],
    ["/certificados", /certificados e histórico/i],
    ["/medicao", /medição/i],
    ["/auditoria-eventos", /eventos de auditoria/i],
    ["/comercial/clientes", /^clientes$/i],
    ["/comercial/servicos", /^serviços$/i],
    ["/comercial/contratos", /contratos e propostas/i],
  ])("renderiza rota autenticada %s", async (path, title) => {
    renderAt(path, "token-teste");

    const headings = await screen.findAllByRole("heading", { name: title }, { timeout: 5000 });
    expect(headings.length).toBeGreaterThan(0);
  }, 12000);
});
