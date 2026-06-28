import { useEffect, useMemo, useState } from "react";
import { getBootstrap, type BootstrapData } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Receipt, Printer, AlertCircle } from "lucide-react";
import { toast } from "sonner";

function fmtDate(date: string) {
  if (!date) return "—";
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
}

function inRange(date: string, from?: string, to?: string) {
  if (!date) return false;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export default function Medicao() {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clienteSel, setClienteSel] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [gerada, setGerada] = useState(false);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      setData(await getBootstrap());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar medição.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const contratos = data?.contracts ?? [];
  const ordens = data?.orders ?? [];
  const clientes = data?.clients ?? [];
  const clientesDisponiveis = [...new Set(contratos.map((item) => item.cliente))].sort();
  const clienteObj = clientes.find((item) => item.razaoSocial === clienteSel);

  const itens = useMemo(
    () =>
      ordens
        .filter((item) => item.status === "encerrada" && item.clienteNome === clienteSel && inRange(item.dataExecucao || item.dataEmissao, dataInicio, dataFim))
        .map((item) => {
          const contrato = contratos.find((entry) => entry.id === item.contratoId);
          const valorUnitario = contrato?.valorUnitario ?? 0;
          return {
            id: item.id,
            numero: item.numero,
            servico: item.servico,
            quantidade: item.quantidade,
            unidade: item.unidade,
            valorUnitario,
            valorTotal: valorUnitario * item.quantidade,
            data: item.dataExecucao || item.dataEmissao,
          };
        }),
    [ordens, contratos, clienteSel, dataInicio, dataFim],
  );

  const totalMedicao = itens.reduce((acc, item) => acc + item.valorTotal, 0);
  const numeroMedicao = `${Math.floor(100 + Math.random() * 900)}/${new Date().getFullYear()}`;

  function handleGerar() {
    if (!clienteSel || !dataInicio || !dataFim) return toast.error("Selecione o cliente e o intervalo da medição.");
    if (!itens.length) return toast.warning("Nenhuma OS encerrada encontrada para o período.");
    setGerada(true);
    toast.success("Medição gerada com sucesso!");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operacional"
        title="Medição"
        description="Consolide as OS encerradas por intervalo de datas e gere a medição pronta para impressão."
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
          <Card className="panel-soft">
            <CardHeader><CardTitle>Dados da medição</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Cliente</Label>
                  <Select value={clienteSel} onValueChange={(value) => { setClienteSel(value); setGerada(false); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                    <SelectContent>{clientesDisponiveis.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Data inicial</Label><Input type="date" value={dataInicio} onChange={(event) => { setDataInicio(event.target.value); setGerada(false); }} /></div>
                <div className="space-y-1.5"><Label>Data final</Label><Input type="date" value={dataFim} onChange={(event) => { setDataFim(event.target.value); setGerada(false); }} /></div>
              </div>

              {clienteSel ? (
                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                  {itens.length ? (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span><strong>{itens.length}</strong> OS encerrada(s) no período</span>
                      <span className="font-bold">R$ {totalMedicao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground"><AlertCircle className="h-4 w-4" /><span>Nenhuma OS encerrada para o intervalo informado.</span></div>
                  )}
                </div>
              ) : null}

              <div className="flex gap-3">
                <Button onClick={handleGerar} className="flex-1 gap-2" size="lg" disabled={!clienteSel || !dataInicio || !dataFim || !itens.length}><Receipt className="h-4 w-4" /> Gerar medição</Button>
                {gerada ? <Button onClick={() => window.print()} variant="outline" size="lg" className="gap-2"><Printer className="h-4 w-4" /> Imprimir PDF</Button> : null}
              </div>
            </CardContent>
          </Card>

          {gerada && clienteSel ? (
            <div className="bg-white text-black print:m-0 print:p-0">
              <div className="mx-auto max-w-[210mm] space-y-5 border border-gray-300 p-8 text-[11px] print:border-none print:p-6">
                <div className="flex items-start justify-between border-b-2 border-emerald-700 pb-4">
                  <div><div className="text-xl font-extrabold tracking-tight text-emerald-700">CIPERPRAG</div><div className="text-[9px] font-medium tracking-[0.3em] text-gray-500">SERVIÇOS</div></div>
                  <div className="text-right text-[10px]"><p className="font-bold">Medição {numeroMedicao}</p><p>Gerada em {new Date().toLocaleDateString("pt-BR")}</p></div>
                </div>
                <h2 className="text-center text-lg font-bold uppercase underline">Medição</h2>
                <div className="space-y-1 border border-gray-400 p-3 text-[11px]"><p><strong>Contratante:</strong> {clienteSel}</p><p><strong>Endereço:</strong> {clienteObj ? `${clienteObj.endereco}, ${clienteObj.municipio}-${clienteObj.uf}` : "—"}</p><p><strong>Período:</strong> {fmtDate(dataInicio)} até {fmtDate(dataFim)}</p></div>
                <table className="w-full border-collapse text-[11px]">
                  <thead><tr className="bg-gray-100">{["ITEM", "SERVIÇO", "OS", "DATA", "QTD.", "VALOR UNIT.", "VALOR TOTAL"].map((head) => <th key={head} className="border border-gray-400 px-2 py-1.5 text-center font-bold">{head}</th>)}</tr></thead>
                  <tbody>{itens.map((item, index) => <tr key={item.id}><td className="border border-gray-400 px-2 py-1.5 text-center">{index + 1}</td><td className="border border-gray-400 px-2 py-1.5">{item.servico}</td><td className="border border-gray-400 px-2 py-1.5 text-center font-mono">{item.numero}</td><td className="border border-gray-400 px-2 py-1.5 text-center">{fmtDate(item.data)}</td><td className="border border-gray-400 px-2 py-1.5 text-center">{item.quantidade} {item.unidade}</td><td className="border border-gray-400 px-2 py-1.5 text-right">R$ {item.valorUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td><td className="border border-gray-400 px-2 py-1.5 text-right font-medium">R$ {item.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td></tr>)}</tbody>
                  <tfoot><tr className="bg-gray-50"><td colSpan={6} className="border border-gray-400 px-2 py-2 text-right font-bold">TOTAL DA MEDIÇÃO</td><td className="border border-gray-400 px-2 py-2 text-right font-bold text-emerald-700">R$ {totalMedicao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td></tr></tfoot>
                </table>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
