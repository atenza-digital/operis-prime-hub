import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, CalendarPlus, ClipboardCheck,
  History, Receipt, Award, Briefcase, Users, Menu, X, ClipboardList
} from "lucide-react";
import { useState } from "react";
import logoCiperprag from "@/assets/logo_ciperprag.png";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agendar", label: "Agendamentos", icon: CalendarPlus },
  { to: "/ordens",      label: "Ordens de Serviço", icon: ClipboardList },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/medicao", label: "Medição", icon: Receipt },
  { to: "/certificados", label: "Certificados", icon: Award },
  { to: "/equipes", label: "Equipes", icon: Users },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-50 border-b bg-[hsl(var(--surface-dark))] text-[hsl(var(--surface-dark-foreground))] print:hidden">
        <div className="container flex h-14 items-center gap-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={logoCiperprag} alt="Ciperprag" className="h-8 w-auto object-contain brightness-0 invert" />
            <span className="font-bold text-base tracking-tight hidden sm:inline text-white">Ciperprag</span>
            <span className="text-[11px] text-white/50 hidden md:inline">Hub Operacional</span>
          </Link>

          {/* Nav — desktop */}
          <nav className="hidden lg:flex items-center gap-0.5 ml-auto">
            {navItems.map(({ to, label, icon: Icon }) => {
              const active = pathname === to;
              return (
                <Link key={to} to={to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    active ? "bg-primary text-white" : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}>
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
            <Link to="/comercial/clientes"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-white/50 hover:text-white hover:bg-white/10 ml-2 border-l border-white/20 pl-4 whitespace-nowrap">
              <Briefcase className="h-4 w-4" />
              <span>Comercial</span>
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button className="lg:hidden ml-auto p-2 text-white/70 hover:text-white"
            onClick={() => setMobileOpen(v => !v)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-white/10 bg-[hsl(var(--surface-dark))]">
            <nav className="container py-3 flex flex-col gap-1">
              {navItems.map(({ to, label, icon: Icon }) => {
                const active = pathname === to;
                return (
                  <Link key={to} to={to} onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      active ? "bg-primary text-white" : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}>
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
              <Link to="/comercial/clientes" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-white/50 hover:text-white hover:bg-white/10 mt-2 border-t border-white/10 pt-3">
                <Briefcase className="h-4 w-4" />
                Comercial
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main className="container py-6">{children}</main>
    </div>
  );
}
