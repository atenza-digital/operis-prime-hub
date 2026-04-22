import { useState, useMemo, useEffect } from "react";
import { contratos } from "@/data/mockData";
import { clientes as clientesCad, servicosCatalogo } from "@/data/comercialData";
import { tecnicos as tecnicosList } from "@/data/equipesData";
import {
  AgendamentoApp, OSApp,
  getAgendamentos, addAgendamento, updateAgendamento,
  getOrdens, addOrdem, nextOSNumber,
} from "@/lib/appStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  CalendarPlus, ShieldAlert, FileText, Printer, Trash2,
  CheckCircle2, Clock, XCircle, Plus, FileCheck2, User,
  MapPin, Tag, MessageSquare, ChevronDown, ChevronUp,
  AlertTriangle, Building2,
} from "lucide-react";
import { toast } from "sonner";

// ── helpers ──────────────────────────────────────────────────
function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}
function newId() {
  return "AG-" + Date.now().toString(36).toUpperCase();
}
function diasAte(d: string) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const data = new Date(d + "T00:00:00");
  return Math.ceil((data.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

const STATUS_CFG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  agendado:  { label: "Agendado",  color: "bg-blue-100 text-blue-700 border-blue-200",    icon: Clock },
  os_gerada: { label: "OS Gerada", color: "bg-green-100 text-green-700 border-green-200", icon: FileCheck2 },
  encerrado: { label: "Encerrado", color: "bg-gray-100 text-gray-600 border-gray-200",    icon: CheckCircle2 },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-600 border-red-200",       icon: XCircle },
};

// ═══════════════════════════════════════════════════════════════
export default function Agendamento() {
  // ── form ────────────────────────────────────────────────
  const [clienteId, setClienteId] = useState("");
  const [contratoId, setContratoId] = useState("");
  const [dataAgendada, setDataAgendada] = useState("");
  const [localExecucao, setLocalExecucao] = useState("");
  const [tags, setTags] = useState("");
  const [observacao, setObservacao] = useState("");
  const [formOpen, setFormOpen] = useState(true);

  // ── lista ────────────────────────────────────────────────
  const [agendamentos, setAgendamentos] = useState<AgendamentoApp[]>([]);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroCliente, setFiltroCliente] = useState("");

  // ── OS dialog ────────────────────────────────────────────
  const [osDialog, setOsDialog] = useState(false);
  const [osAgId, setOsAgId] = useState<string | null>(null);
  const [osTecnico, setOsTecnico] = useState("");
  const [osGerada, setOsGerada] = useState<OSApp | null>(null);

  useEffect(() => { setAgendamentos(getAgendamentos()); }, []);
  function reload() { setAgendamentos(getAgendamentos()); }

  // ── Clientes do cadastro ─────────────────────────────────
  const clientesAtivos = useMemo(() => clientesCad.filter(c => c.ativo), []);

  // ── Contratos do cliente selecionado ─────────────────────
  const contratosCliente = useMemo(
    () => contratos.filter((c: any) => c.cliente === clienteId),
    [clienteId]
  );
  const contratoAtivo = useMemo(() => contratos.find((c: any) => c.id === contratoId), [contratoId]);
  const clienteObj = useMemo(() => clientesCad.find(c => c.id === clienteId || c.razaoSocial === clienteId), [clienteId]);

  const agFiltrados = useMemo(() => {
    let list = [...agendamentos].reverse();
    if (filtroStatus !== "todos") list = list.filter(a => a.status === filtroStatus);
    if (filtroCliente) list = list.filter(a => a.clienteNome.toLowerCase().includes(filtroCliente.toLowerCase()));
    return list;
  }, [agendamentos, filtroStatus, filtroCliente]);

  // ── contadores ────────────────────────────────────────────
  const counts = useMemo(() => {
    const r: Record<string, number> = { todos: agendamentos.length };
    for (const s of Object.keys(STATUS_CFG)) r[s] = agendamentos.filter(a => a.status === s).length;
    return r;
  }, [agendamentos]);

  // ── criar agendamento ─────────────────────────────────────
  function handleAgendar() {
    if (!clienteId || !contratoId || !dataAgendada || !localExecucao) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    const clienteFinal = clientesCad.find(c => c.id === clienteId)?.razaoSocial || clienteId;
    const ag: AgendamentoApp = {
      id: newId(),
      clienteId,
      clienteNome: contratoAtivo.cliente,
      clienteCnpj: contratoAtivo.cnpj,
      contratoId,
      servico: contratoAtivo.servico,
      tipo: contratoAtivo.tipo,
      dataAgendada,
      localExecucao,
      tags,
      observacao,
      status: "agendado",
      createdAt: new Date().toISOString(),
    };
    addAgendamento(ag);
    toast.success("Agendamento criado!", { description: `${ag.servico} — ${fmtDate(dataAgendada)}` });
    setContratoId(""); setDataAgendada(""); setLocalExecucao(""); setTags(""); setObservacao("");
    reload();
  }

  function handleCancelar(id: string) {
    if (!confirm("Cancelar este agendamento?")) return;
    updateAgendamento(id, { status: "cancelado" });
    reload();
    toast.info("Agendamento cancelado");
  }

  // ── OS dialog ─────────────────────────────────────────────
  function openOsDialog(agId: string) {
    setOsAgId(agId); setOsTecnico(""); setOsGerada(null); setOsDialog(true);
  }

  const agDaOs = useMemo(() => agendamentos.find(a => a.id === osAgId), [osAgId, agendamentos]);
  const contratoDaOs = useMemo(() => agDaOs ? contratos.find((c: any) => c.id === agDaOs.contratoId) : null, [agDaOs]);
  const tecnicoSel = useMemo(() => tecnicosList.find(t => t.nome === osTecnico), [osTecnico]);

  function handleGerarOS() {
    if (!osAgId || !osTecnico) { toast.error("Selecione o técnico"); return; }
    const ag = agendamentos.find(a => a.id === osAgId)!;
    const contrato = contratos.find((c: any) => c.id === ag.contratoId)!;
    const clienteCad = clientesCad.find(c => c.razaoSocial === ag.clienteNome);
    const tecnico = tecnicosList.find(t => t.nome === osTecnico);

    const os: OSApp = {
      id: Date.now().toString(),
      numero: nextOSNumber(),
      agendamentoId: ag.id,
      clienteId: ag.clienteId,
      clienteNome: ag.clienteNome,
      clienteCnpj: ag.clienteCnpj,
      clienteEndereco: clienteCad?.endereco,
      clienteLogoUrl: clienteCad?.logoUrl,
      contratoId: ag.contratoId,
      servico: ag.servico,
      tipo: ag.tipo,
      tecnicoNome: osTecnico,
      tecnicoCpf: tecnico?.cpf,
      tecnicoDataAdmissao: tecnico?.dataAdmissao,
      localExecucao: ag.localExecucao,
      tags: ag.tags,
      dataEmissao: new Date().toISOString().split("T")[0],
      quantidade: 1,
      unidade: contrato.unidade,
      status: "aberta",
      fotos: [],
    };

    addOrdem(os);
    updateAgendamento(ag.id, { status: "os_gerada", osId: os.id });
    setOsGerada(os);
    reload();
    toast.success(`${os.numero} gerada com sucesso!`);
  }

  // ═══════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarPlus className="h-6 w-6 text-primary" />
            Agendamentos
          </h1>
          <p className="text-muted-foreground text-sm">Crie agendamentos e gerencie a fila de serviços</p>
        </div>
        <Button onClick={() => setFormOpen(v => !v)} variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Agendamento
          {formOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* ── Formulário colapsável ── */}
      {formOpen && (
        <Card className="border-primary/20 bg-primary/3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" /> Novo Agendamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {/* Cliente */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Cliente <span className="text-destructive">*</span></Label>
                <Select value={clienteId} onValueChange={(v) => { setClienteId(v); setContratoId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>
                    {clientesAtivos.map(c => (
                      <SelectItem key={c.id} value={c.razaoSocial}>{c.nomeFantasia} — {c.razaoSocial}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Contrato */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Contrato / Serviço <span className="text-destructive">*</span></Label>
                <Select value={contratoId} onValueChange={setContratoId} disabled={!clienteId}>
                  <SelectTrigger><SelectValue placeholder={clienteId ? "Selecione o serviço" : "Selecione o cliente primeiro"} /></SelectTrigger>
                  <SelectContent>
                    {contratosCliente.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          {c.servico}
                          <span className="text-muted-foreground text-xs">({c.id})</span>
                          {c.status === "vencido" && <span className="text-amber-500">⚠️</span>}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><CalendarPlus className="h-3.5 w-3.5" /> Data <span className="text-destructive">*</span></Label>
                <Input type="date" value={dataAgendada} onChange={e => setDataAgendada(e.target.value)} disabled={!contratoId} />
              </div>

              {/* Local */}
              <div className="space-y-1.5 md:col-span-2">
                <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Local de Execução <span className="text-destructive">*</span></Label>
                <Input placeholder="Ex: República Administrativa 01, Bloco A..." value={localExecucao} onChange={e => setLocalExecucao(e.target.value)} disabled={!contratoId} />
              </div>

              {/* Tags */}
              {contratoAtivo?.tags && (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> TAGs dos equipamentos</Label>
                  <Input placeholder="Ex: BEB-01, BEB-02" value={tags} onChange={e => setTags(e.target.value)} />
                  <div className="flex flex-wrap gap-1">
                    {contratoAtivo.tags.map((t: string) => (
                      <button key={t} type="button" onClick={() => setTags(p => p ? p + ", " + t : t)}
                        className="text-[10px] px-2 py-0.5 rounded-full border hover:bg-primary/10 hover:border-primary/40 transition-colors">
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Observação */}
              <div className="space-y-1.5 md:col-span-2">
                <Label className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Observação</Label>
                <Textarea placeholder="Informações adicionais para a equipe..." value={observacao} onChange={e => setObservacao(e.target.value)} rows={2} />
              </div>
            </div>

            {/* Info do contrato + EPIs */}
            {contratoAtivo && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/40 border p-3 text-xs space-y-1">
                  <p className="font-semibold text-foreground mb-1.5">Resumo do Contrato</p>
                  <p className="text-muted-foreground">Tipo: <span className="font-medium text-foreground">{contratoAtivo.tipo === "sanitario" ? "Sanitário" : "Manutenção"}</span></p>
                  <p className="text-muted-foreground">Saldo: <span className="font-bold text-foreground">{contratoAtivo.contratado - contratoAtivo.executado} {contratoAtivo.unidade}</span></p>
                  {contratoAtivo.validadeDias > 0 && <p className="text-muted-foreground">Recorrência: <span className="font-medium text-foreground">a cada {contratoAtivo.validadeDias} dias</span></p>}
                  <p className="text-muted-foreground">Valor unitário: <span className="font-medium text-foreground">R$ {contratoAtivo.valorUnitario?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></p>
                </div>

                {contratoAtivo.tipo === "sanitario" && (contratoAtivo.epis?.length || contratoAtivo.riscos?.length) && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs space-y-2">
                    <p className="font-semibold flex items-center gap-1 text-amber-700 dark:text-amber-400">
                      <ShieldAlert className="h-3.5 w-3.5" /> EPIs e Riscos
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {contratoAtivo.epis?.map((e: string) => <Badge key={e} variant="secondary" className="text-[10px]">{e}</Badge>)}
                      {contratoAtivo.riscos?.map((r: string) => <Badge key={r} variant="destructive" className="text-[10px]">{r}</Badge>)}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <Button onClick={handleAgendar} size="lg" className="gap-2" disabled={!clienteId || !contratoId || !dataAgendada || !localExecucao}>
                <CalendarPlus className="h-4 w-4" /> Criar Agendamento
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Filtros e lista ── */}
      <div className="space-y-4">
        {/* Status tabs */}
        <div className="flex items-center gap-2 flex-wrap border-b pb-3">
          {[["todos", "Todos"], ...Object.entries(STATUS_CFG).map(([k, v]) => [k, v.label])].map(([s, label]) => (
            <button key={s} onClick={() => setFiltroStatus(s)}
              className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filtroStatus === s ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-muted"}`}>
              {label}
              {counts[s] > 0 && (
                <span className={`ml-1.5 text-[10px] rounded-full px-1.5 py-0.5 ${filtroStatus === s ? "bg-white/20" : "bg-muted-foreground/10"}`}>
                  {counts[s]}
                </span>
              )}
            </button>
          ))}
          <div className="ml-auto">
            <Input placeholder="Filtrar por cliente..." className="h-8 text-xs w-44" value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} />
          </div>
        </div>

        {/* Cards */}
        {agFiltrados.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Clock className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">Nenhum agendamento encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {agFiltrados.map(ag => {
              const st = STATUS_CFG[ag.status];
              const dias = diasAte(ag.dataAgendada);
              const vencido = dias < 0 && ag.status === "agendado";
              const Icon = st.icon;
              return (
                <Card key={ag.id} className={`hover:shadow-md transition-all ${vencido ? "border-destructive/40" : ""}`}>
                  <CardContent className="p-4 space-y-3">
                    {/* Status + tipo */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${st.color}`}>
                        <Icon className="h-3 w-3" /> {st.label}
                      </span>
                      <div className="flex items-center gap-1">
                        <Badge variant={ag.tipo === "sanitario" ? "default" : "secondary"} className="text-[10px]">
                          {ag.tipo === "sanitario" ? "Sanitário" : "Manutenção"}
                        </Badge>
                        {vencido && <Badge variant="destructive" className="text-[10px]">Vencido</Badge>}
                      </div>
                    </div>

                    {/* Info */}
                    <div>
                      <p className="font-semibold text-sm leading-tight">{ag.clienteNome}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{ag.servico}</p>
                    </div>

                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <CalendarPlus className="h-3 w-3 shrink-0" />
                        {fmtDate(ag.dataAgendada)}
                        {ag.status === "agendado" && (
                          <span className={`ml-1 font-medium ${vencido ? "text-destructive" : dias <= 7 ? "text-amber-600" : "text-primary"}`}>
                            ({vencido ? `${Math.abs(dias)}d atrás` : `em ${dias}d`})
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 shrink-0" /> {ag.localExecucao}
                      </span>
                      {ag.tags && (
                        <span className="flex items-center gap-1.5">
                          <Tag className="h-3 w-3 shrink-0" /> {ag.tags}
                        </span>
                      )}
                      {ag.osId && (
                        <span className="flex items-center gap-1.5 text-primary font-medium">
                          <FileCheck2 className="h-3 w-3" /> OS vinculada
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    {ag.status === "agendado" && (
                      <div className="flex gap-2 pt-1 border-t">
                        <Button size="sm" className="flex-1 gap-1.5" onClick={() => openOsDialog(ag.id)}>
                          <FileText className="h-3.5 w-3.5" /> Gerar OS
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/5 px-2"
                          onClick={() => handleCancelar(ag.id)} title="Cancelar">
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ Dialog — Gerar OS ═══ */}
      <Dialog open={osDialog} onOpenChange={v => { setOsDialog(v); if (!v) { setOsGerada(null); setOsTecnico(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {osGerada ? "OS Gerada com Sucesso" : "Gerar Ordem de Serviço"}
            </DialogTitle>
          </DialogHeader>

          {!osGerada ? (
            <div className="space-y-4">
              {/* Resumo do agendamento */}
              {agDaOs && (
                <div className="rounded-lg bg-muted/40 border p-3 text-xs space-y-1.5">
                  <p className="font-semibold text-sm mb-2">Dados do Agendamento</p>
                  <div className="grid grid-cols-2 gap-1">
                    <span className="text-muted-foreground">Cliente</span>
                    <span className="font-medium">{agDaOs.clienteNome}</span>
                    <span className="text-muted-foreground">Serviço</span>
                    <span>{agDaOs.servico}</span>
                    <span className="text-muted-foreground">Local</span>
                    <span>{agDaOs.localExecucao}</span>
                    <span className="text-muted-foreground">Data</span>
                    <span>{fmtDate(agDaOs.dataAgendada)}</span>
                    {agDaOs.tags && (<><span className="text-muted-foreground">TAGs</span><span>{agDaOs.tags}</span></>)}
                  </div>
                </div>
              )}

              {/* Técnico */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Técnico Responsável <span className="text-destructive">*</span></Label>
                <Select value={osTecnico} onValueChange={setOsTecnico}>
                  <SelectTrigger><SelectValue placeholder="Selecione o técnico" /></SelectTrigger>
                  <SelectContent>
                    {tecnicosList.filter(t => t.ativo).map(t => (
                      <SelectItem key={t.id} value={t.nome}>
                        <div>
                          <span className="font-medium">{t.nome}</span>
                          <span className="text-muted-foreground text-xs ml-2">— {t.cargo}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dados do técnico */}
              {tecnicoSel && (
                <div className="rounded-lg bg-muted/30 border p-3 text-xs grid grid-cols-2 gap-1">
                  <span className="text-muted-foreground">CPF</span><span>{tecnicoSel.cpf}</span>
                  <span className="text-muted-foreground">Admissão</span><span>{fmtDate(tecnicoSel.dataAdmissao)}</span>
                  <span className="text-muted-foreground">Cargo</span><span>{tecnicoSel.cargo}</span>
                </div>
              )}

              {/* EPIs do contrato */}
              {contratoDaOs?.epis?.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs space-y-1.5">
                  <p className="font-semibold flex items-center gap-1 text-amber-700 dark:text-amber-400">
                    <ShieldAlert className="h-3.5 w-3.5" /> EPIs Obrigatórios para esta OS
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {contratoDaOs.epis.map((e: string) => <Badge key={e} variant="secondary" className="text-[10px]">{e}</Badge>)}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setOsDialog(false)}>Cancelar</Button>
                <Button onClick={handleGerarOS} disabled={!osTecnico} className="gap-2">
                  <FileText className="h-4 w-4" /> Gerar OS
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 p-5 text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
                <p className="text-2xl font-bold text-green-700">{osGerada.numero}</p>
                <p className="text-sm text-muted-foreground">Emitida em {new Date().toLocaleDateString("pt-BR")}</p>
              </div>
              <div className="rounded-lg bg-muted/40 border p-3 text-xs grid grid-cols-2 gap-1.5">
                <span className="text-muted-foreground">Técnico</span><span className="font-medium">{osGerada.tecnicoNome}</span>
                <span className="text-muted-foreground">Local</span><span>{osGerada.localExecucao}</span>
                <span className="text-muted-foreground">Serviço</span><span>{osGerada.servico}</span>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOsDialog(false)}>Fechar</Button>
                <Button onClick={() => window.print()} variant="outline" className="gap-2">
                  <Printer className="h-4 w-4" /> Imprimir OS
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
