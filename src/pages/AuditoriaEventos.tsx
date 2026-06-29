import { useEffect, useMemo, useState } from "react";
import { Activity, Clock, DatabaseZap, Search, ShieldCheck, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAuditLogs, type AuditLogApp } from "@/lib/api";
import { formatDateBr, formatTimeBr } from "@/lib/formatters";

const entityLabels: Record<string, string> = {
  usuario: "Usuário",
  anexo: "Anexo",
  os: "OS",
  certificado: "Certificado",
  medicao: "Medição",
  agendamento: "Agendamento",
  recorrencia: "Recorrência",
  cliente: "Cliente",
  servico: "Serviço",
  tecnico: "Técnico",
  veiculo: "Veículo",
  alocacao: "Alocação",
  configuracao: "Configuração",
  contrato_template: "Proposta/Contrato",
};

const actionLabels: Record<string, string> = {
  login: "Login",
  logout: "Logout",
  password_changed: "Senha alterada",
  password_reset: "Senha resetada",
  user_created: "Usuário criado",
  user_updated: "Usuário atualizado",
  attachment_view: "Anexo visualizado",
  attachment_download: "Anexo baixado",
  schedule_created: "Agendamento criado",
  schedule_updated: "Agendamento atualizado",
  order_generated: "OS gerada",
  order_updated: "OS atualizada",
  order_closed: "OS encerrada",
  certificate_generated: "Certificado gerado",
  measurement_generated: "Medição gerada",
  measurement_cancelled: "Medição cancelada",
  recurrence_confirmed: "Recorrência confirmada",
  recurrence_dismissed: "Recorrência dispensada",
  client_created: "Cliente criado",
  client_updated: "Cliente atualizado",
  service_created: "Serviço criado",
  service_updated: "Serviço atualizado",
  technician_created: "Técnico criado",
  technician_updated: "Técnico atualizado",
  vehicle_created: "Veículo criado",
  vehicle_updated: "Veículo atualizado",
  allocation_created: "Alocação criada",
  allocation_updated: "Alocação atualizada",
  company_config_updated: "Config. empresa alterada",
  numbering_config_updated: "Numeração alterada",
  contract_template_created: "Proposta/contrato criado",
  contract_template_updated: "Proposta/contrato atualizado",
  contract_generated_from_proposal: "Contrato gerado",
};

function compactJson(value?: Record<string, unknown> | null) {
  if (!value) return "";
  const text = JSON.stringify(value);
  return text.length > 150 ? `${text.slice(0, 150)}...` : text;
}

export default function AuditoriaEventos() {
  const [logs, setLogs] = useState<AuditLogApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState("todos");
  const [action, setAction] = useState("todas");

  async function reload() {
    setLoading(true);
    try {
      const response = await getAuditLogs({ search, entityType, action, limit: 250 });
      setLogs(response.logs);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar eventos de auditoria");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(
    () => ({
      all: logs.length,
      users: logs.filter((item) => item.entidadeTipo === "usuario").length,
      documents: logs.filter((item) => item.entidadeTipo === "anexo" || item.entidadeTipo === "certificado").length,
      today: logs.filter((item) => formatDateBr(item.criadoEm) === formatDateBr(new Date().toISOString())).length,
    }),
    [logs],
  );

  const entityOptions = useMemo(() => {
    const values = Array.from(new Set(logs.map((item) => item.entidadeTipo))).sort();
    return values.length ? values : Object.keys(entityLabels);
  }, [logs]);

  const actionOptions = useMemo(() => {
    const values = Array.from(new Set(logs.map((item) => item.acao))).sort();
    return values.length ? values : Object.keys(actionLabels);
  }, [logs]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Eventos de Auditoria"
        description="Consulte ações sensíveis executadas na plataforma, com usuário, origem, data/hora e resumo da alteração."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <Activity className="h-9 w-9 rounded-xl bg-emerald-50 p-2 text-emerald-700" />
            <div>
              <p className="text-sm text-muted-foreground">Eventos listados</p>
              <p className="text-3xl font-bold">{totals.all}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <UserRoundCheck className="h-9 w-9 rounded-xl bg-blue-50 p-2 text-blue-700" />
            <div>
              <p className="text-sm text-muted-foreground">Usuários/sessões</p>
              <p className="text-3xl font-bold">{totals.users}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <ShieldCheck className="h-9 w-9 rounded-xl bg-amber-50 p-2 text-amber-700" />
            <div>
              <p className="text-sm text-muted-foreground">Docs/anexos</p>
              <p className="text-3xl font-bold">{totals.documents}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <Clock className="h-9 w-9 rounded-xl bg-slate-100 p-2 text-slate-700" />
            <div>
              <p className="text-sm text-muted-foreground">Hoje</p>
              <p className="text-3xl font-bold">{totals.today}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseZap className="h-5 w-5 text-primary" />
            Trilha de eventos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por resumo, usuário, ação ou entidade..." />
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger>
                <SelectValue placeholder="Entidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as entidades</SelectItem>
                {entityOptions.map((value) => (
                  <SelectItem key={value} value={value}>
                    {entityLabels[value] || value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger>
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as ações</SelectItem>
                {actionOptions.map((value) => (
                  <SelectItem key={value} value={value}>
                    {actionLabels[value] || value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" onClick={reload} disabled={loading}>
              <Search className="mr-2 h-4 w-4" />
              Filtrar
            </Button>
          </div>

          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Resumo</TableHead>
                  <TableHead>Origem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Carregando eventos...
                    </TableCell>
                  </TableRow>
                ) : null}
                {!loading && logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Nenhum evento encontrado para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : null}
                {logs.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateBr(item.criadoEm)}
                      <div className="text-xs text-muted-foreground">{formatTimeBr(item.criadoEm)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{item.usuario?.nome || "Sistema"}</div>
                      <div className="text-xs text-muted-foreground">{item.usuario?.email || "Sem usuário vinculado"}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{actionLabels[item.acao] || item.acao}</Badge>
                      <div className="mt-1 text-xs text-muted-foreground">{item.acao}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{entityLabels[item.entidadeTipo] || item.entidadeTipo}</Badge>
                      <div className="mt-1 max-w-[180px] truncate text-xs text-muted-foreground">{item.entidadeId || "-"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[360px]">{item.resumo || "-"}</div>
                      {item.dadosDepois ? <code className="mt-1 block max-w-[360px] truncate rounded bg-muted px-2 py-1 text-[11px]">{compactJson(item.dadosDepois)}</code> : null}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{item.ip || "-"}</div>
                      <div className="max-w-[220px] truncate text-xs text-muted-foreground">{item.userAgent || "Origem não informada"}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
