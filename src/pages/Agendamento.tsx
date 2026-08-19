import { useEffect, useMemo, useState } from "react";
import {
  generateOrderFromSchedule,
  getBootstrap,
  saveSchedule,
  type AgendamentoApp,
  type BootstrapData,
  type OSApp,
  updateRecurrenceSuggestion,
} from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Building2, CalendarDays, CalendarPlus, Car, CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, Clock, FileCheck2, FileText, MapPin, MessageSquare, Printer, ShieldAlert, Tag, User, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { printOsDocument } from "@/lib/osPrint";
import { PageHeader } from "@/components/PageHeader";

const monthOptions = [
  ["01", "Janeiro"],
  ["02", "Fevereiro"],
  ["03", "Março"],
  ["04", "Abril"],
  ["05", "Maio"],
  ["06", "Junho"],
  ["07", "Julho"],
  ["08", "Agosto"],
  ["09", "Setembro"],
  ["10", "Outubro"],
  ["11", "Novembro"],
  ["12", "Dezembro"],
];

function fmtDate(date: string) {
  if (!date) return "—";
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay() || 7;
  copy.setDate(copy.getDate() - day + 1);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function newId() {
  return `AG-${Date.now().toString(36).toUpperCase()}`;
}

function diasAte(date: string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(`${date}T00:00:00`).getTime() - hoje.getTime()) / 86400000);
}

function formatQuantityUnit(quantity: number, unit?: string | null) {
  const value = Number(quantity || 0);
  const normalized = (unit || "").trim().toLowerCase();
  const compactUnits = new Set(["un", "un.", "unid", "unid."]);
  const pluralMap: Record<string, string> = {
    servico: "serviços",
    serviço: "serviços",
    ponto: "pontos",
    visita: "visitas",
    hora: "horas",
  };

  if (!normalized) return value.toLocaleString("pt-BR");
  if (Math.abs(value) === 1 || compactUnits.has(normalized) || normalized.endsWith("s")) {
    return `${value.toLocaleString("pt-BR")} ${unit}`;
  }

  return `${value.toLocaleString("pt-BR")} ${pluralMap[normalized] || `${unit}s`}`;
}

const STATUS_CFG = {
  agendado: { label: "Agendado", icon: Clock, cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20" },
  os_gerada: { label: "OS Gerada", icon: FileCheck2, cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20" },
  encerrado: { label: "Encerrado", icon: CheckCircle2, cls: "bg-muted text-muted-foreground border-border" },
  cancelado: { label: "Cancelado", icon: XCircle, cls: "bg-destructive/5 text-destructive border-destructive/20" },
} as const;

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthCalendarDays(year: number, month: number) {
  const first = new Date(year, month - 1, 1, 12);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month - 1, 1 - mondayOffset, 12);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export default function Agendamento() {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [clienteId, setClienteId] = useState("");
  const [origemAtendimento, setOrigemAtendimento] = useState<"contrato" | "avulso">("contrato");
  const [contratoId, setContratoId] = useState("");
  const [servicoCatalogoId, setServicoCatalogoId] = useState("");
  const [dataAgendada, setDataAgendada] = useState("");
  const [localId, setLocalId] = useState("");
  const [localExecucao, setLocalExecucao] = useState("");
  const [tagsSelecionadas, setTagsSelecionadas] = useState<string[]>([]);
  const [observacao, setObservacao] = useState("");
  const [tecnicosSelecionados, setTecnicosSelecionados] = useState<string[]>([]);
  const [veiculoId, setVeiculoId] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState("mes");
  const [filtroAno, setFiltroAno] = useState(() => String(new Date().getFullYear()));
  const [filtroMes, setFiltroMes] = useState(() => String(new Date().getMonth() + 1).padStart(2, "0"));
  const [filtroSemanaBase, setFiltroSemanaBase] = useState(() => toDateInputValue(new Date()));
  const [detalheAgendamentoId, setDetalheAgendamentoId] = useState<string | null>(null);
  const [osDialog, setOsDialog] = useState(false);
  const [osAgId, setOsAgId] = useState<string | null>(null);
  const [osTecnico, setOsTecnico] = useState("");
  const [osGerada, setOsGerada] = useState<OSApp | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      setData(await getBootstrap());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar agendamentos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const clientesAtivos = useMemo(() => (data?.clients ?? []).filter((item) => item.ativo), [data?.clients]);
  const contratos = useMemo(() => data?.contracts ?? [], [data?.contracts]);
  const servicos = useMemo(() => (data?.services ?? []).filter((item) => item.ativo), [data?.services]);
  const tecnicos = useMemo(() => data?.technicians ?? [], [data?.technicians]);
  const veiculos = useMemo(() => data?.vehicles ?? [], [data?.vehicles]);
  const agendamentos = useMemo(() => data?.schedules ?? [], [data?.schedules]);
  const recorrencias = useMemo(
    () => (data?.recurrenceSuggestions ?? []).filter((item) => item.status === "pendente"),
    [data?.recurrenceSuggestions],
  );

  const clienteNomeSel = useMemo(() => clientesAtivos.find((item) => item.id === clienteId)?.razaoSocial ?? clienteId, [clienteId, clientesAtivos]);
  const clienteAtivo = useMemo(() => clientesAtivos.find((item) => item.id === clienteId), [clienteId, clientesAtivos]);
  const contratosCliente = useMemo(
    () =>
      contratos.filter((item) => {
        const saldo = Number(item.contratado || 0) - Number(item.executado || 0);
        return item.cliente === clienteNomeSel && item.status === "ativo" && saldo > 0 && Boolean(item.contratoTemplateId);
      }),
    [clienteNomeSel, contratos],
  );
  const contratoAtivo = useMemo(() => contratos.find((item) => item.id === contratoId), [contratoId, contratos]);
  const servicoAvulso = useMemo(() => servicos.find((item) => item.id === servicoCatalogoId), [servicoCatalogoId, servicos]);
  const servicoSelecionado = origemAtendimento === "avulso"
    ? servicoAvulso
    : servicos.find((item) => item.id === contratoAtivo?.servicoCatalogoId) || servicos.find((item) => item.nome === contratoAtivo?.servico);
  const formularioPronto = Boolean(clienteId && dataAgendada && localExecucao && (origemAtendimento === "avulso" ? servicoAvulso : contratoAtivo));
  const locaisCliente = clienteAtivo?.locaisExecucao?.filter((item) => item.ativo) ?? [];
  const equipamentosCliente = clienteAtivo?.equipamentos?.filter((item) => item.ativo) ?? [];
  const locaisContrato = locaisCliente.length ? locaisCliente.map((item) => item.nome) : contratoAtivo?.locais ?? [];
  const veiculoSelecionado = veiculos.find((item) => item.id === veiculoId);

  const agendamentosBase = useMemo(() => {
    let list = [...agendamentos].reverse();
    if (filtroStatus !== "todos") list = list.filter((item) => item.status === filtroStatus);
    if (filtroCliente) list = list.filter((item) => item.clienteNome.toLowerCase().includes(filtroCliente.toLowerCase()));
    return list;
  }, [agendamentos, filtroCliente, filtroStatus]);

  const agFiltrados = useMemo(() => {
    let list = agendamentosBase;
    if (filtroPeriodo === "mes") {
      list = list.filter((item) => {
        const date = new Date(`${item.dataAgendada}T12:00:00`);
        return String(date.getFullYear()) === filtroAno && String(date.getMonth() + 1).padStart(2, "0") === filtroMes;
      });
    }
    if (filtroPeriodo === "ano") {
      list = list.filter((item) => String(new Date(`${item.dataAgendada}T12:00:00`).getFullYear()) === filtroAno);
    }
    if (filtroPeriodo === "semana") {
      const start = startOfWeek(new Date(`${filtroSemanaBase}T12:00:00`));
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      list = list.filter((item) => {
        const date = new Date(`${item.dataAgendada}T12:00:00`);
        return date >= start && date <= end;
      });
    }
    return list;
  }, [agendamentosBase, filtroAno, filtroMes, filtroPeriodo, filtroSemanaBase]);

  const calendarioMes = useMemo(() => monthCalendarDays(Number(filtroAno), Number(filtroMes)), [filtroAno, filtroMes]);
  const eventosPorDia = useMemo(() => {
    const grouped = new Map<string, AgendamentoApp[]>();
    agFiltrados.forEach((item) => grouped.set(item.dataAgendada, [...(grouped.get(item.dataAgendada) ?? []), item]));
    return grouped;
  }, [agFiltrados]);
  const resumoAnual = useMemo(() => monthOptions.map(([value, label]) => ({
    value,
    label,
    items: agendamentosBase.filter((item) => {
      const date = new Date(`${item.dataAgendada}T12:00:00`);
      return String(date.getFullYear()) === filtroAno && String(date.getMonth() + 1).padStart(2, "0") === value;
    }),
  })), [agendamentosBase, filtroAno]);

  const counts = useMemo(() => {
    const result: Record<string, number> = { todos: agendamentos.length };
    for (const status of Object.keys(STATUS_CFG)) result[status] = agendamentos.filter((item) => item.status === status).length;
    return result;
  }, [agendamentos]);

  const agDaOs = agendamentos.find((item) => item.id === osAgId);
  const contratoDaOs = contratos.find((item) => item.id === agDaOs?.contratoId);
  const agDetalhe = agendamentos.find((item) => item.id === detalheAgendamentoId);
  const contratoDetalhe = contratos.find((item) => item.id === agDetalhe?.contratoId);
  const anosDisponiveis = useMemo(() => {
    const years = new Set([String(new Date().getFullYear())]);
    agendamentos.forEach((item) => years.add(String(new Date(`${item.dataAgendada}T12:00:00`).getFullYear())));
    return [...years].sort();
  }, [agendamentos]);

  function resetFormulario() {
    setContratoId("");
    setServicoCatalogoId("");
    setDataAgendada("");
    setLocalExecucao("");
    setLocalId("");
    setTagsSelecionadas([]);
    setObservacao("");
    setTecnicosSelecionados([]);
    setVeiculoId("");
  }

  function toggleTecnico(tecnicoId: string) {
    setTecnicosSelecionados((prev) => (prev.includes(tecnicoId) ? prev.filter((item) => item !== tecnicoId) : [...prev, tecnicoId]));
  }

  async function handleAgendar() {
    if (!formularioPronto || !clienteAtivo || !servicoSelecionado) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    const equipe = tecnicos.filter((item) => tecnicosSelecionados.includes(item.id));
    try {
      await saveSchedule({
        id: newId(),
        clienteId,
        clienteNome: clienteAtivo.razaoSocial,
        clienteCnpj: clienteAtivo.cnpj,
        contratoId: origemAtendimento === "contrato" ? contratoId : undefined,
        servicoCatalogoId: servicoSelecionado.id,
        servico: servicoSelecionado.nome,
        tipo: servicoSelecionado.tipo,
        dataAgendada,
        localId: localId || undefined,
        localExecucao,
        tags: tagsSelecionadas.join(", "),
        observacao,
        tecnicosIds: equipe.map((item) => item.id),
        tecnicosNomes: equipe.map((item) => item.nome),
        veiculoId: veiculoSelecionado?.id,
        veiculoDescricao: veiculoSelecionado ? `${veiculoSelecionado.modelo} • ${veiculoSelecionado.placa}` : undefined,
        status: "agendado",
      });
      toast.success("Agendamento criado!");
      resetFormulario();
      reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar agendamento");
    }
  }

  async function confirmRecurring(id: string) {
    await updateRecurrenceSuggestion(id, "confirm");
    toast.success("Novo agendamento recorrente criado na agenda");
    reload();
  }

  async function dismissRecurring(id: string) {
    await updateRecurrenceSuggestion(id, "dismiss");
    toast.info("Sugestão de recorrência dispensada");
    reload();
  }

  function openOsDialog(agId: string) {
    const agendamento = agendamentos.find((item) => item.id === agId);
    setOsAgId(agId);
    setOsTecnico(agendamento?.tecnicosNomes?.[0] ?? "");
    setOsGerada(null);
    setOsDialog(true);
  }

  async function handleGerarOS() {
    if (!osAgId) return;
    try {
      await generateOrderFromSchedule(osAgId, osTecnico);
      const bootstrap = await getBootstrap();
      setData(bootstrap);
      const criada = bootstrap.orders.find((item) => item.agendamentoId === osAgId);
      if (criada) {
        setOsGerada(criada);
        toast.success(`${criada.numero} gerada!`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao gerar OS");
    }
  }

  function imprimirOS() {
    if (!osGerada) return;
    printOsDocument(osGerada, data);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operacional"
        title="Agendamentos"
        description="Planeje visitas, designe equipe e leve o fluxo adiante até a geração da ordem de serviço."
        crumbs={[{ label: "Operacional" }, { label: "Agendamentos" }]}
        actions={[
          { label: "Atualizar agenda", onClick: reload, variant: "outline" },
          {
            label: formOpen ? "Recolher formulário" : "Novo agendamento",
            onClick: () => setFormOpen((value) => !value),
            variant: "default",
          },
        ]}
      />

      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardContent className="grid gap-3 pt-5 text-sm md:grid-cols-3">
          <div className="rounded-2xl border bg-card p-4">
            <p className="flex items-center gap-2 font-semibold">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              Origem correta
            </p>
            <p className="mt-2 text-muted-foreground">Use um contrato vigente quando houver saldo ou registre um atendimento avulso a partir do catálogo de serviços.</p>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <p className="flex items-center gap-2 font-semibold">
              <Users className="h-4 w-4 text-primary" />
              Planejamento de campo
            </p>
            <p className="mt-2 text-muted-foreground">Agende data, local, equipe, veículo e tags/equipamentos antes de gerar a OS.</p>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <p className="flex items-center gap-2 font-semibold">
              <FileText className="h-4 w-4 text-primary" />
              Próximo passo
            </p>
            <p className="mt-2 text-muted-foreground">Após agendar, gere e imprima a OS para a equipe executar e devolver com evidências.</p>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-4 text-sm text-muted-foreground">{error}</CardContent>
        </Card>
      ) : null}

      {loading ? (
        <Card>
          <CardContent className="py-14 text-center text-sm text-muted-foreground">Carregando agenda operacional...</CardContent>
        </Card>
      ) : null}

      {!loading && recorrencias.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/70 dark:bg-amber-950/10">
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2"><Clock className="h-4 w-4" /> Recorrências sugeridas após serviços concluídos</p>
            {recorrencias.map((item) => (
              <div key={item.id} className="rounded-lg border border-amber-200 bg-white dark:bg-card p-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{item.clienteNome}</p>
                  <p className="text-xs text-muted-foreground">{item.servico}</p>
                  <p className="text-xs text-muted-foreground">Sugestão: {fmtDate(item.suggestedDate)} • {item.localExecucao}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => dismissRecurring(item.id)}>Dispensar</Button>
                  <Button size="sm" onClick={() => confirmRecurring(item.id)}>Confirmar</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!loading && formOpen && (
        <Card className="border-primary/20">
          <CardContent className="pt-5 space-y-5">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2"><CalendarPlus className="h-4 w-4 text-primary" /> Novo Agendamento</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs"><Building2 className="h-3.5 w-3.5" /> Cliente <span className="text-destructive">*</span></Label>
                <Select value={clienteId} onValueChange={(value) => { const cliente = clientesAtivos.find((item) => item.id === value); const possuiContrato = contratos.some((item) => { const saldo = Number(item.contratado || 0) - Number(item.executado || 0); return (item.clienteId === value || item.cliente === cliente?.razaoSocial) && item.status === "ativo" && saldo > 0 && Boolean(item.contratoTemplateId); }); setClienteId(value); resetFormulario(); setOrigemAtendimento(possuiContrato ? "contrato" : "avulso"); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>{clientesAtivos.map((item) => <SelectItem key={item.id} value={item.id}><span className="font-medium">{item.nomeFantasia}</span><span className="text-muted-foreground text-xs ml-1.5">— {item.razaoSocial}</span></SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" /> Origem do atendimento <span className="text-destructive">*</span></Label>
                <Select value={origemAtendimento} onValueChange={(value: "contrato" | "avulso") => { setOrigemAtendimento(value); setContratoId(""); setServicoCatalogoId(""); setLocalId(""); setLocalExecucao(""); setTagsSelecionadas([]); }}>
                  <SelectTrigger disabled={!clienteId}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contrato" disabled={contratosCliente.length === 0}>Contrato vigente com saldo</SelectItem>
                    <SelectItem value="avulso">Serviço avulso (sem contrato)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" /> {origemAtendimento === "contrato" ? "Contrato / Serviço" : "Serviço do catálogo"} <span className="text-destructive">*</span></Label>
                {origemAtendimento === "contrato" ? (
                  <Select value={contratoId} onValueChange={(value) => { setContratoId(value); setServicoCatalogoId(""); setLocalId(""); setLocalExecucao(""); setTagsSelecionadas([]); }}>
                    <SelectTrigger disabled={!clienteId}><SelectValue placeholder={clienteId ? "Selecione" : "Selecione o cliente primeiro"} /></SelectTrigger>
                    <SelectContent>
                      {contratosCliente.map((item) => {
                        const saldo = Number(item.contratado || 0) - Number(item.executado || 0);
                        return <SelectItem key={item.id} value={item.id}><span>{item.servico}</span><span className="text-muted-foreground text-xs ml-1.5">({item.id}) • saldo {formatQuantityUnit(saldo, item.unidade)}</span></SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={servicoCatalogoId} onValueChange={(value) => { setServicoCatalogoId(value); setLocalId(""); setLocalExecucao(""); setTagsSelecionadas([]); }}>
                    <SelectTrigger disabled={!clienteId}><SelectValue placeholder={clienteId ? "Selecione o serviço" : "Selecione o cliente primeiro"} /></SelectTrigger>
                    <SelectContent>{servicos.map((item) => <SelectItem key={item.id} value={item.id}>{item.nome}<span className="text-muted-foreground text-xs ml-1.5">• {item.tipo === "sanitario" ? "Sanitário" : "Manutenção"}</span></SelectItem>)}</SelectContent>
                  </Select>
                )}
                {origemAtendimento === "contrato" && clienteId && contratosCliente.length === 0 ? <p className="text-xs text-muted-foreground">Sem contrato vigente com saldo? Selecione “Serviço avulso” para continuar sem consumir saldo contratual.</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs"><CalendarPlus className="h-3.5 w-3.5" /> Data <span className="text-destructive">*</span></Label>
                <Input type="date" value={dataAgendada} onChange={(event) => setDataAgendada(event.target.value)} disabled={!clienteId || !servicoSelecionado} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs"><MapPin className="h-3.5 w-3.5" /> Local de Execução <span className="text-destructive">*</span></Label>
              {locaisCliente.length > 0 ? (
                <Select value={localId} onValueChange={(value) => { const local = locaisCliente.find((item) => item.id === value); setLocalId(value); setLocalExecucao(local ? [local.nome, local.endereco].filter(Boolean).join(" - ") : ""); }} disabled={!clienteId || !servicoSelecionado}>
                  <SelectTrigger><SelectValue placeholder="Selecione o local do contrato" /></SelectTrigger>
                  <SelectContent>{locaisCliente.map((item) => <SelectItem key={item.id || item.nome} value={item.id || item.nome}>{item.nome}{item.endereco ? ` - ${item.endereco}` : ""}</SelectItem>)}</SelectContent>
                </Select>
              ) : locaisContrato.length > 0 ? (
                <Select value={localExecucao} onValueChange={(value) => { setLocalId(""); setLocalExecucao(value); }} disabled={!clienteId || !servicoSelecionado}>
                  <SelectTrigger><SelectValue placeholder="Selecione o local do contrato" /></SelectTrigger>
                  <SelectContent>{locaisContrato.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input placeholder="Ex: República Administrativa 01, Bloco A" value={localExecucao} onChange={(event) => setLocalExecucao(event.target.value)} disabled={!clienteId || !servicoSelecionado} />
              )}
            </div>

            {equipamentosCliente.length > 0 && (
              <div className="rounded-xl border p-4 space-y-3">
                <Label className="flex items-center gap-1.5 text-xs"><Tag className="h-3.5 w-3.5" /> Equipamentos/tags previstos</Label>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {equipamentosCliente.map((equipamento) => (
                    <label key={equipamento.id || equipamento.tag} className="flex items-start gap-2 rounded-lg border p-2 text-xs cursor-pointer hover:bg-muted/40">
                      <Checkbox
                        checked={tagsSelecionadas.includes(equipamento.tag)}
                        onCheckedChange={() => {
                          setTagsSelecionadas((prev) => (prev.includes(equipamento.tag) ? prev.filter((item) => item !== equipamento.tag) : [...prev, equipamento.tag]));
                        }}
                      />
                      <span>
                        <strong>{equipamento.tag}</strong>
                        <span className="block text-muted-foreground">{equipamento.descricao || equipamento.tipo || equipamento.setor || "Equipamento cadastrado"}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-xl border p-4 space-y-3">
                <Label className="flex items-center gap-1.5 text-xs"><Users className="h-3.5 w-3.5" /> Equipe designada</Label>
                <div className="grid sm:grid-cols-2 gap-2">
                  {tecnicos.filter((item) => item.ativo).map((item) => (
                    <label key={item.id} className="flex items-center gap-2 rounded-lg border p-2 text-xs cursor-pointer hover:bg-muted/40">
                      <Checkbox checked={tecnicosSelecionados.includes(item.id)} onCheckedChange={() => toggleTecnico(item.id)} />
                      <span><strong>{item.nome}</strong><span className="block text-muted-foreground">{item.cargo}</span></span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border p-4 space-y-3">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs"><Car className="h-3.5 w-3.5" /> Veículo designado</Label>
                  <Select value={veiculoId || "none"} onValueChange={(value) => setVeiculoId(value === "none" ? "" : value)}>
                    <SelectTrigger><SelectValue placeholder="Selecione um veículo" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Sem veículo definido</SelectItem>{veiculos.filter((item) => item.ativo).map((item) => <SelectItem key={item.id} value={item.id}>{item.modelo} • {item.placa}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs"><MessageSquare className="h-3.5 w-3.5" /> Observação</Label>
                  <Textarea placeholder="Instruções para a equipe de campo..." value={observacao} onChange={(event) => setObservacao(event.target.value)} rows={3} disabled={!clienteId || !servicoSelecionado} />
                </div>
              </div>
            </div>

            {contratoAtivo && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/40 border p-4 space-y-1.5">
                  <p className="text-xs font-bold text-foreground mb-2">Resumo do Contrato</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span className="text-muted-foreground">Tipo</span><Badge variant={contratoAtivo.tipo === "sanitario" ? "default" : "secondary"} className="text-[10px] w-fit">{contratoAtivo.tipo === "sanitario" ? "Sanitário" : "Manutenção"}</Badge>
                    <span className="text-muted-foreground">Saldo operacional</span><span className="font-bold">{formatQuantityUnit(contratoAtivo.contratado - contratoAtivo.executado, contratoAtivo.unidade)}</span>
                    {contratoAtivo.validadeDias > 0 && <><span className="text-muted-foreground">Recorrência</span><span>a cada {contratoAtivo.validadeDias} dias</span></>}
                    <span className="text-muted-foreground">Status</span><Badge variant={contratoAtivo.status === "vencido" ? "destructive" : "default"} className="text-[10px] w-fit">{contratoAtivo.status}</Badge>
                  </div>
                </div>
                {contratoAtivo.tipo === "sanitario" && (contratoAtivo.epis?.length || contratoAtivo.riscos?.length) ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-2">
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5" /> EPIs e Riscos</p>
                    <div className="flex flex-wrap gap-1">
                      {contratoAtivo.epis?.map((item) => <Badge key={item} variant="secondary" className="text-[10px]">{item}</Badge>)}
                      {contratoAtivo.riscos?.map((item) => <Badge key={item} variant="destructive" className="text-[10px]">{item}</Badge>)}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            <div className="flex justify-end pt-1">
              <Button onClick={handleAgendar} size="lg" className="gap-2 px-8" disabled={!formularioPronto}>
                <CalendarPlus className="h-4 w-4" /> Criar Agendamento
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="panel-soft">
        <CardContent className="space-y-4 pt-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="font-semibold">Agenda operacional</p>
              <p className="text-sm text-muted-foreground">
                {agFiltrados.length} agendamento(s) no filtro atual. Clique em um card para ver detalhes.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:min-w-[660px]">
              <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes">Mês</SelectItem>
                  <SelectItem value="semana">Semana</SelectItem>
                  <SelectItem value="ano">Ano</SelectItem>
                  <SelectItem value="todos">Todos</SelectItem>
                </SelectContent>
              </Select>
              {filtroPeriodo === "mes" || filtroPeriodo === "ano" ? (
                <>
                  {filtroPeriodo === "mes" ? (
                    <Select value={filtroMes} onValueChange={setFiltroMes}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {monthOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : <div className="hidden sm:block" />}
                  <Select value={filtroAno} onValueChange={setFiltroAno}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {anosDisponiveis.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </>
              ) : null}
              {filtroPeriodo === "semana" ? (
                <Input type="date" className="h-9" value={filtroSemanaBase} onChange={(event) => setFiltroSemanaBase(event.target.value)} />
              ) : null}
              <Input placeholder="Filtrar cliente..." className="h-9 text-sm" value={filtroCliente} onChange={(event) => setFiltroCliente(event.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[["todos", "Todos"], ...Object.entries(STATUS_CFG).map(([key, value]) => [key, value.label])].map(([status, label]) => (
              <button key={status} onClick={() => setFiltroStatus(status)} className={cn("relative rounded-xl px-3 py-1.5 text-xs font-semibold transition-all", filtroStatus === status ? "bg-primary text-white shadow-sm" : "bg-muted/60 text-muted-foreground hover:bg-muted")}>
                {label}
                {(counts[status] ?? agendamentos.length) > 0 && <span className={cn("ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]", filtroStatus === status ? "bg-white/20" : "bg-muted-foreground/10")}>{counts[status] ?? agendamentos.length}</span>}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {!loading && filtroPeriodo === "mes" ? (
        <Card className="overflow-hidden">
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4 text-primary" /> Calendário mensal</p>
                <p className="text-sm text-muted-foreground">{monthOptions.find(([value]) => value === filtroMes)?.[1]} de {filtroAno}. Clique em um evento para abrir os detalhes.</p>
              </div>
              <Badge variant="secondary">{agFiltrados.length} agendamento(s)</Badge>
            </div>
            <div className="overflow-x-auto rounded-xl border">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-semibold text-muted-foreground">
                  {WEEKDAY_LABELS.map((day) => <div key={day} className="px-2 py-2">{day}</div>)}
                </div>
                <div className="grid grid-cols-7">
                  {calendarioMes.map((day) => {
                    const key = dateKey(day);
                    const eventos = eventosPorDia.get(key) ?? [];
                    const isCurrentMonth = day.getMonth() + 1 === Number(filtroMes);
                    return (
                      <div key={key} className={cn("min-h-[112px] border-b border-r p-1.5 align-top", !isCurrentMonth && "bg-muted/20 text-muted-foreground")}>
                        <div className="flex items-center justify-between px-1 text-xs font-semibold">
                          <span>{day.getDate()}</span>
                          {eventos.length > 0 ? <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{eventos.length}</span> : null}
                        </div>
                        <div className="mt-1 space-y-1">
                          {eventos.slice(0, 3).map((item) => {
                            const status = STATUS_CFG[item.status];
                            return (
                              <button key={item.id} type="button" onClick={() => setDetalheAgendamentoId(item.id)} className={cn("block w-full truncate rounded-md border px-1.5 py-1 text-left text-[10px] leading-tight transition-colors hover:border-primary hover:bg-primary/5", status?.cls)} title={`${item.clienteNome} — ${item.servico}`}>
                                <span className="block truncate font-semibold">{item.clienteNome}</span>
                                <span className="block truncate opacity-80">{item.servico}</span>
                              </button>
                            );
                          })}
                          {eventos.length > 3 ? <p className="px-1 text-[10px] font-semibold text-muted-foreground">+{eventos.length - 3} outro(s)</p> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!loading && filtroPeriodo === "ano" ? (
        <Card>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4 text-primary" /> Visão anual</p>
                <p className="text-sm text-muted-foreground">Distribuição dos agendamentos de {filtroAno}. Selecione um mês para abrir o calendário detalhado.</p>
              </div>
              <Badge variant="secondary">{agendamentosBase.filter((item) => new Date(`${item.dataAgendada}T12:00:00`).getFullYear() === Number(filtroAno)).length} agendamento(s)</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {resumoAnual.map((month) => {
                const statusCount = Object.entries(STATUS_CFG).filter(([status]) => month.items.some((item) => item.status === status));
                return (
                  <button key={month.value} type="button" onClick={() => { setFiltroMes(month.value); setFiltroPeriodo("mes"); }} className="rounded-2xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{month.label}</span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{month.items.length}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, month.items.length * 18)}%` }} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {statusCount.length > 0 ? statusCount.map(([status, config]) => <span key={status} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{config.label}</span>) : <span className="text-xs text-muted-foreground">Sem agendamentos</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!loading && filtroPeriodo !== "mes" && filtroPeriodo !== "ano" && agFiltrados.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-14 text-muted-foreground"><Clock className="h-10 w-10 mb-3 opacity-20" /><p className="text-sm font-medium">Nenhum agendamento encontrado</p></CardContent></Card>
      ) : !loading && filtroPeriodo !== "mes" && filtroPeriodo !== "ano" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {agFiltrados.map((agendamento) => {
            const status = STATUS_CFG[agendamento.status];
            const dias = diasAte(agendamento.dataAgendada);
            const vencido = dias < 0 && agendamento.status === "agendado";
            const Icon = status.icon;
            return (
              <Card
                key={agendamento.id}
                className={cn("cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md", vencido && "border-destructive/40")}
                onClick={() => setDetalheAgendamentoId(agendamento.id)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border", status.cls)}><Icon className="h-3 w-3" /> {status.label}</span>
                    <div className="flex items-center gap-1">
                      <Badge variant={agendamento.tipo === "sanitario" ? "default" : "secondary"} className="text-[10px]">{agendamento.tipo === "sanitario" ? "Sanitário" : "Manutenção"}</Badge>
                      {vencido && <Badge variant="destructive" className="text-[10px]">Vencido</Badge>}
                    </div>
                  </div>
                  <div><p className="font-semibold text-sm">{agendamento.clienteNome}</p><p className="text-xs text-muted-foreground mt-0.5">{agendamento.servico}</p></div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-1.5"><CalendarPlus className="h-3 w-3" /> {fmtDate(agendamento.dataAgendada)} {agendamento.status === "agendado" && <span className={cn("ml-1 font-medium", vencido ? "text-destructive" : dias <= 7 ? "text-amber-600" : "text-primary")}>({vencido ? `${Math.abs(dias)}d atrás` : `em ${dias}d`})</span>}</div>
                    <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {agendamento.localExecucao}</div>
                    {agendamento.tecnicosNomes?.length ? <div className="flex items-center gap-1.5"><Users className="h-3 w-3" /> {agendamento.tecnicosNomes.join(" • ")}</div> : null}
                    {agendamento.veiculoDescricao ? <div className="flex items-center gap-1.5"><Car className="h-3 w-3" /> {agendamento.veiculoDescricao}</div> : null}
                  </div>
                  {agendamento.status === "agendado" ? (
                    <div className="flex gap-2 pt-1 border-t">
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5 h-7 text-xs"
                        onClick={(event) => {
                          event.stopPropagation();
                          openOsDialog(agendamento.id);
                        }}
                      >
                        <FileText className="h-3.5 w-3.5" /> Gerar OS
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      <Dialog open={Boolean(agDetalhe)} onOpenChange={(open) => !open && setDetalheAgendamentoId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-primary" />
              Detalhes do agendamento
            </DialogTitle>
          </DialogHeader>
          {agDetalhe ? (
            <div className="space-y-4">
              <div className="rounded-2xl border bg-muted/30 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-lg font-bold">{agDetalhe.clienteNome}</p>
                    <p className="text-sm text-muted-foreground">{agDetalhe.servico}</p>
                  </div>
                  <Badge variant={agDetalhe.status === "agendado" ? "default" : "secondary"}>{agDetalhe.status}</Badge>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Data", fmtDate(agDetalhe.dataAgendada)],
                  ["Origem", agDetalhe.contratoId || "Atendimento avulso"],
                  ["Local", agDetalhe.localExecucao || "Não informado"],
                  ["Tipo", agDetalhe.tipo === "sanitario" ? "Sanitário" : "Manutenção"],
                  ["Equipe designada", agDetalhe.tecnicosNomes?.join(" • ") || "Não definida"],
                  ["Veículo designado", agDetalhe.veiculoDescricao || "Não definido"],
                  ["Tags/equipamentos", agDetalhe.tags || "Não informado"],
                  ["Saldo operacional", contratoDetalhe ? formatQuantityUnit(contratoDetalhe.contratado - contratoDetalhe.executado, contratoDetalhe.unidade) : "Não disponível"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
                    <p className="mt-1 text-sm font-semibold">{value}</p>
                  </div>
                ))}
              </div>

              {agDetalhe.observacao ? (
                <div className="rounded-xl border p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Observação</p>
                  <p className="mt-1 text-sm text-muted-foreground">{agDetalhe.observacao}</p>
                </div>
              ) : null}

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetalheAgendamentoId(null)}>Fechar</Button>
                {agDetalhe.status === "agendado" ? (
                  <Button
                    onClick={() => {
                      setDetalheAgendamentoId(null);
                      openOsDialog(agDetalhe.id);
                    }}
                  >
                    Gerar OS
                  </Button>
                ) : null}
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={osDialog} onOpenChange={(value) => { setOsDialog(value); if (!value) setOsGerada(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />{osGerada ? "OS Gerada com Sucesso" : "Gerar Ordem de Serviço"}</DialogTitle></DialogHeader>
          {!osGerada ? (
            <div className="space-y-4">
              {agDaOs ? <div className="rounded-xl bg-muted/40 border p-3 text-xs grid grid-cols-2 gap-1.5"><span className="text-muted-foreground">Cliente</span><span className="font-medium">{agDaOs.clienteNome}</span><span className="text-muted-foreground">Serviço</span><span>{agDaOs.servico}</span><span className="text-muted-foreground">Local</span><span>{agDaOs.localExecucao}</span><span className="text-muted-foreground">Equipe</span><span>{agDaOs.tecnicosNomes?.join(" • ") || "Não definida"}</span></div> : null}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs"><User className="h-3.5 w-3.5" /> Técnico líder <span className="text-destructive">*</span></Label>
                <Select value={osTecnico} onValueChange={setOsTecnico}>
                  <SelectTrigger><SelectValue placeholder="Selecione o técnico" /></SelectTrigger>
                  <SelectContent>{(agDaOs?.tecnicosNomes?.length ? tecnicos.filter((item) => agDaOs.tecnicosNomes?.includes(item.nome)) : tecnicos.filter((item) => item.ativo)).map((item) => <SelectItem key={item.id} value={item.nome}>{item.nome} — {item.cargo}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {contratoDaOs?.epis?.length ? <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs"><p className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mb-1.5"><ShieldAlert className="h-3.5 w-3.5" /> EPIs Obrigatórios</p><div className="flex flex-wrap gap-1">{contratoDaOs.epis.map((item) => <Badge key={item} variant="secondary" className="text-[10px]">{item}</Badge>)}</div></div> : null}
              <DialogFooter><Button variant="outline" onClick={() => setOsDialog(false)}>Cancelar</Button><Button onClick={handleGerarOS} className="gap-2"><FileText className="h-4 w-4" /> Gerar OS</Button></DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 p-5 text-center space-y-2"><CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" /><p className="text-2xl font-bold text-emerald-700">{osGerada.numero}</p><p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("pt-BR")}</p></div>
              <div className="rounded-xl bg-muted/40 border p-3 text-xs grid grid-cols-2 gap-1.5"><span className="text-muted-foreground">Técnico líder</span><span className="font-medium">{osGerada.tecnicoNome}</span><span className="text-muted-foreground">Equipe</span><span>{osGerada.equipeTecnicosNomes?.join(" • ") || osGerada.tecnicoNome}</span><span className="text-muted-foreground">Veículo</span><span>{osGerada.veiculoDescricao ?? "Não definido"}</span><span className="text-muted-foreground">Local</span><span>{osGerada.localExecucao}</span></div>
              <DialogFooter><Button variant="outline" onClick={() => setOsDialog(false)}>Fechar</Button><Button onClick={imprimirOS} className="gap-2"><Printer className="h-4 w-4" /> Imprimir via da equipe</Button></DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
