import { useState, useMemo } from "react";
import { contratosTemplates as templatesMock, clientes, servicosCatalogo, type ContratoTemplate, type ContratoServico } from "@/data/comercialData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileSignature, Plus, Pencil, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  rascunho: "secondary",
  enviado: "outline",
  aprovado: "default",
  vigente: "default",
  encerrado: "destructive",
};

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  vigente: "Vigente",
  encerrado: "Encerrado",
};

const emptyServico: ContratoServico = { servicoId: "", quantidade: 1, valorUnitario: 0, frequencia: "Mensal" };

const emptyTemplate: Omit<ContratoTemplate, "id"> = {
  numero: "", clienteId: "", tipo: "proposta", servicos: [{ ...emptyServico }],
  vigenciaMeses: 12, formaPagamento: "Medição mensal - NF/Boleto", prazoPagamentoDias: 30,
  status: "rascunho", dataCriacao: new Date().toISOString().split("T")[0], observacoes: "",
};

export default function Contratos() {
  const [lista, setLista] = useState<ContratoTemplate[]>(templatesMock);
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<ContratoTemplate, "id">>(emptyTemplate);

  const filtrados = lista.filter((t) => {
    const cliente = clientes.find((c) => c.id === t.clienteId);
    return t.numero.toLowerCase().includes(busca.toLowerCase()) ||
      (cliente?.razaoSocial.toLowerCase().includes(busca.toLowerCase()));
  });

  const openNew = () => { setEditId(null); setForm({ ...emptyTemplate, servicos: [{ ...emptyServico }] }); setDialogOpen(true); };
  const openEdit = (t: ContratoTemplate) => { setEditId(t.id); const { id, ...rest } = t; setForm(rest); setDialogOpen(true); };

  const handleSave = () => {
    if (!form.numero || !form.clienteId) { toast.error("Número e cliente são obrigatórios"); return; }
    if (editId) {
      setLista((prev) => prev.map((t) => (t.id === editId ? { ...form, id: editId } : t)));
      toast.success("Registro atualizado");
    } else {
      setLista((prev) => [...prev, { ...form, id: `TPL-${String(prev.length + 1).padStart(3, "0")}` }]);
      toast.success("Registro criado");
    }
    setDialogOpen(false);
  };

  const updateServico = (idx: number, field: keyof ContratoServico, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      servicos: prev.servicos.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    }));
  };

  const addServico = () => setForm((prev) => ({ ...prev, servicos: [...prev.servicos, { ...emptyServico }] }));
  const removeServico = (idx: number) => setForm((prev) => ({ ...prev, servicos: prev.servicos.filter((_, i) => i !== idx) }));

  const calcTotal = (servicos: ContratoServico[]) =>
    servicos.reduce((acc, s) => acc + s.quantidade * s.valorUnitario, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileSignature className="h-6 w-6 text-primary" />
            Contratos e Propostas
          </h1>
          <p className="text-muted-foreground text-sm">Gerencie templates de contratos e propostas comerciais</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por número ou cliente..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Serviços</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((t) => {
                const cliente = clientes.find((c) => c.id === t.clienteId);
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs font-bold">{t.numero}</TableCell>
                    <TableCell>
                      <Badge variant={t.tipo === "contrato" ? "default" : "outline"}>
                        {t.tipo === "contrato" ? "Contrato" : "Proposta"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{cliente?.razaoSocial || "—"}</p>
                      <p className="text-xs text-muted-foreground">{cliente?.cnpj}</p>
                    </TableCell>
                    <TableCell className="text-xs">{t.servicos.length} serviço(s)</TableCell>
                    <TableCell className="font-mono text-sm font-bold">
                      R$ {calcTotal(t.servicos).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-xs">{t.vigenciaMeses} meses</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[t.status]}>{statusLabels[t.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(t)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar" : "Novo"} {form.tipo === "contrato" ? "Contrato" : "Proposta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Número *</Label>
                <Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} placeholder="CT-000/2026" />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as "contrato" | "proposta" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contrato">Contrato</SelectItem>
                    <SelectItem value="proposta">Proposta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ContratoTemplate["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select value={form.clienteId} onValueChange={(v) => setForm({ ...form, clienteId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.razaoSocial} ({c.cnpj})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Vigência (meses)</Label>
                <Input type="number" value={form.vigenciaMeses} onChange={(e) => setForm({ ...form, vigenciaMeses: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Prazo Pgto (dias)</Label>
                <Input type="number" value={form.prazoPagamentoDias} onChange={(e) => setForm({ ...form, prazoPagamentoDias: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Data Criação</Label>
                <Input type="date" value={form.dataCriacao} onChange={(e) => setForm({ ...form, dataCriacao: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Input value={form.formaPagamento} onChange={(e) => setForm({ ...form, formaPagamento: e.target.value })} />
            </div>

            {/* Serviços */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Serviços do Contrato</Label>
                <Button type="button" variant="outline" size="sm" onClick={addServico}><Plus className="h-3 w-3 mr-1" />Serviço</Button>
              </div>
              {form.servicos.map((s, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-3">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Serviço</Label>
                      <Select value={s.servicoId} onValueChange={(v) => updateServico(i, "servicoId", v)}>
                        <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {servicosCatalogo.map((sv) => <SelectItem key={sv.id} value={sv.id}>{sv.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Quantidade</Label>
                      <Input type="number" value={s.quantidade} onChange={(e) => updateServico(i, "quantidade", Number(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valor Unitário</Label>
                      <Input type="number" step="0.01" value={s.valorUnitario} onChange={(e) => updateServico(i, "valorUnitario", Number(e.target.value))} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1 flex-1 mr-3">
                      <Label className="text-xs">Frequência</Label>
                      <Input value={s.frequencia} onChange={(e) => updateServico(i, "frequencia", e.target.value)} className="text-sm" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Subtotal</p>
                      <p className="font-mono font-bold text-sm">R$ {(s.quantidade * s.valorUnitario).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </div>
                    {form.servicos.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="ml-2 text-destructive" onClick={() => removeServico(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <div className="text-right rounded-lg bg-muted p-3">
                <span className="text-sm text-muted-foreground mr-3">Valor Total:</span>
                <span className="text-lg font-bold font-mono">
                  R$ {calcTotal(form.servicos).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editId ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
