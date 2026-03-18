import { Link, useLocation } from "react-router-dom";
import { Users, Briefcase, FileSignature, ArrowLeft } from "lucide-react";

const navItems = [
  { to: "/comercial/clientes", label: "Clientes", icon: Users },
  { to: "/comercial/servicos", label: "Serviços", icon: Briefcase },
  { to: "/comercial/contratos", label: "Contratos / Propostas", icon: FileSignature },
];

export default function ComercialLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-surface-dark text-surface-dark-foreground print:hidden">
        <div className="container flex h-14 items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center font-bold text-primary-foreground text-sm">
              CP
            </div>
            <span className="font-bold text-lg tracking-tight hidden sm:inline">Ciperprag</span>
            <span className="text-xs text-muted-foreground hidden md:inline ml-1 bg-primary/20 text-primary-foreground px-2 py-0.5 rounded-full">Comercial</span>
          </div>

          <nav className="flex items-center gap-1 ml-auto overflow-x-auto">
            {navItems.map(({ to, label, icon: Icon }) => {
              const active = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-surface-dark-foreground/70 hover:text-surface-dark-foreground hover:bg-surface-dark-foreground/10"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-surface-dark-foreground/50 hover:text-surface-dark-foreground hover:bg-surface-dark-foreground/10 ml-2 border-l border-surface-dark-foreground/20 pl-4"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Operacional</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="container py-6">{children}</main>
    </div>
  );
}
