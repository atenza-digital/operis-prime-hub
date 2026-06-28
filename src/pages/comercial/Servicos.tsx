import { useEffect, useState } from "react";
import { getBootstrap, saveService, type ServicoCatalogo } from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Briefcase, Plus, Pencil, Search, ShieldCheck, FlaskConical, HardHat, AlertTriangle, RotateCcw, BookOpen } from "lucide-react";
import { toast } from "sonner";

const emptyServico: Omit<ServicoCatalogo, "id"> = {
  nome: "",
  tipo: "sanitario",
  descricao: "",
  unidade: "",
  recorrenciaDias: 30,
  geraCertificado: true,
  validadeCertificadoDias: 30,
  produtosQuimicos: [],
  epis: [],
  riscos: [],
  normasAplicaveis: [],
  procedimentos: [],
  ativo: true,
};

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
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((value, index) => (
            <Badge
              key={`${value}-${index}`}
              variant="secondary"
              className="text-xs cursor-pointer hover:bg-destructive/20"
              onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}
            >
              {value} x
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Servicos() {
  const [lista, setLista] = useState<ServicoCatalogo[]>([]);
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<ServicoCatalogo, "id">>(emptyServico);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const data = await getBootstrap();
      setLista(data.services);
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

  const openNew = () => {
    setEditId(null);
    setForm({ ...emptyServico });
    setDialogOpen(true);
  };

  const openEdit = (servico: ServicoCatalogo) => {
    setEditId(servico.id);
    const { id, ...rest } = servico;
    setForm(rest);
    setDialogOpen(true);
  };

  async function handleSave() {
    if (!form.nome || !form.unidade) {
      toast.error("Nome e unidade são obrigatórios");
      return;
    }

    setSaving(true);
    try {
      await saveService({ ...form, id: editId ?? undefined });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            Catálogo de Serviços
          </h1>
          <p className="text-muted-foreground text-sm">Cadastre e gerencie os serviços usando apenas o banco</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Serviço</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar serviço..." value={busca} onChange={(event) => setBusca(event.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Carregando serviços...</div>
          ) : (
            filtrados.map((servico) => (
              <div key={servico.id} className="rounded-lg border overflow-hidden">
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedId(expandedId === servico.id ? null : servico.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{servico.id}</span>
                      <Badge variant={servico.tipo === "sanitario" ? "default" : "secondary"}>
                        {servico.tipo === "sanitario" ? "Sanitário" : "Manutenção"}
                      </Badge>
                      {servico.geraCertificado && <Badge variant="outline" className="text-[10px]"><ShieldCheck className="h-3 w-3 mr-1" />Certificado</Badge>}
                      {!servico.ativo && <Badge variant="destructive">Inativo</Badge>}
                    </div>
                    <p className="font-semibold text-sm mt-1">{servico.nome}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>Unidade: {servico.unidade}</span>
                      {servico.recorrenciaDias > 0 && <span className="flex items-center gap-1"><RotateCcw className="h-3 w-3" />A cada {servico.recorrenciaDias} dias</span>}
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

                {expandedId === servico.id && (
                  <div className="border-t bg-muted/20 p-4 space-y-4 text-sm">
                    <p className="text-muted-foreground">{servico.descricao}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {servico.produtosQuimicos.length > 0 && (
                        <div>
                          <p className="text-xs font-medium flex items-center gap-1 mb-1.5"><FlaskConical className="h-3.5 w-3.5 text-primary" />Produtos Químicos</p>
                          <div className="flex flex-wrap gap-1">{servico.produtosQuimicos.map((item) => <Badge key={item} variant="outline" className="text-xs">{item}</Badge>)}</div>
                        </div>
                      )}
                      {servico.epis.length > 0 && (
                        <div>
                          <p className="text-xs font-medium flex items-center gap-1 mb-1.5"><HardHat className="h-3.5 w-3.5 text-primary" />EPIs</p>
                          <div className="flex flex-wrap gap-1">{servico.epis.map((item) => <Badge key={item} variant="outline" className="text-xs">{item}</Badge>)}</div>
                        </div>
                      )}
                      {servico.riscos.length > 0 && (
                        <div>
                          <p className="text-xs font-medium flex items-center gap-1 mb-1.5"><AlertTriangle className="h-3.5 w-3.5 text-destructive" />Riscos</p>
                          <div className="flex flex-wrap gap-1">{servico.riscos.map((item) => <Badge key={item} variant="destructive" className="text-xs">{item}</Badge>)}</div>
                        </div>
                      )}
                      {servico.normasAplicaveis.length > 0 && (
                        <div>
                          <p className="text-xs font-medium flex items-center gap-1 mb-1.5"><BookOpen className="h-3.5 w-3.5 text-primary" />Normas</p>
                          <div className="flex flex-wrap gap-1">{servico.normasAplicaveis.map((item) => <Badge key={item} variant="secondary" className="text-xs">{item}</Badge>)}</div>
                        </div>
                      )}
                    </div>
                    {servico.procedimentos.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1.5">Procedimentos</p>
                        <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-0.5">
                          {servico.procedimentos.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Editar Serviço" : "Novo Serviço"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Unidade *</Label>
                <Input value={form.unidade} onChange={(event) => setForm({ ...form, unidade: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Recorrência (dias)</Label>
                <Input type="number" value={form.recorrenciaDias} onChange={(event) => setForm({ ...form, recorrenciaDias: Number(event.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Validade Certificado (dias)</Label>
                <Input type="number" value={form.validadeCertificadoDias} onChange={(event) => setForm({ ...form, validadeCertificadoDias: Number(event.target.value) })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.geraCertificado} onChange={(event) => setForm({ ...form, geraCertificado: event.target.checked })} className="rounded" />
              Gera certificado de execução
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.ativo} onChange={(event) => setForm({ ...form, ativo: event.target.checked })} className="rounded" />
              Serviço ativo
            </label>
            <TagEditor label="Produtos Químicos" icon={FlaskConical} values={form.produtosQuimicos} onChange={(values) => setForm({ ...form, produtosQuimicos: values })} />
            <TagEditor label="EPIs Obrigatórios" icon={HardHat} values={form.epis} onChange={(values) => setForm({ ...form, epis: values })} />
            <TagEditor label="Riscos" icon={AlertTriangle} values={form.riscos} onChange={(values) => setForm({ ...form, riscos: values })} />
            <TagEditor label="Normas Aplicáveis" icon={BookOpen} values={form.normasAplicaveis} onChange={(values) => setForm({ ...form, normasAplicaveis: values })} />
            <TagEditor label="Procedimentos" icon={Briefcase} values={form.procedimentos} onChange={(values) => setForm({ ...form, procedimentos: values })} />
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
