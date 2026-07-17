import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getBootstrap, type BootstrapData } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
  const agendamentos = data?.schedules ?? [];
  const ordens = data?.orders ?? [];
  const certificados = data?.certificates ?? [];
  const recorrencias = (data?.recurrenceSuggestions ?? []).filter((item) => item.status === "pendente");

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

  const proximosPassos = useMemo(() => {
    const cards = [
      {
        title: "Criar agendamento",
        description: "Inicie uma nova visita e já defina equipe, local e veículo.",
        to: "/agendar",
        icon: CalendarClock,
      },
      {
        title: "Gerenciar OS",
        description: "Imprima, edite e encerre ordens de serviço em andamento.",
        to: "/ordens",
        icon: ClipboardList,
      },
      {
        title: "Emitir certificados",
        description: "Revise serviços concluídos e gere os certificados pendentes.",
        to: "/certificados",
        icon: ShieldCheck,
      },
      {
        title: "Consolidar medição",
        description: "Feche o período faturável a partir das OS encerradas.",
        to: "/medicao",
        icon: Receipt,
      },
    ];

    return cards;
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operacional"
        title="Painel de Operação"
        description="Uma visão prática do que precisa ser feito agora: agenda, ordens abertas, certificados e saldo dos contratos."
        crumbs={[{ label: "Operacional" }, { label: "Dashboard" }]}
        actions={[
          { label: "Atualizar painel", onClick: reload, variant: "outline" },
          { label: "Novo agendamento", to: "/agendar", variant: "default" },
        ]}
      />

      {error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-destructive">Não foi possível carregar os dados.</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" onClick={reload}>Tentar novamente</Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="page-grid">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="metric-card">
                <CardContent className="space-y-3 pt-6">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          : [
              { label: "Contratos ativos", value: ativos, icon: CheckCircle2, tone: "text-primary" },
              { label: "Agendamentos pendentes", value: agendados, icon: CalendarClock, tone: "text-blue-600" },
              { label: "OS abertas", value: osAbertas, icon: ClipboardList, tone: "text-amber-600" },
              { label: "Certificados emitidos", value: certificados.length, icon: FileText, tone: "text-emerald-700" },
            ].map((item) => (
              <Card key={item.label} className="metric-card">
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="rounded-2xl bg-muted p-3">
                    <item.icon className={`h-5 w-5 ${item.tone}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="text-3xl font-bold tracking-tight">{item.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardHeader>
          <CardTitle className="section-title">Fluxo recomendado de uso</CardTitle>
          <p className="text-sm text-muted-foreground">
            A plataforma foi organizada para sair do comercial, passar pelo campo e terminar na medição, sem misturar financeiro formal do ERP.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            { title: "1. Proposta", description: "Gerar e enviar proposta comercial ao cliente.", icon: FileText },
            { title: "2. Contrato", description: "Após aceite, gerar contrato ou registrar contrato do cliente.", icon: CheckCircle2 },
            { title: "3. Agendamento", description: "Usar contrato vigente com saldo para planejar equipe, veículo e local.", icon: CalendarClock },
            { title: "4. OS e certificado", description: "Executar, encerrar com evidências e emitir certificado quando aplicável.", icon: ShieldCheck },
            { title: "5. Medição", description: "Consolidar OS por período e acompanhar NF/pagamento até baixa no ERP.", icon: Receipt },
          ].map((step) => (
            <div key={step.title} className="rounded-2xl border bg-card p-4">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-primary/10 p-2">
                  <step.icon className="h-4 w-4 text-primary" />
                </div>
                <p className="font-semibold">{step.title}</p>
              </div>
              <p className="mt-2 text-sm leading-5 text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <Card className="panel-soft">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="section-title">Contratos em execução</CardTitle>
              <p className="text-sm text-muted-foreground">Acompanhe o saldo contratual e priorize itens perto do limite.</p>
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
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : contratos.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                Nenhum contrato operacional disponível para acompanhamento.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  <span>
                    Mostrando {contratosVisiveis.length} de {contratos.length} contrato(s), com prioridade para saldo crítico.
                  </span>
                  {!showAllContracts && contratos.length > CONTRACTS_PREVIEW_LIMIT ? (
                    <span>{contratos.length - contratosVisiveis.length} contrato(s) recolhido(s)</span>
                  ) : null}
                </div>
                <div className={`overflow-x-auto ${showAllContracts ? "max-h-[440px] overflow-y-auto pr-1" : ""}`}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="py-2 pr-4 text-left font-medium">Cliente</th>
                        <th className="py-2 pr-4 text-left font-medium">Serviço</th>
                        <th className="py-2 pr-4 text-left font-medium">Progresso</th>
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
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="panel-soft">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="section-title">Próximos passos da agenda</CardTitle>
                <p className="text-sm text-muted-foreground">Recorrências sugeridas e próximos agendamentos da fila operacional.</p>
              </div>
              {!loading ? <Badge variant="secondary">{recorrencias.length} sugestão(ões)</Badge> : null}
            </CardHeader>
            <CardContent className="grid gap-3">
              {loading ? (
                <>
                  <Skeleton className="h-24 w-full rounded-2xl" />
                  <Skeleton className="h-24 w-full rounded-2xl" />
                </>
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

          <Card className="panel-soft">
            <CardHeader>
              <CardTitle className="section-title">Atalhos do fluxo</CardTitle>
              <p className="text-sm text-muted-foreground">Acesse rapidamente as etapas mais comuns do processo operacional.</p>
            </CardHeader>
            <CardContent className="grid gap-3">
              {proximosPassos.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group rounded-2xl border border-border/70 bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
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

          {!loading && vencidos > 0 ? (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="flex items-start gap-3 pt-6">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
                <div>
                  <p className="font-semibold text-destructive">{vencidos} contrato(s) exigem atenção</p>
                  <p className="text-sm text-muted-foreground">
                    Há contratos sem saldo ou vencidos. Revise antes de abrir novos agendamentos ou gerar medição.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
