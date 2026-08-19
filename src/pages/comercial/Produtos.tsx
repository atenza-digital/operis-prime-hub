import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowUpFromLine, Package, Pencil, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createStockMovement, getBootstrap, getStockReport, saveStockProduct, type ProdutoEstoqueApp, type StockReportMovement } from "@/lib/api";

type ProductForm = {
  id?: string;
  codigo: string;
  nome: string;
  descricao: string;
  unidade: string;
  quantidadeAtual: string;
  estoqueMinimo: string;
  ativo: boolean;
};

const emptyForm: ProductForm = {
  codigo: "",
  nome: "",
  descricao: "",
  unidade: "un.",
  quantidadeAtual: "0",
  estoqueMinimo: "0",
  ativo: true,
};

const movementLabels: Record<ProdutoEstoqueApp["movimentos"][number]["tipo"], string> = {
  entrada: "Entrada",
  saida: "Saída",
  ajuste: "Ajuste de saldo",
  devolucao: "Devolução",
  perda: "Perda",
};

export default function Produtos() {
  const [products, setProducts] = useState<ProdutoEstoqueApp[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productDialog, setProductDialog] = useState(false);
  const [movementDialog, setMovementDialog] = useState(false);
  const [report, setReport] = useState<{ movements: StockReportMovement[]; summary: Array<{ produtoId: string; produtoNome: string; unidade: string; entradas: number; saidas: number; ajustes: number; perdas: number; devolucoes: number; movimentos: number }> } | null>(null);
  const [reportFilters, setReportFilters] = useState({ dateFrom: "", dateTo: "", osId: "" });
  const [reportLoading, setReportLoading] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [selected, setSelected] = useState<ProdutoEstoqueApp | null>(null);
  const [movement, setMovement] = useState({ tipo: "entrada" as ProdutoEstoqueApp["movimentos"][number]["tipo"], quantidade: "", osId: "", observacao: "" });

  async function reload() {
    setLoading(true);
    try {
      const data = await getBootstrap();
      setProducts(data.stockProducts || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar o estoque.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, []);

  async function loadReport() {
    setReportLoading(true);
    try {
      const result = await getStockReport(reportFilters);
      setReport({ movements: result.movements, summary: result.summary });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar o relatório de estoque.");
    } finally {
      setReportLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("pt-BR");
    return products.filter((item) => !normalized || `${item.codigo} ${item.nome}`.toLocaleLowerCase("pt-BR").includes(normalized));
  }, [products, search]);
  const lowStock = products.filter((item) => item.ativo && item.quantidadeAtual <= item.estoqueMinimo);
  const activeCount = products.filter((item) => item.ativo).length;

  function openNew() {
    setForm(emptyForm);
    setProductDialog(true);
  }

  function openEdit(product: ProdutoEstoqueApp) {
    setForm({
      id: product.id,
      codigo: product.codigo,
      nome: product.nome,
      descricao: product.descricao,
      unidade: product.unidade,
      quantidadeAtual: String(product.quantidadeAtual),
      estoqueMinimo: String(product.estoqueMinimo),
      ativo: product.ativo,
    });
    setProductDialog(true);
  }

  async function saveProduct() {
    if (!form.codigo.trim() || !form.nome.trim()) {
      toast.error("Informe código e nome do produto.");
      return;
    }
    setSaving(true);
    try {
      await saveStockProduct({
        id: form.id,
        codigo: form.codigo.trim(),
        nome: form.nome.trim(),
        descricao: form.descricao.trim(),
        unidade: form.unidade.trim() || "un.",
        quantidadeAtual: Number(form.quantidadeAtual || 0),
        estoqueMinimo: Number(form.estoqueMinimo || 0),
        ativo: form.ativo,
      });
      toast.success(form.id ? "Produto atualizado." : "Produto cadastrado.");
      setProductDialog(false);
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o produto.");
    } finally {
      setSaving(false);
    }
  }

  function openMovement(product: ProdutoEstoqueApp) {
    setSelected(product);
    setMovement({ tipo: "entrada", quantidade: "", osId: "", observacao: "" });
    setMovementDialog(true);
  }

  async function saveMovement() {
    if (!selected || !Number(movement.quantidade)) {
      toast.error("Informe uma quantidade maior que zero.");
      return;
    }
    setSaving(true);
    try {
      await createStockMovement({
        produtoId: selected.id,
        tipo: movement.tipo,
        quantidade: Number(movement.quantidade),
        osId: movement.osId.trim() || undefined,
        observacao: movement.observacao.trim() || undefined,
      });
      toast.success("Movimentação registrada no banco.");
      setMovementDialog(false);
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar a movimentação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Comercial · Catálogo</p>
          <h2 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight"><Package className="h-6 w-6 text-primary" /> Produtos e estoque</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Cadastre insumos que podem ser usados nos serviços e acompanhe o saldo real disponível para a operação.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reload} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" /> Atualizar</Button>
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Novo produto</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Produtos ativos</p><p className="mt-1 text-2xl font-bold">{activeCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Itens cadastrados</p><p className="mt-1 text-2xl font-bold">{products.length}</p></CardContent></Card>
        <Card className={lowStock.length ? "border-amber-300 bg-amber-50/50" : undefined}><CardContent className="p-4"><p className="flex items-center gap-1 text-xs text-muted-foreground">{lowStock.length ? <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> : null} Estoque baixo</p><p className="mt-1 text-2xl font-bold">{lowStock.length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div><h3 className="font-semibold">Catálogo de produtos</h3><p className="text-xs text-muted-foreground">O saldo só muda por movimentação registrada.</p></div>
          <div className="relative w-full sm:w-72"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por código ou nome..." className="pl-9" /></div>
        </CardHeader>
        <CardContent>
          {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Carregando catálogo...</p> : filtered.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</p> : (
            <div className="space-y-2">
              {filtered.map((product) => {
                const isLow = product.ativo && product.quantidadeAtual <= product.estoqueMinimo;
                const last = product.movimentos[0];
                return (
                  <div key={product.id} className="flex flex-col gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/30 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{product.nome}</span><Badge variant="outline">{product.codigo}</Badge>{!product.ativo ? <Badge variant="secondary">Inativo</Badge> : null}</div><p className="mt-1 text-xs text-muted-foreground">{product.descricao || "Sem descrição cadastrada."} · Unidade: {product.unidade}</p></div>
                    <div className="flex items-center gap-4"><div className="text-right"><p className="text-xs text-muted-foreground">Saldo atual</p><p className={isLow ? "font-bold text-amber-700" : "font-bold text-foreground"}>{product.quantidadeAtual} {product.unidade}</p><p className="text-[11px] text-muted-foreground">mínimo {product.estoqueMinimo} · {last ? `última ${movementLabels[last.tipo].toLowerCase()}` : "sem movimentos"}</p></div><Button variant="outline" size="sm" onClick={() => openMovement(product)}><ArrowUpFromLine className="mr-1.5 h-3.5 w-3.5" /> Movimentar</Button><Button variant="ghost" size="icon" onClick={() => openEdit(product)} title="Editar produto"><Pencil className="h-4 w-4" /></Button></div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1"><h3 className="font-semibold">Histórico e consumo</h3><p className="text-xs text-muted-foreground">Consulte entradas, saídas e consumo vinculado a uma OS por período.</p></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-4">
            <div className="space-y-1"><Label className="text-xs">Data inicial</Label><Input type="date" value={reportFilters.dateFrom} onChange={(event) => setReportFilters({ ...reportFilters, dateFrom: event.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Data final</Label><Input type="date" value={reportFilters.dateTo} onChange={(event) => setReportFilters({ ...reportFilters, dateTo: event.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">OS</Label><Input placeholder="Ex.: OS-2684" value={reportFilters.osId} onChange={(event) => setReportFilters({ ...reportFilters, osId: event.target.value })} /></div>
            <div className="flex items-end"><Button variant="outline" className="w-full" onClick={loadReport} disabled={reportLoading}>{reportLoading ? "Consultando..." : "Consultar consumo"}</Button></div>
          </div>
          {report ? <>
            <div className="grid gap-2 sm:grid-cols-3">{report.summary.slice(0, 6).map((item) => <div key={item.produtoId} className="rounded-lg border p-3"><p className="text-xs font-semibold">{item.produtoNome}</p><p className="mt-1 text-sm">Saídas: <strong>{item.saidas} {item.unidade}</strong></p><p className="text-[11px] text-muted-foreground">{item.movimentos} movimento(s) no filtro</p></div>)}</div>
            {report.movements.length ? <div className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-xs"><thead className="bg-muted/50"><tr><th className="p-2">Data</th><th className="p-2">Produto</th><th className="p-2">Movimento</th><th className="p-2">Qtd.</th><th className="p-2">OS</th><th className="p-2">Saldo</th></tr></thead><tbody>{report.movements.slice(0, 100).map((item) => <tr key={item.id} className="border-t"><td className="p-2">{item.criadoEm ? new Date(item.criadoEm).toLocaleDateString("pt-BR") : "-"}</td><td className="p-2">{item.produtoNome}</td><td className="p-2">{movementLabels[item.tipo]}</td><td className="p-2">{item.quantidade} {item.unidade}</td><td className="p-2">{item.osNumero || item.osId || "-"}</td><td className="p-2">{item.saldoPosterior} {item.unidade}</td></tr>)}</tbody></table></div> : <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">Nenhuma movimentação encontrada.</p>}
          </> : <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">Informe os filtros e consulte o histórico.</p>}
        </CardContent>
      </Card>

      <Dialog open={productDialog} onOpenChange={setProductDialog}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{form.id ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader><div className="grid gap-4 py-2 md:grid-cols-2"><div className="space-y-1.5"><Label>Código *</Label><Input value={form.codigo} onChange={(event) => setForm({ ...form, codigo: event.target.value })} placeholder="Ex.: PROD-001" /></div><div className="space-y-1.5"><Label>Nome *</Label><Input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} placeholder="Ex.: Hipoclorito 2,5%" /></div><div className="space-y-1.5 md:col-span-2"><Label>Descrição</Label><Textarea value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} placeholder="Aplicação, concentração ou observações do produto." /></div><div className="space-y-1.5"><Label>Unidade</Label><Input value={form.unidade} onChange={(event) => setForm({ ...form, unidade: event.target.value })} placeholder="un., L, kg..." /></div><div className="space-y-1.5"><Label>Estoque mínimo</Label><Input type="number" min="0" step="0.001" value={form.estoqueMinimo} onChange={(event) => setForm({ ...form, estoqueMinimo: event.target.value })} /></div>{!form.id ? <div className="space-y-1.5"><Label>Saldo inicial</Label><Input type="number" min="0" step="0.001" value={form.quantidadeAtual} onChange={(event) => setForm({ ...form, quantidadeAtual: event.target.value })} /></div> : null}<label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" checked={form.ativo} onChange={(event) => setForm({ ...form, ativo: event.target.checked })} /> Produto ativo</label></div><DialogFooter><Button variant="outline" onClick={() => setProductDialog(false)}>Cancelar</Button><Button onClick={saveProduct} disabled={saving}>{saving ? "Salvando..." : "Salvar produto"}</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={movementDialog} onOpenChange={setMovementDialog}><DialogContent><DialogHeader><DialogTitle>Movimentar estoque</DialogTitle></DialogHeader>{selected ? <div className="space-y-4"><div className="rounded-xl bg-muted/50 p-3"><p className="font-semibold">{selected.nome}</p><p className="text-xs text-muted-foreground">Saldo atual: {selected.quantidadeAtual} {selected.unidade}</p></div><div className="space-y-1.5"><Label>Tipo de movimento</Label><Select value={movement.tipo} onValueChange={(value) => setMovement({ ...movement, tipo: value as typeof movement.tipo })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(movementLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label>{movement.tipo === "ajuste" ? "Novo saldo" : "Quantidade"}</Label><Input type="number" min="0.001" step="0.001" value={movement.quantidade} onChange={(event) => setMovement({ ...movement, quantidade: event.target.value })} /></div><div className="space-y-1.5"><Label>OS relacionada (opcional)</Label><Input value={movement.osId} onChange={(event) => setMovement({ ...movement, osId: event.target.value })} placeholder="Ex.: OS-2684" /></div><div className="space-y-1.5"><Label>Observação</Label><Textarea value={movement.observacao} onChange={(event) => setMovement({ ...movement, observacao: event.target.value })} placeholder="Fornecedor, motivo, serviço ou conferência..." /></div></div> : null}<DialogFooter><Button variant="outline" onClick={() => setMovementDialog(false)}>Cancelar</Button><Button onClick={saveMovement} disabled={saving}>{saving ? "Registrando..." : "Registrar movimento"}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
