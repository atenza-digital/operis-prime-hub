import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getBootstrap, type BootstrapData } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  Receipt,
  ShieldCheck,
} from "lucide-react";

type DashboardContract = BootstrapData["contracts"][number];

const CONTRACTS_PREVIEW_LIMIT = 6;

function fmtDate(date: string) {
  if (!date) return "—";
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
}

function statusBadge(status: string) {
  switch (status) {
    case "ativo":
      return <Badge className="bg-primary text-primary-foreground">Ativo</Badge>;
    case "vencido":
      return <Badge variant="destructive">Sem saldo / vencido</Badge>;
    default:
      return <Badge variant="secondary">Pendente</Badge>;
  }
}

function contractProgress(item: DashboardContract) {
  return item.contratado ? Math.min(100, Math.round((item.executado / item.contratado) * 100)) : 0;
}

function contractBalance(item: DashboardContract) {
  return item.contratado - item.executado;
}

function contractPriority(item: DashboardContract) {
  if (item.status === "vencido") return 0;
  if (item.status === "ativo" && contractBalance(item) <= 0) return 1;
  if (item.status === "ativo" && contractProgress(item) >= 80) return 2;
  if (item.status === "ativo") return 3;
  return 4;
}

export default function Dashboard() {
  const { user, hasPermission } = useAuth();
  const [data, setData] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllContracts, setShowAllContracts] = useState(false);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      setData(await getBootstrap());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar o dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const contratos = useMemo(() => data?.contracts ?? [], [data?.contracts]);
  const agendamentos = useMemo(() => data?.schedules ?? [], [data?.schedules]);
  const ordens = useMemo(() => data?.orders ?? [], [data?.orders]);
  const certificados = useMemo(() => data?.certificates ?? [], [data?.certificates]);
  const medicoes = useMemo(() => data?.measurements ?? [], [data?.measurements]);
  const propostasContratos = useMemo(() => data?.contractTemplates ?? [], [data?.contractTemplates]);
  const recorrencias = useMemo(
    () => (data?.recurrenceSuggestions ?? []).filter((item) => item.status === "pendente"),
    [data?.recurrenceSuggestions],
  );

  const ativos = contratos.filter((item) => item.status === "ativo").length;
  const vencidos = contratos.filter((item) => item.status === "vencido").length;
  const osAbertas = ordens.filter((item) => item.status === "aberta").length;
  const agendados = agendamentos.filter((item) => item.status === "agendado").length;
  const contratosPrioritarios = useMemo(
    () =>
      [...contratos].sort((a, b) => {
        const priorityDiff = contractPriority(a) - contractPriority(b);
        if (priorityDiff !== 0) return priorityDiff;
        const balanceDiff = contractBalance(a) - contractBalance(b);
        if (balanceDiff !== 0) return balanceDiff;
        return `${a.cliente} ${a.servico}`.localeCompare(`${b.cliente} ${b.servico}`, "pt-BR");
      }),
    [contratos],
  );
  const contratosVisiveis = showAllContracts ? contratosPrioritarios : contratosPrioritarios.slice(0, CONTRACTS_PREVIEW_LIMIT);

  const perfilAtual = useMemo(() => {
    const perfis = [];
    if (hasPermission("contratos.manage", "clientes.manage", "servicos.manage")) perfis.push("Comercial");
    if (hasPermission("agenda.manage", "os.manage")) perfis.push("Operacional");
    if (hasPermission("medicoes.manage")) perfis.push("Financeiro");
    if (hasPermission("certificados.manage")) perfis.push("Qualidade");
    if (hasPermission("usuarios.manage", "configuracoes.manage", "auditoria.view")) perfis.push("Administração");
    return perfis.length ? perfis : ["Consulta"];
  }, [hasPermission]);

  const metrics = useMemo(
    () =>
      [
        { label: "Contratos ativos", value: ativos, icon: CheckCircle2, tone: "text-primary", visible: hasPermission("dashboard.view", "contratos.manage", "agenda.manage", "os.manage", "medicoes.manage") },
        { label: "Propostas/contratos", value: propostasContratos.length, icon: FileText, tone: "text-slate-700", visible: hasPermission("contratos.manage") },
        { label: "Agendamentos", value: agendados, icon: CalendarClock, tone: "text-blue-600", visible: hasPermission("agenda.manage", "os.manage") },
        { label: "OS abertas", value: osAbertas, icon: ClipboardList, tone: "text-amber-600", visible: hasPermission("os.manage", "os.close") },
        { label: "Certificados", value: certificados.length, icon: ShieldCheck, tone: "text-emerald-700", visible: hasPermission("certificados.manage") },
        { label: "Medições", value: medicoes.length, icon: Receipt, tone: "text-teal-700", visible: hasPermission("medicoes.manage") },
      ].filter((item) => item.visible).slice(0, 4),
    [agendados, ativos, certificados.length, hasPermission, medicoes.length, osAbertas, propostasContratos.length],
  );

  const alertasPerfil = useMemo(() => {
    const alerts = [];
    if (hasPermission("contratos.manage")) {
      const propostasEmAndamento = propostasContratos.filter((item) => (
        item.status === "rascunho" ||
        item.status === "enviado" ||
        item.status === "em_negociacao"
      ));
      alerts.push(`${propostasEmAndamento.length} proposta(s) em negociação`);
    }
    if (hasPermission("agenda.manage")) alerts.push(`${agendados} agendamento(s) pendente(s)`);
    if (hasPermission("os.manage", "os.close")) alerts.push(`${osAbertas} OS aberta(s)`);
    if (hasPermission("certificados.manage")) alerts.push(`${ordens.filter((item) => item.status === "encerrada" && !item.certificadoHash).length} certificado(s) possível(is)`);
    if (hasPermission("medicoes.manage")) alerts.push(`${medicoes.filter((item) => item.financeiroStatus !== "pago_no_erp" && item.status !== "cancelada").length} medição(ões) em acompanhamento`);
    return alerts.slice(0, 4);
  }, [agendados, hasPermission, medicoes, ordens, osAbertas, propostasContratos]);

  const proximosPassos = useMemo(() => {
    const cards = [
      { title: "Criar proposta", description: "Monte a proposta e gere contrato após aceite.", to: "/comercial/contratos", icon: FileText, visible: hasPermission("contratos.manage") },
      { title: "Criar agendamento", description: "Planeje equipe, veículo, local e data.", to: "/agendar", icon: CalendarClock, visible: hasPermission("agenda.manage") },
      { title: "Gerenciar OS", description: "Imprima, edite e encerre ordens de serviço.", to: "/ordens", icon: ClipboardList, visible: hasPermission("os.manage", "os.close") },
      { title: "Emitir certificados", description: "Revise serviços concluídos e certifique.", to: "/certificados", icon: ShieldCheck, visible: hasPermission("certificados.manage") },
      { title: "Consolidar medição", description: "Feche período, NF e baixa manual no ERP.", to: "/medicao", icon: Receipt, visible: hasPermission("medicoes.manage") },
    ];
    return cards.filter((item) => item.visible);
  }, [hasPermission]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Início"
        title="Painel de operação"
        description="Resumo curto do que precisa de atenção agora. Use as abas para aprofundar sem transformar o dashboard em uma página longa."
        crumbs={[{ label: "Início" }, { label: "Dashboard" }]}
        actions={[
          { label: "Atualizar", onClick: reload, variant: "outline" },
          ...(hasPermission("agenda.manage") ? [{ label: "Novo agendamento", to: "/agendar", variant: "default" as const }] : []),
        ]}
        className="p-4"
      />

      {error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-destructive">Não foi possível carregar os dados.</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" onClick={reload}>Tentar novamente</Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.08] via-white to-emerald-50/60">
          <CardContent className="p-4">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary/70">Dashboard por perfil</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">Olá, {user?.nome?.split(" ")[0] || "usuário"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Contexto ativo: {perfilAtual.join(", ")}.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {perfilAtual.map((perfil) => <Badge key={perfil} variant="secondary">{perfil}</Badge>)}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="metric-card">
                  <CardContent className="space-y-2 p-4">
                    <Skeleton className="h-8 w-8 rounded-xl" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-7 w-12" />
                  </CardContent>
                </Card>
              ))
            : metrics.map((item) => (
                <Card key={item.label} className="metric-card">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="rounded-2xl bg-muted p-2.5">
                      <item.icon className={`h-5 w-5 ${item.tone}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-2xl font-bold tracking-tight">{item.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>
      </div>

      <Tabs defaultValue="agora" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-2xl bg-muted/70 p-1">
          <TabsTrigger value="agora">Agora</TabsTrigger>
          <TabsTrigger value="contratos">Contratos</TabsTrigger>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="atalhos">Atalhos</TabsTrigger>
        </TabsList>

        <TabsContent value="agora" className="mt-0 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <Card className="panel-soft">
            <CardHeader className="pb-3">
              <CardTitle className="section-title">Fluxo recomendado</CardTitle>
              <p className="text-sm text-muted-foreground">O caminho padrão reduz retrabalho e mantém valores comerciais fora da operação.</p>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-5">
              {[
                ["1", "Proposta", "Comercial"],
                ["2", "Contrato", "Comercial"],
                ["3", "Agenda", "Operacional"],
                ["4", "OS + certificado", "Operacional"],
                ["5", "Medição", "Financeiro"],
              ].map(([number, title, module]) => (
                <div key={title} className="rounded-2xl border bg-card p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{number}</span>
                    <p className="font-semibold">{title}</p>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{module}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="panel-soft">
            <CardHeader className="pb-3">
              <CardTitle className="section-title">Pontos de atenção</CardTitle>
              <p className="text-sm text-muted-foreground">Prioridades calculadas conforme permissões do usuário.</p>
            </CardHeader>
            <CardContent className="grid gap-2">
              {alertasPerfil.length ? alertasPerfil.map((alerta) => (
                <div key={alerta} className="flex items-center gap-2 rounded-xl border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  {alerta}
                </div>
              )) : (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Nenhum alerta específico para o seu perfil.</div>
              )}
              {!loading && vencidos > 0 ? (
                <div className="mt-1 flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
                  <span><strong>{vencidos}</strong> contrato(s) exigem revisão antes de novos agendamentos.</span>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contratos" className="mt-0">
          <Card className="panel-soft">
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="section-title">Contratos em execução</CardTitle>
                <p className="text-sm text-muted-foreground">Saldo operacional por item, sem expor valores comerciais.</p>
              </div>
              {!loading ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{contratos.length} contrato(s)</Badge>
                  {contratos.length > CONTRACTS_PREVIEW_LIMIT ? (
                    <Button variant="outline" size="sm" onClick={() => setShowAllContracts((current) => !current)}>
                      {showAllContracts ? "Recolher" : `Ver todos (${contratos.length})`}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid gap-3">
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              ) : contratos.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                  Nenhum contrato operacional disponível.
                </div>
              ) : (
                <div className={`overflow-x-auto ${showAllContracts ? "max-h-[430px] overflow-y-auto pr-1" : ""}`}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="py-2 pr-4 text-left font-medium">Cliente</th>
                        <th className="py-2 pr-4 text-left font-medium">Serviço</th>
                        <th className="py-2 pr-4 text-left font-medium">Execução</th>
                        <th className="py-2 pr-4 text-left font-medium">Saldo</th>
                        <th className="py-2 text-left font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contratosVisiveis.map((item) => {
                        const progresso = contractProgress(item);
                        const saldo = contractBalance(item);
                        return (
                          <tr key={item.id} className="border-b last:border-0">
                            <td className="py-3 pr-4 font-medium">{item.cliente}</td>
                            <td className="py-3 pr-4">{item.servico}</td>
                            <td className="min-w-[220px] py-3 pr-4">
                              <div className="flex items-center gap-3">
                                <Progress value={progresso} className="h-2 flex-1" />
                                <span className="whitespace-nowrap text-xs text-muted-foreground">
                                  {item.executado}/{item.contratado} {item.unidade}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 pr-4 font-mono text-xs">{saldo} {item.unidade}</td>
                            <td className="py-3">{statusBadge(item.status)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agenda" className="mt-0">
          <Card className="panel-soft">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="section-title">Próximos passos da agenda</CardTitle>
                <p className="text-sm text-muted-foreground">Recorrências sugeridas e próximos agendamentos da fila operacional.</p>
              </div>
              {!loading ? <Badge variant="secondary">{recorrencias.length} sugestão(ões)</Badge> : null}
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)
              ) : recorrencias.length > 0 ? (
                recorrencias.slice(0, 3).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{item.clienteNome}</p>
                        <p className="text-sm text-muted-foreground">{item.servico}</p>
                      </div>
                      <Badge variant="secondary">Recorrência</Badge>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">Sugerido para {fmtDate(item.suggestedDate)}</p>
                  </div>
                ))
              ) : (
                agendamentos.slice(-3).reverse().map((item) => (
                  <div key={item.id} className="rounded-2xl border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{item.clienteNome}</p>
                        <p className="text-sm text-muted-foreground">{item.servico}</p>
                      </div>
                      <Badge variant="outline">{item.status}</Badge>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">Agendado para {fmtDate(item.dataAgendada)}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="atalhos" className="mt-0">
          <Card className="panel-soft">
            <CardHeader className="pb-3">
              <CardTitle className="section-title">Atalhos do fluxo</CardTitle>
              <p className="text-sm text-muted-foreground">Acesse rapidamente as etapas permitidas para seu perfil.</p>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {proximosPassos.map((item) => (
                <Link key={item.to} to={item.to} className="group rounded-2xl border border-border/70 bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-muted p-2">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
