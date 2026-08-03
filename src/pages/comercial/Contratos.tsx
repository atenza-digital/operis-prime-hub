import { useEffect, useMemo, useRef, useState } from "react";
import {
  generateContractFromProposal,
  generateMinutaFromProposal,
  generateProposalFromPdf,
  getBootstrap,
  issueContractTemplateDocument,
  saveContractTemplate,
  uploadContractTemplateSourceFile,
  type BootstrapData,
  type ContratoServico,
  type ContratoTemplate,
  type ProposalAssistDraft,
} from "@/lib/api";
import { repairMojibake } from "@/lib/repairMojibake";
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
  FileUp,
  Link2,
  Pencil,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  rascunho: "secondary",
  enviado: "outline",
  em_negociacao: "secondary",
  aprovado: "default",
  recusado: "destructive",
  cancelado: "destructive",
  vigente: "default",
  encerrado: "destructive",
};

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  em_negociacao: "Em negociação",
  aprovado: "Aprovado",
  recusado: "Recusado",
  cancelado: "Cancelado",
  vigente: "Vigente",
  encerrado: "Encerrado",
};

const emptyServico: ContratoServico = { servicoId: "", quantidade: 1, valorUnitario: 0, frequencia: "Mensal", descricaoComercial: "", unidadeComercial: "", enderecoAtividade: "" };
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
  titulo: "",
  objeto: "",
  validadeDias: 30,
  modalidade: "",
  locaisExecucao: [],
  escopoTecnico: "",
  condicoesComerciais: "",
};

const commercialFlow = [
  {
    title: "1. Gerar proposta",
    description: "Monte a proposta com cliente, serviços/produtos, quantidades, valores e condições comerciais.",
    icon: Send,
  },
  {
    title: "2. Gerar minuta",
    description: "Com a proposta aprovada, gere a minuta para revisão, negociação e aceite formal do cliente.",
    icon: ClipboardCheck,
  },
  {
    title: "3. Contrato final",
    description: "A minuta aprovada gera o contrato vigente ou registra o modelo assinado enviado pelo cliente.",
    icon: FileSignature,
  },
  {
    title: "4. Liberar operação",
    description: "Somente o contrato final vigente sincroniza itens operacionais para agenda, OS, saldo e medição.",
    icon: CalendarDays,
  },
];

function gerarNumero(formato: string, sequencia: number) {
  return formato
    .replace("{SEQ}", String(sequencia).padStart(3, "0"))
    .replace("{ANO}", String(new Date().getFullYear()));
}

function splitLines(value?: string | null) {
  return String(value || "")
    .split(/\r?\n|;\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLines(value?: string[]) {
  return Array.isArray(value) ? value.join("\n") : "";
}

function buildTenantLogoFallback(companyName: string, primaryColor: string) {
  const initials = companyName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "TE";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="130" viewBox="0 0 420 130"><rect width="420" height="130" rx="26" fill="#ffffff"/><circle cx="68" cy="65" r="38" fill="${primaryColor}"/><text x="68" y="78" text-anchor="middle" font-family="Montserrat" font-size="32" font-weight="700" fill="#ffffff">${initials}</text><text x="124" y="58" font-family="Montserrat" font-size="24" font-weight="700" fill="#17212f">Empresa</text><text x="124" y="88" font-family="Montserrat" font-size="17" font-weight="500" fill="#607086">emissora</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function documentLogoFromCompany(company: BootstrapData["companyConfig"]) {
  const config = company?.certificadoConfig ?? {};
  return config.documentLogoLightUrl || config.logoPrincipalUrl || company?.logoUrl || "";
}

function resolveIssuePlace(item: { issueCity?: string | null; issueState?: string | null }, company: { endereco?: string | null } | null | undefined) {
  const address = repairMojibake(String(company?.endereco || ""));
  const stateMatch = address.match(/[-/]\s*([A-Z]{2})\b/);
  const beforeState = stateMatch?.index !== undefined ? address.slice(0, stateMatch.index) : "";
  const cityCandidate = beforeState
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1)
    ?.replace(/^.*\s-\s/, "")
    .trim();

  return {
    city: repairMojibake(String(item.issueCity || cityCandidate || "Parauapebas")),
    state: repairMojibake(String(item.issueState || stateMatch?.[1] || "PA")),
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo selecionado."));
    reader.readAsDataURL(file);
  });
}

type ProposalPrintProps = {
  item: ContratoTemplate;
  client: BootstrapData["clients"][number] | null;
  services: BootstrapData["services"];
  company: BootstrapData["companyConfig"];
  logoSrc: string;
  documentDate: string;
  primaryColor: string;
  representativeName: string;
  representativeRole: string;
};

function ProposalDocumentPrint({ item, client, services, company, logoSrc, documentDate, primaryColor, representativeName, representativeRole }: ProposalPrintProps) {
  const clientAddress = client
    ? [client.endereco, client.bairro, `${client.municipio}-${client.uf}`, client.cep].filter(Boolean).join(", ")
    : "";
  const principalContact = client?.contatos?.find((contact) => contact.principal) || client?.contatos?.[0];
  const activityAddresses = Array.from(new Set(item.servicos.map((service) => cleanText(service.enderecoAtividade)).filter(Boolean)));
  const locations = item.locaisExecucao?.length ? item.locaisExecucao : activityAddresses.length ? activityAddresses : clientAddress ? [clientAddress] : [];
  const servicesRows = item.servicos.map((service, index) => {
    const catalog = services.find((entry) => entry.id === service.servicoId);
    const total = Number(service.quantidade || 0) * Number(service.valorUnitario || 0);
    return { service, catalog, index, total };
  });
  const total = servicesRows.reduce((sum, row) => sum + row.total, 0);
  const frequencies = servicesRows.map(({ service }) => service.frequencia).filter(Boolean).join(", ");
  const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const companyName = company?.razaoSocial || company?.nomeFantasia || "Empresa emissora";
  const companyContact = [company?.telefone ? `Tel.: ${company.telefone}` : "", company?.email].filter(Boolean).join(" | ");
  const clientContact = principalContact ? [principalContact.nome, principalContact.telefone, principalContact.email].filter(Boolean).join(" | ") : "";
  const proposalTitle = item.titulo || "Proposta Técnica e Comercial";
  const proposalObject = item.objeto || servicesRows.map(({ catalog }) => catalog?.descricao).filter(Boolean).join(" ");
  const scopeLines = splitLines(item.escopoTecnico);
  const conditionLines = splitLines(item.condicoesComerciais);

  return (
    <section className="mx-auto flex min-h-[297mm] w-[210mm] flex-col bg-white px-[14mm] py-[12mm] font-document text-[10px] leading-snug text-black">
      <header className="border-b-2 pb-4" style={{ borderColor: primaryColor }}>
        <div className="flex items-start justify-between gap-8">
          <img src={logoSrc || buildTenantLogoFallback(companyName, primaryColor)} alt={companyName} className="h-16 w-48 object-contain object-left" />
          <div className="max-w-[270px] text-right text-[9px] leading-relaxed text-slate-600">
            <p className="font-bold uppercase text-black">{companyName}</p>
            {company?.cnpj ? <p>CNPJ {company.cnpj}</p> : null}
            {company?.endereco ? <p>{company.endereco}</p> : null}
            {companyContact ? <p>{companyContact}</p> : null}
            <p className="mt-2">Proposta {item.numero}</p>
          </div>
        </div>
        <h1 className="mt-10 text-[22px] font-black uppercase tracking-tight">{proposalTitle}</h1>
        {proposalObject ? <p className="mt-2 text-[11px] italic text-slate-700">{proposalObject}</p> : null}
      </header>

      <table className="mt-7 w-full border-collapse text-[9.5px]">
        <tbody>
          <tr><td className="w-[28%] border border-black px-2 py-2 font-bold">Proposta n.º</td><td className="border border-black px-2 py-2">{item.numero}</td></tr>
          <tr><td className="border border-black px-2 py-2 font-bold">Data de emissão</td><td className="border border-black px-2 py-2">{documentDate}</td></tr>
          <tr><td className="border border-black px-2 py-2 font-bold">Validade</td><td className="border border-black px-2 py-2">{item.validadeDias || 30} dias corridos a partir da emissão</td></tr>
          <tr><td className="border border-black px-2 py-2 font-bold">Modalidade</td><td className="border border-black px-2 py-2">{item.modalidade || "Conforme condições comerciais e serviços contratados"}</td></tr>
        </tbody>
      </table>

      <section className="mt-8" style={{ breakInside: "avoid" }}>
        <h2 className="text-[10px] font-bold uppercase text-slate-500">Cliente</h2>
        <p className="mt-3 text-[15px] font-black uppercase">{client?.razaoSocial || "Cliente não informado"}</p>
        {client?.nomeFantasia && client.nomeFantasia !== client.razaoSocial ? <p className="mt-1">{client.nomeFantasia}</p> : null}
        {client?.cnpj ? <p className="mt-2">CNPJ/CPF: {client.cnpj}</p> : null}
        {clientAddress ? <p>{clientAddress}</p> : null}
        {clientContact ? <p>{clientContact}</p> : null}
      </section>

      <section className="mt-7" style={{ breakInside: "avoid" }}>
        <h2 className="text-[10px] font-bold uppercase text-slate-500">Fornecedor</h2>
        <p className="mt-3 text-[15px] font-black uppercase">{companyName}</p>
        {company?.cnpj ? <p className="mt-2">CNPJ: {company.cnpj}</p> : null}
        {company?.endereco ? <p>{company.endereco}</p> : null}
        {companyContact ? <p>{companyContact}</p> : null}
      </section>

      <section className="mt-8" style={{ breakInside: "avoid" }}>
        <h2 className="border-b border-slate-400 pb-1 text-[11px] font-black uppercase">1 - Credenciamento</h2>
        <p className="mt-3">A contratada declara possuir estrutura técnica, equipe qualificada e registros aplicáveis conforme a parametrização do tenant.</p>
        {company?.alvara || company?.vigilanciaSanitaria || company?.anvisa ? (
          <p className="mt-2">{[company.alvara ? `Alvará: ${company.alvara}` : "", company.vigilanciaSanitaria ? `Vigilância Sanitária: ${company.vigilanciaSanitaria}` : "", company.anvisa ? `ANVISA: ${company.anvisa}` : ""].filter(Boolean).join(" | ")}</p>
        ) : null}
      </section>

      <section className="mt-6" style={{ breakInside: "avoid" }}>
        <h2 className="border-b border-slate-400 pb-1 text-[11px] font-black uppercase">2 - Natureza dos serviços</h2>
        <div className="mt-3 space-y-2">
          {servicesRows.map(({ catalog, service, index }) => (
            <div key={`${service.servicoId}-${index}`}>
              <p className="font-bold">{String(index + 1).padStart(2, "0")} - {catalog?.nome || "Serviço não informado"}</p>
              <p className="mt-1 text-slate-700">{catalog?.descricao || `Serviço com frequência ${service.frequencia || "conforme contrato"}.`}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6" style={{ breakInside: "avoid" }}>
        <h2 className="border-b border-slate-400 pb-1 text-[11px] font-black uppercase">3 - Forma de tratamento / execução</h2>
        <div className="mt-3 space-y-3">
          {(scopeLines.length ? scopeLines : servicesRows.map(({ catalog }) => catalog?.nome || "Serviço")).map((line, index) => (
            <div key={`${line}-${index}`}>
              <p className="font-bold">{servicesRows[index]?.catalog?.nome || (index === 0 ? "Execução dos serviços" : "Procedimentos aplicáveis")}</p>
              <p className="mt-1 text-slate-700">{line}</p>
              {servicesRows[index]?.catalog?.epis?.length ? <p className="mt-1 text-[9px]">EPIs previstos: {servicesRows[index].catalog.epis.join(", ")}.</p> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-7" style={{ breakInside: "avoid" }}>
        <h2 className="border-b border-slate-400 pb-1 text-[11px] font-black uppercase">4 - Valor do serviço</h2>
        <table className="mt-3 w-full border-collapse text-[9px]">
          <thead><tr className="bg-[#c6dfb5]"><th className="border border-black px-2 py-1.5 text-left">Item</th><th className="border border-black px-2 py-1.5 text-left">Descrição de serviços</th><th className="border border-black px-2 py-1.5 text-right">Qtd.</th><th className="border border-black px-2 py-1.5 text-left">Frequência</th><th className="border border-black px-2 py-1.5 text-right">Valor unit.</th><th className="border border-black px-2 py-1.5 text-right">Valor total</th></tr></thead>
          <tbody>{servicesRows.map(({ service, catalog, index, total: lineTotal }) => <tr key={`${service.servicoId}-price-${index}`}><td className="border border-black px-2 py-1.5">{String(index + 1).padStart(2, "0")}</td><td className="border border-black px-2 py-1.5"><strong>{catalog?.nome || "Serviço não informado"}</strong><br /><span className="text-[8px]">Unidade: {catalog?.unidade || "un."}</span></td><td className="border border-black px-2 py-1.5 text-right">{service.quantidade}</td><td className="border border-black px-2 py-1.5">{service.frequencia || "-"}</td><td className="border border-black px-2 py-1.5 text-right">{money(Number(service.valorUnitario || 0))}</td><td className="border border-black px-2 py-1.5 text-right font-bold">{money(lineTotal)}</td></tr>)}</tbody>
          <tfoot><tr><td className="border border-black px-2 py-2 text-right font-bold uppercase" colSpan={5}>Total</td><td className="border border-black px-2 py-2 text-right text-[12px] font-black" style={{ color: primaryColor }}>{money(total)}</td></tr></tfoot>
        </table>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-6 text-[9.5px]" style={{ breakInside: "avoid" }}>
        <div><h2 className="border-b border-slate-400 pb-1 text-[10px] font-bold">Condições comerciais</h2><p className="mt-2">Pagamento: {item.formaPagamento || "A negociar"}</p><p>Prazo: {item.prazoPagamentoDias || 30} dias após medição/aceite.</p><p>Validade da proposta: {item.validadeDias || 30} dias.</p>{conditionLines.map((line) => <p key={line}>{line}</p>)}</div>
        <div><h2 className="border-b border-slate-400 pb-1 text-[10px] font-bold">Local e periodicidade</h2><p className="mt-2">Local: {locations.join("; ") || "Conforme cadastro do cliente."}</p><p>Periodicidade: {frequencies || "Conforme serviços contratados."}</p></div>
      </section>

      {item.observacoes ? <section className="mt-5 border-t border-slate-400 pt-3 text-[9.5px]" style={{ breakInside: "avoid" }}><h2 className="text-[10px] font-bold uppercase">Observações</h2><p className="mt-2">{item.observacoes}</p></section> : null}

      <section className="mt-auto pt-8" style={{ breakInside: "avoid" }}>
        <p className="mb-8 text-center text-[9px]">E, por estarem de acordo, as partes assinam a presente proposta.</p>
        <div className="grid grid-cols-2 gap-12 text-center text-[9px]"><div className="border-t border-black pt-2"><p className="font-bold">{companyName}</p><p>{representativeName}</p><p>{representativeRole}</p></div><div className="border-t border-black pt-2"><p className="font-bold">{client?.razaoSocial || "Contratante"}</p><p>Nome / cargo / assinatura</p><p>{client ? `${client.municipio}/${client.uf}` : "Local"}, ____/____/______</p></div></div>
      </section>
    </section>
  );
}

function ProposalReferencePrint({ item, client, services, company, logoSrc, documentDate, primaryColor, representativeName, representativeRole }: ProposalPrintProps) {
  const cleanText = (value: unknown) => repairMojibake(String(value || ""));
  const address = client ? [client.endereco, client.bairro, `${client.municipio}-${client.uf}`, client.cep].filter(Boolean).map(cleanText).join(", ") : "";
  const companyName = cleanText(company?.razaoSocial || company?.nomeFantasia || "Empresa emissora");
  const contact = [company?.telefone, company?.email].filter(Boolean).map(cleanText).join(" | ");
  const activityAddresses = Array.from(new Set(item.servicos.map((service) => cleanText(service.enderecoAtividade)).filter(Boolean)));
  const locations = item.locaisExecucao?.length ? item.locaisExecucao : activityAddresses.length ? activityAddresses : address ? [address] : [];
  const rows = item.servicos.map((service, index) => {
    const catalog = services.find((entry) => entry.id === service.servicoId);
    const total = Number(service.quantidade || 0) * Number(service.valorUnitario || 0);
    return { service, catalog, index, total };
  });
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const title = cleanText(item.titulo || "Proposta Técnica e Comercial");
  const objectText = cleanText(item.objeto || rows.map(({ catalog }) => catalog?.descricao).filter(Boolean).join(" "));
  const scope = splitLines(item.escopoTecnico);
  const conditions = splitLines(item.condicoesComerciais);
  const documentVersion = "Versão 1";
  const totalPages = 4;
  const softColor = `${primaryColor}14`;
  const darkColor = "#1f2933";
  const documentLabel = `Proposta ${item.numero}`;
  const issuePlace = resolveIssuePlace(item, company);
  const issueCity = issuePlace.city;
  const issueState = issuePlace.state;
  const effectiveLogoSrc = logoSrc || buildTenantLogoFallback(companyName, primaryColor);
  const Header = ({ first = false }: { first?: boolean }) => (
    <header className="border-b pb-[9pt]" style={{ borderColor: primaryColor }}>
      <div className="grid grid-cols-[auto_1fr] items-center gap-[22mm]">
        <img src={effectiveLogoSrc} alt={`Logo ${companyName}`} className="h-[15mm] w-[44mm] object-contain object-left" />
        <div className="text-right">
          <p className="text-[9.5pt] font-semibold" style={{ color: darkColor }}>{documentLabel}</p>
          <p className="mt-[2pt] text-[8.5pt] font-medium text-slate-500">
            {first ? `${documentVersion} · ${documentDate}` : documentVersion}
          </p>
        </div>
      </div>
    </header>
  );
  const Footer = ({ page }: { page: number }) => (
    <footer className="mt-[10pt] flex h-[12mm] shrink-0 items-center justify-between border-t pt-[6pt] text-[8pt] font-medium text-slate-500" style={{ borderColor: "#d8dee8" }}>
      <span>{documentLabel} · {documentVersion}</span>
      <span>Página {page} de {totalPages}</span>
    </footer>
  );
  const SectionTitle = ({ number, title, compact = false }: { number: string; title: string; compact?: boolean }) => (
    <h2 className={`${compact ? "mb-[6pt] mt-[14pt] pb-[4pt]" : "mb-[8pt] mt-[18pt] pb-[5pt]"} flex items-end gap-[7pt] border-b text-[10.5pt] font-bold`} style={{ borderColor: "#d8dee8", color: darkColor }}>
      <span className="text-[12pt] font-bold" style={{ color: primaryColor }}>{number}</span>
      <span>{title}</span>
    </h2>
  );
  const paragraphClass = "mt-[7pt] text-justify leading-[1.3] [text-indent:7.5mm]";
  const listClass = "mt-[7pt] list-disc space-y-[4pt] pl-[14pt] leading-[1.24]";
  const tableClass = "mt-[8pt] w-full border-collapse text-[8.7pt] leading-[1.2]";
  const serviceText = (catalog: BootstrapData["services"][number] | undefined, _service: ContratoTemplate["servicos"][number]) => cleanText(catalog?.descricao || `Execução de ${catalog?.nome || "serviço técnico"}, conforme frequência e condições registradas.`);
  const serviceName = (catalog: BootstrapData["services"][number] | undefined, _service: ContratoTemplate["servicos"][number]) => cleanText(catalog?.nome || "Serviço técnico");
  const splitActivity = (value: string) => value.split(";").map((line) => cleanText(line.trim())).filter(Boolean);
  const scopeItems = scope.length ? scope.flatMap(splitActivity) : rows.map(({ catalog, service }) => serviceText(catalog, service));
  const conditionItems = conditions.length ? conditions : [
    `Vigência sugerida: ${item.vigenciaMeses || 12} meses, prorrogável mediante acordo entre as partes.`,
    `Medição conforme a periodicidade cadastrada e aprovação da fiscalização.`,
    `Pagamento: ${item.formaPagamento || "conforme condição comercial acordada"}.`,
    `Validade desta proposta: ${item.validadeDias || 30} dias corridos a contar da data de emissão.`,
  ];
  const DocumentSignatureBlock = () => (
      <section className="mt-[18pt] break-inside-avoid text-center text-[8.8pt]" style={{ pageBreakInside: "avoid" }}>
        <div
          className="items-start"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: "18mm",
            breakInside: "avoid",
            pageBreakInside: "avoid",
          }}
        >
          <div data-testid="proposal-signature-cell" className="min-w-0 break-inside-avoid" style={{ minHeight: "46mm", height: "46mm", breakInside: "avoid", pageBreakInside: "avoid" }}>
            <div className="box-border h-[15mm] border-b border-slate-700" />
            <div className="box-border h-[25mm] pt-[7pt]">
              <p className="mx-auto flex h-[10mm] max-w-[72mm] items-start justify-center break-words font-semibold leading-[1.18]">{companyName}</p>
              <p className="mt-[3pt] h-[4mm]">Responsável: {cleanText(representativeName)}</p>
              <p className="h-[4mm]">{cleanText(representativeRole)}</p>
            </div>
            <p className="mt-[4pt] text-slate-500">Assinatura e carimbo</p>
          </div>
          <div data-testid="proposal-signature-cell" className="min-w-0 break-inside-avoid" style={{ minHeight: "46mm", height: "46mm", breakInside: "avoid", pageBreakInside: "avoid" }}>
            <div className="box-border h-[15mm] border-b border-slate-700" />
            <div className="box-border h-[25mm] pt-[7pt]">
              <p className="mx-auto flex h-[10mm] max-w-[72mm] items-start justify-center break-words font-semibold leading-[1.18]">{cleanText(client?.razaoSocial || "Contratante")}</p>
              <p className="mt-[3pt] h-[4mm]">Responsável: ____________________</p>
              <p className="h-[4mm]">Cargo: __________________________</p>
            </div>
            <p className="mt-[4pt] text-slate-500">Assinatura e carimbo</p>
          </div>
        </div>
      </section>
  );

  return <div className="mx-auto w-[210mm] bg-white font-proposal text-[9.35pt] leading-[1.3] text-slate-950" lang="pt-BR">
    <section className="box-border flex h-[297mm] flex-col px-[18mm] py-[16mm]" style={{ breakAfter: "page", overflow: "hidden" }}>
      <div className="min-h-0 flex-1">
      <Header first />
      <div className="mx-auto mt-[12pt] max-w-[142mm] text-center">
        <h1 className="text-[19pt] font-bold uppercase leading-tight" style={{ color: darkColor }}>{title}</h1>
        {objectText ? <p className="mx-auto mt-[6pt] max-w-[142mm] text-center text-[10.1pt] font-medium leading-[1.24] text-slate-600">{objectText}</p> : null}
      </div>

      <section className="mt-[16pt] rounded-[8px] border border-slate-200 bg-white px-[11pt] py-[9pt]">
        <div className="grid grid-cols-2 gap-x-[16pt] gap-y-[7pt]">
          {[
            ["Número", item.numero],
            ["Emissão", documentDate],
            ["Validade", `${item.validadeDias || 30} dias corridos`],
            ["Cliente", cleanText(client?.razaoSocial || "Cliente não informado")],
            ["Objeto", objectText || "Prestação de serviços técnicos conforme catálogo."],
            ["Fornecedor", `${companyName}${company?.cnpj ? ` · CNPJ ${cleanText(company.cnpj)}` : ""}`],
            ["Responsável comercial/técnico", `${cleanText(representativeName)}${representativeRole ? ` · ${cleanText(representativeRole)}` : ""}${contact ? ` · ${contact}` : ""}`],
          ].map(([label, value], index) => (
            <div key={label} className={index >= 4 ? "col-span-2 border-t border-slate-100 pt-[7pt]" : ""}>
              <p className="text-[7.8pt] font-semibold uppercase tracking-[0.04em] text-slate-500">{label}</p>
              <p className="mt-[1pt] text-[9pt] font-medium leading-[1.18] text-slate-950">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <SectionTitle number="01" title="Unidades e endereços contemplados" />
      <ul className={listClass}>{(locations.length ? locations : [address || "Conforme cadastro do cliente."]).map((location) => <li key={location}>{cleanText(location)}</li>)}</ul>

      <SectionTitle number="02" title="Escopo técnico proposto" />
      <p className={paragraphClass}>A {companyName} executará os serviços de forma programada, com fornecimento de mão de obra, equipamentos, ferramentas, materiais operacionais e mobilização local necessários ao escopo contratado.</p>
      <ul className={listClass}>{scopeItems.map((line, index) => <li key={`${line}-${index}`}>{cleanText(line)}</li>)}</ul>

      </div>
      <Footer page={1} />
    </section>
    <section className="box-border flex h-[297mm] flex-col px-[18mm] py-[16mm]" style={{ breakAfter: "page", overflow: "hidden" }}>
      <div className="min-h-0 flex-1">
      <Header />
      <SectionTitle number="03" title="Frequência e cronograma" compact />
      <table className={tableClass}>
        <thead><tr style={{ backgroundColor: darkColor }} className="text-white"><th className="w-[23mm] px-[8pt] py-[8pt] text-left font-semibold">Frequência</th><th className="px-[8pt] py-[8pt] text-left font-semibold">Atividade programada</th><th className="w-[48mm] px-[8pt] py-[8pt] text-left font-semibold">Abrangência</th></tr></thead>
        <tbody>{rows.map(({ service, catalog, index }) => <tr key={`${service.servicoId}-schedule-${index}`} className="break-inside-avoid border-b border-slate-200"><td className="px-[8pt] py-[8pt] font-semibold" style={{ color: primaryColor }}>{cleanText(service.frequencia || "Conforme contrato")}</td><td className="px-[8pt] py-[8pt] font-semibold">{serviceName(catalog, service)}</td><td className="px-[8pt] py-[8pt] text-slate-600">Conforme seção 01</td></tr>)}</tbody>
      </table>
      <p className={paragraphClass}>O cronograma poderá ser ajustado em razão de acesso, condições operacionais, segurança ou prioridade definida pelo contratante, sem prejuízo da frequência contratada.</p>

      <SectionTitle number="04" title="Mobilização e documentação" compact />
      <ul className={listClass}><li>Mobilização local, equipe, EPIs, ferramentas e equipamentos necessários à execução.</li><li>Emissão de ordem de serviço, registros operacionais, evidências fotográficas e relatório técnico quando aplicável.</li><li>Liberação de acesso, integração e regras internas do cliente devem ser disponibilizadas antes da execução.</li></ul>

      <SectionTitle number="05" title="Responsabilidades" compact />
      <div className="grid grid-cols-2 gap-[9pt]">
        <div className="rounded-[7px] border border-slate-200 bg-slate-50/60 px-[9pt] py-[7pt]">
          <h3 className="text-[10pt] font-semibold" style={{ color: darkColor }}>Contratada</h3>
          <ul className="mt-[6pt] list-disc space-y-[3pt] pl-[13pt] text-[8.9pt] leading-[1.18]"><li>Fornecer equipe qualificada e supervisionada.</li><li>Fornecer EPIs, ferramentas, materiais e equipamentos necessários.</li><li>Cumprir normas de segurança, meio ambiente, qualidade e procedimentos aplicáveis.</li><li>Registrar atividades executadas, pendências e recomendações.</li></ul>
        </div>
        <div className="rounded-[7px] border border-slate-200 bg-slate-50/60 px-[9pt] py-[7pt]">
          <h3 className="text-[10pt] font-semibold" style={{ color: darkColor }}>Contratante</h3>
          <ul className="mt-[6pt] list-disc space-y-[3pt] pl-[13pt] text-[8.9pt] leading-[1.18]"><li>Liberar os locais e informar riscos, restrições e regras internas.</li><li>Indicar responsável para acompanhamento e aceite dos serviços.</li><li>Comunicar alterações de escopo, áreas bloqueadas ou impedimentos de execução.</li></ul>
        </div>
      </div>

      </div>
      <Footer page={2} />
    </section>
    <section className="box-border flex h-[297mm] flex-col px-[18mm] py-[16mm]" style={{ breakAfter: "page", overflow: "hidden" }}>
      <div className="min-h-0 flex-1">
        <Header />
        <SectionTitle number="06" title="Proposta comercial" compact />
        <p className={paragraphClass}>Os valores abaixo contemplam o escopo técnico, mobilização, mão de obra, equipamentos ordinários, materiais operacionais e administração necessários, salvo condições expressamente indicadas.</p>
        <table className={tableClass}>
          <thead><tr style={{ backgroundColor: darkColor }} className="text-white"><th className="w-[10mm] px-[7pt] py-[8pt] text-center font-semibold">Item</th><th className="px-[7pt] py-[8pt] text-left font-semibold">Descrição</th><th className="w-[18mm] px-[7pt] py-[8pt] text-center font-semibold">Unid.</th><th className="w-[15mm] px-[7pt] py-[8pt] text-center font-semibold">Qtd.</th><th className="w-[25mm] px-[7pt] py-[8pt] text-right font-semibold">Valor unit.</th><th className="w-[25mm] px-[7pt] py-[8pt] text-right font-semibold">Total</th></tr></thead>
          <tbody>{rows.map(({ service, catalog, index, total: lineTotal }) => <tr key={`${service.servicoId}-commercial-${index}`} className="break-inside-avoid border-b border-slate-200"><td className="px-[7pt] py-[8pt] text-center">{index + 1}</td><td className="px-[7pt] py-[8pt] font-semibold">{serviceName(catalog, service)}</td><td className="px-[7pt] py-[8pt] text-center">{cleanText(catalog?.unidade || "un.")}</td><td className="px-[7pt] py-[8pt] text-center">{service.quantidade}</td><td className="px-[7pt] py-[8pt] text-right">{money(Number(service.valorUnitario || 0))}</td><td className="px-[7pt] py-[8pt] text-right font-semibold">{money(lineTotal)}</td></tr>)}</tbody>
          <tfoot><tr><td className="px-[8pt] py-[8pt] text-right text-[9.5pt] font-semibold" colSpan={5} style={{ backgroundColor: softColor }}>Valor global da proposta</td><td className="px-[8pt] py-[8pt] text-right text-[11pt] font-bold" style={{ backgroundColor: softColor, color: primaryColor }}>{money(total)}</td></tr></tfoot>
        </table>

        <SectionTitle number="07" title="Serviços spot ou itens não inclusos" compact />
        <ul className={listClass}><li>Serviços fora do escopo, áreas adicionais ou demandas emergenciais não previstas.</li><li>Materiais, equipamentos especiais, acesso extraordinário ou descarte externo não descritos nos itens acima.</li><li>Qualquer alteração será submetida previamente à aprovação do contratante.</li></ul>

        <SectionTitle number="08" title="Condições comerciais" compact />
        <ul className={listClass}>{conditionItems.map((condition) => <li key={condition}>{cleanText(condition)}</li>)}</ul>

        <SectionTitle number="09" title="Premissas técnicas" compact />
        <ul className={listClass}><li>A proposta considera o escopo, as unidades e as condições informadas pelo contratante.</li><li>Visita técnica poderá confirmar metragem, logística, pontos de acesso, riscos e necessidade de ajustes.</li><li>Alterações relevantes de área, frequência, unidade ou equipe poderão exigir reavaliação comercial prévia.</li></ul>

        {item.observacoes ? <section className="mt-[14pt] rounded-[7px] px-[10pt] py-[8pt]" style={{ backgroundColor: softColor }}><h3 className="text-[9.5pt] font-semibold" style={{ color: darkColor }}>Observações</h3><p className="mt-[4pt] text-left leading-[1.25]">{cleanText(item.observacoes)}</p></section> : null}

      </div>
      <Footer page={3} />
    </section>
    <section className="box-border flex h-[297mm] flex-col px-[18mm] py-[16mm]" style={{ overflow: "hidden" }}>
      <div className="min-h-0 flex-1">
        <Header />
        <SectionTitle number="10" title="Aceite da proposta" />
        <p className={paragraphClass}>De acordo com as condições técnicas e comerciais descritas nesta proposta, as partes poderão formalizar o aceite por e-mail, pedido de compra ou instrumento contratual específico, autorizando a continuidade do fluxo comercial e operacional.</p>

        <section className="mt-[18pt] rounded-[8px] border border-slate-200 bg-white px-[11pt] py-[9pt]">
          <h3 className="text-[9.5pt] font-semibold" style={{ color: darkColor }}>Resumo para aceite</h3>
          <div className="mt-[8pt] grid grid-cols-2 gap-x-[16pt] gap-y-[7pt]">
            {[
              ["Número da proposta", item.numero],
              ["Cliente", cleanText(client?.razaoSocial || "Cliente não informado")],
              ["Objeto resumido", objectText || "Prestação de serviços técnicos conforme catálogo."],
              ["Valor global", money(total)],
              ["Validade", `${item.validadeDias || 30} dias corridos`],
              ["Versão", documentVersion],
            ].map(([label, value], index) => (
              <div key={label} className={index === 2 ? "col-span-2 border-t border-slate-100 pt-[7pt]" : ""}>
                <p className="text-[7.8pt] font-semibold uppercase tracking-[0.04em] text-slate-500">{label}</p>
                <p className="mt-[1pt] text-[9.4pt] font-medium leading-[1.22] text-slate-950">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-[12pt] text-right text-[9pt]">{issueCity}/{issueState}, {documentDate}.</p>
        <div className="mt-[18pt]">
          <DocumentSignatureBlock />
        </div>
      </div>
      <Footer page={4} />
    </section>
  </div>;
}

function ContractReferencePrint({ item, client, services, company, logoSrc, documentDate, primaryColor, representativeName, representativeRole }: ProposalPrintProps) {
  const cleanText = (value: unknown) => repairMojibake(String(value || ""));
  const address = client ? [client.endereco, client.bairro, `${client.municipio}-${client.uf}`, client.cep].filter(Boolean).map(cleanText).join(", ") : "";
  const companyName = cleanText(company?.razaoSocial || company?.nomeFantasia || "Empresa emissora");
  const companyDocument = cleanText(company?.cnpj || "");
  const contact = [company?.telefone, company?.email].filter(Boolean).map(cleanText).join(" | ");
  const activityAddresses = Array.from(new Set(item.servicos.map((service) => cleanText(service.enderecoAtividade)).filter(Boolean)));
  const locations = item.locaisExecucao?.length ? item.locaisExecucao.map(cleanText) : activityAddresses.length ? activityAddresses : address ? [address] : [];
  const rows = item.servicos.map((service, index) => {
    const catalog = services.find((entry) => entry.id === service.servicoId);
    const total = Number(service.quantidade || 0) * Number(service.valorUnitario || 0);
    return { service, catalog, index, total };
  });
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const documentVersion = "Versão 1";
  const needsClosingPage = rows.length > 3;
  const totalPages = needsClosingPage ? 3 : 2;
  const softColor = `${primaryColor}14`;
  const darkColor = "#1f2933";
  const documentLabel = `${item.tipo === "minuta" ? "Minuta" : "Contrato"} ${item.numero}`;
  const title = item.tipo === "minuta" ? "Minuta / Modelo do Cliente" : "Contrato de Prestação de Serviços";
  const subject = cleanText(item.titulo || item.objeto || rows.map(({ catalog }) => catalog?.nome).filter(Boolean).join(", "));
  const issuePlace = resolveIssuePlace(item, company);
  const issueCity = issuePlace.city;
  const issueState = issuePlace.state;
  const serviceName = (catalog: BootstrapData["services"][number] | undefined, _service: ContratoTemplate["servicos"][number]) => cleanText(catalog?.nome || "Serviço técnico");
  const serviceText = (catalog: BootstrapData["services"][number] | undefined, _service: ContratoTemplate["servicos"][number]) => cleanText(catalog?.descricao || `Execução de ${catalog?.nome || "serviço técnico"}, conforme frequência e condições registradas.`);
  const effectiveLogoSrc = logoSrc || buildTenantLogoFallback(companyName, primaryColor);
  const paragraphClass = "mt-[7pt] text-justify leading-[1.3] [text-indent:7.5mm]";
  const listClass = "mt-[7pt] list-disc space-y-[4pt] pl-[14pt] leading-[1.24]";
  const tableClass = "mt-[8pt] w-full border-collapse text-[8.7pt] leading-[1.2]";

  const Header = ({ first = false }: { first?: boolean }) => (
    <header className="border-b pb-[9pt]" style={{ borderColor: primaryColor }}>
      <div className="grid grid-cols-[auto_1fr] items-center gap-[22mm]">
        <img src={effectiveLogoSrc} alt={`Logo ${companyName}`} className="h-[15mm] w-[44mm] object-contain object-left" />
        <div className="text-right">
          <p className="text-[9.5pt] font-semibold" style={{ color: darkColor }}>{documentLabel}</p>
          <p className="mt-[2pt] text-[8.5pt] font-medium text-slate-500">{first ? `${documentVersion} · ${documentDate}` : documentVersion}</p>
        </div>
      </div>
    </header>
  );

  const Footer = ({ page }: { page: number }) => (
    <footer className="mt-[10pt] flex h-[12mm] shrink-0 items-center justify-between border-t pt-[6pt] text-[8pt] font-medium text-slate-500" style={{ borderColor: "#d8dee8" }}>
      <span>{documentLabel} · {documentVersion}</span>
      <span>Página {page} de {totalPages}</span>
    </footer>
  );

  const SectionTitle = ({ number, title, compact = false }: { number: string; title: string; compact?: boolean }) => (
    <h2 className={`${compact ? "mb-[6pt] mt-[14pt] pb-[4pt]" : "mb-[8pt] mt-[18pt] pb-[5pt]"} flex items-end gap-[7pt] border-b text-[10.5pt] font-bold`} style={{ borderColor: "#d8dee8", color: darkColor }}>
      <span className="text-[12pt] font-bold" style={{ color: primaryColor }}>{number}</span>
      <span>{title}</span>
    </h2>
  );

  const SignatureBlock = () => (
    <section className="mt-[18pt] break-inside-avoid text-center text-[8.8pt]" style={{ pageBreakInside: "avoid" }}>
      <p className="mb-[16pt] text-center text-[8.8pt] text-slate-500">E, por estarem de acordo, as partes assinam o presente instrumento.</p>
      <div
        className="items-start"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: "18mm",
          breakInside: "avoid",
          pageBreakInside: "avoid",
        }}
      >
        <div className="min-w-0 break-inside-avoid" style={{ minHeight: "46mm", height: "46mm", breakInside: "avoid", pageBreakInside: "avoid" }}>
          <div className="box-border h-[15mm] border-b border-slate-700" />
          <div className="box-border h-[25mm] pt-[7pt]">
            <p className="mx-auto flex h-[10mm] max-w-[72mm] items-start justify-center break-words font-semibold leading-[1.18]">{companyName}</p>
            <p className="mt-[3pt] h-[4mm]">Responsável: {cleanText(representativeName)}</p>
            <p className="h-[4mm]">{cleanText(representativeRole)}</p>
          </div>
          <p className="mt-[4pt] text-slate-500">Assinatura e carimbo</p>
        </div>
        <div className="min-w-0 break-inside-avoid" style={{ minHeight: "46mm", height: "46mm", breakInside: "avoid", pageBreakInside: "avoid" }}>
          <div className="box-border h-[15mm] border-b border-slate-700" />
          <div className="box-border h-[25mm] pt-[7pt]">
            <p className="mx-auto flex h-[10mm] max-w-[72mm] items-start justify-center break-words font-semibold leading-[1.18]">{cleanText(client?.razaoSocial || "Contratante")}</p>
            <p className="mt-[3pt] h-[4mm]">Responsável: ____________________</p>
            <p className="h-[4mm]">Cargo: __________________________</p>
          </div>
          <p className="mt-[4pt] text-slate-500">Assinatura e carimbo</p>
        </div>
      </div>
    </section>
  );

  const ClosingSections = () => (
    <>
      <SectionTitle number="05" title="Condições comerciais" compact />
      <div className="grid grid-cols-2 gap-[10pt]">
        <div className="rounded-[7px] border border-slate-200 bg-slate-50/60 px-[9pt] py-[7pt]">
          <p className="font-semibold">Pagamento</p>
          <p className="mt-[3pt] leading-[1.25] text-slate-700">{cleanText(item.formaPagamento || "Conforme condição comercial pactuada.")}</p>
        </div>
        <div className="rounded-[7px] border border-slate-200 bg-slate-50/60 px-[9pt] py-[7pt]">
          <p className="font-semibold">Prazo, vigência e medição</p>
          <p className="mt-[3pt] leading-[1.25] text-slate-700">Prazo de pagamento: {item.prazoPagamentoDias || 30} dias após medição/aceite. Vigência: {item.vigenciaMeses || 12} meses.</p>
        </div>
      </div>

      <SectionTitle number="06" title="Local e periodicidade" compact />
      <ul className={listClass}>
        <li><strong>Local:</strong> {locations.join("; ") || "Conforme cadastro do cliente/contrato."}</li>
        <li><strong>Periodicidade:</strong> {Array.from(new Set(rows.map(({ service }) => service.frequencia).filter(Boolean))).join(", ") || "Conforme itens contratados."}</li>
      </ul>

      <SectionTitle number="07" title="Reajuste" compact />
      <p className={paragraphClass}>Os valores poderão ser reajustados conforme índice e regra comercial definidos no contrato, aditivo, proposta aceita ou parametrização vigente do tenant.</p>

      <SectionTitle number="08" title="Rescisão e disposições gerais" compact />
      <p className={paragraphClass}>A rescisão, substituição de escopo, aceite de medições e demais disposições seguirão as condições pactuadas entre as partes e os registros operacionais do sistema.</p>

      {item.observacoes ? <section className="mt-[14pt] rounded-[7px] px-[10pt] py-[8pt]" style={{ backgroundColor: softColor }}><h3 className="text-[9.5pt] font-semibold" style={{ color: darkColor }}>Observações contratuais</h3><p className="mt-[4pt] text-justify leading-[1.25] [text-indent:7.5mm]">{cleanText(item.observacoes)}</p></section> : null}

      <p className="mt-[12pt] text-right text-[9pt]">{issueCity}/{issueState}, {documentDate}.</p>
      <SignatureBlock />
    </>
  );

  return <div className="mx-auto w-[210mm] bg-white font-proposal text-[9.35pt] leading-[1.3] text-slate-950" lang="pt-BR">
    <section className="box-border flex h-[297mm] flex-col px-[18mm] py-[16mm]" style={{ breakAfter: "page", overflow: "hidden" }}>
      <div className="min-h-0 flex-1">
        <Header first />
        <div className="mx-auto mt-[12pt] max-w-[142mm] text-center">
          <h1 className="text-[19pt] font-bold uppercase leading-tight" style={{ color: darkColor }}>{title}</h1>
          {subject ? <p className="mx-auto mt-[6pt] max-w-[142mm] text-center text-[10.1pt] font-medium leading-[1.24] text-slate-600">{subject}</p> : null}
        </div>

        <SectionTitle number="01" title="Partes contratantes" />
        <section className="rounded-[8px] border border-slate-200 bg-white px-[11pt] py-[9pt]">
          <div className="grid gap-y-[7pt]">
            <div>
              <p className="text-[7.8pt] font-semibold uppercase tracking-[0.04em] text-slate-500">Contratada</p>
              <p className="mt-[1pt] text-[9pt] font-medium leading-[1.22] text-slate-950">{companyName}{companyDocument ? ` · CNPJ ${companyDocument}` : ""}</p>
              {company?.endereco ? <p className="mt-[1pt] text-[8.7pt] text-slate-600">{cleanText(company.endereco)}</p> : null}
              <p className="mt-[1pt] text-[8.7pt] text-slate-600">Representante: {cleanText(representativeName)}{representativeRole ? ` · ${cleanText(representativeRole)}` : ""}{contact ? ` · ${contact}` : ""}</p>
            </div>
            <div className="border-t border-slate-100 pt-[7pt]">
              <p className="text-[7.8pt] font-semibold uppercase tracking-[0.04em] text-slate-500">Contratante</p>
              <p className="mt-[1pt] text-[9pt] font-medium leading-[1.22] text-slate-950">{cleanText(client?.razaoSocial || "Cliente não informado")}{client?.cnpj ? ` · CNPJ/CPF ${cleanText(client.cnpj)}` : ""}</p>
              {address ? <p className="mt-[1pt] text-[8.7pt] text-slate-600">{address}</p> : null}
            </div>
          </div>
        </section>

        <section className="mt-[12pt] rounded-[8px] border border-slate-200 bg-white px-[11pt] py-[9pt]">
          <div className="grid grid-cols-2 gap-x-[16pt] gap-y-[7pt]">
            {[["Emissão", documentDate], ["Vigência", `${item.vigenciaMeses || 12} meses`], ["Valor total", money(total)], ["Pagamento", cleanText(item.formaPagamento || "-")], ["Local", locations[0] || "Conforme cadastro do cliente/contrato."], ["Periodicidade", Array.from(new Set(rows.map(({ service }) => service.frequencia).filter(Boolean))).join(", ") || "Conforme itens contratados."]].map(([label, value]) => (
              <div key={label}>
                <p className="text-[7.8pt] font-semibold uppercase tracking-[0.04em] text-slate-500">{label}</p>
                <p className="mt-[1pt] text-[9pt] font-medium leading-[1.18] text-slate-950">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <SectionTitle number="02" title="Objeto do contrato" />
        <p className={paragraphClass}>O presente instrumento estabelece as condições para prestação dos serviços técnicos listados neste documento, incluindo escopo, frequência, valores, vigência e responsabilidades operacionais vinculadas ao contrato.</p>

        <SectionTitle number="03" title="Escopo técnico e responsabilidades" />
        <p className={paragraphClass}>Os serviços serão executados conforme catálogo técnico, POPs, checklist aplicável, requisitos do cliente e registros de OS. Cada item contratado poderá alimentar agendamentos, ordens de serviço, certificados e medições.</p>
        <div className="mt-[10pt] grid grid-cols-2 gap-[9pt]">
          <div className="rounded-[7px] border border-slate-200 bg-slate-50/60 px-[9pt] py-[7pt]">
            <h3 className="text-[10pt] font-semibold" style={{ color: darkColor }}>Contratada</h3>
            <ul className="mt-[6pt] list-disc space-y-[3pt] pl-[13pt] text-[8.9pt] leading-[1.18]"><li>Executar os serviços contratados com equipe qualificada.</li><li>Registrar evidências, pendências e recomendações técnicas.</li><li>Emitir documentos aplicáveis e manter rastreabilidade operacional.</li></ul>
          </div>
          <div className="rounded-[7px] border border-slate-200 bg-slate-50/60 px-[9pt] py-[7pt]">
            <h3 className="text-[10pt] font-semibold" style={{ color: darkColor }}>Contratante</h3>
            <ul className="mt-[6pt] list-disc space-y-[3pt] pl-[13pt] text-[8.9pt] leading-[1.18]"><li>Disponibilizar acesso aos locais e informar regras internas.</li><li>Acompanhar a execução quando necessário.</li><li>Validar medições conforme contrato e registros operacionais.</li></ul>
          </div>
        </div>
      </div>
      <Footer page={1} />
    </section>

    <section className="box-border flex h-[297mm] flex-col px-[18mm] py-[16mm]" style={{ breakAfter: needsClosingPage ? "page" : undefined, overflow: "hidden" }}>
      <div className="min-h-0 flex-1">
        <Header />
        <SectionTitle number="04" title="Serviços contratados" compact />
        <table className={tableClass}>
          <thead><tr style={{ backgroundColor: darkColor }} className="text-white"><th className="w-[10mm] px-[7pt] py-[8pt] text-center font-semibold">Item</th><th className="px-[7pt] py-[8pt] text-left font-semibold">Serviço/produto</th><th className="w-[18mm] px-[7pt] py-[8pt] text-center font-semibold">Unid.</th><th className="w-[15mm] px-[7pt] py-[8pt] text-center font-semibold">Qtd.</th><th className="w-[25mm] px-[7pt] py-[8pt] text-right font-semibold">Unit.</th><th className="w-[25mm] px-[7pt] py-[8pt] text-right font-semibold">Total</th></tr></thead>
          <tbody>{rows.map(({ service, catalog, index, total: lineTotal }) => <tr key={`${service.servicoId}-contract-${index}`} className="break-inside-avoid border-b border-slate-200"><td className="px-[7pt] py-[8pt] text-center">{String(index + 1).padStart(2, "0")}</td><td className="px-[7pt] py-[8pt]"><p className="font-semibold">{serviceName(catalog, service)}</p><p className="mt-[2pt] text-[8pt] text-slate-500">{serviceText(catalog, service)}</p></td><td className="px-[7pt] py-[8pt] text-center">{cleanText(catalog?.unidade || "un.")}</td><td className="px-[7pt] py-[8pt] text-center">{service.quantidade}</td><td className="px-[7pt] py-[8pt] text-right">{money(Number(service.valorUnitario || 0))}</td><td className="px-[7pt] py-[8pt] text-right font-semibold">{money(lineTotal)}</td></tr>)}</tbody>
          <tfoot><tr><td className="px-[8pt] py-[8pt] text-right text-[9.5pt] font-semibold" colSpan={5} style={{ backgroundColor: softColor }}>Total geral</td><td className="px-[8pt] py-[8pt] text-right text-[11pt] font-bold" style={{ backgroundColor: softColor, color: primaryColor }}>{money(total)}</td></tr></tfoot>
        </table>

        {!needsClosingPage ? <ClosingSections /> : null}
      </div>
      <Footer page={2} />
    </section>

    {needsClosingPage ? (
      <section className="box-border flex h-[297mm] flex-col px-[18mm] py-[16mm]" style={{ overflow: "hidden" }}>
        <div className="min-h-0 flex-1">
          <Header />
          <ClosingSections />
        </div>
        <Footer page={3} />
      </section>
    ) : null}
  </div>;
}

export default function Contratos() {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<ContratoTemplate, "id">>(emptyTemplate);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [proposalAssistDraft, setProposalAssistDraft] = useState<ProposalAssistDraft | null>(null);
  const [analyzingProposal, setAnalyzingProposal] = useState(false);
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

  useEffect(() => {
    if (!pdfItem || !printRef.current) return;
    const walker = document.createTreeWalker(printRef.current, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let node = walker.nextNode();
    while (node) {
      textNodes.push(node as Text);
      node = walker.nextNode();
    }
    textNodes.forEach((textNode) => {
      textNode.nodeValue = repairMojibake(textNode.nodeValue || "");
    });
  }, [pdfItem, data]);

  const templates = useMemo(() => data?.contractTemplates ?? [], [data?.contractTemplates]);
  const clients = useMemo(() => data?.clients ?? [], [data?.clients]);
  const services = useMemo(() => data?.services ?? [], [data?.services]);
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

  function openNew(tipo: "proposta" | "contrato" | "minuta" = "proposta") {
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
    setSourceFile(null);
    setProposalAssistDraft(null);
    setDialogOpen(true);
  }

  function openEdit(item: ContratoTemplate) {
    setEditId(item.id);
    const { id, ...rest } = item;
    setForm({ ...rest, servicos: rest.servicos.length > 0 ? rest.servicos : [{ ...emptyServico }] });
    setSourceFile(null);
    setProposalAssistDraft(null);
    setDialogOpen(true);
  }

  async function handleAnalyzeProposalPdf() {
    if (!sourceFile) {
      toast.error("Selecione um PDF de referência antes de analisar.");
      return;
    }
    setAnalyzingProposal(true);
    try {
      const contentBase64 = await readFileAsDataUrl(sourceFile);
      const result = await generateProposalFromPdf({ fileName: sourceFile.name, mimeType: sourceFile.type || "application/pdf", contentBase64 });
      setProposalAssistDraft(result.draft);
      setForm((previous) => ({
        ...previous,
        clienteId: result.draft.clienteId || previous.clienteId,
        titulo: result.draft.titulo || previous.titulo,
        objeto: result.draft.objeto || previous.objeto,
        modalidade: result.draft.modalidade || previous.modalidade,
        validadeDias: result.draft.validadeDias || previous.validadeDias,
        locaisExecucao: result.draft.locaisExecucao.length ? result.draft.locaisExecucao : previous.locaisExecucao,
        escopoTecnico: result.draft.escopoTecnico.join("\n") || previous.escopoTecnico,
        condicoesComerciais: result.draft.condicoesComerciais.join("\n") || previous.condicoesComerciais,
        observacoes: result.draft.observacoes.join("\n") || previous.observacoes,
        servicos: result.draft.servicos.length ? result.draft.servicos.map((item) => ({
          servicoId: item.servicoId,
          quantidade: item.quantidade,
          valorUnitario: item.valorUnitario,
          frequencia: item.frequencia,
          enderecoAtividade: item.enderecoAtividade,
        })) : previous.servicos,
      }));
      toast.success("Rascunho preenchido. Revise os campos pendentes antes de salvar.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível analisar o PDF.");
    } finally {
      setAnalyzingProposal(false);
    }
  }

  async function handleSave() {
    if (!form.numero || !form.clienteId) {
      toast.error("Número e cliente são obrigatórios");
      return;
    }

    if (form.tipo === "proposta" && form.servicos.some((servico) => !servico.servicoId)) {
      toast.error("Selecione um serviço do catálogo em todas as linhas antes de salvar a proposta.");
      return;
    }

    setSaving(true);
    try {
      const result = await saveContractTemplate({ ...form, id: editId ?? undefined });
      if (["minuta", "proposta"].includes(form.tipo) && sourceFile && result.id) {
        const contentBase64 = await readFileAsDataUrl(sourceFile);
        const uploaded = await uploadContractTemplateSourceFile(result.id, {
          fileName: sourceFile.name,
          mimeType: sourceFile.type || (form.tipo === "proposta" ? "application/pdf" : "application/octet-stream"),
          contentBase64,
        });
        toast.success(`Arquivo original anexado. Hash ${uploaded.attachment.hashSha256.slice(0, 12)}...`);
      }
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
      toast.success(`Contrato ${result.numero} gerado a partir da minuta ${item.numero}.${synced}`);
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao gerar contrato");
    }
  }

  async function handleGenerateMinuta(item: ContratoTemplate) {
    try {
      const result = await generateMinutaFromProposal(item.id);
      toast.success(`Minuta ${result.numero} gerada a partir da proposta ${item.numero}. Revise e aprove a minuta antes do contrato final.`);
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao gerar minuta");
    }
  }

  async function handleProposalStatus(item: ContratoTemplate, status: ContratoTemplate["status"]) {
    try {
      const result = await saveContractTemplate({ ...item, status });
      const label = statusLabels[status]?.toLowerCase() || status;
      const documentType = item.tipo === "minuta" ? "Minuta" : item.tipo === "contrato" ? "Contrato" : "Proposta";
      const synced = result.operationalSync && !result.operationalSync.skipped
        ? ` Operacional: ${result.operationalSync.created} criado(s), ${result.operationalSync.updated} atualizado(s).`
        : "";
      toast.success(`${documentType} ${item.numero} marcada como ${label}.${synced}`);
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar status da proposta");
    }
  }

  async function openPdf(item: ContratoTemplate) {
    try {
      const result = await issueContractTemplateDocument(item.id);
      toast.success(`Snapshot histórico salvo (${result.attachment.hashSha256?.slice(0, 12)}...).`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível versionar o documento.");
      return;
    }
    setPdfItem(item);
    const previousTitle = document.title;
    const printTitle = item.tipo === "proposta" ? `Proposta ${item.numero}` : `${item.tipo === "minuta" ? "Minuta" : "Contrato"} ${item.numero}`;
    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };
    document.title = printTitle;
    window.addEventListener("afterprint", restoreTitle, { once: true });
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        restoreTitle();
      }, 5000);
    }, 300);
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
  const rawDocumentDate = pdfItem?.dataCriacao
    ? new Date(pdfItem.dataCriacao.includes("T") ? pdfItem.dataCriacao : `${pdfItem.dataCriacao}T12:00:00`)
    : new Date();
  const safeDocumentDate = Number.isNaN(rawDocumentDate.getTime()) ? new Date() : rawDocumentDate;
  const documentDate = safeDocumentDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const commercialPrimary = companyConfig?.corPrimaria || "#0f7f5c";
  const representativeName = companyConfig?.responsavelExecucao || companyConfig?.responsavelTecnico || "Responsável autorizado";
  const representativeRole = companyConfig?.cargoResponsavel || (pdfItem?.tipo !== "proposta" ? "Representante da contratada" : "Responsável pela proposta");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileSignature className="h-6 w-6 text-primary" />
            Contratos e Propostas
          </h1>
          <p className="text-muted-foreground text-sm">Fluxo comercial integrado: proposta aprovada, minuta revisada, contrato vigente e operação liberada por item contratado.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openNew("minuta")}><ClipboardCheck className="h-4 w-4 mr-2" />Minuta do cliente</Button>
          <Button variant="outline" onClick={() => openNew("contrato")}><FileSignature className="h-4 w-4 mr-2" />Contrato direto</Button>
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
            Caminho recomendado: envie a proposta, marque como aprovada após aceite, gere a minuta, aprove a minuta e só então gere o contrato final que libera o saldo operacional.
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
                  <TableHead>Prazo</TableHead>
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
                        <Badge variant={item.tipo === "contrato" ? "default" : item.tipo === "minuta" ? "secondary" : "outline"}>
                          {item.tipo === "contrato" ? "Contrato" : item.tipo === "minuta" ? "Minuta" : "Proposta"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{client?.razaoSocial || "â⬝"}</p>
                        <p className="text-xs text-muted-foreground">{client?.cnpj}</p>
                      </TableCell>
                      <TableCell className="text-xs">{item.servicos.length} serviço(s)</TableCell>
                      <TableCell className="font-mono text-sm font-bold">
                        R$ {calcTotal(item.servicos).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.tipo === "proposta" ? `${item.validadeDias || 30} dias` : `${item.vigenciaMeses} meses`}
                      </TableCell>
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
                          {item.tipo === "proposta" && item.status === "rascunho" && (
                            <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => handleProposalStatus(item, "enviado")}>
                              <Send className="h-3 w-3" />
                              Enviar
                            </Button>
                          )}
                          {item.tipo === "proposta" && (item.status === "enviado" || item.status === "em_negociacao") && (
                            <>
                              <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => handleProposalStatus(item, "aprovado")}>
                                <CheckCircle2 className="h-3 w-3" />
                                Aprovar
                              </Button>
                              <Button size="sm" variant="ghost" className="text-xs text-destructive hover:text-destructive" onClick={() => handleProposalStatus(item, "recusado")}>
                                Recusar
                              </Button>
                            </>
                          )}
                          {item.tipo === "proposta" && item.status === "aprovado" && (
                            <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => handleGenerateMinuta(item)}>
                              <ClipboardCheck className="h-3 w-3" />
                              Gerar minuta
                            </Button>
                          )}
                          {item.tipo === "minuta" && ["rascunho", "enviado", "em_negociacao", "vigente"].includes(item.status) && (
                            <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => handleProposalStatus(item, "aprovado")}>
                              <CheckCircle2 className="h-3 w-3" />
                              Aprovar minuta
                            </Button>
                          )}
                          {item.tipo === "minuta" && ["aprovado", "vigente"].includes(item.status) && (
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
          {pdfItem.tipo === "proposta" ? (
              <ProposalReferencePrint
                item={pdfItem}
                client={pdfClient}
                services={services}
                company={companyConfig}
                logoSrc={documentLogoFromCompany(companyConfig)}
                documentDate={documentDate}
                primaryColor={commercialPrimary}
                representativeName={representativeName}
                representativeRole={representativeRole}
              />
            ) : (
              <>
                <ContractReferencePrint
                  item={pdfItem}
                  client={pdfClient}
                  services={services}
                  company={companyConfig}
                  logoSrc={documentLogoFromCompany(companyConfig)}
                  documentDate={documentDate}
                  primaryColor={commercialPrimary}
                  representativeName={representativeName}
                  representativeRole={representativeRole}
                />
              </>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar" : form.tipo === "contrato" ? "Novo contrato do cliente" : form.tipo === "minuta" ? "Nova minuta" : "Nova proposta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-2xl border bg-muted/40 p-3 text-sm text-muted-foreground">
              {form.tipo === "contrato"
                ? "Use este caminho quando o cliente já aprovou o fornecimento por um contrato próprio. Ao salvar como vigente, os itens ficam disponíveis para agenda e controle de saldo operacional."
                : form.tipo === "minuta"
                  ? "Use este caminho para revisar a minuta antes do contrato final. Apenas a minuta aprovada deve gerar o contrato vigente."
                  : "Use este caminho para enviar uma proposta. Depois do aceite, altere o status para aprovada e gere a minuta antes do contrato final."}
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
                    const tipo = value as "contrato" | "proposta" | "minuta";
                    setForm({ ...form, tipo, status: tipo === "contrato" && form.status === "rascunho" ? "vigente" : form.status });
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contrato">Contrato</SelectItem>
                    <SelectItem value="minuta">Minuta / modelo do cliente</SelectItem>
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

            {form.tipo === "minuta" || form.tipo === "proposta" ? (
              <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-4">
                <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><p className="text-sm font-semibold">PDF de referência</p></div>
                 <p className="mt-1 text-xs text-muted-foreground">Anexe um PDF de referência para preencher a proposta a partir dos cadastros do sistema. O arquivo será usado como rascunho e ficará disponível junto ao cadastro após a confirmação.</p>
                <Input
                  className="mt-3"
                  type="file"
                  accept={form.tipo === "proposta" ? "application/pdf" : "application/pdf,.doc,.docx,.odt,image/png,image/jpeg"}
                  onChange={(event) => setSourceFile(event.target.files?.[0] || null)}
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {sourceFile ? <p className="text-xs text-muted-foreground">Selecionado: {sourceFile.name}</p> : null}
                  {form.tipo === "proposta" ? (
                    <Button type="button" size="sm" variant="outline" onClick={handleAnalyzeProposalPdf} disabled={!sourceFile || analyzingProposal}>
                      <FileUp className="mr-2 h-4 w-4" />
                      {analyzingProposal ? "Analisando PDF..." : "Preencher proposta com PDF"}
                    </Button>
                  ) : null}
                </div>
                {proposalAssistDraft && form.tipo === "proposta" ? (
                  <div className="mt-3 rounded-xl border bg-background/80 p-3 text-xs">
                    <p className="font-semibold">Prévia da leitura</p>
                    <p className="mt-1 text-muted-foreground">Cliente: {proposalAssistDraft.clienteNome || "não identificado"} · Serviços reconhecidos: {proposalAssistDraft.servicos.length} · Confiança: {proposalAssistDraft.confianca}</p>
                    {proposalAssistDraft.camposPendentes.length ? <p className="mt-2 text-amber-700">Revisar: {proposalAssistDraft.camposPendentes.join(", ")}.</p> : null}
                    {proposalAssistDraft.avisos.length ? <p className="mt-1 text-amber-700">Atenção: {proposalAssistDraft.avisos.join(" ")}</p> : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {form.tipo === "proposta" ? (
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="mb-3 text-sm font-semibold">Dados técnicos da proposta</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Modelo documental (título automático)</Label>
                    <Input
                      placeholder="Ex.: Serviço mensal de roçagem, aplicação de herbicida e jardinagem semanal"
                      value={form.titulo || "Proposta Técnica e Comercial"}
                      readOnly
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Objeto composto pelo catálogo</Label>
                    <Textarea
                      placeholder="Descreva o objeto comercial/técnico da proposta..."
                      value={form.objeto || "Será composto a partir dos serviços selecionados no catálogo."}
                      readOnly
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Validade da proposta (dias)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.validadeDias || 30}
                      onChange={(event) => setForm({ ...form, validadeDias: Number(event.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Modalidade</Label>
                    <Input
                      placeholder="Ex.: contrato mensal, serviço avulso, medição por unidade executada"
                      value={form.modalidade || ""}
                      onChange={(event) => setForm({ ...form, modalidade: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Unidades / locais contemplados</Label>
                    <Textarea
                      placeholder="Informe um local por linha..."
                      value={joinLines(form.locaisExecucao)}
                      onChange={(event) => setForm({ ...form, locaisExecucao: splitLines(event.target.value) })}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Escopo técnico proposto</Label>
                    <Textarea
                      placeholder="Informe um item de escopo por linha..."
                      value={form.escopoTecnico || ""}
                      onChange={(event) => setForm({ ...form, escopoTecnico: event.target.value })}
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Condições comerciais complementares</Label>
                    <Textarea
                      placeholder="Informe uma condição por linha..."
                      value={form.condicoesComerciais || ""}
                      onChange={(event) => setForm({ ...form, condicoesComerciais: event.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{form.tipo === "proposta" ? "Vigência prevista do contrato (meses)" : "Vigência (meses)"}</Label>
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
                  <div className="hidden grid gap-3 md:grid-cols-[1fr_160px]" aria-hidden="true">
                    <div className="space-y-1">
                      <Label className="text-xs">Descrição comercial da linha</Label>
                      <Input
                        placeholder="Ex.: Aplicação mensal controlada de herbicida"
                        value={servico.descricaoComercial || ""}
                        onChange={(event) => updateServico(index, "descricaoComercial", event.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Unidade comercial</Label>
                      <Input
                        placeholder="Ex.: mês, visita, m²"
                        value={servico.unidadeComercial || ""}
                        onChange={(event) => updateServico(index, "unidadeComercial", event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Endereço da atividade</Label>
                    <Input
                      placeholder="Ex.: Unidade, área ou endereço onde o serviço será realizado"
                      value={servico.enderecoAtividade || ""}
                      onChange={(event) => updateServico(index, "enderecoAtividade", event.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">A unidade e o nome do serviço vêm do catálogo cadastrado.</p>
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

