import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Briefcase, FileSignature, LogOut, Settings, Users } from "lucide-react";
import logoImg from "@/assets/logo_ciperprag.png";
import { EnvironmentBadge } from "@/components/EnvironmentBadge";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { APP_VERSION_LABEL, PRODUCT_NAME } from "@/lib/version";

const navItems = [
  { to: "/comercial/clientes", label: "Clientes", icon: Users, description: "Cadastros e contatos", permission: "clientes.manage" },
  { to: "/comercial/servicos", label: "Serviços", icon: Briefcase, description: "Portfólio e regras técnicas", permission: "servicos.manage" },
  { to: "/comercial/contratos", label: "Contratos", icon: FileSignature, description: "Propostas e vigências", permission: "contratos.manage" },
  { to: "/comercial/configuracoes", label: "Configurações", icon: Settings, description: "Empresa, logo e numeração", permission: "configuracoes.manage" },
];

const meta: Record<string, { title: string; description: string }> = {
  "/comercial/clientes": { title: "Clientes", description: "Organize cadastros, contatos e dados que alimentam os contratos." },
  "/comercial/servicos": { title: "Serviços", description: "Padronize o catálogo, as recorrências e os requisitos técnicos." },
  "/comercial/contratos": { title: "Contratos e Propostas", description: "Gerencie propostas, aprovações, valores e contratos vigentes." },
  "/comercial/configuracoes": { title: "Configurações", description: "Centralize identidade visual, dados da empresa e padrões operacionais." },
};

export default function ComercialLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { logout, hasPermission } = useAuth();
  const current = meta[pathname] ?? meta["/comercial/clientes"];
  const visibleNavItems = navItems.filter((item) => hasPermission(item.permission));

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_rgba(248,248,246,1),_rgba(243,245,242,1))]">
      <header className="sticky top-0 z-40 border-b bg-surface-dark text-surface-dark-foreground print:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <img src={logoImg} alt="Ciperprag" className="h-9 object-contain" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{PRODUCT_NAME}</p>
              <p className="truncate text-[10px] font-medium uppercase tracking-[0.16em] text-surface-dark-foreground/40">{APP_VERSION_LABEL}</p>
              <p className="truncate text-xs text-surface-dark-foreground/55">Hub Comercial · Origem dos dados operacionais</p>
            </div>
          </div>

          <EnvironmentBadge className="hidden lg:inline-flex" />

          <nav className="ml-auto hidden items-center gap-2 xl:flex">
            {visibleNavItems.map(({ to, label, icon: Icon }) => {
              const active = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-surface-dark-foreground/70 hover:bg-white/8 hover:text-surface-dark-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
            <Link
              to="/"
              className="ml-3 flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-surface-dark-foreground/70 transition-colors hover:bg-white/8 hover:text-surface-dark-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Operacional
            </Link>
            <button
              onClick={() => logout()}
              className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-surface-dark-foreground/70 transition-colors hover:bg-white/8 hover:text-surface-dark-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <PageHeader
          eyebrow="Comercial"
          title={current.title}
          description={current.description}
          crumbs={[
            { label: "Operacional", to: "/" },
            { label: "Comercial" },
            { label: current.title },
          ]}
        />

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {visibleNavItems.map(({ to, label, icon: Icon, description }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "rounded-lg border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md",
                  active ? "border-primary/40 shadow-sm ring-1 ring-primary/15" : "border-border/70",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("rounded-xl p-2", active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {children}
      </main>
    </div>
  );
}
