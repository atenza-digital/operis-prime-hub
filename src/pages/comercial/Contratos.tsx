import { useEffect, useMemo, useRef, useState } from "react";
import {
  generateContractFromProposal,
  getBootstrap,
  saveContractTemplate,
  type BootstrapData,
  type ContratoServico,
  type ContratoTemplate,
} from "@/lib/api";
import logoImg from "@/assets/logo_ciperprag.png";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileSignature, Plus, Pencil, Search, Trash2, FileText, ArrowRight, CheckCircle2, Link2 } from "lucide-react";
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
  numero: "",
  clienteId: "",
  tipo: "proposta",
  servicos: [{ ...emptyServico }],
  vigenciaMeses: 12,
  formaPagamento: "Medição mensal - NF/Boleto",
  prazoPagamentoDias: 30,
  status: "rascunho",
  dataCriacao: new Date().toISOString().split("T")[0],
  observacoes: "",
};

function gerarNumero(formato: string, sequencia: number) {
  return formato
    .replace("{SEQ}", String(sequencia).padStart(3, "0"))
    .replace("{ANO}", String(new Date().getFullYear()));
}

export default function Contratos() {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<ContratoTemplate, "id">>(emptyTemplate);
  const [pdfItem, setPdfItem] = useState<ContratoTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  async function reload() {
    setLoading(true);
    try {
      setData(await getBootstrap());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar contratos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const templates = data?.contractTemplates ?? [];
  const clients = data?.clients ?? [];
  const services = data?.services ?? [];
  const companyConfig = data?.companyConfig;
  const numberingConfig = data?.numberingConfig;

  const filtrados = useMemo(() => {
    return templates.filter((item) => {
      const client = clients.find((entry) => entry.id === item.clienteId);
      return (
        item.numero.toLowerCase().includes(busca.toLowerCase()) ||
        (client?.razaoSocial.toLowerCase().includes(busca.toLowerCase()) ?? false)
      );
    });
  }, [templates, clients, busca]);

  function openNew(tipo: "proposta" | "contrato" = "proposta") {
    setEditId(null);
    const sequenciaAtual = tipo === "proposta" ? (numberingConfig?.propostaUltimo ?? 0) : (numberingConfig?.contratoUltimo ?? 0);
    const formato = tipo === "proposta"
      ? (numberingConfig?.propostaFormato ?? "PROP-{SEQ}/{ANO}")
      : (numberingConfig?.contratoFormato ?? "CT-{SEQ}/{ANO}");
    setForm({
      ...emptyTemplate,
      tipo,
      numero: gerarNumero(formato, sequenciaAtual + 1),
      servicos: [{ ...emptyServico }],
    });
    setDialogOpen(true);
  }

  function openEdit(item: ContratoTemplate) {
    setEditId(item.id);
    const { id, ...rest } = item;
    setForm({ ...rest, servicos: rest.servicos.length > 0 ? rest.servicos : [{ ...emptyServico }] });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.numero || !form.clienteId) {
      toast.error("Número e cliente são obrigatórios");
      return;
    }

    setSaving(true);
    try {
      const result = await saveContractTemplate({ ...form, id: editId ?? undefined });
      const synced = result.operationalSync && !result.operationalSync.skipped
        ? ` Operacional: ${result.operationalSync.created} criado(s), ${result.operationalSync.updated} atualizado(s).`
        : "";
      toast.success(`${editId ? "Registro atualizado" : "Registro criado"}.${synced}`);
      setDialogOpen(false);
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar contrato/proposta");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateContract(item: ContratoTemplate) {
    try {
      const result = await generateContractFromProposal(item.id);
      const synced = result.operationalSync && !result.operationalSync.skipped
        ? ` Integração operacional: ${result.operationalSync.created} contrato(s) criado(s), ${result.operationalSync.updated} atualizado(s).`
        : "";
      toast.success(`Contrato ${result.numero} gerado a partir da proposta ${item.numero}.${synced}`);
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao gerar contrato");
    }
  }

  function openPdf(item: ContratoTemplate) {
    setPdfItem(item);
    setTimeout(() => window.print(), 300);
  }

  function updateServico(index: number, field: keyof ContratoServico, value: string | number) {
    setForm((prev) => ({
      ...prev,
      servicos: prev.servicos.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  }

  function addServico() {
    setForm((prev) => ({ ...prev, servicos: [...prev.servicos, { ...emptyServico }] }));
  }

  function removeServico(index: number) {
    setForm((prev) => ({ ...prev, servicos: prev.servicos.filter((_, itemIndex) => itemIndex !== index) }));
  }

  function calcTotal(servicos: ContratoServico[]) {
    return servicos.reduce((total, item) => total + item.quantidade * item.valorUnitario, 0);
  }

  const pdfClient = pdfItem ? clients.find((item) => item.id === pdfItem.clienteId) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileSignature className="h-6 w-6 text-primary" />
            Contratos e Propostas
          </h1>
          <p className="text-muted-foreground text-sm">Gerencie propostas e contratos persistidos no banco</p>
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
            <Input placeholder="Buscar por número ou cliente..." value={busca} onChange={(event) => setBusca(event.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Carregando contratos e propostas...</div>
          ) : (
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
                  <TableHead>Operacional</TableHead>
                  <TableHead className="w-[220px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((item) => {
                  const client = clients.find((entry) => entry.id === item.clienteId);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs font-bold">{item.numero}</TableCell>
                      <TableCell>
                        <Badge variant={item.tipo === "contrato" ? "default" : "outline"}>
                          {item.tipo === "contrato" ? "Contrato" : "Proposta"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{client?.razaoSocial || "—"}</p>
                        <p className="text-xs text-muted-foreground">{client?.cnpj}</p>
                      </TableCell>
                      <TableCell className="text-xs">{item.servicos.length} serviço(s)</TableCell>
                      <TableCell className="font-mono text-sm font-bold">
                        R$ {calcTotal(item.servicos).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-xs">{item.vigenciaMeses} meses</TableCell>
                      <TableCell>
                        <Badge variant={statusColors[item.status]}>{statusLabels[item.status]}</Badge>
                      </TableCell>
                      <TableCell>
                        {item.operacionalizado ? (
                          <Badge variant="secondary" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Integrado
                          </Badge>
                        ) : item.tipo === "contrato" && item.status === "vigente" ? (
                          <Badge variant="outline" className="gap-1">
                            <Link2 className="h-3 w-3" />
                            Pendente
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" title="Editar" onClick={() => openEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Imprimir" onClick={() => openPdf(item)}>
                            <FileText className="h-4 w-4" />
                          </Button>
                          {item.tipo === "proposta" && item.status === "aprovado" && (
                            <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => handleGenerateContract(item)}>
                              <ArrowRight className="h-3 w-3" />
                              Gerar contrato
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pdfItem && (
        <div className="document-print-root hidden print:block" ref={printRef}>
          <div className="mx-auto max-w-[210mm] border border-black bg-white p-0 font-sans text-[11px] text-black">
            <div className="relative min-h-[82px] overflow-hidden border-b border-black">
              <div className="absolute -right-10 -top-16 h-32 w-32 rounded-full bg-emerald-900" />
              <div className="flex items-center gap-6 px-5 py-3">
                <img src={companyConfig?.logoUrl || logoImg} alt="Ciperprag" className="h-14 w-28 object-contain" />
                <div className="flex-1 text-center text-[13px] font-bold uppercase">
                  {companyConfig?.razaoSocial || "CIPERPRAG SERVIÇOS LTDA"} CNPJ: {companyConfig?.cnpj || "15.722.292/0001-43"}
                </div>
              </div>
            </div>

            <h1 className="border-b border-black py-2 text-center text-lg font-extrabold uppercase text-emerald-800">
              {pdfItem.tipo === "contrato" ? "CONTRATO DE PRESTAÇÃO DE SERVIÇOS" : "PROPOSTA TÉCNICA COMERCIAL"}
            </h1>
            <p className="border-b border-black py-1 text-center text-sm font-bold">Nº {pdfItem.numero}</p>

            <table className="w-full border-collapse">
              <tbody>
                <tr className="bg-[#c6e0b4] text-center text-sm font-extrabold uppercase">
                  <td colSpan={4} className="border border-black px-2 py-1">DADOS DO CONTRATANTE</td>
                </tr>
                <tr>
                  <td className="w-[15%] border border-black px-2 py-1 font-bold uppercase">Razão Social:</td>
                  <td className="w-[43%] border border-black px-2 py-1">{pdfClient?.razaoSocial}</td>
                  <td className="w-[15%] border border-black px-2 py-1 font-bold uppercase">CNPJ:</td>
                  <td className="border border-black px-2 py-1">{pdfClient?.cnpj}</td>
                </tr>
                <tr>
                  <td className="border border-black px-2 py-1 font-bold uppercase">Endereço:</td>
                  <td className="border border-black px-2 py-1">{pdfClient?.endereco}, {pdfClient?.bairro}</td>
                  <td className="border border-black px-2 py-1 font-bold uppercase">Município/UF:</td>
                  <td className="border border-black px-2 py-1">{pdfClient?.municipio}/{pdfClient?.uf}</td>
                </tr>
              </tbody>
            </table>

            <div className="p-4">
              <p className="mb-3 text-center">
                Encaminhamos para conferência as condições comerciais e técnicas para execução dos serviços abaixo descritos.
              </p>

              <table className="mb-4 w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#c6e0b4]">
                    <th className="border border-black p-2 text-left uppercase">Descrição de serviços</th>
                    <th className="border border-black p-2 text-center uppercase">Qtd.</th>
                    <th className="border border-black p-2 text-center uppercase">Frequência</th>
                    <th className="border border-black p-2 text-right uppercase">Valor unit.</th>
                    <th className="border border-black p-2 text-right uppercase">Valor total</th>
                  </tr>
                </thead>
                <tbody>
                  {pdfItem.servicos.map((servico, index) => {
                    const service = services.find((item) => item.id === servico.servicoId);
                    return (
                      <tr key={`${servico.servicoId}-${index}`}>
                        <td className="border border-black p-2 uppercase">{service?.nome || "—"}</td>
                        <td className="border border-black p-2 text-center">{servico.quantidade}</td>
                        <td className="border border-black p-2 text-center">{servico.frequencia}</td>
                        <td className="border border-black p-2 text-right">R$ {servico.valorUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                        <td className="border border-black p-2 text-right font-bold">R$ {(servico.quantidade * servico.valorUnitario).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td className="border border-black p-2" colSpan={4}>VALOR TOTAL</td>
                    <td className="border border-black bg-[#92d050] p-2 text-right">R$ {calcTotal(pdfItem.servicos).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>

              <div className="mb-8 border border-black">
                <div className="border-b border-black bg-[#c6e0b4] px-2 py-1 text-center text-sm font-extrabold uppercase">Condições comerciais</div>
                <div className="space-y-1 px-3 py-2">
                  <p><strong>Vigência:</strong> {pdfItem.vigenciaMeses} meses</p>
                  <p><strong>Forma de pagamento:</strong> {pdfItem.formaPagamento}</p>
                  <p><strong>Prazo de pagamento:</strong> {pdfItem.prazoPagamentoDias} dias após medição</p>
                  {pdfItem.observacoes && <p><strong>Observações:</strong> {pdfItem.observacoes}</p>}
                </div>
              </div>

              <div className="mt-16 grid grid-cols-2 gap-12 text-center text-xs">
                <div className="border-t border-black pt-2">
                  <p className="font-bold">{companyConfig?.razaoSocial}</p>
                  <p>{companyConfig?.responsavelExecucao || companyConfig?.responsavelTecnico}</p>
                  <p>{companyConfig?.cargoResponsavel}</p>
                </div>
                <div className="border-t border-black pt-2">
                  <p className="font-bold">{pdfClient?.razaoSocial}</p>
                  <p>Representante Legal</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar" : "Novo(a)"} {form.tipo === "contrato" ? "Contrato" : "Proposta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Número *</Label>
                <Input value={form.numero} onChange={(event) => setForm({ ...form, numero: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(value) => setForm({ ...form, tipo: value as "contrato" | "proposta" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contrato">Contrato</SelectItem>
                    <SelectItem value="proposta">Proposta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as ContratoTemplate["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select value={form.clienteId} onValueChange={(value) => setForm({ ...form, clienteId: value })}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {clients.map((item) => <SelectItem key={item.id} value={item.id}>{item.razaoSocial} ({item.cnpj})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Vigência (meses)</Label>
                <Input type="number" value={form.vigenciaMeses} onChange={(event) => setForm({ ...form, vigenciaMeses: Number(event.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Prazo Pgto (dias)</Label>
                <Input type="number" value={form.prazoPagamentoDias} onChange={(event) => setForm({ ...form, prazoPagamentoDias: Number(event.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Data Criação</Label>
                <Input type="date" value={form.dataCriacao} onChange={(event) => setForm({ ...form, dataCriacao: event.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Input value={form.formaPagamento} onChange={(event) => setForm({ ...form, formaPagamento: event.target.value })} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Serviços</Label>
                <Button type="button" variant="outline" size="sm" onClick={addServico}><Plus className="h-3 w-3 mr-1" />Serviço</Button>
              </div>
              {form.servicos.map((servico, index) => (
                <div key={index} className="rounded-lg border p-3 space-y-3">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Serviço</Label>
                      <Select value={servico.servicoId} onValueChange={(value) => updateServico(index, "servicoId", value)}>
                        <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {services.map((item) => <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Quantidade</Label>
                      <Input type="number" value={servico.quantidade} onChange={(event) => updateServico(index, "quantidade", Number(event.target.value))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valor Unitário</Label>
                      <Input type="number" step="0.01" value={servico.valorUnitario} onChange={(event) => updateServico(index, "valorUnitario", Number(event.target.value))} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1 flex-1 mr-3">
                      <Label className="text-xs">Frequência</Label>
                      <Input value={servico.frequencia} onChange={(event) => updateServico(index, "frequencia", event.target.value)} className="text-sm" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Subtotal</p>
                      <p className="font-mono font-bold text-sm">R$ {(servico.quantidade * servico.valorUnitario).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                      {servico.contratoOperacionalId ? (
                        <Badge variant="secondary" className="mt-1 text-[10px]">
                          Operacional {servico.contratoOperacionalId}
                        </Badge>
                      ) : null}
                    </div>
                    {form.servicos.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="ml-2 text-destructive" onClick={() => removeServico(index)}>
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
              <Textarea value={form.observacoes} onChange={(event) => setForm({ ...form, observacoes: event.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : editId ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
