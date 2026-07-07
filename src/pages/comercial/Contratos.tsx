import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileSignature,
  FileText,
  Link2,
  Pencil,
  Plus,
  Receipt,
  Search,
  Send,
  Trash2,
} from "lucide-react";
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

const commercialFlow = [
  {
    title: "1. Gerar proposta",
    description: "Monte a proposta com cliente, serviços/produtos, quantidades, valores e condições comerciais.",
    icon: Send,
  },
  {
    title: "2. Aprovar e contratar",
    description: "Após aceite, gere o contrato pela proposta ou cadastre o contrato no modelo enviado pelo cliente.",
    icon: FileSignature,
  },
  {
    title: "3. Liberar operação",
    description: "Contrato vigente sincroniza os itens operacionais para agenda, OS e consulta de saldo.",
    icon: CalendarDays,
  },
  {
    title: "4. Medir execução",
    description: "OS encerradas entram na medição; NF e pagamento são acompanhados até a baixa manual no ERP.",
    icon: Receipt,
  },
];

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
      status: tipo === "contrato" ? "vigente" : "rascunho",
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
  const pdfServicos = pdfItem
    ? pdfItem.servicos.map((item) => ({
        ...item,
        catalogo: services.find((service) => service.id === item.servicoId),
        total: Number(item.quantidade || 0) * Number(item.valorUnitario || 0),
      }))
    : [];
  const pdfTotal = pdfItem ? calcTotal(pdfItem.servicos) : 0;
  const companyName = companyConfig?.razaoSocial || companyConfig?.nomeFantasia || "Empresa emissora";
  const companyDocument = companyConfig?.cnpj || "";
  const companyContact = [companyConfig?.telefone, companyConfig?.email].filter(Boolean).join(" | ");
  const clientAddress = pdfClient ? [pdfClient.endereco, pdfClient.bairro, `${pdfClient.municipio}-${pdfClient.uf}`, pdfClient.cep].filter(Boolean).join(", ") : "";
  const rawDocumentDate = pdfItem?.dataCriacao
    ? new Date(pdfItem.dataCriacao.includes("T") ? pdfItem.dataCriacao : `${pdfItem.dataCriacao}T12:00:00`)
    : new Date();
  const safeDocumentDate = Number.isNaN(rawDocumentDate.getTime()) ? new Date() : rawDocumentDate;
  const documentDate = safeDocumentDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const commercialPrimary = companyConfig?.corPrimaria || "#0f7f5c";
  const commercialSecondary = companyConfig?.corSecundaria || "#475569";
  const documentKindLabel = pdfItem?.tipo === "contrato" ? "Contrato de Prestação de Serviços" : "Proposta Técnica Comercial";
  const isContractDocument = pdfItem?.tipo === "contrato";
  const representativeName = companyConfig?.responsavelExecucao || companyConfig?.responsavelTecnico || "Responsável autorizado";
  const representativeRole = companyConfig?.cargoResponsavel || (isContractDocument ? "Representante da contratada" : "Responsável pela proposta");
  const serviceFrequencies = Array.from(new Set(pdfServicos.map((item) => item.frequencia).filter(Boolean))).join(", ");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileSignature className="h-6 w-6 text-primary" />
            Contratos e Propostas
          </h1>
          <p className="text-muted-foreground text-sm">Fluxo comercial integrado: proposta aprovada, contrato vigente e operação liberada por item contratado.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openNew("contrato")}><ClipboardCheck className="h-4 w-4 mr-2" />Contrato do cliente</Button>
          <Button onClick={() => openNew("proposta")}><Plus className="h-4 w-4 mr-2" />Nova Proposta</Button>
        </div>
      </div>

      <Card className="print:hidden border-primary/20 bg-primary/[0.03]">
        <CardContent className="pt-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {commercialFlow.map((step) => (
              <div key={step.title} className="rounded-2xl border bg-card p-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-primary/10 p-2 text-primary">
                    <step.icon className="h-4 w-4" />
                  </div>
                  <p className="font-semibold">{step.title}</p>
                </div>
                <p className="mt-2 text-sm leading-5 text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Caminho recomendado: envie a proposta, marque como aprovada após aceite, gere o contrato e só então agende serviços pelo saldo operacional criado.
          </p>
        </CardContent>
      </Card>

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
          <section
            className="mx-auto flex min-h-[297mm] w-[210mm] flex-col bg-white px-[14mm] py-[10mm] font-sans text-[10px] leading-snug text-slate-950"
            style={{ "--doc-primary": commercialPrimary, "--doc-secondary": commercialSecondary } as CSSProperties}
          >
            <header className="border-b-2 pb-2" style={{ borderColor: commercialPrimary }}>
              <div className="flex items-start justify-between gap-8">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-36 items-center justify-start border border-slate-200 bg-white px-3">
                    <img src={companyConfig?.logoUrl || logoImg} alt={companyName} className="max-h-10 max-w-full object-contain object-left" />
                  </div>
                  <div>
                    <h1 className="text-[19px] font-black uppercase leading-tight tracking-tight">{documentKindLabel}</h1>
                    <p className="mt-1 font-mono text-[11px] font-bold" style={{ color: commercialSecondary }}>
                      Nº {pdfItem.numero} · Emissão {documentDate}
                    </p>
                  </div>
                </div>
                <div className="max-w-[285px] text-right text-[9px] text-slate-600">
                  <p className="font-black uppercase leading-tight text-slate-950">{companyName}</p>
                  {companyDocument ? <p>CNPJ {companyDocument}</p> : null}
                  {companyConfig?.endereco ? <p>{companyConfig.endereco}</p> : null}
                  {companyContact ? <p>{companyContact}</p> : null}
                </div>
              </div>
            </header>

            {isContractDocument ? (
              <div className="mt-4">
                <h2 className="mb-2 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: commercialPrimary }}>Partes Contratantes</h2>
                <table className="w-full border-collapse text-[9.5px]">
                  <tbody>
                    <tr>
                      <td className="w-[18%] border border-slate-300 bg-slate-50 px-2 py-1.5 font-black uppercase">Contratada</td>
                      <td className="border border-slate-300 px-2 py-1.5">
                        <strong>{companyName}</strong>
                        {companyDocument ? <span> · CNPJ {companyDocument}</span> : null}
                        {companyConfig?.endereco ? <span> · {companyConfig.endereco}</span> : null}
                        <span> · Representante: {representativeName}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 bg-slate-50 px-2 py-1.5 font-black uppercase">Contratante</td>
                      <td className="border border-slate-300 px-2 py-1.5">
                        <strong>{pdfClient?.razaoSocial || "Cliente não informado"}</strong>
                        {pdfClient?.cnpj ? <span> · CNPJ/CPF {pdfClient.cnpj}</span> : null}
                        {clientAddress ? <span> · {clientAddress}</span> : null}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-5 border-b border-slate-200 pb-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: commercialPrimary }}>Cliente / Contratante</p>
                <h2 className="mt-1 text-[20px] font-black leading-tight">{pdfClient?.razaoSocial || "Cliente não informado"}</h2>
                <p className="mt-1 text-[9.5px] text-slate-600">
                  CNPJ/CPF {pdfClient?.cnpj || "-"} · {pdfClient ? `${pdfClient.municipio}/${pdfClient.uf}` : "-"} · {clientAddress || "Endereço não informado"}
                </p>
              </div>
            )}

                <table className="mt-3 w-full border-collapse text-[9.5px]">
              <tbody>
                <tr>
                  <td className="border border-slate-300 bg-slate-50 px-2 py-1.5 font-bold uppercase text-slate-600">Emissão</td>
                  <td className="border border-slate-300 px-2 py-1.5">{documentDate}</td>
                  <td className="border border-slate-300 bg-slate-50 px-2 py-1.5 font-bold uppercase text-slate-600">{isContractDocument ? "Vigência" : "Validade"}</td>
                  <td className="border border-slate-300 px-2 py-1.5">{pdfItem.vigenciaMeses} meses</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 bg-slate-50 px-2 py-1.5 font-bold uppercase text-slate-600">Valor total</td>
                  <td className="border border-slate-300 px-2 py-1.5 font-black" style={{ color: commercialPrimary }}>{pdfTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                  <td className="border border-slate-300 bg-slate-50 px-2 py-1.5 font-bold uppercase text-slate-600">Pagamento</td>
                  <td className="border border-slate-300 px-2 py-1.5">{pdfItem.formaPagamento || "-"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 bg-slate-50 px-2 py-1.5 font-bold uppercase text-slate-600">Local</td>
                  <td className="border border-slate-300 px-2 py-1.5">{clientAddress || "Conforme cadastro do cliente/contrato."}</td>
                  <td className="border border-slate-300 bg-slate-50 px-2 py-1.5 font-bold uppercase text-slate-600">Periodicidade</td>
                  <td className="border border-slate-300 px-2 py-1.5">{serviceFrequencies || "Conforme itens contratados."}</td>
                </tr>
              </tbody>
            </table>

              {pdfItem.tipo === "proposta" ? (
                <div className="mt-3 space-y-2">
                  <section>
                    <h3 className="border-b border-slate-300 pb-1 text-[12px] font-black uppercase" style={{ color: commercialPrimary }}>1. Apresentação</h3>
                    <p className="mt-2">
                      Apresentamos nossa proposta técnica e comercial para execução dos serviços abaixo caracterizados,
                      com escopo, frequência, valores e condições definidos a partir do cadastro comercial e do catálogo de serviços.
                    </p>
                  </section>

                  <section>
                    <h3 className="border-b border-slate-300 pb-1 text-[12px] font-black uppercase" style={{ color: commercialPrimary }}>2. Credenciamento / capacidade técnica</h3>
                    <p className="mt-2 text-[10.5px] text-slate-700">
                      A contratada declara possuir estrutura técnica, equipe qualificada e registros aplicáveis conforme parametrização do tenant.
                      {companyConfig?.alvara ? ` Alvará: ${companyConfig.alvara}.` : ""}
                      {companyConfig?.vigilanciaSanitaria ? ` Vigilância Sanitária: ${companyConfig.vigilanciaSanitaria}.` : ""}
                      {companyConfig?.anvisa ? ` ANVISA: ${companyConfig.anvisa}.` : ""}
                    </p>
                  </section>

                  <section>
                    <h3 className="border-b border-slate-300 pb-1 text-[12px] font-black uppercase" style={{ color: commercialPrimary }}>3. Natureza dos serviços</h3>
                    <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-1.5">
                      {pdfServicos.map((item, index) => (
                        <div key={`${item.servicoId}-${index}`} className="border-b border-slate-200 pb-1">
                          <p className="font-black">{String(index + 1).padStart(2, "0")} - {item.catalogo?.nome || "Serviço não informado"}</p>
                          <p className="mt-1 text-[9.5px] text-slate-600">{item.catalogo?.descricao || `Frequência: ${item.frequencia}`}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="border-b border-slate-300 pb-1 text-[12px] font-black uppercase" style={{ color: commercialPrimary }}>4. Forma de execução / tratamento</h3>
                    <div className="mt-1 space-y-1">
                      {pdfServicos.map((item, index) => (
                        <div key={`${item.servicoId}-execucao-${index}`} className="pl-2.5" style={{ borderLeft: `2px solid ${commercialPrimary}` }}>
                          <p className="font-black">{item.catalogo?.nome || "Serviço"}</p>
                          <p className="mt-0.5 text-[9px] text-slate-700">
                            {(item.catalogo?.procedimentos && item.catalogo.procedimentos.length > 0)
                              ? item.catalogo.procedimentos.slice(0, 3).join(" ")
                              : "Execução conforme procedimento operacional, boas práticas técnicas, requisitos do contrato e orientações do responsável técnico."}
                          </p>
                          {item.catalogo?.epis?.length ? <p className="mt-1 text-[9.5px] text-slate-500">EPIs previstos: {item.catalogo.epis.join(", ")}.</p> : null}
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              ) : (
                <div className="mt-4 space-y-2 text-[10px]">
                  <section>
                    <h3 className="text-[12px] font-black uppercase" style={{ color: commercialPrimary }}>Cláusula 1ª - Objeto do contrato</h3>
                    <p className="mt-2 text-slate-700">
                      O presente instrumento estabelece as condições para prestação dos serviços técnicos listados neste documento,
                      incluindo escopo, frequência, valores, vigência e responsabilidades operacionais vinculadas ao contrato.
                    </p>
                  </section>
                  <section>
                    <h3 className="text-[12px] font-black uppercase" style={{ color: commercialPrimary }}>Cláusula 2ª - Escopo técnico</h3>
                    <p className="mt-2 text-slate-700">
                      Os serviços serão executados conforme catálogo técnico, POPs, checklist aplicável, requisitos do cliente e registros de OS.
                      Cada item contratado poderá alimentar agendamentos, ordens de serviço, certificados e medições.
                    </p>
                  </section>
                  <section>
                    <h3 className="text-[12px] font-black uppercase" style={{ color: commercialPrimary }}>Cláusula 3ª - Responsabilidades das partes</h3>
                    <p className="mt-2 text-slate-700"><strong>Contratada:</strong> executar os serviços, registrar evidências, emitir documentos aplicáveis e manter rastreabilidade operacional.</p>
                    <p className="mt-1 text-slate-700"><strong>Contratante:</strong> disponibilizar acesso aos locais, acompanhar a execução quando necessário e validar medições conforme contrato.</p>
                  </section>
                </div>
              )}

              <section className="mt-3">
                <div className="mb-2 flex items-end justify-between">
                  <h3 className="border-b border-slate-300 pb-1 text-[12px] font-black uppercase" style={{ color: commercialPrimary }}>
                    {pdfItem.tipo === "proposta" ? "5. Valor do serviço" : "Cláusula 4ª - Serviços contratados"}
                  </h3>
                  <span className="text-[10px] font-bold text-slate-500">{pdfServicos.length} item(ns)</span>
                </div>
                <table className="w-full border-collapse text-[9px]">
                  <thead>
                    <tr className="bg-slate-100 text-left text-slate-800">
                      <th className="border border-slate-300 px-2 py-1.5">Item</th>
                      <th className="border border-slate-300 px-2 py-1.5">Serviço/produto</th>
                      <th className="border border-slate-300 px-2 py-1.5 text-center">Qtd.</th>
                      <th className="border border-slate-300 px-2 py-1.5 text-center">Frequência</th>
                      <th className="border border-slate-300 px-2 py-1.5 text-right">Unit.</th>
                      <th className="border border-slate-300 px-2 py-1.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pdfServicos.map((item, index) => (
                      <tr key={`${item.servicoId}-valor-${index}`}>
                        <td className="border border-slate-300 px-2 py-1.5 font-bold">{String(index + 1).padStart(2, "0")}</td>
                        <td className="border border-slate-300 px-2 py-1.5">
                          <p className="font-bold">{item.catalogo?.nome || "Serviço não informado"}</p>
                          <p className="text-[8.5px] text-slate-500">{item.catalogo?.unidade ? `Unidade: ${item.catalogo.unidade}` : "Origem: catálogo de serviços/produtos"}</p>
                        </td>
                        <td className="border border-slate-300 px-2 py-1.5 text-center">{item.quantidade}</td>
                        <td className="border border-slate-300 px-2 py-1.5 text-center">{item.frequencia}</td>
                        <td className="border border-slate-300 px-2 py-1.5 text-right">{item.valorUnitario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                        <td className="border border-slate-300 px-2 py-1.5 text-right font-black">{item.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="border border-slate-300 px-2 py-1.5 text-right font-black uppercase" colSpan={5}>Total geral</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-right font-black" style={{ color: commercialPrimary }}>{pdfTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                    </tr>
                  </tfoot>
                </table>
              </section>

              <section
                className="mt-3 grid grid-cols-2 gap-5 text-[9.5px]"
                style={{ breakBefore: pdfServicos.length > 8 ? "page" : "auto" }}
              >
                {pdfServicos.length > 8 ? (
                  <div className="col-span-2 border-b border-slate-300 pb-2">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: commercialPrimary }}>
                      Fechamento comercial e assinaturas
                    </p>
                    <p className="mt-1 text-[9px] text-slate-500">Condições finais do documento, observações e campos de assinatura.</p>
                  </div>
                ) : null}
                <div>
                  <h3 className="border-b border-slate-300 pb-1 font-black uppercase" style={{ color: commercialPrimary }}>
                    {isContractDocument ? "Cláusula 5ª - Condições comerciais" : "6. Condições comerciais"}
                  </h3>
                  <p className="mt-2"><strong>Pagamento:</strong> {pdfItem.formaPagamento}</p>
                  <p><strong>Prazo:</strong> {pdfItem.prazoPagamentoDias} dias após medição/aceite.</p>
                  <p><strong>{pdfItem.tipo === "contrato" ? "Vigência" : "Validade da proposta"}:</strong> {pdfItem.vigenciaMeses} meses.</p>
                </div>
                <div>
                  <h3 className="border-b border-slate-300 pb-1 font-black uppercase" style={{ color: commercialPrimary }}>
                    {isContractDocument ? "Cláusula 6ª - Local e periodicidade" : "7. Local e periodicidade"}
                  </h3>
                  <p className="mt-2"><strong>Local:</strong> {clientAddress || "Locais definidos no cadastro do cliente/contrato."}</p>
                  <p><strong>Periodicidade:</strong> {serviceFrequencies || "Conforme contrato."}</p>
                </div>
              </section>

              {isContractDocument ? (
                <section className="mt-3 space-y-2 text-[9.5px]">
                  <div>
                    <h3 className="font-black uppercase" style={{ color: commercialPrimary }}>Cláusula 7ª - Reajuste</h3>
                    <p>Os valores poderão ser reajustados conforme índice e regra comercial definidos no contrato, aditivo ou parametrização vigente do tenant.</p>
                  </div>
                  <div>
                    <h3 className="font-black uppercase" style={{ color: commercialPrimary }}>Cláusula 8ª - Rescisão e disposições gerais</h3>
                    <p>A rescisão, substituição de escopo, aceite de medições e demais disposições seguirão as condições pactuadas entre as partes e os registros operacionais do sistema.</p>
                  </div>
                </section>
              ) : null}

              {pdfItem.observacoes ? (
                <section className="mt-3 border-t border-slate-300 pt-2 text-[9.5px]">
                  <h3 className="font-black uppercase" style={{ color: commercialPrimary }}>{isContractDocument ? "Observações contratuais" : "8. Observações"}</h3>
                  <p className="mt-1 text-slate-700">{pdfItem.observacoes}</p>
                </section>
              ) : null}

              <section className={`${isContractDocument ? "mt-auto" : "mt-4"} border-t border-slate-300 pt-2 text-[9.5px]`}>
                <p className="mb-3 text-center text-[8.5px] text-slate-500">
                  {isContractDocument ? "E, por estarem de acordo, as partes assinam o presente instrumento." : "Aceite da proposta e autorização para continuidade do fluxo comercial."}
                </p>
                <div className="grid grid-cols-2 gap-14 text-center">
                <div className="border-t border-slate-900 pt-1.5">
                  <p className="font-black">{companyName}</p>
                  <p>{representativeName}</p>
                  <p>{representativeRole}</p>
                </div>
                <div className="border-t border-slate-900 pt-1.5">
                  <p className="font-black">{pdfClient?.razaoSocial || "Contratante"}</p>
                  <p>Nome / cargo / assinatura</p>
                  <p>{pdfClient ? `${pdfClient.municipio}/${pdfClient.uf}` : "Local"}, ____/____/______</p>
                </div>
                </div>
              </section>
          </section>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar" : form.tipo === "contrato" ? "Novo contrato do cliente" : "Nova proposta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-2xl border bg-muted/40 p-3 text-sm text-muted-foreground">
              {form.tipo === "contrato"
                ? "Use este caminho quando o cliente já aprovou o fornecimento por um contrato próprio. Ao salvar como vigente, os itens ficam disponíveis para agenda e controle de saldo operacional."
                : "Use este caminho para enviar uma proposta. Depois do aceite, altere o status para aprovada e gere o contrato a partir dela."}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Número *</Label>
                <Input value={form.numero} onChange={(event) => setForm({ ...form, numero: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(value) => {
                    const tipo = value as "contrato" | "proposta";
                    setForm({ ...form, tipo, status: tipo === "contrato" && form.status === "rascunho" ? "vigente" : form.status });
                  }}
                >
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
