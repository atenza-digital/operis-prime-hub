import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, CalendarPlus, ClipboardCheck, FileCheck2 } from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agendar", label: "Agendamento", icon: CalendarPlus },
  { to: "/os-finalizar", label: "Encerrar OS", icon: ClipboardCheck },
  { to: "/visualizar", label: "Certificado", icon: FileCheck2 },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b bg-surface-dark text-surface-dark-foreground">
        <div className="container flex h-14 items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center font-bold text-primary-foreground text-sm">
              CP
            </div>
            <span className="font-bold text-lg tracking-tight hidden sm:inline">Ciperprag</span>
            <span className="text-xs text-muted-foreground hidden md:inline ml-1">Hub de Operações</span>
          </div>

          <nav className="flex items-center gap-1 ml-auto">
            {navItems.map(({ to, label, icon: Icon }) => {
              const active = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
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
          </nav>
        </div>
      </header>

      <main className="container py-6">{children}</main>
    </div>
  );
}
