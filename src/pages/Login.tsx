import { FormEvent, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import logoCiperprag from "@/assets/logo_ciperprag.png";
import { EnvironmentBadge } from "@/components/EnvironmentBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { APP_VERSION_LABEL } from "@/lib/version";

export default function Login() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/";

  if (user) return <Navigate to={from} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Não foi possível entrar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#07110d] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(38,166,102,0.25),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.10),transparent_22%),linear-gradient(135deg,rgba(2,6,4,1),rgba(11,31,22,1))]" />
      <div className="relative grid min-h-screen lg:grid-cols-[1fr_500px]">
        <section className="flex flex-col justify-between p-6 sm:p-10">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white px-4 py-3 shadow-2xl shadow-black/30">
              <img src={logoCiperprag} alt="Ciperprag Serviços" className="h-11 w-56 object-contain" />
            </div>
            <EnvironmentBadge />
          </div>

          <div className="max-w-3xl py-16">
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.28em] text-emerald-300">Operação protegida</p>
            <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
              Acesse o hub para gerenciar agendas, OS e certificados.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/68">
              Ambiente de homologação para validação dos fluxos operacionais antes da publicação em produção.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-white/45">
            <span>{APP_VERSION_LABEL}</span>
            <span className="h-1 w-1 rounded-full bg-white/30" />
            <span>Plataforma Atenza</span>
          </div>
        </section>

        <section className="flex items-center justify-center border-l border-white/10 bg-white/8 p-6 backdrop-blur-xl">
          <Card className="w-full max-w-md border-white/12 bg-white text-foreground shadow-2xl">
            <CardHeader className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <LockKeyhole className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Entrar na plataforma</CardTitle>
                <CardDescription>Use seu e-mail e senha cadastrados.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="seuemail@empresa.com.br"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>

                {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

                <Button className="h-11 w-full rounded-xl" disabled={submitting} type="submit">
                  {submitting ? "Entrando..." : "Entrar"}
                </Button>
              </form>

              <div className="mt-5 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Você está em homologação. Use este ambiente apenas para testes e validação.</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
