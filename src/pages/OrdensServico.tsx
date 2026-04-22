import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { contratos, licencas } from "@/data/mockData";
import { clientes as clientesCad, servicosCatalogo } from "@/data/comercialData";
import { tecnicos as tecnicosList } from "@/data/equipesData";
import {
  getOrdens, updateOrdem, addCertificado, getAgendamentos,
  updateAgendamento, generateHash, nextCertNumber, addOrdem, nextOSNumber,
  OSApp, CertificadoApp,
} from "@/lib/appStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ClipboardList, ImagePlus, FileCheck2, CheckCircle2, X,
  Eye, Search, Filter, FileText, CalendarPlus, User,
  MapPin, Tag, Printer, Download, AlertCircle, Clock,
  ChevronDown, ChevronUp, PenLine, Award,
} from "lucide-react";
import { toast } from "sonner";
import { useReactToPrint } from "react-to-print";

// PDF geração via iframe print (sem biblioteca extra)
function printElement(el: HTMLElement, title: string) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) { window.print(); return; }
  w.document.write(`<!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <title>${title}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; font-size: 11px; padding: 10mm; color: #000; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #555; padding: 4px 6px; }
      th { background: #f0f0f0; font-weight: bold; }
      h2 { text-align: center; margin-bottom: 12px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #166534; padding-bottom: 12px; margin-bottom: 12px; }
      .logo-box { background:#166534; color:#fff; width:50px; height:50px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:18px; border-radius:6px; }
      .field { margin-bottom: 4px; }
      .label { color:#666; font-size:10px; }
      .section { border: 1px solid #555; margin-bottom: 8px; }
      .section-header { background:#f0f0f0; padding:4px 8px; font-weight:bold; border-bottom:1px solid #555; }
      .section-body { padding: 6px 8px; }
      ul { padding-left: 16px; }
      li { margin-bottom: 3px; }
      .footer { border-top: 2px solid #166534; padding-top: 6px; text-align: center; color: #666; font-size:9px; margin-top: 12px; }
      @media print { @page { margin: 10mm; } }
    </style>
  </head><body>${el.innerHTML}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 500);
}

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  aberta:    { label: "Aberta",    color: "bg-blue-100 text-blue-700 border-blue-200" },
  encerrada: { label: "Encerrada", color: "bg-green-100 text-green-700 border-green-200" },
};

// ═══════════════════════════════════════════════════════════════
export default function OrdensServico() {
  const navigate = useNavigate();
  const [ordens, setOrdens] = useState<OSApp[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [activeTab, setActiveTab] = useState("lista");

  // ── Encerrar OS dialog ─────────────────────────────────
  const [encDialog, setEncDialog] = useState(false);
  const [encOsId, setEncOsId] = useState("");
  const [dataExecucao, setDataExecucao] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [fotos, setFotos] = useState<{ preview: string; base64: string }[]>([]);
  const [encerrada, setEncerrada] = useState(false);
  const [certHash, setCertHash] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Visualizar OS ──────────────────────────────────────
  const [viewOs, setViewOs] = useState<OSApp | null>(null);
  const osViewRef = useRef<HTMLDivElement>(null);

  // ── Editar OS ─────────────────────────────────────────
  const [editOs, setEditOs] = useState<OSApp | null>(null);
  const [editTecnico, setEditTecnico] = useState("");
  const [editLocal, setEditLocal] = useState("");
  const [editObs, setEditObs] = useState("");

  useEffect(() => { setOrdens(getOrdens()); }, []);
  function reload() { setOrdens(getOrdens()); }

  const os = useMemo(() => ordens.find(o => o.id === encOsId), [encOsId, ordens]);
  const contrato = useMemo(() => os ? contratos.find(c => c.id === os.contratoId) : null, [os]);
  const servicoCat = useMemo(() => os ? servicosCatalogo.find(s => s.nome === os.servico) : null, [os]);
  const saldoAtual = useMemo(() => contrato ? contrato.contratado - contrato.executado : 0, [contrato]);
  const saldoApos = useMemo(() => saldoAtual - Number(quantidade), [saldoAtual, quantidade]);

  const ordensFiltradas = useMemo(() => {
    let list = [...ordens].reverse();
    if (filtroStatus !== "todos") list = list.filter(o => o.status === filtroStatus);
    if (busca) {
      const q = busca.toLowerCase();
      list = list.filter(o =>
        o.numero.toLowerCase().includes(q) ||
        o.clienteNome.toLowerCase().includes(q) ||
        o.servico.toLowerCase().includes(q) ||
        (o.tecnicoNome || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [ordens, filtroStatus, busca]);

  const counts = useMemo(() => ({
    todos: ordens.length,
    aberta: ordens.filter(o => o.status === "aberta").length,
    encerrada: ordens.filter(o => o.status === "encerrada").length,
  }), [ordens]);

  // ── Fotos upload ────────────────────────────────────────
  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    files.slice(0, 3 - fotos.length).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        // Comprime antes de salvar (resize para max 800px)
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX = 800;
          const scale = Math.min(1, MAX / Math.max(img.width, img.height));
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL("image/jpeg", 0.7);
          setFotos(prev => [...prev, { preview: compressed, base64: compressed }]);
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  // ── Encerrar OS ─────────────────────────────────────────
  function openEnc(osId: string) {
    setEncOsId(osId);
    setDataExecucao(new Date().toISOString().split("T")[0]);
    setQuantidade("1");
    setFotos([]);
    setEncerrada(false);
    setCertHash("");
    setEncDialog(true);
  }

  function handleEncerrar() {
    if (!os) return;
    if (!dataExecucao) { toast.error("Informe a data de execução"); return; }
    if (fotos.length < 3) { toast.error("Adicione 3 fotos de evidência"); return; }

    const geraCert = servicoCat?.geraCertificado ?? (os.tipo === "sanitario");
    const hash = geraCert ? generateHash() : undefined;

    updateOrdem(os.id, {
      status: "encerrada",
      dataExecucao,
      quantidade: Number(quantidade),
      fotos: fotos.map(f => f.base64),
      certificadoHash: hash,
    });

    if (os.agendamentoId) updateAgendamento(os.agendamentoId, { status: "encerrado" });

    if (hash) {
      const clienteCad = clientesCad.find(c => c.razaoSocial === os.clienteNome);
      const svc = servicosCatalogo.find(s => s.nome === os.servico);
      const cert: CertificadoApp = {
        id: Date.now().toString(),
        hash,
        numero: nextCertNumber(),
        osId: os.id,
        osNumero: os.numero,
        clienteNome: os.clienteNome,
        clienteCnpj: os.clienteCnpj,
        clienteEndereco: clienteCad ? `${clienteCad.endereco}, ${clienteCad.bairro}, ${clienteCad.municipio}-${clienteCad.uf}` : os.clienteEndereco,
        clienteLogoUrl: clienteCad?.logoUrl,
        contratoId: os.contratoId,
        servico: os.servico,
        tecnicoNome: os.tecnicoNome,
        localExecucao: os.localExecucao,
        dataExecucao,
        emitidoEm: new Date().toISOString(),
        validadeDias: svc?.validadeCertificadoDias ?? 180,
        produtosQuimicos: svc?.produtosQuimicos,
      };
      addCertificado(cert);
      setCertHash(hash);
      toast.success(`OS encerrada! Certificado ${hash} gerado.`);
    } else {
      toast.success("OS encerrada com sucesso!");
    }
    setEncerrada(true);
    reload();
  }

  // ── Imprimir OS ─────────────────────────────────────────
  function handleImprimirOS(o: OSApp) {
    const cont = contratos.find(c => c.id === o.contratoId);
    const el = document.createElement("div");
    el.innerHTML = gerarHtmlOS(o, cont);
    printElement(el, o.numero);
  }

  // ── Editar OS ────────────────────────────────────────────
  function openEdit(o: OSApp) {
    setEditOs(o);
    setEditTecnico(o.tecnicoNome || "");
    setEditLocal(o.localExecucao || "");
    setEditObs("");
  }

  function handleSaveEdit() {
    if (!editOs) return;
    updateOrdem(editOs.id, { tecnicoNome: editTecnico, localExecucao: editLocal });
    reload();
    setEditOs(null);
    toast.success("OS atualizada!");
  }

  // ═══════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" /> Ordens de Serviço
        </h1>
        <p className="text-muted-foreground text-sm">Gerencie todas as ordens de serviço — emissão, encerramento e consulta</p>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total OS", value: counts.todos, icon: ClipboardList, color: "text-foreground" },
          { label: "Abertas", value: counts.aberta, icon: Clock, color: "text-blue-600" },
          { label: "Encerradas", value: counts.encerrada, icon: CheckCircle2, color: "text-green-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 pt-5 pb-4">
              <div className={`rounded-lg bg-muted p-2 ${color}`}><Icon className="h-5 w-5" /></div>
              <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-44">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="Buscar OS, cliente, técnico..." className="pl-9 h-9" value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {["todos", "aberta", "encerrada"].map(s => (
            <button key={s} onClick={() => setFiltroStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filtroStatus === s ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}>
              {s === "todos" ? `Todas (${counts.todos})` : s === "aberta" ? `Abertas (${counts.aberta})` : `Encerradas (${counts.encerrada})`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Lista ── */}
      {ordensFiltradas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ClipboardList className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">Nenhuma OS encontrada</p>
            <p className="text-xs mt-1">As OS são criadas a partir dos agendamentos</p>
            <Button variant="outline" className="mt-4 gap-2" onClick={() => navigate("/agendar")}>
              <CalendarPlus className="h-4 w-4" /> Ir para Agendamentos
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ordensFiltradas.map(o => {
            const st = STATUS_CFG[o.status];
            const svc = servicosCatalogo.find(s => s.nome === o.servico);
            return (
              <Card key={o.id} className="hover:shadow-md transition-all">
                <CardContent className="p-4 space-y-3">
                  {/* Header card */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-base">{o.numero}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(o.dataEmissao)}</p>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
                  </div>

                  {/* Dados */}
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-sm truncate">{o.clienteNome}</p>
                    <p className="text-muted-foreground truncate">{o.servico}</p>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <User className="h-3 w-3 shrink-0" /> {o.tecnicoNome}
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" /> {o.localExecucao}
                    </div>
                    {o.dataExecucao && (
                      <p className="text-muted-foreground">Executado: <span className="font-medium text-foreground">{fmtDate(o.dataExecucao)}</span></p>
                    )}
                    {o.certificadoHash && (
                      <p className="flex items-center gap-1 text-primary font-medium">
                        <Award className="h-3 w-3" /> {o.certificadoHash}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1.5 pt-1 border-t flex-wrap">
                    <Button size="sm" variant="outline" className="flex-1 gap-1 h-7 text-xs" onClick={() => setViewOs(o)}>
                      <Eye className="h-3 w-3" /> Ver
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1 h-7 text-xs" onClick={() => handleImprimirOS(o)}>
                      <Printer className="h-3 w-3" /> PDF
                    </Button>
                    {o.status === "aberta" && (
                      <>
                        <Button size="sm" variant="outline" className="flex-1 gap-1 h-7 text-xs" onClick={() => openEdit(o)}>
                          <PenLine className="h-3 w-3" /> Editar
                        </Button>
                        <Button size="sm" className="w-full gap-1 h-7 text-xs mt-1" onClick={() => openEnc(o.id)}>
                          <FileCheck2 className="h-3 w-3" /> Encerrar OS
                        </Button>
                      </>
                    )}
                    {o.status === "encerrada" && o.certificadoHash && (
                      <Button size="sm" variant="outline" className="flex-1 gap-1 h-7 text-xs" onClick={() => navigate(`/certificados?hash=${o.certificadoHash}`)}>
                        <Award className="h-3 w-3" /> Certificado
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ═══ Dialog Encerrar OS ═══ */}
      <Dialog open={encDialog} onOpenChange={v => { if (!v) setEncDialog(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-primary" />
              {encerrada ? "OS Encerrada!" : `Encerrar ${os?.numero}`}
            </DialogTitle>
          </DialogHeader>

          {!encerrada ? (
            <div className="space-y-4">
              {os && (
                <div className="rounded-lg bg-muted/40 border p-3 text-xs grid grid-cols-2 gap-1.5">
                  <span className="text-muted-foreground">Cliente</span><span className="font-medium">{os.clienteNome}</span>
                  <span className="text-muted-foreground">Serviço</span><span>{os.servico}</span>
                  <span className="text-muted-foreground">Técnico</span><span>{os.tecnicoNome}</span>
                  <span className="text-muted-foreground">Local</span><span>{os.localExecucao}</span>
                  {servicoCat && (
                    <><span className="text-muted-foreground">Gera Cert.</span>
                    <Badge variant={servicoCat.geraCertificado ? "default" : "secondary"} className="text-[10px] h-4 w-fit">
                      {servicoCat.geraCertificado ? "Sim" : "Não"}
                    </Badge></>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Data de Execução <span className="text-destructive">*</span></Label>
                  <Input type="date" value={dataExecucao} onChange={e => setDataExecucao(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Quantidade</Label>
                  <Input type="number" min="1" value={quantidade} onChange={e => setQuantidade(e.target.value)} />
                  {saldoApos < 0 && <p className="text-[10px] text-destructive">⚠️ Excede saldo!</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Fotos de Evidência <span className="text-destructive">*</span> <span className="text-muted-foreground text-xs">(3 obrigatórias)</span></Label>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFotoChange} />
                <div className="flex gap-3">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="relative">
                      {fotos[i] ? (
                        <div className="h-24 w-24 rounded-lg border-2 border-primary overflow-hidden group relative">
                          <img src={fotos[i].preview} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => setFotos(p => p.filter((_, j) => j !== i))}
                            className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="h-3 w-3 text-white" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => fileInputRef.current?.click()}
                          className="h-24 w-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-xs text-muted-foreground hover:border-primary/50 transition-colors">
                          <ImagePlus className="h-5 w-5 mb-1" />
                          Foto {i + 1}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{fotos.length}/3 adicionadas</p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEncDialog(false)}>Cancelar</Button>
                <Button onClick={handleEncerrar} disabled={fotos.length < 3 || !dataExecucao} className="gap-2">
                  <FileCheck2 className="h-4 w-4" />
                  {servicoCat?.geraCertificado ? "Encerrar e Gerar Cert." : "Encerrar OS"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 p-5 text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
                <p className="font-bold text-green-700">OS encerrada com sucesso!</p>
                {certHash && (
                  <p className="font-mono text-lg font-bold text-primary">{certHash}</p>
                )}
              </div>
              {certHash && (
                <p className="text-xs text-center text-muted-foreground">Certificado gerado automaticamente. Acesse em <strong>Certificados</strong> para imprimir.</p>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEncDialog(false)}>Fechar</Button>
                {certHash && (
                  <Button onClick={() => { setEncDialog(false); navigate(`/certificados`); }}>
                    <Award className="h-4 w-4 mr-1.5" /> Ver Certificados
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ Dialog Visualizar OS ═══ */}
      <Dialog open={!!viewOs} onOpenChange={v => { if (!v) setViewOs(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{viewOs?.numero}</span>
              <Button size="sm" variant="outline" className="mr-6 gap-1.5" onClick={() => viewOs && handleImprimirOS(viewOs)}>
                <Printer className="h-3.5 w-3.5" /> Baixar PDF
              </Button>
            </DialogTitle>
          </DialogHeader>
          {viewOs && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Número", viewOs.numero],
                  ["Status", viewOs.status === "aberta" ? "🔵 Aberta" : "✅ Encerrada"],
                  ["Cliente", viewOs.clienteNome],
                  ["CNPJ", viewOs.clienteCnpj],
                  ["Serviço", viewOs.servico],
                  ["Contrato", viewOs.contratoId],
                  ["Técnico", viewOs.tecnicoNome],
                  ["Local", viewOs.localExecucao],
                  ["Emissão", fmtDate(viewOs.dataEmissao)],
                  ["Execução", viewOs.dataExecucao ? fmtDate(viewOs.dataExecucao) : "—"],
                  ["Quantidade", `${viewOs.quantidade} ${viewOs.unidade}`],
                  ["Certificado", viewOs.certificadoHash || "—"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-muted/30 border p-2">
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="font-medium text-xs">{value}</p>
                  </div>
                ))}
              </div>
              {viewOs.fotos?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Fotos de evidência:</p>
                  <div className="flex gap-2">
                    {viewOs.fotos.map((f, i) => (
                      <img key={i} src={f} alt={`Foto ${i + 1}`} className="h-24 w-24 rounded-lg object-cover border" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ Dialog Editar OS ═══ */}
      <Dialog open={!!editOs} onOpenChange={v => { if (!v) setEditOs(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="h-4 w-4 text-primary" /> Editar OS — {editOs?.numero}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Técnico Responsável</Label>
              <Select value={editTecnico} onValueChange={setEditTecnico}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tecnicosList.filter(t => t.ativo).map(t => (
                    <SelectItem key={t.id} value={t.nome}>{t.nome} — {t.cargo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Local de Execução</Label>
              <Input value={editLocal} onChange={e => setEditLocal(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOs(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── HTML da OS para impressão/PDF ─────────────────────────────
function gerarHtmlOS(o: OSApp, contrato: any): string {
  return `
    <div class="header">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="logo-box">CP</div>
        <div>
          <div style="font-size:18px;font-weight:800;color:#166534">CIPERPRAG</div>
          <div style="font-size:9px;letter-spacing:3px;color:#888">S E R V I Ç O S</div>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:14px;font-weight:bold">${o.numero}</div>
        <div style="font-size:10px;color:#666">Emitida em ${new Date(o.dataEmissao + "T12:00:00").toLocaleDateString("pt-BR")}</div>
      </div>
    </div>

    <h2>ORDEM DE SERVIÇO</h2>

    <table style="margin-bottom:8px">
      <tr>
        <td style="background:#f5f5f5;font-weight:bold;width:140px">SETOR:</td><td>OPERACIONAL</td>
        <td style="background:#f5f5f5;font-weight:bold;width:120px">DATA EMISSÃO:</td>
        <td>${new Date(o.dataEmissao + "T12:00:00").toLocaleDateString("pt-BR")}</td>
      </tr>
      <tr>
        <td style="background:#f5f5f5;font-weight:bold">COLABORADOR:</td><td>${o.tecnicoNome}</td>
        <td style="background:#f5f5f5;font-weight:bold">CPF:</td><td>${o.tecnicoCpf || "___.___.___-__"}</td>
      </tr>
      <tr>
        <td style="background:#f5f5f5;font-weight:bold">CLIENTE:</td><td>${o.clienteNome}</td>
        <td style="background:#f5f5f5;font-weight:bold">CNPJ:</td><td>${o.clienteCnpj}</td>
      </tr>
      <tr>
        <td style="background:#f5f5f5;font-weight:bold">LOCAL:</td><td>${o.localExecucao}</td>
        <td style="background:#f5f5f5;font-weight:bold">CONTRATO:</td><td>${o.contratoId}</td>
      </tr>
    </table>

    <div class="section">
      <div class="section-header">Descrição das Atividades:</div>
      <div class="section-body">${o.servico.toUpperCase()}</div>
    </div>

    ${contrato?.epis?.length ? `
    <div class="section">
      <div class="section-header">EPIs Obrigatórios:</div>
      <div class="section-body">${contrato.epis.join(" &bull; ")}</div>
    </div>` : ""}

    <div class="section">
      <div class="section-header">Procedimentos de Segurança:</div>
      <div class="section-body">
        <ul>
          <li>Utilizar todos os EPIs listados antes de iniciar os trabalhos.</li>
          <li>Sinalizar e isolar a área de trabalho com cones e correntes.</li>
          <li>Em caso de emergência, evacuar a área e acionar o supervisor.</li>
          <li>Não executar trabalhos sem ter recebido o treinamento necessário.</li>
          <li>Comunicar imediatamente qualquer acidente ou incidente.</li>
        </ul>
      </div>
    </div>

    <div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:40px">
      <div>
        <div style="border-bottom:1px solid #333;padding-bottom:40px;margin-bottom:4px"></div>
        <div style="font-size:10px">Assinatura do Colaborador</div>
      </div>
      <div>
        <div style="border-bottom:1px solid #333;padding-bottom:40px;margin-bottom:4px"></div>
        <div style="font-size:10px">Acompanhante / Guarita</div>
      </div>
    </div>

    <div class="footer">
      CIPERPRAG Controle de Pragas e Serviços LTDA &bull; CNPJ 15.722.292/0001-43 &bull;
      Rua Tiradentes 190, Centro, Rondon do Pará &bull; (94) 99258-2761
    </div>
  `;
}
