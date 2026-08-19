import { Link, Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function ProtectedRoute({ children, permission }: { children: React.ReactNode; permission?: string }) {
  const { user, loading, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <div className="flex items-center gap-3 rounded-2xl border bg-card px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm font-medium">Verificando sessão...</span>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.senhaTemporaria && location.pathname !== "/alterar-senha") return <Navigate to="/alterar-senha" replace />;
  if (permission && !hasPermission(permission)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Acesso restrito</p>
          <h1 className="mt-2 text-xl font-bold text-slate-900">Você não tem permissão para acessar esta tela.</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Solicite ao administrador do tenant a liberação do perfil adequado e tente novamente.</p>
          <Link className="mt-6 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700" to="/">
            Voltar ao dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
