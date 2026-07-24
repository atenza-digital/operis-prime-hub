import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, ClipboardCheck, FileText, Printer, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getBootstrap, type BootstrapData, type OSApp } from "@/lib/api";
import { formatDateBr } from "@/lib/formatters";
import { repairMojibake } from "@/lib/repairMojibake";
import { printTechnicalReport } from "@/lib/technicalReportPrint";

function cleanText(value: string | number | null | undefined, fallback = "Não informado") {
  const cleaned = repairMojibake(String(value ?? "").trim());
  return cleaned || fallback;
}

function normalizeReportNumber(os: OSApp) {
  return `RT-${cleanText(os.numero, os.id).replace(/^OS[-\s]*/i, "")}`;
}

function hasPhotos(os: OSApp) {
  return Boolean(os.fotos?.length || os.evidencias?.some((item) => item.mimeType?.startsWith("image/") || item.conteudoBase64?.startsWith("data:image/")));
}

export default function RelatoriosTecnicos() {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("encerrada");
  const [serviceFilter, setServiceFilter] = useState("todos");

  async function reload() {
    setLoading(true);
    try {
      setData(await getBootstrap());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar relatórios técnicos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const orders = useMemo(() => data?.orders ?? [], [data?.orders]);
  const serviceOptions = useMemo(() => Array.from(new Set(orders.map((item) => cleanText(item.servico, "")).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR")), [orders]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    const orderTimestamp = (os: OSApp) => {
      const value = os.dataExecucao || os.dataEmissao;
      const timestamp = value ? new Date(value).getTime() : Number.NaN;
      return Number.isNaN(timestamp) ? 0 : timestamp;
    };
    return [...orders]
      .sort((a, b) => orderTimestamp(b) - orderTimestamp(a) || String(b.numero || b.id).localeCompare(String(a.numero || a.id), "pt-BR", { numeric: true }))
      .filter((os) => statusFilter === "todas" || os.status === statusFilter)
      .filter((os) => serviceFilter === "todos" || cleanText(os.servico, "") === serviceFilter)
      .filter((os) => {
        if (!term) return true;
        return [os.numero, os.clienteNome, os.clienteCnpj, os.servico, os.localExecucao, os.tagEquipamentoServico, os.tags, os.tecnicoNome, os.equipeTecnicosNomes?.join(" ")]
          .filter(Boolean)
          .some((value) => cleanText(value).toLowerCase().includes(term));
      });
  }, [orders, search, serviceFilter, statusFilter]);

  const totals = useMemo(
    () => ({
      closed: orders.filter((item) => item.status === "encerrada").length,
      open: orders.filter((item) => item.status === "aberta").length,
      withPhotos: orders.filter((item) => item.status === "encerrada" && hasPhotos(item)).length,
      withChecklist: orders.filter((item) => item.status === "encerrada" && item.checklistRespostas?.length).length,
    }),
    [orders],
  );

  function handlePrint(os: OSApp) {
    if (os.status !== "encerrada") {
      toast.warning("O relatório técnico deve ser gerado preferencialmente após o encerramento da OS.");
    }
    printTechnicalReport(os, data);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operacional"
        title="Relatórios técnicos"
        description="Gere relatórios operacionais a partir das OS, com equipe, local, checklist, fotos, produtos, normas e assinatura técnica, sem expor valores comerciais."
        actions={[
          { label: "Atualizar", onClick: reload, variant: "outline" },
          { label: "Ver OS", to: "/ordens", variant: "default" },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <CheckCircle2 className="h-10 w-10 rounded-xl bg-emerald-50 p-2 text-emerald-700" />
            <div>
              <p className="text-sm text-muted-foreground">OS encerradas</p>
              <p className="text-3xl font-bold">{totals.closed}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <Camera className="h-10 w-10 rounded-xl bg-blue-50 p-2 text-blue-700" />
            <div>
              <p className="text-sm text-muted-foreground">Com fotos</p>
              <p className="text-3xl font-bold">{totals.withPhotos}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <ClipboardCheck className="h-10 w-10 rounded-xl bg-slate-100 p-2 text-slate-700" />
            <div>
              <p className="text-sm text-muted-foreground">Com checklist</p>
              <p className="text-3xl font-bold">{totals.withChecklist}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <AlertTriangle className="h-10 w-10 rounded-xl bg-amber-50 p-2 text-amber-700" />
            <div>
              <p className="text-sm text-muted-foreground">OS abertas</p>
              <p className="text-3xl font-bold">{totals.open}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-emerald-100 bg-emerald-50/40">
        <CardContent className="flex flex-col gap-3 p-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-emerald-900">
              <ShieldCheck className="h-4 w-4" />
              Como usar no fluxo
            </p>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-emerald-950/80">
              O relatório técnico é emitido após a execução da OS para registrar o que foi feito em campo. Ele usa o mesmo conjunto de dados da OS encerrada e pode acompanhar o certificado quando o serviço exigir mais contexto técnico.
            </p>
          </div>
          <Badge className="w-fit bg-emerald-700 text-white">Sem valores comerciais</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            OS disponíveis para relatório
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1.5fr_0.7fr_0.9fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Buscar por OS, cliente, serviço, local, tag ou equipe..." />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="encerrada">Encerradas</SelectItem>
                <SelectItem value="aberta">Abertas</SelectItem>
                <SelectItem value="todas">Todas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Serviço" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os serviços</SelectItem>
                {serviceOptions.map((service) => (
                  <SelectItem key={service} value={service}>
                    {service}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Carregando OS e dados técnicos...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhuma OS encontrada para os filtros selecionados.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Relatório</TableHead>
                  <TableHead>Cliente / serviço</TableHead>
                  <TableHead>Execução</TableHead>
                  <TableHead>Equipe</TableHead>
                  <TableHead>Evidências</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((os) => (
                  <TableRow key={os.id}>
                    <TableCell>
                      <div className="font-semibold">{normalizeReportNumber(os)}</div>
                      <div className="text-xs text-muted-foreground">{cleanText(os.numero)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold">{cleanText(os.clienteNome)}</div>
                      <div className="text-xs text-muted-foreground">{cleanText(os.servico)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{cleanText(os.localExecucao)}</div>
                    </TableCell>
                    <TableCell>
                      <div>{formatDateBr(os.dataExecucao || os.dataEmissao)}</div>
                      <Badge variant={os.status === "encerrada" ? "default" : "secondary"} className="mt-1">
                        {os.status === "encerrada" ? "Encerrada" : "Aberta"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[220px] text-sm">{cleanText(os.equipeTecnicosNomes?.join(" • ") || os.tecnicoNome)}</div>
                      <div className="text-xs text-muted-foreground">{cleanText(os.veiculoDescricao, "Veículo não informado")}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline">{hasPhotos(os) ? "Com fotos" : "Sem fotos"}</Badge>
                        <Badge variant="outline">{os.checklistRespostas?.length ? "Checklist" : "Sem checklist"}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" className="gap-2" onClick={() => handlePrint(os)}>
                        <Printer className="h-4 w-4" />
                        Imprimir relatório
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
