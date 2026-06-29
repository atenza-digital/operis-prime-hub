import { useEffect, useMemo, useState } from "react";
import { Activity, Clock, Copy, DatabaseZap, Download, Eye, RotateCcw, Search, ShieldCheck, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

const defaultFilters = {
  search: "",
  entityType: "todos",
  action: "todas",
  entityId: "",
  user: "",
  ip: "",
  dateFrom: "",
  dateTo: "",
  limit: "250",
};

const FILTER_STORAGE_KEY = "ciperprag_hub_audit_filters";
const criticalFieldKeywords = ["status", "permiss", "valor", "validade", "quantidade", "hash", "senha", "certificado", "medicao", "contrato", "ativo"];

function compactJson(value?: Record<string, unknown> | null) {
  if (!value) return "";
  const text = JSON.stringify(value);
  return text.length > 150 ? `${text.slice(0, 150)}...` : text;
}

function prettyJson(value?: Record<string, unknown> | null) {
  return value ? JSON.stringify(value, null, 2) : "Sem dados registrados.";
}

function changedKeys(before?: Record<string, unknown> | null, after?: Record<string, unknown> | null) {
  if (!before || !after) return [];
  return Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .sort();
}

function formatAuditValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (Array.isArray(value)) return value.length ? `${value.length} item(ns)` : "Lista vazia";
  if (typeof value === "object") {
    const text = JSON.stringify(value);
    return text.length > 120 ? `${text.slice(0, 120)}...` : text;
  }
  const text = String(value);
  return text.length > 160 ? `${text.slice(0, 160)}...` : text;
}

function changedRows(before?: Record<string, unknown> | null, after?: Record<string, unknown> | null) {
  return changedKeys(before, after).map((key) => ({
    key,
    before: formatAuditValue(before?.[key]),
    after: formatAuditValue(after?.[key]),
    critical: criticalFieldKeywords.some((keyword) => key.toLowerCase().includes(keyword)),
  }));
}

function loadSavedFilters() {
  try {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY);
    return saved ? { ...defaultFilters, ...JSON.parse(saved) } : defaultFilters;
  } catch {
    return defaultFilters;
  }
}

function csvCell(value: unknown) {
  const text = String(value ?? "").replaceAll('"', '""');
  return `"${text}"`;
}

export default function AuditoriaEventos() {
  const [logs, setLogs] = useState<AuditLogApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(loadSavedFilters);
  const [selectedLog, setSelectedLog] = useState<AuditLogApp | null>(null);

  async function reload(nextFilters = filters) {
    setLoading(true);
    try {
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(nextFilters));
      const response = await getAuditLogs({
        ...nextFilters,
        limit: Number(nextFilters.limit || 250),
      });
      setLogs(response.logs);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar eventos de auditoria");
    } finally {
      setLoading(false);
    }
  }

  function updateFilter(key: keyof typeof defaultFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function clearFilters() {
    setFilters(defaultFilters);
    localStorage.removeItem(FILTER_STORAGE_KEY);
    reload(defaultFilters);
  }

  function exportCsv() {
    if (!logs.length) {
      toast.info("Nenhum evento para exportar.");
      return;
    }
    const headers = ["ID", "Data", "Hora", "Usuario", "Email", "Acao", "Entidade", "Entidade ID", "Resumo", "IP", "User-agent"];
    const rows = logs.map((item) => [
      item.id,
      formatDateBr(item.criadoEm),
      formatTimeBr(item.criadoEm),
      item.usuario?.nome || "Sistema",
      item.usuario?.email || "",
      actionLabels[item.acao] || item.acao,
      entityLabels[item.entidadeTipo] || item.entidadeTipo,
      item.entidadeId || "",
      item.resumo || "",
      item.ip || "",
      item.userAgent || "",
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `auditoria-eventos-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function copyDiffRow(row: { key: string; before: string; after: string }) {
    const text = `Campo: ${row.key}\nAntes: ${row.before}\nDepois: ${row.after}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Linha do diff copiada.");
    } catch {
      toast.error("Nao foi possivel copiar automaticamente.");
    }
  }

  useEffect(() => {
    reload(loadSavedFilters());
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
    const values = Array.from(new Set([...Object.keys(entityLabels), ...logs.map((item) => item.entidadeTipo)])).sort();
    return values;
  }, [logs]);

  const actionOptions = useMemo(() => {
    const values = Array.from(new Set([...Object.keys(actionLabels), ...logs.map((item) => item.acao)])).sort();
    return values;
  }, [logs]);

  const selectedChangedRows = useMemo(() => changedRows(selectedLog?.dadosAntes, selectedLog?.dadosDepois), [selectedLog]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Eventos de Auditoria"
        description="Consulte ações sensíveis executadas na plataforma, com filtros por período, usuário, IP, entidade e comparação antes/depois."
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
          <div className="grid gap-3 xl:grid-cols-[1.5fr_0.8fr_0.9fr_0.8fr]">
            <Input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="Buscar por resumo, usuário, ação ou entidade..." />
            <Input value={filters.user} onChange={(event) => updateFilter("user", event.target.value)} placeholder="Usuário ou e-mail" />
            <Input value={filters.entityId} onChange={(event) => updateFilter("entityId", event.target.value)} placeholder="ID da entidade" />
            <Input value={filters.ip} onChange={(event) => updateFilter("ip", event.target.value)} placeholder="IP" />
          </div>

          <div className="grid gap-3 xl:grid-cols-[0.9fr_0.9fr_0.8fr_0.8fr_0.6fr_auto_auto_auto]">
            <Select value={filters.entityType} onValueChange={(value) => updateFilter("entityType", value)}>
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
            <Select value={filters.action} onValueChange={(value) => updateFilter("action", value)}>
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
            <Input type="date" value={filters.dateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} />
            <Input type="date" value={filters.dateTo} onChange={(event) => updateFilter("dateTo", event.target.value)} />
            <Select value={filters.limit} onValueChange={(value) => updateFilter("limit", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Limite" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="250">250</SelectItem>
                <SelectItem value="500">500</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" onClick={() => reload()} disabled={loading}>
              <Search className="mr-2 h-4 w-4" />
              Filtrar
            </Button>
            <Button type="button" variant="outline" onClick={clearFilters} disabled={loading}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Limpar
            </Button>
            <Button type="button" variant="outline" onClick={exportCsv} disabled={loading || logs.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              CSV
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
                  <TableHead className="text-right">Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Carregando eventos...
                    </TableCell>
                  </TableRow>
                ) : null}
                {!loading && logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
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
                    <TableCell className="text-right">
                      <Button type="button" variant="outline" size="sm" onClick={() => setSelectedLog(item)}>
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto">
          {selectedLog ? (
            <>
              <DialogHeader>
                <DialogTitle>Detalhes do evento #{selectedLog.id}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 rounded-xl border bg-muted/30 p-4 md:grid-cols-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Quando</p>
                  <p>{formatDateBr(selectedLog.criadoEm)} {formatTimeBr(selectedLog.criadoEm)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Usuário</p>
                  <p>{selectedLog.usuario?.nome || "Sistema"}</p>
                  <p className="text-xs text-muted-foreground">{selectedLog.usuario?.email || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Entidade</p>
                  <p>{entityLabels[selectedLog.entidadeTipo] || selectedLog.entidadeTipo}</p>
                  <p className="text-xs text-muted-foreground">{selectedLog.entidadeId || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Origem</p>
                  <p>{selectedLog.ip || "-"}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold">Resumo</p>
                <p className="text-sm text-muted-foreground">{selectedLog.resumo || "-"}</p>
              </div>

              {selectedChangedRows.length ? (
                <div>
                  <p className="mb-2 text-sm font-semibold">Diferenças identificadas</p>
                  <div className="overflow-hidden rounded-xl border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campo</TableHead>
                          <TableHead>Antes</TableHead>
                          <TableHead>Depois</TableHead>
                          <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedChangedRows.map((row) => (
                          <TableRow key={row.key} className={row.critical ? "bg-amber-50/70" : undefined}>
                            <TableCell className="w-[180px] align-top font-medium">
                              <div className="flex flex-wrap items-center gap-2">
                                <span>{row.key}</span>
                                {row.critical ? <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-900">Crítico</Badge> : null}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[330px] whitespace-pre-wrap break-words align-top text-sm text-muted-foreground">{row.before}</TableCell>
                            <TableCell className="max-w-[330px] whitespace-pre-wrap break-words align-top text-sm">{row.after}</TableCell>
                            <TableCell className="text-right align-top">
                              <Button type="button" variant="ghost" size="sm" onClick={() => copyDiffRow(row)}>
                                <Copy className="mr-1 h-3.5 w-3.5" />
                                Copiar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-semibold">Antes</p>
                  <pre className="max-h-[420px] overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-50">{prettyJson(selectedLog.dadosAntes)}</pre>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold">Depois</p>
                  <pre className="max-h-[420px] overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-50">{prettyJson(selectedLog.dadosDepois)}</pre>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">User-agent</p>
                <code className="block rounded-lg bg-muted p-3 text-xs">{selectedLog.userAgent || "Origem não informada"}</code>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
