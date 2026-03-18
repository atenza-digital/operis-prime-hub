import { contratos, proximosAgendamentos } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle2, Clock, FileText } from "lucide-react";

const statusBadge = (status: string) => {
  switch (status) {
    case "ativo":
      return <Badge className="bg-primary text-primary-foreground">Ativo</Badge>;
    case "vencido":
      return <Badge variant="destructive">Vencido</Badge>;
    default:
      return <Badge variant="secondary">Pendente</Badge>;
  }
};

export default function Dashboard() {
  const ativos = contratos.filter((c) => c.status === "ativo").length;
  const vencidos = contratos.filter((c) => c.status === "vencido").length;
  const totalExec = contratos.reduce((a, c) => a + c.executado, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard de Contratos</h1>
        <p className="text-muted-foreground text-sm">Visão geral de medição e recorrência técnica</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-accent p-2.5"><FileText className="h-5 w-5 text-accent-foreground" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Contratos</p>
              <p className="text-2xl font-bold">{contratos.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-accent p-2.5"><CheckCircle2 className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Ativos</p>
              <p className="text-2xl font-bold">{ativos}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-destructive/10 p-2.5"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Vencidos</p>
              <p className="text-2xl font-bold">{vencidos}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-accent p-2.5"><Clock className="h-5 w-5 text-accent-foreground" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Serviços Executados</p>
              <p className="text-2xl font-bold">{totalExec}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contratos table */}
      <Card>
        <CardHeader><CardTitle>Contratos Ativos — Medição</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 pr-4 font-medium">Cliente</th>
                <th className="text-left py-2 pr-4 font-medium">Serviço</th>
                <th className="text-left py-2 pr-4 font-medium">Progresso</th>
                <th className="text-left py-2 pr-4 font-medium">Saldo</th>
                <th className="text-left py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {contratos.map((c) => {
                const pct = Math.round((c.executado / c.contratado) * 100);
                const saldo = c.contratado - c.executado;
                return (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium">{c.cliente}</td>
                    <td className="py-3 pr-4">{c.servico}</td>
                    <td className="py-3 pr-4 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {c.executado}/{c.contratado} {c.unidade}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">
                      {saldo} {c.unidade}
                    </td>
                    <td className="py-3">{statusBadge(c.status)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Próximos Agendamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Fila de Recorrência — Próximos Agendamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {proximosAgendamentos.map((ag) => {
              const vencido = ag.diasParaVencer < 0;
              return (
                <div
                  key={ag.id}
                  className={`rounded-lg border p-4 ${
                    vencido ? "border-destructive/50 bg-destructive/5" : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{ag.cliente}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{ag.servico}</p>
                    </div>
                    {vencido ? (
                      <Badge variant="destructive" className="shrink-0">Vencido</Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0">{ag.diasParaVencer}d</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Agendado: {new Date(ag.dataAgendada).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
