import { Suspense, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Award,
  BriefcaseBusiness,
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileSearch,
  FileText,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import { EnvironmentBadge } from "@/components/EnvironmentBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { APP_VERSION, APP_VERSION_LABEL, PRODUCT_NAME } from "@/lib/version";

const navGroups = [
  {
    label: "Início",
    description: "Visão executiva",
    icon: LayoutDashboard,
    items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard.view" }],
  },
  {
    label: "Comercial",
    description: "Clientes, serviços, propostas e contratos",
    icon: BriefcaseBusiness,
    items: [
      { to: "/comercial/clientes", label: "Clientes", icon: Users, permission: "clientes.manage" },
      { to: "/comercial/servicos", label: "Serviços", icon: ClipboardList, permission: "servicos.manage" },
      { to: "/comercial/produtos", label: "Produtos e estoque", icon: Package, permission: "estoque.manage" },
      { to: "/comercial/contratos", label: "Contratos e Propostas", icon: BriefcaseBusiness, permission: "contratos.manage" },
      { to: "/comercial/configuracoes", label: "Parâmetros do tenant", icon: Settings, permission: "configuracoes.manage" },
    ],
  },
  {
    label: "Operacional",
    description: "Agendamentos, OS, evidências e certificados",
    icon: CalendarPlus,
    items: [
      { to: "/agendar", label: "Agendamentos", icon: CalendarPlus, permission: "agenda.manage" },
      { to: "/ordens", label: "Ordens de serviço", icon: ClipboardList, permission: "os.manage" },
      { to: "/relatorios-tecnicos", label: "Relatórios técnicos", icon: FileText, permission: "os.manage" },
      { to: "/certificados", label: "Certificados e histórico", icon: Award, permission: "certificados.manage" },
      { to: "/equipes", label: "Equipes e veículos", icon: CalendarDays, permission: "equipes.manage" },
      { to: "/auditoria-anexos", label: "Auditoria de anexos", icon: FileSearch, permission: "os.manage" },
    ],
  },
  {
    label: "Financeiro",
    description: "Medições e acompanhamento de NF",
    icon: Receipt,
    items: [{ to: "/medicao", label: "Medição", icon: Receipt, permission: "medicoes.manage" }],
  },
  {
    label: "Administração",
    description: "Usuários, perfis e auditoria",
    icon: ShieldCheck,
    items: [
      { to: "/usuarios", label: "Usuários e perfis", icon: Users, permission: "usuarios.manage" },
      { to: "/auditoria-eventos", label: "Eventos de auditoria", icon: ShieldCheck, permission: "auditoria.view" },
    ],
  },
];

const routeMeta: Record<string, { section: string; title: string; description: string }> = {
  "/": { section: "Início", title: "Dashboard", description: "Prioridades, agenda, OS, certificados e medições em uma visão única." },
  "/agendar": { section: "Operacional", title: "Agendamentos", description: "Planeje visitas, equipe, veículo, local e continuidade do fluxo de campo." },
  "/ordens": { section: "Operacional", title: "Ordens de serviço", description: "Gere, imprima, acompanhe e encerre as OS da equipe de campo." },
  "/os-finalizar": { section: "Operacional", title: "Ordens de serviço", description: "Finalize serviços, registre evidências e libere certificados quando aplicável." },
  "/relatorios-tecnicos": { section: "Operacional", title: "Relatórios técnicos", description: "Emita relatórios técnicos a partir de OS encerradas, evidências e checklist de campo." },
  "/certificados": { section: "Operacional", title: "Certificados e histórico", description: "Consulte serviços executados, certificados emitidos e validação pública." },
  "/historico": { section: "Operacional", title: "Histórico", description: "Consulte serviços executados e documentos gerados para o cliente." },
  "/medicao": { section: "Financeiro", title: "Medição", description: "Consolide OS executadas e acompanhe NF, cobrança, pagamento e baixa no ERP." },
  "/auditoria-anexos": { section: "Operacional", title: "Auditoria de anexos", description: "Rastreie evidências, documentos históricos, hashes e downloads seguros." },
  "/equipes": { section: "Operacional", title: "Equipes e veículos", description: "Cadastre técnicos, veículos e dados de apoio da equipe de campo." },
  "/comercial/clientes": { section: "Comercial", title: "Clientes", description: "Cadastros, contatos, locais e equipamentos atendidos." },
  "/comercial/servicos": { section: "Comercial", title: "Serviços", description: "Catálogo técnico que alimenta propostas, contratos, OS e certificados." },
  "/comercial/produtos": { section: "Comercial", title: "Produtos e estoque", description: "Cadastre insumos, acompanhe saldo e registre entradas e saídas vinculadas à operação." },
  "/comercial/contratos": { section: "Comercial", title: "Contratos e Propostas", description: "Da proposta aprovada ao contrato operacional disponível para agenda." },
  "/comercial/configuracoes": { section: "Comercial", title: "Parâmetros do tenant", description: "Identidade visual, numeração, assinaturas e dados documentais." },
  "/usuarios": { section: "Administração", title: "Usuários e perfis", description: "Gerencie contas, papéis, permissões e reset de senha." },
  "/auditoria-eventos": { section: "Administração", title: "Eventos de auditoria", description: "Consulte ações sensíveis, origem dos acessos e trilha de alterações." },
  "/alterar-senha": { section: "Conta", title: "Alterar senha", description: "Atualize sua senha de acesso à plataforma." },
};

function getActiveGroup(pathname: string) {
  return navGroups.find((group) => group.items.some((item) => pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to))))?.label ?? "Início";
}

function getInitials(name?: string) {
  return (name || "Usuário")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function AppPageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl space-y-3" aria-live="polite" aria-busy="true">
        <div className="h-8 w-2/5 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-3/5 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl border bg-card/70" />
      </div>
    </div>
  );
}

function NavLink({
  to,
  label,
  icon: Icon,
  collapsed,
  onClick,
}: {
  to: string;
  label: string;
  icon: React.ElementType;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  const { pathname } = useLocation();
  const isActive = pathname === to || (to !== "/" && pathname.startsWith(to));

  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "group relative flex items-center rounded-xl text-sm font-semibold transition-all duration-150",
        collapsed ? "mx-auto h-11 w-11 justify-center" : "gap-3 px-3 py-2.5",
        isActive
          ? "bg-primary text-primary-foreground shadow-[0_14px_32px_-18px_rgba(21,128,61,0.95)]"
          : "text-white/90 hover:bg-white/10 hover:text-white",
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary-foreground" : "text-white/75 group-hover:text-white")} />
      {!collapsed ? <span className="truncate">{label}</span> : null}
      {collapsed ? (
        <div className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          {label}
        </div>
      ) : null}
    </Link>
  );
}

function SidebarContent({ collapsed = false, onLinkClick }: { collapsed?: boolean; onLinkClick?: () => void }) {
  const { hasPermission } = useAuth();
  const { pathname } = useLocation();
  const activeGroup = getActiveGroup(pathname);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(["Início", activeGroup]));

  const visibleGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => hasPermission(item.permission)) }))
    .filter((group) => group.items.length > 0);

  useEffect(() => {
    setOpenGroups((current) => {
      const next = new Set(current);
      next.add(activeGroup);
      return next;
    });
  }, [activeGroup]);

  const toggleGroup = (label: string) => {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  if (collapsed) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <nav className="scrollbar-dark flex-1 space-y-2 overflow-y-auto px-2 py-4">
          {visibleGroups.map((group) => {
            const GroupIcon = group.icon;
            const isActive = group.label === activeGroup;

            return (
              <button
                key={group.label}
                type="button"
                onClick={() => toggleGroup(group.label)}
                className={cn(
                  "group relative mx-auto flex h-11 w-11 items-center justify-center rounded-2xl transition-all",
                  isActive ? "bg-primary text-primary-foreground shadow-[0_14px_32px_-18px_rgba(21,128,61,0.95)]" : "text-white/75 hover:bg-white/10 hover:text-white",
                )}
                title={group.label}
              >
                <GroupIcon className="h-4 w-4" />
                <div className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  {group.label}
                </div>
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav className="scrollbar-dark flex-1 space-y-2 overflow-y-auto px-3 py-4">
        {visibleGroups.map((group) => {
          const GroupIcon = group.icon;
          const isOpen = openGroups.has(group.label);
          const isActive = group.label === activeGroup;

          return (
            <Collapsible key={group.label} open={isOpen} onOpenChange={() => toggleGroup(group.label)}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all",
                    isActive ? "bg-white/[0.08] text-white ring-1 ring-white/10" : "text-white/90 hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", isActive ? "bg-primary text-primary-foreground" : "bg-white/[0.06] text-white/75")}>
                    <GroupIcon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-bold uppercase tracking-[0.2em]">{group.label}</span>
                    <span className="mt-0.5 block truncate text-[11px] font-medium text-white/60">{group.description}</span>
                  </span>
                  {isOpen ? <ChevronDown className="h-4 w-4 text-white/60" /> : <ChevronRight className="h-4 w-4 text-white/60" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-1 pl-2">
                {group.items.map((item) => (
                  <NavLink key={item.to} {...item} onClick={onLinkClick} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </nav>

      <div className="mx-3 mb-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">Sobre</p>
        <p className="mt-1 text-sm font-semibold text-white">Plataforma Atenza</p>
        <p className="mt-1 text-xs leading-5 text-white/60">
          {PRODUCT_NAME} · {APP_VERSION_LABEL}
        </p>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const currentMeta = useMemo(() => routeMeta[location.pathname] ?? routeMeta["/"], [location.pathname]);
  const tenantLogoSrc = user?.tenant.logoInterfaceUrl || user?.tenant.logoUrl || "";
  const tenantIconSrc = user?.tenant.brandIconUrl || "/favicon.png";
  const tenantLogoAlt = user?.tenant.nome ? `Logo ${user.tenant.nome}` : "Logo do tenant";
  const firstName = user?.nome?.split(" ")[0] || "usuário";
  const initials = getInitials(user?.nome);
  const today = useMemo(() => new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }), []);

  return (
    <div className="flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top_right,_rgba(22,163,74,0.10),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,247,245,0.96))]">
      <aside
        className={cn(
          "hidden shrink-0 border-r border-white/10 bg-[#050807] transition-all duration-300 lg:flex lg:flex-col print:hidden",
          collapsed ? "w-[76px]" : "w-[276px]",
        )}
      >
        <div className={cn("flex min-h-[92px] items-center border-b border-white/10", collapsed ? "justify-center px-2" : "justify-between gap-3 px-4")}>
          {collapsed || tenantLogoSrc ? (
            <img
              src={collapsed ? tenantIconSrc : tenantLogoSrc}
              alt={tenantLogoAlt}
              className={cn("object-contain drop-shadow-sm", collapsed ? "h-10 w-10 rounded-full" : "max-h-12 w-[188px]")}
            />
          ) : (
            <div className="min-w-0 rounded-2xl border border-white/10 px-3 py-2">
              <p className="truncate text-sm font-black text-white">{user?.tenant.nome || PRODUCT_NAME}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">Tenant</p>
            </div>
          )}
          {!collapsed ? (
            <button
              onClick={() => setCollapsed(true)}
              className="rounded-xl border border-white/10 p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              title="Recolher menu"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="mx-auto mt-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            title="Expandir menu"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        ) : null}

        <SidebarContent collapsed={collapsed} />

        <div className="border-t border-white/10 p-3">
          <button
            onClick={() => logout()}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed ? <span>Sair</span> : null}
          </button>
          {collapsed ? <p className="mt-2 text-center text-[10px] font-semibold text-white/50">v{APP_VERSION}</p> : null}
        </div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden print:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 flex w-[286px] flex-col border-r border-white/10 bg-[#050807]">
            <div className="flex min-h-[92px] items-center justify-between gap-3 border-b border-white/10 px-4">
              <img src={tenantLogoSrc} alt={tenantLogoAlt} className="max-h-12 w-[188px] object-contain" />
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarContent onLinkClick={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-xl print:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
            <button className="rounded-xl border border-border/80 bg-card p-2 text-muted-foreground transition-colors hover:bg-muted lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="sr-only">{currentMeta.title}</h1>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-primary/70">
                <span>{currentMeta.section}</span>
                <span className="h-1 w-1 rounded-full bg-primary/40" />
                <span>{currentMeta.title}</span>
              </div>
              <p className="truncate text-sm text-muted-foreground">{currentMeta.description}</p>
            </div>

            <EnvironmentBadge className="hidden md:inline-flex" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-full border border-transparent p-1.5 transition-colors hover:border-primary/20 hover:bg-primary/5">
                  <div className="hidden text-right md:block">
                    <p className="text-sm font-semibold text-foreground">Olá, {firstName}</p>
                    <p className="text-xs capitalize text-muted-foreground">{today}</p>
                  </div>
                  <Avatar className="h-10 w-10 border border-primary/20 bg-primary/10 text-primary">
                    <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">{initials}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <span className="block truncate text-sm">{user?.nome}</span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">{user?.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <UserCircle className="mr-2 h-4 w-4" />
                  Minha conta
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/alterar-senha">
                    <KeyRound className="mr-2 h-4 w-4" />
                    Alterar senha
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="scrollbar-light flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
            <Suspense fallback={<AppPageFallback />}>{children}</Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
