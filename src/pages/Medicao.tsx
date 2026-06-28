import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Ban, CalendarDays, Printer, Receipt, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cancelMeasurement, generateMeasurement, getBootstrap, type BootstrapData, type MedicaoApp } from "@/lib/api";

function fmtDate(date: string) {
  if (!date) return "-";
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
}

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function MeasurementPrint({ measurement }: { measurement: MedicaoApp }) {
  return (
    <div className="bg-white text-black print:m-0 print:p-0">
      <div className="mx-auto max-w-[210mm] space-y-5 border border-gray-300 p-8 text-[11px] print:border-none print:p-6">
        <div className="flex items-start justify-between border-b-2 border-emerald-700 pb-4">
          <div>
            <div className="text-xl font-extrabold tracking-tight text-emerald-700">CIPERPRAG</div>
            <div className="text-[9px] font-medium tracking-[0.3em] text-gray-500">SERVIÇOS</div>
          </div>
          <div className="text-right text-[10px]">
            <p className="font-bold">Medição {measurement.numero}</p>
            <p>Gerada em {new Date(measurement.criadoEm).toLocaleDateString("pt-BR")}</p>
          </div>
        </div>

        <h2 className="text-center text-lg font-bold uppercase underline">Medição</h2>

        <div className="space-y-1 border border-gray-400 p-3 text-[11px]">
          <p><strong>Contratante:</strong> {measurement.clienteNome}</p>
          <p><strong>CNPJ:</strong> {measurement.clienteCnpj || "-"}</p>
          <p><strong>Endereço:</strong> {measurement.clienteEndereco || "-"}</p>
          <p><strong>Período:</strong> {fmtDate(measurement.periodoInicio)} até {fmtDate(measurement.periodoFim)}</p>
          <p><strong>Forma de pagamento:</strong> {measurement.formaPagamento || "-"}</p>
          <p><strong>Local de entrega:</strong> {measurement.localEntrega || "-"}</p>
        </div>

        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-gray-100">
              {["ITEM", "SERVIÇO", "OS", "DATA", "QTD.", "VALOR UNIT.", "VALOR TOTAL"].map((head) => (
                <th key={head} className="border border-gray-400 px-2 py-1.5 text-center font-bold">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {measurement.itens.map((item, index) => (
              <tr key={`${item.osId}-${index}`}>
                <td className="border border-gray-400 px-2 py-1.5 text-center">{index + 1}</td>
                <td className="border border-gray-400 px-2 py-1.5">{item.servico}</td>
                <td className="border border-gray-400 px-2 py-1.5 text-center font-mono">{item.osNumero}</td>
                <td className="border border-gray-400 px-2 py-1.5 text-center">{fmtDate(item.dataExecucao)}</td>
                <td className="border border-gray-400 px-2 py-1.5 text-center">{item.quantidade} {item.unidade}</td>
                <td className="border border-gray-400 px-2 py-1.5 text-right">{money(item.valorUnitario)}</td>
                <td className="border border-gray-400 px-2 py-1.5 text-right font-medium">{money(item.valorTotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50">
              <td colSpan={6} className="border border-gray-400 px-2 py-2 text-right font-bold">TOTAL DA MEDIÇÃO</td>
              <td className="border border-gray-400 px-2 py-2 text-right font-bold text-emerald-700">{money(measurement.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default function Medicao() {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clienteSel, setClienteSel] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [busca, setBusca] = useState("");
  const [selected, setSelected] = useState<MedicaoApp | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const bootstrap = await getBootstrap();
      setData(bootstrap);
      setSelected((current) => (current ? bootstrap.measurements.find((item) => item.id === current.id) ?? current : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar medição.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const contratos = useMemo(() => data?.contracts ?? [], [data?.contracts]);
  const ordens = useMemo(() => data?.orders ?? [], [data?.orders]);
  const measurements = useMemo(() => data?.measurements ?? [], [data?.measurements]);
  const clientesDisponiveis = useMemo(() => [...new Set(contratos.map((item) => item.cliente))].sort(), [contratos]);

  const preItens = useMemo(
    () =>
      ordens.filter((item) =>
        item.status === "encerrada" &&
        !item.naoExecutada &&
        item.clienteNome === clienteSel &&
        (!dataInicio || (item.dataExecucao || item.dataEmissao) >= dataInicio) &&
        (!dataFim || (item.dataExecucao || item.dataEmissao) <= dataFim) &&
        !measurements.some((measurement) => measurement.status !== "cancelada" && measurement.itens.some((medItem) => medItem.osId === item.id)),
      ),
    [ordens, measurements, clienteSel, dataInicio, dataFim],
  );

  const filteredMeasurements = measurements.filter((item) => {
    const termo = busca.toLowerCase();
    if (!termo) return true;
    return item.numero.toLowerCase().includes(termo) || item.clienteNome.toLowerCase().includes(termo);
  });

  async function handleGerar() {
    if (!clienteSel || !dataInicio || !dataFim) return toast.error("Selecione o cliente e o intervalo da medição.");
    setSaving(true);
    try {
      const response = await generateMeasurement({ clienteNome: clienteSel, dataInicio, dataFim });
      setSelected(response.measurement);
      toast.success(`Medição ${response.measurement.numero} gerada.`);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar medição.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(medicao: MedicaoApp) {
    if (!confirm(`Cancelar a medição ${medicao.numero}? As OS poderão entrar em nova medição.`)) return;
    await cancelMeasurement(medicao.id);
    toast.success("Medição cancelada.");
    await reload();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operacional"
        title="Medição"
        description="Gere medições persistidas por cliente e período, com histórico e reimpressão."
        crumbs={[{ label: "Operacional" }, { label: "Medição" }]}
        actions={[
          { label: "Atualizar base", onClick: reload, variant: "outline" },
          { label: "Ver OS", to: "/ordens", variant: "default" },
        ]}
      />

      {error ? <Card className="border-destructive/30 bg-destructive/5"><CardContent className="pt-4 text-sm text-muted-foreground">{error}</CardContent></Card> : null}
      {loading ? <Card><CardContent className="py-14 text-center text-sm text-muted-foreground">Carregando dados de medição...</CardContent></Card> : null}

      {!loading ? (
        <>
          <Card className="panel-soft print:hidden">
            <CardHeader><CardTitle>Nova medição</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Cliente</Label>
                  <Select value={clienteSel} onValueChange={setClienteSel}>
                    <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                    <SelectContent>{clientesDisponiveis.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Data inicial</Label><Input type="date" value={dataInicio} onChange={(event) => setDataInicio(event.target.value)} /></div>
                <div className="space-y-1.5"><Label>Data final</Label><Input type="date" value={dataFim} onChange={(event) => setDataFim(event.target.value)} /></div>
              </div>

              {clienteSel ? (
                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                  {preItens.length ? (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span><strong>{preItens.length}</strong> OS encerrada(s), ainda não medidas, no período</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground"><AlertCircle className="h-4 w-4" /><span>Nenhuma OS disponível para nova medição neste intervalo.</span></div>
                  )}
                </div>
              ) : null}

              <Button onClick={handleGerar} className="w-full gap-2" size="lg" disabled={!clienteSel || !dataInicio || !dataFim || !preItens.length || saving}>
                <Receipt className="h-4 w-4" /> {saving ? "Gerando..." : "Gerar medição persistida"}
              </Button>
            </CardContent>
          </Card>

          <Card className="print:hidden">
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <CardTitle>Histórico de medições</CardTitle>
                <div className="relative w-full md:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Buscar número ou cliente..." value={busca} onChange={(event) => setBusca(event.target.value)} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredMeasurements.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">Nenhuma medição gerada ainda.</div>
              ) : filteredMeasurements.map((measurement) => (
                <div key={measurement.id} className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-sm font-bold">{measurement.numero}</p>
                      <Badge variant={measurement.status === "cancelada" ? "destructive" : "default"}>{measurement.status === "cancelada" ? "Cancelada" : "Emitida"}</Badge>
                    </div>
                    <p className="mt-1 text-sm font-semibold">{measurement.clienteNome}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(measurement.periodoInicio)} até {fmtDate(measurement.periodoFim)} · {measurement.itens.length} item(ns) · {money(measurement.total)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelected(measurement)}><CalendarDays className="mr-1.5 h-3.5 w-3.5" /> Ver</Button>
                    <Button variant="outline" size="sm" onClick={() => { setSelected(measurement); setTimeout(() => window.print(), 150); }}><Printer className="mr-1.5 h-3.5 w-3.5" /> Imprimir</Button>
                    {measurement.status !== "cancelada" ? <Button variant="ghost" size="sm" onClick={() => handleCancel(measurement)}><Ban className="mr-1.5 h-3.5 w-3.5" /> Cancelar</Button> : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {selected ? <MeasurementPrint measurement={selected} /> : null}
        </>
      ) : null}
    </div>
  );
}
