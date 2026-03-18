import { useState } from "react";
import { servicosCatalogo as catalogoMock, type ServicoCatalogo } from "@/data/comercialData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  nome: "", tipo: "sanitario", descricao: "", unidade: "", recorrenciaDias: 30,
  geraCertificado: true, validadeCertificadoDias: 30,
  produtosQuimicos: [], epis: [], riscos: [], normasAplicaveis: [], procedimentos: [], ativo: true,
};

function TagEditor({ label, icon: Icon, values, onChange }: { label: string; icon: React.ElementType; values: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
      setInput("");
    }
  };
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5 text-xs"><Icon className="h-3.5 w-3.5" />{label}</Label>
      <div className="flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} placeholder="Adicionar..." className="text-sm" />
        <Button type="button" variant="outline" size="sm" onClick={add}>+</Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v, i) => (
            <Badge key={i} variant="secondary" className="text-xs cursor-pointer hover:bg-destructive/20" onClick={() => onChange(values.filter((_, j) => j !== i))}>
              {v} ×
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Servicos() {
  const [lista, setLista] = useState<ServicoCatalogo[]>(catalogoMock);
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<ServicoCatalogo, "id">>(emptyServico);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtrados = lista.filter((s) => s.nome.toLowerCase().includes(busca.toLowerCase()));

  const openNew = () => { setEditId(null); setForm({ ...emptyServico }); setDialogOpen(true); };
  const openEdit = (s: ServicoCatalogo) => { setEditId(s.id); const { id, ...rest } = s; setForm(rest); setDialogOpen(true); };

  const handleSave = () => {
    if (!form.nome || !form.unidade) { toast.error("Nome e unidade são obrigatórios"); return; }
    if (editId) {
      setLista((prev) => prev.map((s) => (s.id === editId ? { ...form, id: editId } : s)));
      toast.success("Serviço atualizado");
    } else {
      setLista((prev) => [...prev, { ...form, id: `SRV-${String(prev.length + 1).padStart(3, "0")}` }]);
      toast.success("Serviço cadastrado");
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            Catálogo de Serviços
          </h1>
          <p className="text-muted-foreground text-sm">Cadastre e gerencie os serviços prestados e seus detalhes técnicos</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Serviço</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar serviço..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filtrados.map((s) => (
            <div key={s.id} className="rounded-lg border overflow-hidden">
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-muted-foreground">{s.id}</span>
                    <Badge variant={s.tipo === "sanitario" ? "default" : "secondary"}>
                      {s.tipo === "sanitario" ? "Sanitário" : "Manutenção"}
                    </Badge>
                    {s.geraCertificado && <Badge variant="outline" className="text-[10px]"><ShieldCheck className="h-3 w-3 mr-1" />Certificado</Badge>}
                    {!s.ativo && <Badge variant="destructive">Inativo</Badge>}
                  </div>
                  <p className="font-semibold text-sm mt-1">{s.nome}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>Unidade: {s.unidade}</span>
                    {s.recorrenciaDias > 0 && <span className="flex items-center gap-1"><RotateCcw className="h-3 w-3" />A cada {s.recorrenciaDias} dias</span>}
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(s); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>

              {expandedId === s.id && (
                <div className="border-t bg-muted/20 p-4 space-y-4 text-sm">
                  <p className="text-muted-foreground">{s.descricao}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {s.produtosQuimicos.length > 0 && (
                      <div>
                        <p className="text-xs font-medium flex items-center gap-1 mb-1.5"><FlaskConical className="h-3.5 w-3.5 text-primary" />Produtos Químicos</p>
                        <div className="flex flex-wrap gap-1">{s.produtosQuimicos.map((p) => <Badge key={p} variant="outline" className="text-xs">{p}</Badge>)}</div>
                      </div>
                    )}
                    {s.epis.length > 0 && (
                      <div>
                        <p className="text-xs font-medium flex items-center gap-1 mb-1.5"><HardHat className="h-3.5 w-3.5 text-primary" />EPIs</p>
                        <div className="flex flex-wrap gap-1">{s.epis.map((e) => <Badge key={e} variant="outline" className="text-xs">{e}</Badge>)}</div>
                      </div>
                    )}
                    {s.riscos.length > 0 && (
                      <div>
                        <p className="text-xs font-medium flex items-center gap-1 mb-1.5"><AlertTriangle className="h-3.5 w-3.5 text-destructive" />Riscos</p>
                        <div className="flex flex-wrap gap-1">{s.riscos.map((r) => <Badge key={r} variant="destructive" className="text-xs">{r}</Badge>)}</div>
                      </div>
                    )}
                    {s.normasAplicaveis.length > 0 && (
                      <div>
                        <p className="text-xs font-medium flex items-center gap-1 mb-1.5"><BookOpen className="h-3.5 w-3.5 text-primary" />Normas</p>
                        <div className="flex flex-wrap gap-1">{s.normasAplicaveis.map((n) => <Badge key={n} variant="secondary" className="text-xs">{n}</Badge>)}</div>
                      </div>
                    )}
                  </div>
                  {s.procedimentos.length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-1.5">Procedimentos</p>
                      <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-0.5">
                        {s.procedimentos.map((p, i) => <li key={i}>{p}</li>)}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Editar Serviço" : "Novo Serviço"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Serviço *</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as "sanitario" | "manutencao" })}>
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
              <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Unidade *</Label>
                <Input value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} placeholder="visitas, horas, itens..." />
              </div>
              <div className="space-y-2">
                <Label>Recorrência (dias)</Label>
                <Input type="number" value={form.recorrenciaDias} onChange={(e) => setForm({ ...form, recorrenciaDias: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Validade Certificado (dias)</Label>
                <Input type="number" value={form.validadeCertificadoDias} onChange={(e) => setForm({ ...form, validadeCertificadoDias: Number(e.target.value) })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.geraCertificado} onChange={(e) => setForm({ ...form, geraCertificado: e.target.checked })} className="rounded" />
              Gera certificado de execução
            </label>
            <TagEditor label="Produtos Químicos" icon={FlaskConical} values={form.produtosQuimicos} onChange={(v) => setForm({ ...form, produtosQuimicos: v })} />
            <TagEditor label="EPIs Obrigatórios" icon={HardHat} values={form.epis} onChange={(v) => setForm({ ...form, epis: v })} />
            <TagEditor label="Riscos" icon={AlertTriangle} values={form.riscos} onChange={(v) => setForm({ ...form, riscos: v })} />
            <TagEditor label="Normas Aplicáveis" icon={BookOpen} values={form.normasAplicaveis} onChange={(v) => setForm({ ...form, normasAplicaveis: v })} />
            <TagEditor label="Procedimentos" icon={Briefcase} values={form.procedimentos} onChange={(v) => setForm({ ...form, procedimentos: v })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editId ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
