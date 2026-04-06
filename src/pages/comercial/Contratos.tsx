import { useState, useMemo, useRef } from "react";
import { contratosTemplates as templatesMock, clientes, servicosCatalogo, type ContratoTemplate, type ContratoServico } from "@/data/comercialData";
import { empresaConfig } from "@/data/empresaData";
import { numeracaoConfig, gerarNumero } from "@/data/empresaData";
import logoImg from "@/assets/logo_ciperprag.png";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileSignature, Plus, Pencil, Search, Trash2, FileText, ArrowRight, Printer } from "lucide-react";
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
  const [pdfItem, setPdfItem] = useState<ContratoTemplate | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const filtrados = lista.filter((t) => {
    const cliente = clientes.find((c) => c.id === t.clienteId);
    return t.numero.toLowerCase().includes(busca.toLowerCase()) ||
      (cliente?.razaoSocial.toLowerCase().includes(busca.toLowerCase()));
  });

  const openNew = (tipo: "proposta" | "contrato" = "proposta") => {
    setEditId(null);
    const nextNum = tipo === "proposta"
      ? gerarNumero(numeracaoConfig.propostaFormato, numeracaoConfig.propostaUltimo + lista.filter(l => l.tipo === "proposta").length + 1)
      : gerarNumero(numeracaoConfig.contratoFormato, numeracaoConfig.contratoUltimo + lista.filter(l => l.tipo === "contrato").length + 1);
    setForm({ ...emptyTemplate, tipo, numero: nextNum, servicos: [{ ...emptyServico }] });
    setDialogOpen(true);
  };

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

  const gerarContratoFromProposta = (proposta: ContratoTemplate) => {
    if (proposta.status !== "aprovado") {
      toast.error("Apenas propostas aprovadas podem gerar contratos");
      return;
    }
    const nextNum = gerarNumero(numeracaoConfig.contratoFormato, numeracaoConfig.contratoUltimo + lista.filter(l => l.tipo === "contrato").length + 1);
    const novoContrato: ContratoTemplate = {
      ...proposta,
      id: `TPL-${String(lista.length + 1).padStart(3, "0")}`,
      numero: nextNum,
      tipo: "contrato",
      status: "vigente",
      dataCriacao: new Date().toISOString().split("T")[0],
      observacoes: `Gerado a partir da proposta ${proposta.numero}. ${proposta.observacoes}`,
    };
    setLista((prev) => [...prev, novoContrato]);
    toast.success(`Contrato ${nextNum} gerado a partir da proposta ${proposta.numero}`);
  };

  const handleStatusChange = (item: ContratoTemplate, newStatus: ContratoTemplate["status"]) => {
    setLista((prev) => prev.map((t) => t.id === item.id ? { ...t, status: newStatus } : t));
    toast.success(`Status alterado para ${statusLabels[newStatus]}`);
  };

  const openPdf = (item: ContratoTemplate) => {
    setPdfItem(item);
    setTimeout(() => window.print(), 300);
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
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileSignature className="h-6 w-6 text-primary" />
            Contratos e Propostas
          </h1>
          <p className="text-muted-foreground text-sm">Gerencie propostas, aprove e gere contratos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openNew("contrato")}><Plus className="h-4 w-4 mr-2" />Novo Contrato</Button>
          <Button onClick={() => openNew("proposta")}><Plus className="h-4 w-4 mr-2" />Nova Proposta</Button>
        </div>
      </div>

      <Card className="print:hidden">
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
                <TableHead className="w-[180px]">Ações</TableHead>
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
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" title="Editar" onClick={() => openEdit(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Gerar PDF" onClick={() => openPdf(t)}>
                          <FileText className="h-4 w-4" />
                        </Button>
                        {t.tipo === "proposta" && t.status === "enviado" && (
                          <Button size="icon" variant="ghost" title="Aprovar" onClick={() => handleStatusChange(t, "aprovado")}>
                            <Badge variant="default" className="text-[9px] px-1">OK</Badge>
                          </Button>
                        )}
                        {t.tipo === "proposta" && t.status === "aprovado" && (
                          <Button size="sm" variant="outline" title="Gerar Contrato" onClick={() => gerarContratoFromProposta(t)} className="text-xs gap-1">
                            <ArrowRight className="h-3 w-3" />CT
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Printable PDF Document */}
      {pdfItem && (() => {
        const cliente = clientes.find((c) => c.id === pdfItem.clienteId);
        const total = calcTotal(pdfItem.servicos);
        const titulo = pdfItem.tipo === "contrato" ? "CONTRATO DE PRESTAÇÃO DE SERVIÇOS" : "PROPOSTA TÉCNICA COMERCIAL";
        return (
          <div className="hidden print:block" ref={printRef}>
            <div className="max-w-[210mm] mx-auto p-8 text-sm font-sans">
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-primary pb-4 mb-6">
                <img src={logoImg} alt="Ciperprag" className="h-12" />
                <div className="text-right text-xs">
                  <p className="font-bold">{empresaConfig.razaoSocial}</p>
                  <p>CNPJ: {empresaConfig.cnpj}</p>
                  <p>{empresaConfig.endereco}</p>
                  <p>{empresaConfig.telefone} | {empresaConfig.email}</p>
                </div>
              </div>

              <h1 className="text-center text-lg font-bold mb-1">{titulo}</h1>
              <p className="text-center text-xs text-muted-foreground mb-6">Nº {pdfItem.numero}</p>

              {/* Client info */}
              <div className="rounded border p-4 mb-4 space-y-1 text-xs">
                <h3 className="font-bold text-sm mb-2">DADOS DO CONTRATANTE</h3>
                <div className="grid grid-cols-2 gap-2">
                  <p><strong>Razão Social:</strong> {cliente?.razaoSocial}</p>
                  <p><strong>CNPJ:</strong> {cliente?.cnpj}</p>
                  <p><strong>Endereço:</strong> {cliente?.endereco}, {cliente?.bairro}</p>
                  <p><strong>Município/UF:</strong> {cliente?.municipio}/{cliente?.uf}</p>
                </div>
              </div>

              {/* Services table */}
              <div className="mb-4">
                <h3 className="font-bold text-sm mb-2">SERVIÇOS</h3>
                <table className="w-full text-xs border">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border p-2 text-left">Serviço</th>
                      <th className="border p-2 text-center">Qtd</th>
                      <th className="border p-2 text-center">Frequência</th>
                      <th className="border p-2 text-right">Valor Unit.</th>
                      <th className="border p-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pdfItem.servicos.map((s, i) => {
                      const srv = servicosCatalogo.find((sv) => sv.id === s.servicoId);
                      return (
                        <tr key={i}>
                          <td className="border p-2">{srv?.nome || "—"}</td>
                          <td className="border p-2 text-center">{s.quantidade}</td>
                          <td className="border p-2 text-center">{s.frequencia}</td>
                          <td className="border p-2 text-right">R$ {s.valorUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                          <td className="border p-2 text-right font-bold">R$ {(s.quantidade * s.valorUnitario).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted font-bold">
                      <td className="border p-2" colSpan={4}>VALOR TOTAL</td>
                      <td className="border p-2 text-right">R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Conditions */}
              <div className="text-xs space-y-2 mb-6">
                <h3 className="font-bold text-sm">CONDIÇÕES</h3>
                <p><strong>Vigência:</strong> {pdfItem.vigenciaMeses} meses</p>
                <p><strong>Forma de Pagamento:</strong> {pdfItem.formaPagamento}</p>
                <p><strong>Prazo de Pagamento:</strong> {pdfItem.prazoPagamentoDias} dias após medição</p>
                {pdfItem.observacoes && <p><strong>Observações:</strong> {pdfItem.observacoes}</p>}
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 mt-16 text-xs text-center">
                <div className="border-t pt-2">
                  <p className="font-bold">{empresaConfig.razaoSocial}</p>
                  <p>{empresaConfig.responsavelExecucao}</p>
                  <p>{empresaConfig.cargoResponsavel}</p>
                </div>
                <div className="border-t pt-2">
                  <p className="font-bold">{cliente?.razaoSocial}</p>
                  <p>Representante Legal</p>
                </div>
              </div>

              <p className="text-center text-[10px] text-muted-foreground mt-8">
                {empresaConfig.razaoSocial} — CNPJ: {empresaConfig.cnpj} — Alvará: {empresaConfig.alvara}
              </p>
            </div>
          </div>
        );
      })()}

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar" : "Novo(a)"} {form.tipo === "contrato" ? "Contrato" : "Proposta"}</DialogTitle>
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
                <Label className="text-base font-semibold">Serviços</Label>
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
