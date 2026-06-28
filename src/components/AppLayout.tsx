import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Award,
  CalendarDays,
  CalendarPlus,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Receipt,
  Settings,
  LogOut,
  Users,
  X,
} from "lucide-react";
import logoCiperprag from "@/assets/logo_ciperprag.png";
import { EnvironmentBadge } from "@/components/EnvironmentBadge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { APP_VERSION, APP_VERSION_LABEL } from "@/lib/version";

const navGroups = [
  {
    label: "Operacional",
    items: [
      { to: "/", label: "Dashboard", shortLabel: "Visão geral", icon: LayoutDashboard, permission: "dashboard.view" },
      { to: "/agendar", label: "Agendamentos", shortLabel: "Agenda", icon: CalendarPlus, permission: "agenda.manage" },
      { to: "/ordens", label: "Ordens de Serviço", shortLabel: "OS", icon: ClipboardList, permission: "os.manage" },
      { to: "/certificados", label: "Certificados e Histórico", shortLabel: "Certificados", icon: Award, permission: "certificados.manage" },
      { to: "/medicao", label: "Medição", shortLabel: "Medição", icon: Receipt, permission: "medicoes.manage" },
    ],
  },
  {
    label: "Equipes",
    items: [{ to: "/equipes", label: "Quadro Semanal", shortLabel: "Equipes", icon: CalendarDays, permission: "equipes.manage" }],
  },
  {
    label: "Comercial",
    items: [
      { to: "/comercial/clientes", label: "Clientes", shortLabel: "Clientes", icon: Users, permission: "clientes.manage" },
      { to: "/comercial/servicos", label: "Serviços", shortLabel: "Serviços", icon: ClipboardList, permission: "servicos.manage" },
      { to: "/comercial/contratos", label: "Contratos", shortLabel: "Contratos", icon: Receipt, permission: "contratos.manage" },
      { to: "/comercial/configuracoes", label: "Configurações", shortLabel: "Config.", icon: Settings, permission: "configuracoes.manage" },
    ],
  },
];

const routeMeta: Record<string, { section: string; title: string; description: string }> = {
  "/": { section: "Operacional", title: "Dashboard", description: "Acompanhe contratos, ordens e a saúde da operação em um único lugar." },
  "/agendar": { section: "Operacional", title: "Agendamentos", description: "Planeje visitas, designe equipe e inicie o fluxo de execução." },
  "/ordens": { section: "Operacional", title: "Ordens de Serviço", description: "Gerencie emissão, impressão, edição e encerramento das OS." },
  "/os-finalizar": { section: "Operacional", title: "Ordens de Serviço", description: "Finalize serviços e registre evidências de campo." },
  "/certificados": { section: "Operacional", title: "Certificados e Histórico", description: "Consulte certificados emitidos e o histórico completo dos serviços." },
  "/medicao": { section: "Operacional", title: "Medição", description: "Consolide OS encerradas em períodos faturáveis e gere a medição." },
  "/equipes": { section: "Equipes", title: "Quadro Semanal", description: "Visualize a alocação operacional de técnicos e veículos." },
};

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
  const isActive = pathname === to || (to !== "/" && pathname.startsWith(to.split("?")[0]));

  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-primary text-primary-foreground shadow-[0_12px_30px_-16px_rgba(21,128,61,0.9)]"
          : "text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-foreground",
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary-foreground" : "text-sidebar-foreground/80 group-hover:text-sidebar-foreground")} />
      {!collapsed ? <span className="truncate">{label}</span> : null}
      {collapsed ? (
        <div className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          {label}
        </div>
      ) : null}
    </Link>
  );
}

function SidebarContent({ collapsed = false, onLinkClick }: { collapsed?: boolean; onLinkClick?: () => void }) {
  const { hasPermission } = useAuth();
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasPermission(item.permission)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="flex h-full flex-col">
      <div className={cn("min-h-[92px] border-b border-sidebar-border px-4", collapsed ? "flex items-center justify-center px-2" : "flex items-center justify-center")}>
        <div className={cn("flex items-center justify-center rounded-2xl bg-white px-3 py-2 shadow-sm", collapsed ? "h-12 w-12 p-2" : "w-full max-w-[220px]")}>
          <img src={logoCiperprag} alt="Ciperprag" className={cn("object-contain", collapsed ? "h-8 w-8" : "h-10 w-full")} />
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4">
        {visibleGroups.map((group) => (
          <section key={group.label}>
            {!collapsed ? <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-sidebar-foreground/52">{group.label}</p> : <div className="mx-2 mb-2 border-t border-sidebar-border" />}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink key={item.to} {...item} collapsed={collapsed} onClick={onLinkClick} />
              ))}
            </div>
          </section>
        ))}
      </nav>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, logout, hasPermission } = useAuth();

  const currentMeta = useMemo(() => routeMeta[location.pathname] ?? routeMeta["/"], [location.pathname]);
  const topLinks = navGroups[0].items.filter((item) => hasPermission(item.permission)).slice(0, 5);

  return (
    <div className="flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top_right,_rgba(22,163,74,0.10),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,247,245,0.96))]">
      <aside
        className={cn(
          "hidden shrink-0 border-r border-sidebar-border bg-sidebar transition-all duration-300 lg:flex lg:flex-col print:hidden",
          collapsed ? "w-[72px]" : "w-[280px]",
        )}
      >
        <SidebarContent collapsed={collapsed} />
        <div className="border-t border-sidebar-border p-2">
          <div className={cn("px-3 pb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-sidebar-foreground/45", collapsed && "px-0 text-center")}>
            {collapsed ? `v${APP_VERSION}` : APP_VERSION_LABEL}
          </div>
          {!collapsed && user ? (
            <div className="mb-2 rounded-xl border border-sidebar-border bg-sidebar-accent/35 px-3 py-2">
              <p className="truncate text-xs font-semibold text-sidebar-foreground">{user.nome}</p>
              <p className="truncate text-[11px] text-sidebar-foreground/55">{user.email}</p>
            </div>
          ) : null}
          <button
            onClick={() => logout()}
            className="mb-1 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed ? <span>Sair</span> : null}
          </button>
          <button
            onClick={() => setCollapsed((value) => !value)}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <ChevronRight className={cn("h-4 w-4 transition-transform duration-300", !collapsed && "rotate-180")} />
            {!collapsed ? <span>Recolher menu</span> : null}
          </button>
        </div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden print:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 flex w-[280px] flex-col border-r border-sidebar-border bg-sidebar">
            <div className="flex min-h-[92px] items-center justify-between gap-3 border-b border-sidebar-border px-4">
              <div className="flex flex-1 items-center justify-center rounded-2xl bg-white px-3 py-2 shadow-sm">
                <img src={logoCiperprag} alt="Ciperprag" className="h-10 w-full object-contain" />
              </div>
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent onLinkClick={() => setMobileOpen(false)} />
            </div>
            {user ? (
              <div className="border-t border-sidebar-border px-4 py-3">
                <p className="truncate text-xs font-semibold text-sidebar-foreground">{user.nome}</p>
                <p className="truncate text-[11px] text-sidebar-foreground/55">{user.email}</p>
                <button onClick={() => logout()} className="mt-2 flex items-center gap-2 rounded-xl px-0 py-1 text-xs text-sidebar-foreground/70">
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            ) : null}
            <div className="border-t border-sidebar-border px-4 py-3 text-[10px] font-medium uppercase tracking-[0.16em] text-sidebar-foreground/45">
              {APP_VERSION_LABEL}
            </div>
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/88 backdrop-blur-xl print:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
            <button className="rounded-xl border border-border/80 bg-card p-2 text-muted-foreground transition-colors hover:bg-muted lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">
                <span>{currentMeta.section}</span>
                <span className="h-1 w-1 rounded-full bg-primary/40" />
                <span>{currentMeta.title}</span>
              </div>
              <p className="truncate text-sm text-muted-foreground">{currentMeta.description}</p>
            </div>

            <EnvironmentBadge className="hidden md:inline-flex" />

            <div className="hidden items-center gap-2 xl:flex">
              {topLinks.map((item) => {
                const active = location.pathname === item.to;
                return (
                  <Button key={item.to} asChild size="sm" variant={active ? "default" : "ghost"} className="rounded-full px-4">
                    <Link to={item.to}>{item.shortLabel}</Link>
                  </Button>
                );
              })}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
