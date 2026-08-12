import { useEffect, useState } from "react";
import { AlertTriangle, BookOpen, Briefcase, ClipboardCheck, FileUp, FlaskConical, HardHat, Pencil, Plus, RotateCcw, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getBootstrap, saveService, uploadServicePopFile, type EvidenciaAnexoApp, type ServicoCatalogo } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const emptyServico: Omit<ServicoCatalogo, "id"> = {
  nome: "",
  tipo: "sanitario",
  descricao: "",
  unidade: "",
  recorrenciaDias: 30,
  geraCertificado: true,
  validadeCertificadoDias: 30,
  produtosQuimicos: [],
  produtosDetalhados: [],
  epis: [],
  riscos: [],
  normasAplicaveis: [],
  procedimentos: [],
  checklistItens: [],
  exigeFoto: false,
  exigeAssinatura: true,
  permiteNaoExecucao: true,
  popCodigo: "",
  popTitulo: "",
  popVersao: "001",
  popObjetivo: "",
  popAplicacao: "",
  popResponsabilidades: [],
  popMateriais: [],
  popAprovadoPor: "",
  popAprovadoEm: "",
  ativo: true,
};

type ProdutoDetalhado = NonNullable<ServicoCatalogo["produtosDetalhados"]>[number];

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Nao foi possivel ler o arquivo selecionado."));
    reader.readAsDataURL(file);
  });
}

function TagEditor({
  label,
  icon: Icon,
  values,
  onChange,
}: {
  label: string;
  icon: React.ElementType;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function add() {
    const value = input.trim();
    if (!value || values.includes(value)) return;
    onChange([...values, value]);
    setInput("");
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5 text-xs"><Icon className="h-3.5 w-3.5" />{label}</Label>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          placeholder="Adicionar..."
          className="text-sm"
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>+</Button>
      </div>
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {values.map((value, index) => (
            <Badge
              key={`${value}-${index}`}
              variant="secondary"
              className="cursor-pointer text-xs hover:bg-destructive/20"
              onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}
            >
              {value} x
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProductDetailsEditor({
  values,
  onChange,
}: {
  values: ProdutoDetalhado[];
  onChange: (values: ProdutoDetalhado[]) => void;
}) {
  const fields: Array<{ key: keyof ProdutoDetalhado; label: string; placeholder: string }> = [
    { key: "nome", label: "Produto", placeholder: "Ex.: Hipoclorito de Sodio 2,5%" },
    { key: "grupoQuimico", label: "Grupo", placeholder: "Ex.: Desinfetante" },
    { key: "qtUso", label: "Qt. uso", placeholder: "Ex.: 10 ml/L" },
    { key: "diluente", label: "Diluente", placeholder: "Ex.: Agua" },
    { key: "volAplicado", label: "Vol. aplicado", placeholder: "Ex.: Conforme area" },
    { key: "combate", label: "Combate", placeholder: "Ex.: Bacterias" },
    { key: "antidoto", label: "Antidoto", placeholder: "Ex.: Tratamento sintomatico" },
  ];

  function update(index: number, patch: Partial<ProdutoDetalhado>) {
    onChange(values.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold"><FlaskConical className="h-4 w-4 text-primary" /> Produtos detalhados do certificado</p>
          <p className="text-xs text-muted-foreground">Esses dados alimentam a tabela do certificado quando a OS for encerrada.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...values, {}])}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Produto
        </Button>
      </div>

      {values.length === 0 ? (
        <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
          Se não houver produto detalhado, o certificado usa a lista simples de produtos químicos ou exibe não aplicável.
        </p>
      ) : (
        <div className="space-y-3">
          {values.map((produto, index) => (
            <div key={index} className="rounded-md border bg-background/80 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-bold text-muted-foreground">Produto {index + 1}</p>
                <Button type="button" variant="ghost" size="sm" onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}>
                  Remover
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {fields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs">{field.label}</Label>
                    <Input
                      value={produto[field.key] || ""}
                      onChange={(event) => update(index, { [field.key]: event.target.value })}
                      placeholder={field.placeholder}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Servicos() {
  const [lista, setLista] = useState<ServicoCatalogo[]>([]);
  const [anexos, setAnexos] = useState<EvidenciaAnexoApp[]>([]);
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<ServicoCatalogo, "id">>(emptyServico);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [popFile, setPopFile] = useState<File | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const data = await getBootstrap();
      setLista(data.services);
      setAnexos(data.attachments);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar serviços");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const filtrados = lista.filter((item) => item.nome.toLowerCase().includes(busca.toLowerCase()));

  function openNew() {
    setEditId(null);
    setForm({ ...emptyServico });
    setPopFile(null);
    setDialogOpen(true);
  }

  function openEdit(servico: ServicoCatalogo) {
    const { id, ...rest } = servico;
    setEditId(id);
    setForm({
      ...emptyServico,
      ...rest,
      popVersao: rest.popVersao || "001",
      popResponsabilidades: rest.popResponsabilidades || [],
      popMateriais: rest.popMateriais || [],
    });
    setPopFile(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.nome || !form.unidade) {
      toast.error("Nome e unidade são obrigatórios");
      return;
    }

    setSaving(true);
    try {
      const saved = await saveService({ ...form, id: editId ?? undefined }) as { id?: string };
      if (popFile) {
        await uploadServicePopFile(saved.id || editId || "", {
          fileName: popFile.name,
          mimeType: popFile.type || "application/octet-stream",
          contentBase64: await readFileAsDataUrl(popFile),
        });
      }
      toast.success(editId ? "Serviço atualizado" : "Serviço cadastrado");
      setDialogOpen(false);
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar serviço");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Briefcase className="h-6 w-6 text-primary" />
            Serviços
          </h1>
          <p className="text-sm text-muted-foreground">Regras técnicas, POPs versionados e checklists usados em OS, certificados e medições.</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Novo Serviço</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar serviço..." value={busca} onChange={(event) => setBusca(event.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Carregando serviços...</div>
          ) : filtrados.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Nenhum serviço encontrado.</div>
          ) : filtrados.map((servico) => {
            const popAnexos = anexos.filter((anexo) => anexo.entidadeTipo === "servico_pop" && anexo.entidadeId === servico.popId && anexo.categoria === "pop_aprovado");
            return (
            <div key={servico.id} className="overflow-hidden rounded-lg border">
              <div className="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-muted/30" onClick={() => setExpandedId(expandedId === servico.id ? null : servico.id)}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{servico.id}</span>
                    <Badge variant={servico.tipo === "sanitario" ? "default" : "secondary"}>{servico.tipo === "sanitario" ? "Sanitário" : "Manutenção"}</Badge>
                    {servico.geraCertificado ? <Badge variant="outline" className="text-[10px]"><ShieldCheck className="mr-1 h-3 w-3" />Certificado</Badge> : null}
                    {servico.checklistItens.length > 0 ? <Badge variant="outline" className="text-[10px]"><ClipboardCheck className="mr-1 h-3 w-3" />Checklist</Badge> : null}
                    {servico.popCodigo ? <Badge variant="secondary" className="text-[10px]">{servico.popCodigo} v{servico.popVersao || "001"}</Badge> : null}
                    {!servico.ativo ? <Badge variant="destructive">Inativo</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm font-semibold">{servico.nome}</p>
                  <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Unidade: {servico.unidade}</span>
                    {servico.recorrenciaDias > 0 ? <span className="flex items-center gap-1"><RotateCcw className="h-3 w-3" />A cada {servico.recorrenciaDias} dias</span> : null}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(event) => {
                    event.stopPropagation();
                    openEdit(servico);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>

              {expandedId === servico.id ? (
                <div className="space-y-4 border-t bg-muted/20 p-4 text-sm">
                  <p className="text-muted-foreground">{servico.descricao}</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    {servico.produtosQuimicos.length > 0 ? (
                      <div>
                        <p className="mb-1.5 flex items-center gap-1 text-xs font-medium"><FlaskConical className="h-3.5 w-3.5 text-primary" />Produtos químicos</p>
                        <div className="flex flex-wrap gap-1">{servico.produtosQuimicos.map((item) => <Badge key={item} variant="outline" className="text-xs">{item}</Badge>)}</div>
                      </div>
                    ) : null}
                    {servico.epis.length > 0 ? (
                      <div>
                        <p className="mb-1.5 flex items-center gap-1 text-xs font-medium"><HardHat className="h-3.5 w-3.5 text-primary" />EPIs</p>
                        <div className="flex flex-wrap gap-1">{servico.epis.map((item) => <Badge key={item} variant="outline" className="text-xs">{item}</Badge>)}</div>
                      </div>
                    ) : null}
                    {servico.riscos.length > 0 ? (
                      <div>
                        <p className="mb-1.5 flex items-center gap-1 text-xs font-medium"><AlertTriangle className="h-3.5 w-3.5 text-destructive" />Riscos</p>
                        <div className="flex flex-wrap gap-1">{servico.riscos.map((item) => <Badge key={item} variant="destructive" className="text-xs">{item}</Badge>)}</div>
                      </div>
                    ) : null}
                    {servico.normasAplicaveis.length > 0 ? (
                      <div>
                        <p className="mb-1.5 flex items-center gap-1 text-xs font-medium"><BookOpen className="h-3.5 w-3.5 text-primary" />Normas</p>
                        <div className="flex flex-wrap gap-1">{servico.normasAplicaveis.map((item) => <Badge key={item} variant="secondary" className="text-xs">{item}</Badge>)}</div>
                      </div>
                    ) : null}
                  </div>

                  {(servico.popCodigo || servico.popObjetivo || servico.popAplicacao) ? (
                    <div className="rounded-lg border bg-background/80 p-3">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold"><BookOpen className="h-3.5 w-3.5 text-primary" /> POP ativo {servico.popCodigo ? `- ${servico.popCodigo}` : ""} {servico.popVersao ? `v${servico.popVersao}` : ""}</p>
                      {servico.popTitulo ? <p className="text-xs font-medium">{servico.popTitulo}</p> : null}
                      {servico.popObjetivo ? <p className="mt-1 text-xs text-muted-foreground"><strong>Objetivo:</strong> {servico.popObjetivo}</p> : null}
                      {servico.popAplicacao ? <p className="mt-1 text-xs text-muted-foreground"><strong>Aplicação:</strong> {servico.popAplicacao}</p> : null}
                      {servico.popMateriais?.length ? <p className="mt-1 text-xs text-muted-foreground"><strong>Materiais:</strong> {servico.popMateriais.join(", ")}</p> : null}
                      {servico.popResponsabilidades?.length ? <p className="mt-1 text-xs text-muted-foreground"><strong>Responsabilidades:</strong> {servico.popResponsabilidades.join(", ")}</p> : null}
                      {popAnexos.length > 0 ? (
                        <div className="mt-3 border-t pt-3">
                          <p className="text-xs font-semibold text-primary">Arquivo(s) do POP</p>
                          {popAnexos.map((anexo) => <p key={anexo.id} className="mt-1 break-all text-xs text-muted-foreground">{anexo.nomeArquivo} · SHA-256 {anexo.hashSha256?.slice(0, 12) || "pendente"}...</p>)}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {servico.procedimentos.length > 0 ? (
                    <div>
                      <p className="mb-1.5 text-xs font-medium">Procedimentos da OS</p>
                      <ol className="list-inside list-decimal space-y-0.5 text-xs text-muted-foreground">
                        {servico.procedimentos.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
                      </ol>
                    </div>
                  ) : null}
                  {servico.checklistItens.length > 0 ? (
                    <div>
                      <p className="mb-1.5 text-xs font-medium">Checklist de encerramento</p>
                      <ol className="list-inside list-decimal space-y-0.5 text-xs text-muted-foreground">
                        {servico.checklistItens.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
                      </ol>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Editar Serviço" : "Novo Serviço"}</DialogTitle></DialogHeader>
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome do Serviço *</Label>
                <Input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={(value) => setForm({ ...form, tipo: value as "sanitario" | "manutencao" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sanitario">Sanitário</SelectItem>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} rows={3} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Unidade *</Label>
                <Input value={form.unidade} onChange={(event) => setForm({ ...form, unidade: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Recorrência (dias)</Label>
                <Input type="number" value={form.recorrenciaDias} onChange={(event) => setForm({ ...form, recorrenciaDias: Number(event.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Validade do certificado (dias)</Label>
                <Input type="number" value={form.validadeCertificadoDias} onChange={(event) => setForm({ ...form, validadeCertificadoDias: Number(event.target.value) })} />
              </div>
            </div>

            <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={form.geraCertificado} onChange={(event) => setForm({ ...form, geraCertificado: event.target.checked })} className="rounded" />
                Gera certificado de execução
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={form.ativo} onChange={(event) => setForm({ ...form, ativo: event.target.checked })} className="rounded" />
                Serviço ativo
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={form.exigeFoto} onChange={(event) => setForm({ ...form, exigeFoto: event.target.checked })} className="rounded" />
                Exige foto no encerramento
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={form.exigeAssinatura} onChange={(event) => setForm({ ...form, exigeAssinatura: event.target.checked })} className="rounded" />
                Exige assinatura na OS
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={form.permiteNaoExecucao} onChange={(event) => setForm({ ...form, permiteNaoExecucao: event.target.checked })} className="rounded" />
                Permite registrar não execução
              </label>
            </div>

            <div className="space-y-4 rounded-lg border p-3">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold"><BookOpen className="h-4 w-4 text-primary" /> POP versionado</p>
                <p className="text-xs text-muted-foreground">POP é o Procedimento Operacional Padrão: orienta a equipe sobre como executar o serviço com segurança e consistência. A versão ativa alimenta a OS e o checklist de encerramento.</p>
              </div>
              <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
                <Label className="flex items-center gap-2 text-sm font-semibold"><FileUp className="h-4 w-4 text-primary" /> Anexar POP pronto</Label>
                <p className="mt-1 text-xs text-muted-foreground">Se a empresa já possui o POP, envie PDF, DOCX, ODT, PNG ou JPG. O arquivo será guardado no histórico do tenant; o cadastro detalhado abaixo é opcional.</p>
                <Input type="file" accept="application/pdf,.pdf,.docx,.doc,.odt,.png,.jpg,.jpeg" className="mt-3" onChange={(event) => setPopFile(event.target.files?.[0] || null)} />
                {popFile ? <p className="mt-2 text-xs font-medium text-primary">Selecionado: {popFile.name}</p> : null}
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>Código do POP</Label>
                  <Input value={form.popCodigo || ""} onChange={(event) => setForm({ ...form, popCodigo: event.target.value })} placeholder="Ex.: POP-BEB-001" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Título do POP</Label>
                  <Input value={form.popTitulo || ""} onChange={(event) => setForm({ ...form, popTitulo: event.target.value })} placeholder="Ex.: Higienização de bebedouro" />
                </div>
                <div className="space-y-2">
                  <Label>Versão</Label>
                  <Input value={form.popVersao || ""} onChange={(event) => setForm({ ...form, popVersao: event.target.value })} placeholder="001" />
                </div>
                <div className="space-y-2">
                  <Label>Aprovado por</Label>
                  <Input value={form.popAprovadoPor || ""} onChange={(event) => setForm({ ...form, popAprovadoPor: event.target.value })} placeholder="Responsável técnico" />
                </div>
                <div className="space-y-2">
                  <Label>Data de aprovação</Label>
                  <Input type="date" value={form.popAprovadoEm || ""} onChange={(event) => setForm({ ...form, popAprovadoEm: event.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Objetivo do POP</Label>
                  <Textarea value={form.popObjetivo || ""} onChange={(event) => setForm({ ...form, popObjetivo: event.target.value })} rows={3} placeholder="Descreva o objetivo do procedimento..." />
                </div>
                <div className="space-y-2">
                  <Label>Aplicação</Label>
                  <Textarea value={form.popAplicacao || ""} onChange={(event) => setForm({ ...form, popAplicacao: event.target.value })} rows={3} placeholder="Onde/quando este POP deve ser aplicado..." />
                </div>
              </div>
              <TagEditor label="Responsabilidades do POP" icon={ShieldCheck} values={form.popResponsabilidades || []} onChange={(values) => setForm({ ...form, popResponsabilidades: values })} />
              <TagEditor label="Materiais e registros do POP" icon={ClipboardCheck} values={form.popMateriais || []} onChange={(values) => setForm({ ...form, popMateriais: values })} />
            </div>

            <TagEditor label="Produtos químicos" icon={FlaskConical} values={form.produtosQuimicos} onChange={(values) => setForm({ ...form, produtosQuimicos: values })} />
            <TagEditor label="EPIs obrigatórios" icon={HardHat} values={form.epis} onChange={(values) => setForm({ ...form, epis: values })} />
            <ProductDetailsEditor values={form.produtosDetalhados || []} onChange={(values) => setForm({ ...form, produtosDetalhados: values })} />
            <TagEditor label="Riscos" icon={AlertTriangle} values={form.riscos} onChange={(values) => setForm({ ...form, riscos: values })} />
            <TagEditor label="Normas aplicáveis" icon={BookOpen} values={form.normasAplicaveis} onChange={(values) => setForm({ ...form, normasAplicaveis: values })} />
            <TagEditor label="Procedimentos da OS" icon={Briefcase} values={form.procedimentos} onChange={(values) => setForm({ ...form, procedimentos: values })} />
            <TagEditor label="Checklist de encerramento" icon={ClipboardCheck} values={form.checklistItens} onChange={(values) => setForm({ ...form, checklistItens: values })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : editId ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
