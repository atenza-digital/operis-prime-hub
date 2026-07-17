import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { generateCertificateForOrder, getBootstrap, type BootstrapData, type CertificadoApp } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { imprimirCertificado } from "@/components/CertificadoImpressao";
import { Award, CalendarDays, Clock, FileCheck2, Hash, History, MapPin, Printer, QrCode, Search, Share2, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function fmtDate(date: string) {
  if (!date) return "—";
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
}

function addDays(dateStr: string, days: number) {
  const date = new Date(`${dateStr}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function validadeStatus(cert: CertificadoApp) {
  if (!cert.validadeDias) return "valid";
  const expiry = new Date(`${addDays(cert.dataExecucao, cert.validadeDias)}T23:59:59`);
  const today = new Date();
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "expiring";
  return "valid";
}

export default function Certificados() {
  const [params] = useSearchParams();
  const [data, setData] = useState<BootstrapData | null>(null);
  const [tab, setTab] = useState(params.get("tab") === "historico" ? "historico" : "certificados");
  const [busca, setBusca] = useState(params.get("hash") ?? "");
  const [clienteFilter, setClienteFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [gerando, setGerando] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      setData(await getBootstrap());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar certificados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const certs = data?.certificates ?? [];
  const ordens = data?.orders ?? [];
  const clientesUnicos = [...new Set([...certs.map((item) => item.clienteNome), ...ordens.map((item) => item.clienteNome)])].sort();
  const pendentes = ordens.filter((item) => item.status === "encerrada" && !item.certificadoHash);

  const certsFiltrados = useMemo(() => {
    const termo = busca.toLowerCase();
    return [...certs]
      .filter((item) => {
        const status = validadeStatus(item);
        if (clienteFilter !== "todos" && item.clienteNome !== clienteFilter) return false;
        if (statusFilter !== "todos" && status !== statusFilter) return false;
        if (termo && !item.hash.toLowerCase().includes(termo) && !item.clienteNome.toLowerCase().includes(termo) && !item.servico.toLowerCase().includes(termo)) return false;
        return true;
      })
      .reverse();
  }, [certs, busca, clienteFilter, statusFilter]);

  const historicoFiltrado = useMemo(() => {
    const termo = busca.toLowerCase();
    return [...ordens]
      .filter((item) => item.status === "encerrada")
      .filter((item) => {
        if (clienteFilter !== "todos" && item.clienteNome !== clienteFilter) return false;
        if (termo && !item.numero.toLowerCase().includes(termo) && !item.clienteNome.toLowerCase().includes(termo) && !item.servico.toLowerCase().includes(termo)) return false;
        return true;
      })
      .reverse();
  }, [ordens, busca, clienteFilter]);

  async function handleGerarCert(id: string) {
    setGerando(id);
    await generateCertificateForOrder(id);
    toast.success("Certificado gerado!");
    setGerando(null);
    reload();
  }

  async function handleCompartilhar(cert: CertificadoApp) {
    const text = `Certificado Ciperprag\nCliente: ${cert.clienteNome}\nServiço: ${cert.servico}\nData: ${fmtDate(cert.dataExecucao)}\nCódigo: ${cert.hash}`;
    if (navigator.share) await navigator.share({ title: "Certificado Ciperprag", text });
    else {
      await navigator.clipboard.writeText(text);
      toast.success("Texto do certificado copiado!");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operacional"
        title="Certificados e Histórico"
        description="Consulte certificados emitidos, encontre pendências e acompanhe todo o histórico operacional do cliente."
        crumbs={[{ label: "Operacional" }, { label: "Certificados e Histórico" }]}
        actions={[
          { label: "Atualizar lista", onClick: reload, variant: "outline" },
          { label: "Ver ordens", to: "/ordens", variant: "default" },
        ]}
      />

      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardContent className="grid gap-3 pt-5 text-sm md:grid-cols-4">
          <div className="rounded-2xl border bg-card p-4">
            <p className="flex items-center gap-2 font-semibold">
              <FileCheck2 className="h-4 w-4 text-primary" />
              1. OS encerrada
            </p>
            <p className="mt-2 text-muted-foreground">O certificado só nasce depois da OS encerrada com os dados de execução e evidências.</p>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <p className="flex items-center gap-2 font-semibold">
              <Award className="h-4 w-4 text-primary" />
              2. Serviço permitido
            </p>
            <p className="mt-2 text-muted-foreground">Se o serviço do contrato permite certificado, a OS aparece como pendente de emissão.</p>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <p className="flex items-center gap-2 font-semibold">
              <QrCode className="h-4 w-4 text-primary" />
              3. Validação pública
            </p>
            <p className="mt-2 text-muted-foreground">O QR Code leva à rota pública para conferir se os dados batem com o certificado.</p>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <p className="flex items-center gap-2 font-semibold">
              <History className="h-4 w-4 text-primary" />
              4. Histórico completo
            </p>
            <p className="mt-2 text-muted-foreground">Serviços com ou sem certificado permanecem consultáveis no histórico do cliente.</p>
          </div>
        </CardContent>
      </Card>

      {error ? <Card className="border-destructive/30 bg-destructive/5"><CardContent className="pt-4 text-sm text-muted-foreground">{error}</CardContent></Card> : null}
      {loading ? <Card><CardContent className="py-14 text-center text-sm text-muted-foreground">Carregando certificados e histórico...</CardContent></Card> : null}

      {!loading && pendentes.length > 0 ? (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
          <CardContent className="space-y-2 pt-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400"><Clock className="h-4 w-4" /> OS aguardando certificado</p>
            {pendentes.map((os) => (
              <div key={os.id} className="flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-white p-3 dark:bg-card">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{os.numero}</p>
                  <p className="text-xs text-muted-foreground">{os.clienteNome} • {os.servico}</p>
                </div>
                <Button size="sm" onClick={() => handleGerarCert(os.id)} disabled={gerando === os.id}>Gerar</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-44 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Buscar hash, OS, cliente ou serviço..." className="h-9 pl-9" value={busca} onChange={(event) => setBusca(event.target.value)} /></div>
        <Select value={clienteFilter} onValueChange={setClienteFilter}>
          <SelectTrigger className="h-9 w-48"><SelectValue placeholder="Cliente" /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todos os clientes</SelectItem>{clientesUnicos.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="certificados">Certificados</TabsTrigger><TabsTrigger value="historico">Histórico</TabsTrigger></TabsList>
        <TabsContent value="certificados" className="space-y-4">
          <div className="flex gap-1">
            {["todos", "valid", "expiring", "expired"].map((item) => (
              <button key={item} onClick={() => setStatusFilter(item)} className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition-all", statusFilter === item ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted")}>
                {item === "todos" ? "Todos" : item === "valid" ? "Válidos" : item === "expiring" ? "A vencer" : "Vencidos"}
              </button>
            ))}
          </div>
          {!loading && certsFiltrados.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">Nenhum certificado encontrado.</CardContent></Card>
          ) : !loading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {certsFiltrados.map((cert) => {
                const status = validadeStatus(cert);
                return (
                  <Card key={cert.id} className={cn("hover:shadow-md transition-all", status === "expired" && "border-destructive/30 bg-destructive/5", status === "expiring" && "border-amber-300")}>
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5"><Hash className="h-3.5 w-3.5 shrink-0 text-primary" /><span className="font-mono text-xs font-bold text-primary">{cert.hash}</span></div>
                        <Badge variant={status === "expired" ? "destructive" : status === "expiring" ? "secondary" : "default"}>{status === "expired" ? "Vencido" : status === "expiring" ? "A vencer" : "Válido"}</Badge>
                      </div>
                      <div><p className="truncate text-sm font-semibold leading-tight">{cert.clienteNome}</p><p className="mt-0.5 text-xs text-muted-foreground">{cert.servico}</p></div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5"><CalendarDays className="h-3 w-3 shrink-0" /><span>Executado: <span className="font-medium text-foreground">{fmtDate(cert.dataExecucao)}</span></span></div>
                        <div className="flex items-center gap-1.5"><User className="h-3 w-3 shrink-0" /> {cert.tecnicoNome}</div>
                        <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{cert.localExecucao || "Local não informado"}</span></div>
                      </div>
                      <div className="flex gap-2 border-t pt-1">
                        <Button size="sm" className="h-7 flex-1 gap-1.5 text-xs" onClick={() => imprimirCertificado(cert)}><Printer className="h-3 w-3" /> Imprimir PDF</Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleCompartilhar(cert)} title="Compartilhar"><Share2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : null}
        </TabsContent>
        <TabsContent value="historico">
          {!loading && historicoFiltrado.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">Nenhum serviço encerrado encontrado.</CardContent></Card>
          ) : !loading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {historicoFiltrado.map((os) => (
                <Card key={os.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-2"><span className="text-sm font-bold">{os.numero}</span><Badge variant={os.certificadoHash ? "default" : "secondary"}>{os.certificadoHash ? "Com certificado" : "Sem certificado"}</Badge></div>
                    <div><p className="text-sm font-semibold">{os.clienteNome}</p><p className="text-xs text-muted-foreground">{os.servico}</p></div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5"><CalendarDays className="h-3 w-3" /> {fmtDate(os.dataExecucao || os.dataEmissao)}</div>
                      <div className="flex items-center gap-1.5"><User className="h-3 w-3" /> {os.tecnicoNome}</div>
                      <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {os.localExecucao || "Local não informado"}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
