import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { EnvironmentBadge } from "@/components/EnvironmentBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { changePassword } from "@/lib/api";
import { APP_VERSION_LABEL, PRODUCT_NAME } from "@/lib/version";

export default function AlterarSenha() {
  const { user, loading, setAuthenticatedUser, logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Carregando sessão...</div>;
  }

  if (!user) return <Navigate to="/login" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 8) {
      toast.error("A nova senha deve ter pelo menos 8 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("A confirmação não confere com a nova senha");
      return;
    }

    setSubmitting(true);
    try {
      const response = await changePassword({ currentPassword, newPassword });
      setAuthenticatedUser(response.user);
      toast.success("Senha alterada com sucesso");
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao alterar senha");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.22),_transparent_30%),linear-gradient(135deg,#07110d,#10251a)] p-6 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl flex-col">
        <header className="flex items-center justify-between gap-4">
          {user.tenant.logoInterfaceUrl || user.tenant.logoUrl ? (
            <div className="rounded-2xl bg-white px-4 py-3 shadow-2xl shadow-black/25">
              <img src={user.tenant.logoInterfaceUrl || user.tenant.logoUrl} alt={`Logo ${user.tenant.nome || "do tenant"}`} className="h-10 w-52 object-contain" />
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 shadow-2xl shadow-black/25">
              <p className="text-lg font-black">{PRODUCT_NAME}</p>
            </div>
          )}
          <EnvironmentBadge />
        </header>

        <section className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1fr_420px]">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.28em] text-amber-200">Segurança da conta</p>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Defina uma nova senha para continuar.</h1>
            <p className="mt-5 text-lg leading-8 text-white/70">
              Sua conta recebeu uma senha temporária. Por segurança, troque a senha antes de acessar os módulos da plataforma.
            </p>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/50">
              <ShieldCheck className="h-4 w-4" />
              {APP_VERSION_LABEL}
            </div>
          </div>

          <Card className="border-white/12 bg-white text-foreground shadow-2xl">
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <KeyRound className="h-6 w-6" />
              </div>
              <CardTitle>Alterar senha</CardTitle>
              <CardDescription>Usuário: {user.email}</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Senha temporária/atual</Label>
                  <Input id="currentPassword" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova senha</Label>
                  <Input id="newPassword" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                  <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
                </div>

                <Button className="h-11 w-full rounded-xl" disabled={submitting} type="submit">
                  {submitting ? "Alterando..." : "Salvar nova senha"}
                </Button>

                {!user.senhaTemporaria ? (
                  <Button className="w-full" type="button" variant="ghost" onClick={() => navigate("/")}>
                    Voltar ao sistema
                  </Button>
                ) : (
                  <Button className="w-full" type="button" variant="ghost" onClick={() => logout()}>
                    Sair
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
