import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { closeOrder, fetchAttachmentBlob, getBootstrap, type BootstrapData, type EvidenciaAnexoApp, type OSApp, updateOrder } from "@/lib/api";
import { printOsDocument } from "@/lib/osPrint";
import { documentTypographyCss } from "@/lib/documentFontFaces";
import { repairMojibake } from "@/lib/repairMojibake";
import { PageHeader } from "@/components/PageHeader";
import { todayInputDateBr } from "@/lib/formatters";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Award, BookOpen, CheckCircle2, ClipboardList, Eye, FileCheck2, MapPin, PenLine, Printer, Search, Tag, User, Users, X, XCircle } from "lucide-react";
import { toast } from "sonner";

function fmtDate(date: string) {
  if (!date) return "—";
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
}

function cleanText(value: string | number | null | undefined, fallback = "") {
  const text = String(value ?? fallback);
  return repairMojibake(text) || fallback;
}

function cleanJoin(items: string[] | undefined, fallback: string) {
  const cleaned = (items ?? []).map((item) => cleanText(item)).filter(Boolean);
  return cleaned.length ? cleaned.join(" • ") : cleanText(fallback);
}

function formatBytes(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MAX_EVIDENCE_EDGE = 1600;
const MAX_EVIDENCE_DATA_URL_CHARS = 900_000;

async function prepareEvidencePhoto(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Selecione somente arquivos de imagem.");

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = sourceUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Não foi possível ler a foto selecionada."));
    });

    const scale = Math.min(1, MAX_EVIDENCE_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar a foto para envio.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    let quality = 0.82;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);
    while (dataUrl.length > MAX_EVIDENCE_DATA_URL_CHARS && quality > 0.56) {
      quality -= 0.08;
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function isImageEvidence(anexo: { mimeType?: string; conteudoBase64?: string }) {
  return Boolean(anexo.conteudoBase64) && (anexo.mimeType?.startsWith("image/") || anexo.conteudoBase64?.startsWith("data:image/"));
}

async function openAttachment(anexo: EvidenciaAnexoApp) {
  const { blob } = await fetchAttachmentBlob(anexo.id);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function downloadAttachment(anexo: EvidenciaAnexoApp) {
  const { blob, fileName } = await fetchAttachmentBlob(anexo.id, true);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = decodeURIComponent(fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function printElement(html: string, title: string) {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;
          printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title><style>${documentTypographyCss}*{box-sizing:border-box}body{font-size:11px;padding:10mm;color:#000}table{border-collapse:collapse;width:100%}th,td{border:1px solid #555;padding:4px 6px}th{background:#f0f0f0;font-weight:bold}h2{text-align:center;margin-bottom:12px}.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #166534;padding-bottom:12px;margin-bottom:12px}.logo-box{background:#166534;color:#fff;width:50px;height:50px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:18px;border-radius:6px}.section{border:1px solid #555;margin-bottom:8px}.section-header{background:#f0f0f0;padding:4px 8px;font-weight:bold;border-bottom:1px solid #555}.section-body{padding:6px 8px}.footer{border-top:2px solid #166534;padding-top:6px;text-align:center;color:#666;font-size:9px;margin-top:12px}</style></head><body>${html}<script>window.onload=function(){window.print();}</script></body></html>`);
  printWindow.document.close();
}

function gerarHtmlOS(os: OSApp) {
  const equipe = os.equipeTecnicosNomes?.length ? os.equipeTecnicosNomes.join(" • ") : os.tecnicoNome;
  return `<div class="header"><div style="display:flex;align-items:center;gap:12px"><div class="logo-box">CP</div><div><div style="font-size:18px;font-weight:800;color:#166534">CIPERPRAG</div><div style="font-size:9px;letter-spacing:3px;color:#888">SERVIÇOS</div></div></div><div style="text-align:right"><div style="font-size:14px;font-weight:bold">${os.numero}</div><div style="font-size:10px;color:#666">Emitida em ${fmtDate(os.dataEmissao)}</div></div></div><h2>ORDEM DE SERVIÇO</h2><table style="margin-bottom:8px"><tr><td style="background:#f5f5f5;font-weight:bold;width:140px">CLIENTE</td><td>${os.clienteNome}</td><td style="background:#f5f5f5;font-weight:bold;width:120px">CNPJ</td><td>${os.clienteCnpj}</td></tr><tr><td style="background:#f5f5f5;font-weight:bold">SERVIÇO</td><td>${os.servico}</td><td style="background:#f5f5f5;font-weight:bold">CONTRATO</td><td>${os.contratoId}</td></tr><tr><td style="background:#f5f5f5;font-weight:bold">LOCAL</td><td>${os.localExecucao}</td><td style="background:#f5f5f5;font-weight:bold">VEÍCULO</td><td>${os.veiculoDescricao ?? "Não definido"}</td></tr><tr><td style="background:#f5f5f5;font-weight:bold">TÉCNICO LÍDER</td><td>${os.tecnicoNome}</td><td style="background:#f5f5f5;font-weight:bold">EQUIPE</td><td>${equipe}</td></tr></table><div class="section"><div class="section-header">Descrição das atividades</div><div class="section-body">${os.servico}</div></div><div class="section"><div class="section-header">Observações de campo</div><div class="section-body">${os.observacao ?? "Sem observações registradas."}</div></div><div class="footer">CIPERPRAG Controle de Pragas e Serviços LTDA • CNPJ 15.722.292/0001-43</div>`;
}

export default function OrdensServico() {
  const navigate = useNavigate();
  const [data, setData] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [encDialog, setEncDialog] = useState(false);
  const [encOsId, setEncOsId] = useState("");
  const [dataExecucao, setDataExecucao] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [tagEquipamento, setTagEquipamento] = useState("");
  const [checklist, setChecklist] = useState<Array<{ item: string; concluido: boolean; observacao?: string }>>([]);
  const [naoExecutada, setNaoExecutada] = useState(false);
  const [motivoNaoExecucao, setMotivoNaoExecucao] = useState("");
  const [fotos, setFotos] = useState<{ preview: string; base64: string }[]>([]);
  const [encerrada, setEncerrada] = useState(false);
  const [certHash, setCertHash] = useState("");
  const [certHashes, setCertHashes] = useState<string[]>([]);
  const [viewOs, setViewOs] = useState<OSApp | null>(null);
  const [editOs, setEditOs] = useState<OSApp | null>(null);
  const [editTecnico, setEditTecnico] = useState("");
  const [editLocal, setEditLocal] = useState("");
  const [editTag, setEditTag] = useState("");
  const [savingClose, setSavingClose] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      setData(await getBootstrap());
    } catch (err) {
      setError(cleanText(err instanceof Error ? err.message : "Falha ao carregar ordens de serviço."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const ordens = useMemo(() => data?.orders ?? [], [data?.orders]);
  const tecnicos = useMemo(() => data?.technicians ?? [], [data?.technicians]);
  const osSelecionada = ordens.find((item) => item.id === encOsId);
  const servicoSelecionado = data?.services.find((item) => item.nome === osSelecionada?.servico);
  const clienteSelecionado = data?.clients.find((item) => item.id === osSelecionada?.clienteId || item.cnpj === osSelecionada?.clienteCnpj);
  const equipamentosOs = clienteSelecionado?.equipamentos?.filter((item) => item.ativo) ?? [];

  const ordensFiltradas = useMemo(() => {
    let list = [...ordens].reverse();
    if (filtroStatus !== "todos") list = list.filter((item) => item.status === filtroStatus);
    if (busca) {
      const termo = cleanText(busca).toLowerCase();
      list = list.filter((item) => [
        item.numero,
        item.clienteNome,
        item.servico,
        item.tecnicoNome,
        item.localExecucao,
        item.tagEquipamentoServico || item.tags,
        item.equipeTecnicosNomes?.join(" "),
      ].some((value) => cleanText(value).toLowerCase().includes(termo)));
    }
    return list;
  }, [ordens, filtroStatus, busca]);

  const counts = {
    todos: ordens.length,
    aberta: ordens.filter((item) => item.status === "aberta").length,
    encerrada: ordens.filter((item) => item.status === "encerrada").length,
  };

  async function handleFotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    try {
      const prepared = await Promise.all(files.slice(0, 3 - fotos.length).map(prepareEvidencePhoto));
      setFotos((prev) => [...prev, ...prepared.map((base64) => ({ preview: base64, base64 }))].slice(0, 3));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível preparar a foto.");
    }
    event.target.value = "";
  }

  function openEnc(osId: string) {
    const os = ordens.find((item) => item.id === osId);
    const service = data?.services.find((item) => item.nome === os?.servico);
    setEncOsId(osId);
    setDataExecucao(todayInputDateBr());
    setQuantidade("1");
    setTagEquipamento(os?.tagEquipamentoServico || os?.tags?.split(",")[0]?.trim() || "");
    setChecklist((service?.checklistItens ?? []).map((item) => ({ item, concluido: false, observacao: "" })));
    setNaoExecutada(false);
    setMotivoNaoExecucao("");
    setFotos([]);
    setEncerrada(false);
    setCertHash("");
    setCertHashes([]);
    setEncDialog(true);
  }

  async function handleEncerrar() {
    if (!osSelecionada || !dataExecucao) return;
    if (savingClose) return;
    if (servicoSelecionado?.exigeFoto && !naoExecutada && fotos.length === 0) {
      toast.error("Este serviço exige ao menos uma foto de evidência.");
      return;
    }
    if (naoExecutada && !motivoNaoExecucao.trim()) {
      toast.error("Informe o motivo da não execução.");
      return;
    }
    setSavingClose(true);
    try {
      const response = await closeOrder(osSelecionada.id, {
        dataExecucao,
        quantidade: Number(quantidade || 1),
        tagEquipamentoServico: tagEquipamento,
        fotos: fotos.map((item) => item.base64),
        checklistRespostas: checklist,
        naoExecutada,
        motivoNaoExecucao,
      });
      setCertHash(response.certificateHash || "");
      setCertHashes(response.certificateHashes || (response.certificateHash ? [response.certificateHash] : []));
      setEncerrada(true);
      toast.success(response.certificateHash ? `OS encerrada e certificado ${response.certificateHash} gerado.` : "OS encerrada com sucesso!");
      reload();
    } catch (error) {
      toast.error(cleanText(error instanceof Error ? error.message : "Não foi possível encerrar a OS."));
    } finally {
      setSavingClose(false);
    }
  }

  function handleImprimirOS(os: OSApp) {
    printOsDocument(os, data);
  }

  function openEdit(os: OSApp) {
    setEditOs(os);
    setEditTecnico(os.tecnicoNome);
    setEditLocal(os.localExecucao);
    setEditTag(os.tagEquipamentoServico || os.tags || "");
  }

  async function handleSaveEdit() {
    if (!editOs) return;
    if (savingEdit) return;
    setSavingEdit(true);
    try {
      await updateOrder(editOs.id, { tecnicoNome: editTecnico, localExecucao: editLocal, tagEquipamentoServico: editTag, tags: editTag });
      toast.success("OS atualizada!");
      setEditOs(null);
      reload();
    } catch (error) {
      toast.error(cleanText(error instanceof Error ? error.message : "Não foi possível atualizar a OS."));
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operacional"
        title="Ordens de Serviço"
        description="Acompanhe a execução em campo, imprima a via da equipe e conclua as OS com evidências."
        crumbs={[{ label: "Operacional" }, { label: "Ordens de Serviço" }]}
        actions={[
          { label: "Atualizar OS", onClick: reload, variant: "outline" },
          { label: "Ir para agenda", to: "/agendar", variant: "default" },
        ]}
      />

      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardContent className="grid gap-3 pt-5 text-sm md:grid-cols-4">
          <div className="rounded-2xl border bg-card p-4">
            <p className="flex items-center gap-2 font-semibold">
              <Printer className="h-4 w-4 text-primary" />
              1. Via de campo
            </p>
            <p className="mt-2 text-muted-foreground">Imprima a OS gerada para a equipe executar e registrar as informações no atendimento.</p>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <p className="flex items-center gap-2 font-semibold">
              <Tag className="h-4 w-4 text-primary" />
              2. Serviço executado
            </p>
            <p className="mt-2 text-muted-foreground">No retorno, informe data, quantidade, tag/equipamento e checklist quando houver.</p>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <p className="flex items-center gap-2 font-semibold">
              <FileCheck2 className="h-4 w-4 text-primary" />
              3. Evidências
            </p>
            <p className="mt-2 text-muted-foreground">Anexe até 3 fotos da execução para compor histórico, certificado e auditoria.</p>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <p className="flex items-center gap-2 font-semibold">
              <Award className="h-4 w-4 text-primary" />
              4. Próximo fluxo
            </p>
            <p className="mt-2 text-muted-foreground">Ao encerrar, o sistema libera certificado quando aplicável e a OS entra na medição.</p>
          </div>
        </CardContent>
      </Card>

      {error ? <Card className="border-destructive/30 bg-destructive/5"><CardContent className="pt-4 text-sm text-muted-foreground">{error}</CardContent></Card> : null}
      {loading ? <Card><CardContent className="py-14 text-center text-sm text-muted-foreground">Carregando ordens de serviço...</CardContent></Card> : null}

      {!loading ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[{ label: "Total OS", value: counts.todos }, { label: "Abertas", value: counts.aberta }, { label: "Encerradas", value: counts.encerrada }].map((item) => (
              <Card key={item.label} className="metric-card">
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-xl font-bold">{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-44 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar OS, cliente, técnico..." className="h-9 pl-9" value={busca} onChange={(event) => setBusca(event.target.value)} />
            </div>
            <div className="flex gap-1">
              {["todos", "aberta", "encerrada"].map((status) => (
                <button
                  key={status}
                  onClick={() => setFiltroStatus(status)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${filtroStatus === status ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}
                >
                  {status === "todos" ? `Todas (${counts.todos})` : status === "aberta" ? `Abertas (${counts.aberta})` : `Encerradas (${counts.encerrada})`}
                </button>
              ))}
            </div>
          </div>

          {ordensFiltradas.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ClipboardList className="mb-3 h-10 w-10 opacity-30" />
                <p className="text-sm">Nenhuma OS encontrada</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {ordensFiltradas.map((os) => (
                <Card key={os.id} className="hover:shadow-md transition-all">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-base font-bold">{os.numero}</p>
                        <p className="text-xs text-muted-foreground">{fmtDate(os.dataEmissao)}</p>
                      </div>
                      <Badge variant={os.status === "aberta" ? "secondary" : "default"}>{os.status === "aberta" ? "Aberta" : "Encerrada"}</Badge>
                    </div>
                    <div className="space-y-1 text-xs">
                        <p className="truncate text-sm font-semibold">{cleanText(os.clienteNome)}</p>
                        <p className="truncate text-muted-foreground">{cleanText(os.servico)}</p>
                        <div className="flex items-center gap-1 text-muted-foreground"><User className="h-3 w-3" /> {cleanText(os.tecnicoNome)}</div>
                      <div className="flex items-center gap-1 text-muted-foreground"><Users className="h-3 w-3" /> {cleanJoin(os.equipeTecnicosNomes, os.tecnicoNome)}</div>
                      <div className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3" /> {cleanText(os.localExecucao)}</div>
                      {(os.tagEquipamentoServico || os.tags) ? <div className="flex items-center gap-1 text-muted-foreground"><Tag className="h-3 w-3" /> {cleanText(os.tagEquipamentoServico || os.tags)}</div> : null}
                      {os.evidencias?.length ? <div className="flex items-center gap-1 font-medium text-primary"><FileCheck2 className="h-3 w-3" /> {os.evidencias.length} evidência(s)</div> : null}
                      {os.naoExecutada ? <div className="flex items-center gap-1 font-medium text-destructive"><XCircle className="h-3 w-3" /> Não executada</div> : null}
                      {os.certificadoHash ? <div className="flex items-center gap-1 font-medium text-primary"><Award className="h-3 w-3" /> {os.certificadoHash}</div> : null}
                    </div>
                    <div className="flex flex-wrap gap-1.5 border-t pt-1">
                      <Button size="sm" variant="outline" className="h-7 flex-1 gap-1 text-xs" onClick={() => setViewOs(os)}><Eye className="h-3 w-3" /> Ver</Button>
                      <Button size="sm" variant="outline" className="h-7 flex-1 gap-1 text-xs" onClick={() => handleImprimirOS(os)}><Printer className="h-3 w-3" /> Imprimir</Button>
                      {os.status === "aberta" ? (
                        <>
                          <Button size="sm" variant="outline" className="h-7 flex-1 gap-1 text-xs" onClick={() => openEdit(os)}><PenLine className="h-3 w-3" /> Editar</Button>
                          <Button size="sm" className="mt-1 h-7 w-full gap-1 text-xs" onClick={() => openEnc(os.id)}><FileCheck2 className="h-3 w-3" /> Encerrar OS</Button>
                        </>
                      ) : os.certificadoHash ? (
                        <Button size="sm" variant="outline" className="mt-1 h-7 w-full gap-1 text-xs" onClick={() => navigate(`/certificados?hash=${os.certificadoHash}`)}>
                          <Award className="h-3 w-3" /> Abrir certificado
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : null}

      <Dialog open={encDialog} onOpenChange={setEncDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FileCheck2 className="h-5 w-5 text-primary" />{encerrada ? "OS encerrada" : `Encerrar ${osSelecionada?.numero}`}</DialogTitle></DialogHeader>
          {!encerrada ? (
            <div className="space-y-4">
              {osSelecionada ? <div className="grid grid-cols-2 gap-1.5 rounded-lg border bg-muted/40 p-3 text-xs"><span className="text-muted-foreground">Cliente</span><span className="font-medium">{cleanText(osSelecionada.clienteNome)}</span><span className="text-muted-foreground">Serviço</span><span>{cleanText(osSelecionada.servico)}</span><span className="text-muted-foreground">Equipe</span><span>{cleanJoin(osSelecionada.equipeTecnicosNomes, osSelecionada.tecnicoNome)}</span><span className="text-muted-foreground">Local</span><span>{cleanText(osSelecionada.localExecucao)}</span></div> : null}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Data de execução <span className="text-destructive">*</span></Label><Input type="date" value={dataExecucao} onChange={(event) => setDataExecucao(event.target.value)} /></div>
                <div className="space-y-1.5"><Label>Quantidade</Label><Input type="number" min="1" value={quantidade} onChange={(event) => setQuantidade(event.target.value)} /></div>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Tag do equipamento atendido</Label>
                {equipamentosOs.length > 0 ? (
                  <Select value={tagEquipamento || "sem-tag"} onValueChange={(value) => setTagEquipamento(value === "sem-tag" ? "" : value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sem-tag">Sem tag específica</SelectItem>
                      {equipamentosOs.map((equipamento) => <SelectItem key={equipamento.id || equipamento.tag} value={equipamento.tag}>{cleanText(equipamento.tag)} — {cleanText(equipamento.descricao || equipamento.tipo || "Equipamento")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={tagEquipamento} onChange={(event) => setTagEquipamento(event.target.value)} placeholder="Ex: BEB-02, CX-01, ARM-03" />
                )}
              </div>
              {servicoSelecionado?.popCodigo || servicoSelecionado?.popTitulo ? (
                <div className="rounded-lg border bg-muted/30 p-3 text-xs">
                  <p className="flex items-center gap-1.5 font-semibold"><BookOpen className="h-3.5 w-3.5 text-primary" /> POP vinculado</p>
                  <p className="mt-1 text-muted-foreground">{servicoSelecionado.popCodigo || "POP"} {servicoSelecionado.popVersao ? `· versão ${servicoSelecionado.popVersao}` : ""}</p>
                  {servicoSelecionado.popTitulo ? <p className="font-medium">{cleanText(servicoSelecionado.popTitulo)}</p> : null}
                </div>
              ) : null}
              {checklist.length > 0 ? (
                <div className="space-y-2 rounded-lg border p-3">
                  <Label className="flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5" /> Checklist do serviço</Label>
                  {checklist.map((item, index) => (
                    <label key={`${item.item}-${index}`} className="flex items-start gap-2 rounded-md border p-2 text-xs">
                      <Checkbox checked={item.concluido} onCheckedChange={(checked) => setChecklist((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, concluido: Boolean(checked) } : entry))} />
                      <span>{cleanText(item.item)}</span>
                    </label>
                  ))}
                </div>
              ) : null}
              {servicoSelecionado?.permiteNaoExecucao ? (
                <div className="space-y-2 rounded-lg border p-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={naoExecutada} onCheckedChange={(checked) => setNaoExecutada(Boolean(checked))} />
                    Registrar como não executada
                  </label>
                  {naoExecutada ? <Textarea value={motivoNaoExecucao} onChange={(event) => setMotivoNaoExecucao(event.target.value)} placeholder="Informe o motivo da não execução..." rows={3} /> : null}
                </div>
              ) : null}
              <div className="space-y-2"><Label>Fotos de evidência <span className="text-xs text-muted-foreground">(até 3)</span></Label><input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFotoChange} /><div className="flex gap-3">{[0, 1, 2].map((index) => <div key={index} className="relative">{fotos[index] ? <div className="group relative h-24 w-24 overflow-hidden rounded-lg border-2 border-primary"><img src={fotos[index].preview} alt={`Foto ${index + 1}`} className="h-full w-full object-cover" /><button onClick={() => setFotos((prev) => prev.filter((_, fotoIndex) => fotoIndex !== index))} className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5"><X className="h-3 w-3 text-white" /></button></div> : <button onClick={() => fileInputRef.current?.click()} className="flex h-24 w-24 flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground transition-colors hover:border-primary/50">Foto {index + 1}</button>}</div>)}</div></div>
              <DialogFooter><Button variant="outline" onClick={() => setEncDialog(false)} disabled={savingClose}>Cancelar</Button><Button onClick={handleEncerrar} disabled={savingClose}>{savingClose ? "Encerrando..." : "Encerrar OS"}</Button></DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2 rounded-lg border border-green-200 bg-green-50 p-5 text-center dark:bg-green-950/20"><CheckCircle2 className="mx-auto h-10 w-10 text-green-600" /><p className="font-bold text-green-700">OS encerrada com sucesso.</p>{certHashes.length > 1 ? <p className="text-sm text-muted-foreground">{certHashes.length} certificados gerados, um para cada TAG atendida.</p> : null}{certHashes.length ? <div className="space-y-1 font-mono text-sm font-bold text-primary">{certHashes.map((hash) => <p key={hash}>{hash}</p>)}</div> : certHash ? <p className="font-mono text-lg font-bold text-primary">{certHash}</p> : null}</div>
              <DialogFooter><Button variant="outline" onClick={() => setEncDialog(false)}>Fechar</Button>{certHash ? <Button onClick={() => { setEncDialog(false); navigate("/certificados"); }}><Award className="mr-1.5 h-4 w-4" /> Ver certificados</Button> : null}</DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewOs} onOpenChange={(value) => { if (!value) setViewOs(null); }}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center justify-between"><span>{viewOs?.numero}</span>{viewOs ? <Button size="sm" variant="outline" className="mr-6 gap-1.5" onClick={() => handleImprimirOS(viewOs)}><Printer className="h-3.5 w-3.5" /> Imprimir</Button> : null}</DialogTitle></DialogHeader>
          {viewOs ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Número", viewOs.numero],
                  ["Status", viewOs.status === "aberta" ? "Aberta" : "Encerrada"],
                  ["Cliente", cleanText(viewOs.clienteNome)],
                  ["Serviço", cleanText(viewOs.servico)],
                  ["Técnico líder", cleanText(viewOs.tecnicoNome)],
                  ["Equipe", cleanJoin(viewOs.equipeTecnicosNomes, viewOs.tecnicoNome)],
                  ["Local", cleanText(viewOs.localExecucao)],
                  ["Tag equipamento", cleanText(viewOs.tagEquipamentoServico || "—")],
                  ["Emissão", fmtDate(viewOs.dataEmissao)],
                  ["Execução", viewOs.dataExecucao ? fmtDate(viewOs.dataExecucao) : "—"],
                  ["Quantidade", `${viewOs.quantidade} ${viewOs.unidade}`],
                  ["Certificado", viewOs.certificadoHash || "—"],
                  ["Anexos", `${viewOs.evidencias?.length || viewOs.fotos?.length || 0}`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border bg-muted/30 p-2">
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="text-xs font-medium">{value}</p>
                  </div>
                ))}
              </div>

              {(viewOs.evidencias?.length || viewOs.fotos?.length) ? (
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">Evidências anexadas</p>
                  <div className="flex flex-wrap gap-2">
                    {(viewOs.evidencias?.length ? viewOs.evidencias.filter(isImageEvidence) : viewOs.fotos.map((foto, index) => ({ id: `foto-${index}`, nomeArquivo: `Foto ${index + 1}`, conteudoBase64: foto, tamanhoBytes: undefined }))).map((anexo, index) => (
                      <div key={anexo.id || index} className="space-y-1">
                        <img src={anexo.conteudoBase64} alt={anexo.nomeArquivo || `Foto ${index + 1}`} className="h-24 w-24 rounded-lg border object-cover" />
                    <p className="max-w-24 truncate text-[10px] text-muted-foreground">{cleanText(anexo.nomeArquivo)} {formatBytes(anexo.tamanhoBytes)}</p>
                      </div>
                    ))}
                  </div>

                  {viewOs.evidencias?.some((item) => item.categoria === "pdf_historico") ? (
                    <div className="mt-3 rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs font-semibold">Documentos históricos</p>
                      {viewOs.evidencias.filter((item) => item.categoria === "pdf_historico").map((item) => (
                        <div key={item.id} className="mt-2 flex flex-col gap-2 rounded-md border bg-background p-2 md:flex-row md:items-center md:justify-between">
                          <p className="text-[11px] text-muted-foreground">
                            {cleanText(item.nomeArquivo)} {item.imutavel ? "· imutável" : ""} {item.hashSha256 ? `· hash ${item.hashSha256.slice(0, 12)}...` : ""}
                          </p>
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openAttachment(item)}>Abrir</Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => downloadAttachment(item)}>Baixar</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editOs} onOpenChange={(value) => { if (!value) setEditOs(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><PenLine className="h-4 w-4 text-primary" /> Editar OS — {editOs?.numero}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Técnico responsável</Label><Select value={editTecnico} onValueChange={setEditTecnico}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{tecnicos.filter((item) => item.ativo).map((item) => <SelectItem key={item.id} value={item.nome}>{cleanText(item.nome)} — {cleanText(item.cargo)}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Local de execução</Label><Input value={editLocal} onChange={(event) => setEditLocal(event.target.value)} /></div>
            <div className="space-y-1.5"><Label className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Tag/equipamento</Label><Input value={editTag} onChange={(event) => setEditTag(event.target.value)} placeholder="Ex: BEB-02, CX-01, ARM-03" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditOs(null)} disabled={savingEdit}>Cancelar</Button><Button onClick={handleSaveEdit} disabled={savingEdit}>{savingEdit ? "Salvando..." : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
