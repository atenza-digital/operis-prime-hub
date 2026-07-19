import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { AlertCircle, Ban, CalendarDays, CheckCircle2, Clock3, Printer, Receipt, Search, Send, WalletCards, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { cancelMeasurement, generateMeasurement, getBootstrap, updateMeasurementFinancial, type BootstrapData, type MedicaoApp, type MedicaoFinanceiroStatus } from "@/lib/api";

function fmtDate(date: string) {
  if (!date) return "-";
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
}

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const financeiroStatusOrder: MedicaoFinanceiroStatus[] = [
  "em_conferencia",
  "emitida",
  "enviada_ao_cliente",
  "aceita",
  "aguardando_nf",
  "nf_registrada",
  "nf_enviada",
  "aguardando_pagamento",
  "paga",
  "pago_no_erp",
  "pendente_cliente",
];

const financeiroStatusMeta: Record<MedicaoFinanceiroStatus, { label: string; description: string; tone: string; icon: typeof Clock3 }> = {
  em_conferencia: {
    label: "Em conferência",
    description: "Medição gerada e aguardando validação interna.",
    tone: "border-slate-200 bg-slate-50 text-slate-700",
    icon: Clock3,
  },
  emitida: {
    label: "Emitida",
    description: "Documento emitido e pronto para envio ou aceite.",
    tone: "border-cyan-200 bg-cyan-50 text-cyan-800",
    icon: Receipt,
  },
  enviada_ao_cliente: {
    label: "Enviada ao cliente",
    description: "Medição enviada para conferência do cliente.",
    tone: "border-blue-200 bg-blue-50 text-blue-800",
    icon: Send,
  },
  aceita: {
    label: "Aceita",
    description: "Cliente aceitou a medição para continuidade do faturamento externo.",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: CheckCircle2,
  },
  aguardando_nf: {
    label: "Aguardando NF",
    description: "Liberada para faturamento, ainda sem nota enviada.",
    tone: "border-amber-200 bg-amber-50 text-amber-800",
    icon: Receipt,
  },
  nf_registrada: {
    label: "NF registrada",
    description: "Dados da NF foram registrados para acompanhamento.",
    tone: "border-sky-200 bg-sky-50 text-sky-800",
    icon: Receipt,
  },
  nf_enviada: {
    label: "NF enviada",
    description: "Nota fiscal enviada ao cliente.",
    tone: "border-blue-200 bg-blue-50 text-blue-800",
    icon: Send,
  },
  aguardando_pagamento: {
    label: "Aguardando pagamento",
    description: "Cliente recebeu a NF e está dentro do acompanhamento.",
    tone: "border-indigo-200 bg-indigo-50 text-indigo-800",
    icon: WalletCards,
  },
  pago_no_erp: {
    label: "Pago no ERP",
    description: "Pagamento confirmado/baixado no ERP.",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: CheckCircle2,
  },
  paga: {
    label: "Paga",
    description: "Pagamento confirmado no acompanhamento da medição.",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: CheckCircle2,
  },
  pendente_cliente: {
    label: "Pendente cliente",
    description: "Aguardando aceite, retorno ou correção solicitada.",
    tone: "border-rose-200 bg-rose-50 text-rose-800",
    icon: AlertCircle,
  },
  cancelada: {
    label: "Cancelada",
    description: "Medição cancelada e fora do acompanhamento.",
    tone: "border-zinc-200 bg-zinc-50 text-zinc-600",
    icon: Ban,
  },
  substituida: {
    label: "Substituída",
    description: "Medição preservada como histórico e substituída por nova revisão.",
    tone: "border-zinc-200 bg-zinc-50 text-zinc-600",
    icon: Ban,
  },
};

const measurementFlowSteps = [
  {
    title: "1. Selecionar período",
    description: "Escolha cliente e intervalo. A busca considera somente OS encerradas.",
  },
  {
    title: "2. Conferir OS",
    description: "Revise as OS disponíveis antes de consolidar. OS já medida não entra novamente.",
  },
  {
    title: "3. Gerar medição",
    description: "O sistema grava a medição, baixa os itens do contrato e libera o PDF.",
  },
  {
    title: "4. Enviar NF",
    description: "Informe número e data de envio da NF quando o faturamento externo for feito.",
  },
  {
    title: "5. Baixar no ERP",
    description: "Acompanhe cobrança e marque a baixa quando o pagamento for confirmado no ERP.",
  },
];

type FinancialDraft = {
  financeiroStatus: MedicaoFinanceiroStatus;
  nfNumero: string;
  nfEnviadaEm: string;
  pagamentoPrevistoEm: string;
  pagoNoErpEm: string;
  financeiroObservacao: string;
};

function financialStatusOf(measurement: MedicaoApp): MedicaoFinanceiroStatus {
  if (measurement.status === "cancelada") return "cancelada";
  return measurement.financeiroStatus || "em_conferencia";
}

function financialDraftFrom(measurement: MedicaoApp): FinancialDraft {
  const currentStatus = financialStatusOf(measurement);
  return {
    financeiroStatus: currentStatus === "cancelada" || currentStatus === "substituida" ? "em_conferencia" : currentStatus,
    nfNumero: measurement.nfNumero || "",
    nfEnviadaEm: measurement.nfEnviadaEm || "",
    pagamentoPrevistoEm: measurement.pagamentoPrevistoEm || "",
    pagoNoErpEm: measurement.pagoNoErpEm || "",
    financeiroObservacao: measurement.financeiroObservacao || "",
  };
}

function formatQuantityUnit(quantity: number, unit?: string | null) {
  const value = Number(quantity || 0);
  const normalized = normalizeUnit(unit);
  const unitLabel = unitLabelFor(value, normalized || textFrom(unit));

  if (!normalized) return value.toLocaleString("pt-BR");
  return `${value.toLocaleString("pt-BR")} ${unitLabel}`;
}

function normalizeUnit(unit?: string | null) {
  return textFrom(unit).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\.$/, "");
}

function canonicalUnitKey(unit?: string | null) {
  const normalized = normalizeUnit(unit);
  const aliases: Record<string, string> = {
    itens: "item",
    visitas: "visita",
    servicos: "servico",
    pontos: "ponto",
    horas: "hora",
    unidades: "unidade",
    equipamentos: "equipamento",
    limpezas: "limpeza",
    unid: "un",
    "m²": "m2",
    "mÂ²": "m2",
  };
  return aliases[normalized] || normalized;
}

function unitLabelFor(quantity: number, unit?: string | null) {
  const normalized = canonicalUnitKey(unit);
  const singular = Math.abs(Number(quantity || 0)) === 1;
  const labels: Record<string, { singular: string; plural: string }> = {
    item: { singular: "item", plural: "itens" },
    itens: { singular: "item", plural: "itens" },
    visita: { singular: "visita", plural: "visitas" },
    visitas: { singular: "visita", plural: "visitas" },
    servico: { singular: "serviço", plural: "serviços" },
    servicos: { singular: "serviço", plural: "serviços" },
    ponto: { singular: "ponto", plural: "pontos" },
    pontos: { singular: "ponto", plural: "pontos" },
    hora: { singular: "hora", plural: "horas" },
    horas: { singular: "hora", plural: "horas" },
    unidade: { singular: "unidade", plural: "unidades" },
    unidades: { singular: "unidade", plural: "unidades" },
    equipamento: { singular: "equipamento", plural: "equipamentos" },
    equipamentos: { singular: "equipamento", plural: "equipamentos" },
    limpeza: { singular: "limpeza", plural: "limpezas" },
    limpezas: { singular: "limpeza", plural: "limpezas" },
    un: { singular: "un.", plural: "un." },
    unid: { singular: "un.", plural: "un." },
    m2: { singular: "m²", plural: "m²" },
    "m²": { singular: "m²", plural: "m²" },
  };
  const label = labels[normalized];
  if (label) return singular ? label.singular : label.plural;
  const fallback = textFrom(unit);
  if (!fallback) return "";
  if (singular || fallback.endsWith("s")) return fallback;
  return `${fallback}s`;
}

function pluralizeCount(count: number, singular: string, plural: string) {
  return `${count.toLocaleString("pt-BR")} ${Math.abs(count) === 1 ? singular : plural}`;
}

function measurementUnitSummary(items: MedicaoApp["itens"]) {
  const totals = new Map<string, number>();
  for (const item of items) {
    const key = canonicalUnitKey(item.unidade) || "item";
    totals.set(key, (totals.get(key) || 0) + Number(item.quantidade || 0));
  }
  return [...totals.entries()]
    .map(([unit, quantity]) => `${quantity.toLocaleString("pt-BR")} ${unitLabelFor(quantity, unit)}`)
    .join(" • ");
}

function measurementSnapshotValue(snapshot: Record<string, unknown>, key: string) {
  return typeof snapshot === "object" && snapshot ? snapshot[key] : null;
}

function measurementPartialLabel(measurement: MedicaoApp) {
  const snapshot = measurement.snapshotDados ?? {};
  const classification = textFrom(measurementSnapshotValue(snapshot, "classificacao"));
  const partialUntil = textFrom(measurementSnapshotValue(snapshot, "parcialAte"));
  if (classification === "parcial" && partialUntil) return `Parcial até ${fmtDate(partialUntil)}`;
  return null;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] || "E"}${parts[1]?.[0] || ""}`.toUpperCase();
}

function textFrom(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function sanitizeHexColor(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const color = value.trim();
  return /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(color) ? color : fallback;
}

function companyDocumentConfig(company?: BootstrapData["companyConfig"] | null) {
  const config = company?.certificadoConfig;
  return config && typeof config === "object" ? (config as Record<string, unknown>) : {};
}

function companyDocumentLogo(company?: BootstrapData["companyConfig"] | null) {
  const config = companyDocumentConfig(company);
  return textFrom(config.documentLogoLightUrl) || textFrom(config.logoPrincipalUrl) || textFrom(company?.logoUrl);
}

function parseCityStateFromAddress(address?: string | null) {
  const text = textFrom(address);
  const stateMatch = text.match(/(?:-|\/)\s*([A-Z]{2})\b/);
  const state = stateMatch?.[1] || "";
  const city = stateMatch?.index !== undefined
    ? text
        .slice(0, stateMatch.index)
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .at(-1) || ""
    : "";
  return { city, state };
}

function formatLongDateBr(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone }).format(date);
}

function measurementIssuePlaceDate(measurement: MedicaoApp, company?: BootstrapData["companyConfig"] | null) {
  const snapshot = measurement.snapshotDados ?? {};
  const config = companyDocumentConfig(company);
  const parsedAddress = parseCityStateFromAddress(company?.endereco);
  const timeZone = textFrom((snapshot as Record<string, unknown>).timezone) || textFrom(config.timezone) || "America/Fortaleza";
  const city =
    textFrom((snapshot as Record<string, unknown>).issueCity) ||
    textFrom(config.issueCity) ||
    textFrom(config.cidadeDocumental) ||
    parsedAddress.city;
  const state =
    textFrom((snapshot as Record<string, unknown>).issueState) ||
    textFrom(config.issueState) ||
    textFrom(config.ufDocumental) ||
    parsedAddress.state;
  const issuedAtRaw =
    textFrom((snapshot as Record<string, unknown>).issuedAt) ||
    textFrom((snapshot as Record<string, unknown>).acceptedAt) ||
    measurement.criadoEm;
  const issuedAt = new Date(issuedAtRaw || Date.now());
  if (!city || !state || Number.isNaN(issuedAt.getTime())) return "";
  return `${city} - ${state}, ${formatLongDateBr(issuedAt, timeZone)}.`;
}

function MeasurementPrint({ measurement, data }: { measurement: MedicaoApp; data: BootstrapData | null }) {
  const company = data?.companyConfig;
  const today = new Date(measurement.criadoEm || Date.now());
  const issueDate = today.toLocaleDateString("pt-BR");
  const periodLabel = `${fmtDate(measurement.periodoInicio)} a ${fmtDate(measurement.periodoFim)}`;
  const contractIds = [...new Set(measurement.itens.map((item) => item.contratoId).filter(Boolean))];
  const unitSummary = measurementUnitSummary(measurement.itens);
  const trackingCode = `${measurement.id}-${measurement.numero}`.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24).toUpperCase();
  const companyName = company?.razaoSocial || company?.nomeFantasia || "Empresa emissora";
  const companyCnpj = company?.cnpj || "-";
  const logoSrc = companyDocumentLogo(company);

  return (
    <div className="document-print-root measurement-print-root bg-[#f1f5f9] p-0 text-slate-950 print:m-0 print:p-0">
      <section className="relative mx-auto flex min-h-[210mm] w-[297mm] overflow-hidden bg-[#f8fafc] font-document shadow-2xl print:shadow-none">
        <div className="absolute inset-y-0 left-0 w-[10mm] bg-[#334155]" />
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#475569]" />
        <div className="absolute -right-10 top-24 h-28 w-28 rounded-full border-[18px] border-[#cbd5e1]/35" />
        <div className="absolute bottom-0 left-0 h-28 w-full bg-gradient-to-r from-[#1f2937] via-[#334155] to-[#cbd5e1] opacity-95" />

        <div className="relative z-10 flex w-full flex-col p-[12mm] pl-[18mm]">
          <div className="grid grid-cols-[1fr_1.2fr_0.85fr] gap-5">
            <div className="rounded-3xl border border-white/70 bg-white/95 p-4 shadow-sm">
              {logoSrc ? (
                <img src={logoSrc} alt={companyName} className="h-14 w-48 object-contain object-left" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-lg font-black text-slate-700">
                  {getInitials(companyName)}
                </div>
              )}
              <div className="mt-4 space-y-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                <p>Contratada</p>
                <p className="text-[11px] font-black normal-case tracking-normal text-slate-950">{companyName}</p>
                <p className="font-bold tracking-normal text-slate-700">CNPJ {companyCnpj}</p>
                {company?.endereco ? <p className="pt-2 normal-case leading-relaxed tracking-normal text-slate-600">{company.endereco}</p> : null}
                {(company?.responsavelExecucao || company?.responsavelTecnico) ? (
                  <p className="pt-2 normal-case tracking-normal text-slate-600">
                    Resp.: {company.responsavelExecucao || company.responsavelTecnico}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl bg-[#1f2937] p-5 text-white shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-300">Medição operacional</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight">{measurement.numero}</h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-emerald-50">
                Consolidação dos serviços executados no período, com rastreabilidade por OS, contrato e cliente.
              </p>
              <div className="mt-5 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-emerald-100">Período</p>
                  <p className="mt-1 font-bold">{periodLabel}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-emerald-100">Status</p>
                  <p className="mt-1 font-bold uppercase">{measurement.status}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-emerald-100">Emissão</p>
                  <p className="mt-1 font-bold">{issueDate}</p>
                </div>
              </div>
            </div>

            <aside className="rounded-3xl border border-[#cbd5e1] bg-white p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#334155]">Total a medir</p>
              <p className="mt-3 text-4xl font-black tracking-tight text-[#1f2937]">{money(measurement.total)}</p>
              <div className="mt-5 space-y-2 text-xs text-slate-600">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                  <span>OS consolidadas</span>
                  <strong className="text-slate-950">{measurement.itens.length}</strong>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                  <span>Itens medidos</span>
                  <strong className="text-slate-950">{measurement.itens.length}</strong>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                  <span>Contrato(s)</span>
                  <strong className="text-slate-950">{contractIds.join(", ") || "-"}</strong>
                </div>
                {unitSummary ? (
                  <div className="rounded-2xl bg-slate-50 px-3 py-2 font-semibold text-slate-700">
                    {unitSummary}
                  </div>
                ) : null}
              </div>
            </aside>
          </div>

          <main className="mt-5 grid flex-1 grid-cols-[0.72fr_1.28fr] gap-5">
            <section className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#334155]">Cliente / contratante</p>
                <h2 className="mt-3 text-2xl font-black leading-tight text-slate-950">{measurement.clienteNome}</h2>
                <dl className="mt-4 space-y-3 text-xs">
                  <div>
                    <dt className="font-bold uppercase tracking-[0.16em] text-slate-400">CNPJ</dt>
                    <dd className="mt-1 font-semibold text-slate-800">{measurement.clienteCnpj || "-"}</dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase tracking-[0.16em] text-slate-400">Endereço</dt>
                    <dd className="mt-1 leading-relaxed text-slate-700">{measurement.clienteEndereco || "-"}</dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase tracking-[0.16em] text-slate-400">Entrega / financeiro</dt>
                    <dd className="mt-1 leading-relaxed text-slate-700">{measurement.localEntrega || "Local de entrega não informado"}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-3xl border border-[#cbd5e1] bg-[#f8fafc] p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#334155]">Condições</p>
                <p className="mt-3 text-sm font-bold text-slate-950">Forma de pagamento</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-700">{measurement.formaPagamento || "Medição mensal - NF/Boleto"}</p>
                <div className="mt-4 rounded-2xl bg-white p-3 text-xs text-slate-600">
                  Documento gerado a partir das OS encerradas e ainda não medidas no período informado.
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#334155]">Serviços medidos</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">Resumo por ordem de serviço</h2>
                </div>
                <div className="rounded-full bg-[#f1f5f9] px-4 py-2 text-xs font-bold text-[#334155]">
                  {pluralizeCount(measurement.itens.length, "item", "itens")}
                </div>
              </div>

              <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-2xl text-[11px]">
                <thead>
                  <tr className="bg-[#1f2937] text-white">
                    {["#", "Serviço", "OS", "Contrato", "Data", "Qtd.", "Valor unit.", "Total"].map((head, index) => (
                      <th key={head} className={`px-3 py-3 text-left font-bold ${index === 0 ? "rounded-l-2xl" : ""} ${index >= 5 ? "text-right" : ""} ${index === 7 ? "rounded-r-2xl" : ""}`}>{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {measurement.itens.map((item, index) => (
                    <tr key={`${item.osId}-${index}`} className={index % 2 === 0 ? "bg-slate-50" : "bg-white"}>
                      <td className="px-3 py-3 font-mono text-slate-500">{String(index + 1).padStart(2, "0")}</td>
                      <td className="px-3 py-3 font-bold uppercase text-slate-900">{item.servico}</td>
                      <td className="px-3 py-3 font-mono text-slate-700">{item.osNumero || item.osId}</td>
                      <td className="px-3 py-3 font-mono text-slate-700">{item.contratoId || "-"}</td>
                      <td className="px-3 py-3 text-slate-700">{fmtDate(item.dataExecucao)}</td>
                      <td className="px-3 py-3 text-right text-slate-700">{formatQuantityUnit(item.quantidade, item.unidade)}</td>
                      <td className="px-3 py-3 text-right text-slate-700">{money(item.valorUnitario)}</td>
                      <td className="px-3 py-3 text-right font-black text-slate-950">{money(item.valorTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-5 grid grid-cols-[1fr_0.45fr] gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
                  <strong className="text-slate-950">Observação:</strong> valores consolidados conforme serviços executados, contratos vigentes e período selecionado na emissão da medição.
                </div>
                <div className="rounded-2xl bg-[#e2e8f0] p-4 text-right text-[#1f2937]">
                  <p className="text-xs font-black uppercase tracking-[0.18em]">Total geral</p>
                  <p className="mt-1 text-3xl font-black">{money(measurement.total)}</p>
                </div>
              </div>
            </section>
          </main>

          <footer className="relative z-10 mt-5 grid grid-cols-[1fr_1fr_0.75fr] gap-5 text-white">
            <div className="rounded-3xl bg-white/12 p-4 backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/80">Responsável pela emissão</p>
              <div className="mt-6 border-t border-white/70 pt-2 text-sm font-bold">{company?.responsavelExecucao || company?.responsavelTecnico || "Responsável técnico"}</div>
              <p className="text-xs text-emerald-50">{company?.cargoResponsavel || "Responsável pela execução"}</p>
            </div>
            <div className="rounded-3xl bg-white/12 p-4 backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/80">Aceite do cliente</p>
              <div className="mt-6 border-t border-white/70 pt-2 text-sm font-bold">Nome / cargo / assinatura</div>
              <p className="text-xs text-emerald-50">Conferência dos serviços e valores medidos</p>
            </div>
            <div className="rounded-3xl bg-white p-4 text-[#1f2937]">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#334155]">Rastreabilidade</p>
              <p className="mt-2 font-mono text-sm font-black">{trackingCode}</p>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
                Código interno para conferência e rastreabilidade da medição.
              </p>
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
}

function MeasurementPrintSaas({ measurement, data, emittedBy }: { measurement: MedicaoApp; data: BootstrapData | null; emittedBy?: { name?: string; role?: string } }) {
  const company = data?.companyConfig;
  const issuedAt = new Date(measurement.criadoEm || Date.now());
  const issueDate = issuedAt.toLocaleDateString("pt-BR");
  const issueTime = issuedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const periodLabel = `${fmtDate(measurement.periodoInicio)} a ${fmtDate(measurement.periodoFim)}`;
  const contractIds = [...new Set(measurement.itens.map((item) => item.contratoId).filter(Boolean))];
  const unitSummary = measurementUnitSummary(measurement.itens);
  const partialLabel = measurementPartialLabel(measurement);
  const companyName = company?.razaoSocial || company?.nomeFantasia || "Empresa emissora";
  const companyDisplayName = company?.nomeFantasia || companyName;
  const snapshot = measurement.snapshotDados ?? {};
  const issuerSnapshot = typeof snapshot === "object" && snapshot && "emissor" in snapshot ? (snapshot.emissor as Record<string, unknown>) : null;
  const issuerName = textFrom(issuerSnapshot?.nome) || company?.responsavelExecucao || company?.responsavelTecnico || textFrom(emittedBy?.name) || "";
  const issuerRole = textFrom(issuerSnapshot?.cargo) || company?.cargoResponsavel || textFrom(emittedBy?.role) || "Responsável pela emissão";
  const logoSrc = companyDocumentLogo(company);
  const traceabilityLabel = `${measurement.numero} • Revisão ${textFrom((snapshot as Record<string, unknown>)?.revisao) || "1"} • Página 1 de 1`;
  const issuePlaceDate = measurementIssuePlaceDate(measurement, company);
  const observationText =
    textFrom((snapshot as Record<string, unknown>)?.observacao) ||
    "Valores consolidados conforme serviços executados, contratos vigentes e período selecionado na emissão da medição.";
  const primaryColor = sanitizeHexColor(company?.corPrimaria, "#243447");
  const secondaryColor = sanitizeHexColor(company?.corSecundaria, "#64748b");
  const accentColor = sanitizeHexColor(company?.corDestaque, primaryColor);
  const themeStyle = {
    "--measurement-primary": primaryColor,
    "--measurement-secondary": secondaryColor,
    "--measurement-accent": accentColor,
    "--measurement-background": "#f8fafc",
    "--measurement-text": "#0f172a",
    "--measurement-table-header": primaryColor,
  } as CSSProperties;

  return (
    <div className="document-print-root measurement-print-root bg-slate-100 p-0 text-slate-950 print:m-0 print:bg-white print:p-0" style={themeStyle}>
      <section className="measurement-document mx-auto min-h-[297mm] w-[210mm] bg-white px-[15mm] py-[11mm] font-document text-[var(--measurement-text)] shadow-2xl print:shadow-none">
        <div className="h-1 rounded-full bg-[var(--measurement-primary)]" />

        <header className="measurement-header mt-4 grid grid-cols-[1fr_0.95fr] gap-8 border-b border-slate-200 pb-4">
          <div className="min-w-0">
            {logoSrc ? (
              <img src={logoSrc} alt={companyDisplayName} className="h-11 w-44 object-contain object-left" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-base font-black text-[var(--measurement-primary)]">
                {getInitials(companyDisplayName)}
              </div>
            )}
            <div className="mt-4 space-y-1 text-[9.5px] leading-relaxed text-slate-600">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Contratada</p>
              <p className="text-sm font-black leading-tight text-slate-950">{companyDisplayName}</p>
              <p className="font-semibold text-slate-800">{companyName}</p>
              <p>CNPJ {company?.cnpj || "-"}</p>
              {company?.endereco ? <p>{company.endereco}</p> : null}
              {(company?.telefone || company?.email) ? (
                <p>{[company?.telefone ? `Tel.: ${company.telefone}` : "", company?.email || ""].filter(Boolean).join(" | ")}</p>
              ) : null}
            </div>
          </div>

          <div className="min-w-0 text-right">
            <p className="text-lg font-black leading-tight text-slate-950">Medição de Serviços</p>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold text-slate-500">Código da medição</p>
                  <h1 className="mt-1 whitespace-nowrap text-[15px] font-black leading-tight tracking-tight">{measurement.numero}</h1>
                </div>
                <span className="shrink-0 rounded-full border border-[var(--measurement-primary)]/30 bg-white px-2.5 py-1 text-[9px] font-bold uppercase text-[var(--measurement-primary)]">
                  {partialLabel || measurement.status}
                </span>
              </div>
            </div>
            <dl className="mt-4 space-y-1.5 text-[10.5px] leading-relaxed">
              <div className="flex items-start justify-between gap-4">
                <dt className="font-semibold text-slate-500">Período</dt>
                <dd className="text-right font-bold">{periodLabel}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="font-semibold text-slate-500">Emissão</dt>
                <dd className="text-right font-bold">{issueDate} às {issueTime}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="font-semibold text-slate-500">Contratos</dt>
                <dd className="text-right font-bold">{contractIds.join(", ") || "-"}</dd>
              </div>
            </dl>
          </div>
        </header>

        <section className="measurement-summary mt-4 grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 text-[10.5px]">
          <div className="border-r border-slate-200 px-4 py-2.5">
            <p className="font-semibold text-slate-500">OS consolidadas</p>
            <p className="mt-1 text-lg font-black">{measurement.itens.length}</p>
          </div>
          <div className="border-r border-slate-200 px-4 py-2.5">
            <p className="font-semibold text-slate-500">Itens medidos</p>
            <p className="mt-1 text-lg font-black">{measurement.itens.length}</p>
          </div>
          <div className="px-4 py-2.5">
            <p className="font-semibold text-slate-500">Total geral</p>
            <p className="mt-1 text-xl font-black text-[var(--measurement-primary)]">{money(measurement.total)}</p>
          </div>
        </section>

        {unitSummary ? (
          <p className="mt-2 text-right text-[9.5px] font-semibold text-slate-500">
            Composição: {unitSummary}
          </p>
        ) : null}

        <section className="measurement-block mt-5">
          <h2 className="border-l-4 border-[var(--measurement-primary)] pl-3 text-sm font-black">Cliente / contratante</h2>
          <div className="mt-2.5 grid grid-cols-[1fr_1.1fr] gap-6 rounded-xl border border-slate-200 p-3.5 text-[10.5px] leading-relaxed">
            <div>
              <p className="text-lg font-black leading-tight">{measurement.clienteNome}</p>
              <p className="mt-2 font-semibold text-slate-700">CNPJ/CPF {measurement.clienteCnpj || "-"}</p>
            </div>
            <dl className="space-y-2 text-slate-600">
              <div>
                <dt className="font-bold text-slate-900">Endereço</dt>
                <dd>{measurement.clienteEndereco || "-"}</dd>
              </div>
              <div>
                <dt className="font-bold text-slate-900">Entrega / financeiro</dt>
                <dd>{measurement.localEntrega || "Não informado"}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="measurement-block mt-4">
          <h2 className="border-l-4 border-[var(--measurement-primary)] pl-3 text-sm font-black">Condições e observações</h2>
          <div className="mt-2.5 grid grid-cols-2 gap-6 rounded-xl border border-slate-200 p-3.5 text-[10.5px] leading-relaxed text-slate-600">
            <div>
              <p className="font-bold text-slate-950">Forma de pagamento</p>
              <p className="mt-1">{measurement.formaPagamento || "Não informada"}</p>
            </div>
            <div>
              <p className="font-bold text-slate-950">Observação</p>
              <p className="mt-1">{observationText}</p>
            </div>
          </div>
        </section>

        <section className="measurement-block measurement-services mt-5">
          <div className="mb-2.5 flex items-end justify-between gap-4">
            <h2 className="border-l-4 border-[var(--measurement-primary)] pl-3 text-sm font-black">Serviços medidos</h2>
            <p className="text-[10px] font-semibold text-slate-500">{pluralizeCount(measurement.itens.length, "item", "itens")}</p>
          </div>

          <table className="measurement-table w-full border-collapse text-[9.2px]">
            <thead>
              <tr className="bg-[var(--measurement-table-header)] text-white">
                <th className="w-6 rounded-l-md px-1.5 py-2 text-left font-bold">#</th>
                <th className="px-2 py-2 text-left font-bold">Serviço</th>
                <th className="w-20 px-1.5 py-2 text-left font-bold">OS / contrato</th>
                <th className="w-14 px-1.5 py-2 text-left font-bold">Data</th>
                <th className="w-12 px-1.5 py-2 text-right font-bold">Qtd.</th>
                <th className="w-16 px-1.5 py-2 text-right font-bold">Unit.</th>
                <th className="w-16 rounded-r-md px-1.5 py-2 text-right font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {measurement.itens.map((item, index) => (
                <tr key={`${item.osId}-${index}`} className={index % 2 === 0 ? "bg-slate-50" : "bg-white"}>
                  <td className="border-b border-slate-100 px-1.5 py-2 font-mono text-slate-500">{String(index + 1).padStart(2, "0")}</td>
                  <td className="border-b border-slate-100 px-2 py-2 font-semibold leading-snug text-slate-900">{item.servico}</td>
                  <td className="border-b border-slate-100 px-1.5 py-2 font-mono leading-snug text-slate-700">
                    <p>{item.osNumero || item.osId}</p>
                    <p className="text-slate-500">{item.contratoId || "-"}</p>
                  </td>
                  <td className="border-b border-slate-100 px-1.5 py-2 text-slate-700">{fmtDate(item.dataExecucao)}</td>
                  <td className="whitespace-nowrap border-b border-slate-100 px-1.5 py-2 text-right text-slate-700">{formatQuantityUnit(item.quantidade, item.unidade)}</td>
                  <td className="border-b border-slate-100 px-1.5 py-2 text-right text-slate-700">{money(item.valorUnitario)}</td>
                  <td className="border-b border-slate-100 px-1.5 py-2 text-right font-black text-slate-950">{money(item.valorTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} className="border-t border-slate-300 px-2 py-3 text-right text-[10px] font-bold text-slate-500">
                  Total geral
                </td>
                <td colSpan={2} className="border-t border-slate-300 px-2 py-3 text-right text-lg font-black text-[var(--measurement-primary)]">
                  {money(measurement.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section className="measurement-signatures mt-3 grid grid-cols-2 gap-4 text-[10.5px]">
          {issuePlaceDate ? (
            <p className="col-span-2 text-right text-[10.5px] font-medium text-slate-700">{issuePlaceDate}</p>
          ) : null}
          <div className="measurement-signature-box min-h-24 rounded-xl border border-slate-200 p-3.5">
            <p className="font-bold text-slate-600">Responsável pela emissão</p>
            <div className="mt-7 border-t border-slate-300 pt-2 font-bold">{issuerName || "Nome do responsável"}</div>
            <p className="text-slate-500">{issuerRole}</p>
          </div>
          <div className="measurement-signature-box min-h-24 rounded-xl border border-slate-200 p-3.5">
            <p className="font-bold text-slate-600">Aceite do cliente</p>
            <div className="mt-7 border-t border-slate-300 pt-2 font-bold">Nome / cargo / assinatura</div>
            <p className="text-slate-500">Conferência dos serviços e valores medidos</p>
          </div>
          <footer className="col-span-2 border-t border-slate-200 pt-2 text-[9.5px] leading-relaxed text-slate-500">
            <p className="font-semibold text-slate-600">{traceabilityLabel}</p>
          </footer>
        </section>
      </section>
    </div>
  );
}

export default function Medicao() {
  const { user } = useAuth();
  const [data, setData] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clienteSel, setClienteSel] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [busca, setBusca] = useState("");
  const [financeiroFiltro, setFinanceiroFiltro] = useState<MedicaoFinanceiroStatus | "todos">("todos");
  const [selected, setSelected] = useState<MedicaoApp | null>(null);
  const [financialEditingId, setFinancialEditingId] = useState<string | null>(null);
  const [financialDrafts, setFinancialDrafts] = useState<Record<string, FinancialDraft>>({});
  const [saving, setSaving] = useState(false);
  const [savingFinancialId, setSavingFinancialId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const bootstrap = await getBootstrap();
      setData(bootstrap);
      setSelected((current) => (current ? bootstrap.measurements.find((item) => item.id === current.id) ?? current : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar medição.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const contratos = useMemo(() => data?.contracts ?? [], [data?.contracts]);
  const ordens = useMemo(() => data?.orders ?? [], [data?.orders]);
  const measurements = useMemo(() => data?.measurements ?? [], [data?.measurements]);
  const clientesDisponiveis = useMemo(() => [...new Set(contratos.map((item) => item.cliente))].sort(), [contratos]);

  const preItens = useMemo(
    () =>
      ordens.filter((item) =>
        item.status === "encerrada" &&
        !item.naoExecutada &&
        item.clienteNome === clienteSel &&
        (!dataInicio || (item.dataExecucao || item.dataEmissao) >= dataInicio) &&
        (!dataFim || (item.dataExecucao || item.dataEmissao) <= dataFim) &&
        !measurements.some((measurement) => measurement.status !== "cancelada" && measurement.itens.some((medItem) => medItem.osId === item.id)),
      ),
    [ordens, measurements, clienteSel, dataInicio, dataFim],
  );

  const filteredMeasurements = measurements.filter((item) => {
    const termo = busca.toLowerCase();
    const matchesText = !termo || item.numero.toLowerCase().includes(termo) || item.clienteNome.toLowerCase().includes(termo);
    const matchesFinancial = financeiroFiltro === "todos" || financialStatusOf(item) === financeiroFiltro;
    return matchesText && matchesFinancial;
  });

  const financialKanban = useMemo(
    () =>
      financeiroStatusOrder.map((status) => {
        const items = measurements.filter((measurement) => measurement.status !== "cancelada" && financialStatusOf(measurement) === status);
        return {
          status,
          items,
          total: items.reduce((sum, item) => sum + Number(item.total || 0), 0),
        };
      }),
    [measurements],
  );

  function updateFinancialDraft(id: string, patch: Partial<FinancialDraft>) {
    setFinancialDrafts((current) => ({
      ...current,
      [id]: {
        ...(current[id] || financialDraftFrom(measurements.find((item) => item.id === id) as MedicaoApp)),
        ...patch,
      },
    }));
  }

  function openFinancialEditor(measurement: MedicaoApp) {
    setFinancialEditingId((current) => (current === measurement.id ? null : measurement.id));
    setFinancialDrafts((current) => ({
      ...current,
      [measurement.id]: current[measurement.id] || financialDraftFrom(measurement),
    }));
  }

  async function handleSaveFinancial(measurement: MedicaoApp) {
    const draft = financialDrafts[measurement.id] || financialDraftFrom(measurement);
    setSavingFinancialId(measurement.id);
    try {
      await updateMeasurementFinancial(measurement.id, draft);
      toast.success("Acompanhamento financeiro atualizado.");
      setFinancialEditingId(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar acompanhamento financeiro.");
    } finally {
      setSavingFinancialId(null);
    }
  }

  async function handleGerar() {
    if (!clienteSel || !dataInicio || !dataFim) return toast.error("Selecione o cliente e o intervalo da medição.");
    setSaving(true);
    try {
      const response = await generateMeasurement({ clienteNome: clienteSel, dataInicio, dataFim });
      setSelected(response.measurement);
      toast.success(`Medição ${response.measurement.numero} gerada.`);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar medição.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(medicao: MedicaoApp) {
    if (!confirm(`Cancelar a medição ${medicao.numero}? As OS poderão entrar em nova medição.`)) return;
    await cancelMeasurement(medicao.id);
    toast.success("Medição cancelada.");
    await reload();
  }

  function handleViewMeasurement(measurement: MedicaoApp) {
    setSelected(measurement);
    toast.success(`Medição ${measurement.numero} selecionada para conferência.`);
  }

  function handlePrintMeasurement(measurement?: MedicaoApp | null) {
    const target = measurement ?? selected;
    if (!target) {
      toast.error("Selecione uma medição para imprimir.");
      return;
    }
    setSelected(target);
    toast.info(`Preparando impressão da medição ${target.numero}.`);
    setTimeout(() => window.print(), 200);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Financeiro"
        title="Medição"
        description="Consolide OS encerradas por cliente e período, gere a medição e acompanhe NF, cobrança e baixa manual no ERP."
        crumbs={[{ label: "Financeiro" }, { label: "Medição" }]}
        actions={[
          { label: "Atualizar base", onClick: reload, variant: "outline" },
          { label: "Ver OS", to: "/ordens", variant: "default" },
        ]}
      />

      <Card className="border-primary/20 bg-primary/[0.03] print:hidden">
        <CardHeader>
          <CardTitle>Fluxo da medição</CardTitle>
          <p className="text-sm text-muted-foreground">
            A medição consolida o serviço executado e ajuda a acompanhar NF e pagamento, sem substituir o ERP.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-5">
          {measurementFlowSteps.map((step) => (
            <div key={step.title} className="rounded-2xl border bg-card p-4">
              <p className="font-semibold text-foreground">{step.title}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {error ? <Card className="border-destructive/30 bg-destructive/5"><CardContent className="pt-4 text-sm text-muted-foreground">{error}</CardContent></Card> : null}
      {loading ? <Card><CardContent className="py-14 text-center text-sm text-muted-foreground">Carregando dados de medição...</CardContent></Card> : null}

      {!loading ? (
        <>
          <Card className="panel-soft print:hidden">
            <CardHeader><CardTitle>Nova medição</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Cliente</Label>
                  <Select value={clienteSel} onValueChange={setClienteSel}>
                    <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                    <SelectContent>{clientesDisponiveis.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Data inicial</Label><Input type="date" value={dataInicio} onChange={(event) => setDataInicio(event.target.value)} /></div>
                <div className="space-y-1.5"><Label>Data final</Label><Input type="date" value={dataFim} onChange={(event) => setDataFim(event.target.value)} /></div>
              </div>

              {clienteSel ? (
                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                  {preItens.length ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span><strong>{preItens.length}</strong> OS encerrada(s), ainda não medidas, no período</span>
                        <span className="text-xs text-muted-foreground">Prévia antes de gerar a medição</span>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {preItens.slice(0, 6).map((order) => (
                          <div key={order.id} className="rounded-lg border bg-card px-3 py-2">
                            <p className="font-mono text-xs font-bold">{order.numero || order.id}</p>
                            <p className="mt-1 truncate font-semibold">{order.servico}</p>
                            <p className="text-xs text-muted-foreground">{fmtDate(order.dataExecucao || order.dataEmissao)} · {order.contratoId || "Sem contrato"}</p>
                          </div>
                        ))}
                      </div>
                      {preItens.length > 6 ? <p className="text-xs text-muted-foreground">+{preItens.length - 6} OS adicional(is) serão consolidadas nesta medição.</p> : null}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground"><AlertCircle className="h-4 w-4" /><span>Nenhuma OS disponível para nova medição neste intervalo.</span></div>
                  )}
                </div>
              ) : null}

              <Button onClick={handleGerar} className="w-full gap-2" size="lg" disabled={!clienteSel || !dataInicio || !dataFim || !preItens.length || saving}>
                <Receipt className="h-4 w-4" /> {saving ? "Gerando..." : "Gerar medição persistida"}
              </Button>
            </CardContent>
          </Card>

          <Card className="print:hidden">
            <CardHeader>
              <div>
                <CardTitle>Acompanhamento da medição</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Controle visual após a emissão: conferência, NF enviada, cobrança, aguardando pagamento e baixa manual no ERP.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                {financialKanban.map((column) => {
                  const meta = financeiroStatusMeta[column.status];
                  const Icon = meta.icon;
                  return (
                    <div key={column.status} className={`rounded-2xl border p-3 ${meta.tone}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold">{meta.label}</p>
                          <p className="mt-1 text-xs opacity-80">{pluralizeCount(column.items.length, "medição", "medições")}</p>
                        </div>
                        <Icon className="h-4 w-4 shrink-0" />
                      </div>
                      <p className="mt-3 text-lg font-black">{money(column.total)}</p>
                      <div className="mt-3 space-y-2">
                        {column.items.slice(0, 3).map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="w-full rounded-xl bg-white/70 p-2 text-left text-xs shadow-sm transition hover:bg-white"
                            onClick={() => {
                              setSelected(item);
                              openFinancialEditor(item);
                            }}
                          >
                            <span className="block font-mono font-bold">{item.numero}</span>
                            <span className="mt-0.5 block truncate opacity-80">{item.clienteNome}</span>
                          </button>
                        ))}
                        {column.items.length > 3 ? <p className="text-xs font-medium opacity-75">+{pluralizeCount(column.items.length - 3, "medição", "medições")}</p> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {selected ? (
            <Card className="border-primary/30 bg-primary/[0.035] print:hidden">
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Medição selecionada</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Use esta área para confirmar o documento antes de imprimir ou continuar o acompanhamento.
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                  <X className="mr-1.5 h-4 w-4" /> Limpar seleção
                </Button>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                <div className="grid gap-3 rounded-2xl border bg-card p-4 text-sm md:grid-cols-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Número</p>
                    <p className="mt-1 font-mono font-bold">{selected.numero}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cliente</p>
                    <p className="mt-1 font-semibold">{selected.clienteNome}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Total</p>
                    <p className="mt-1 font-bold text-primary">{money(selected.total)}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Período</p>
                    <p className="mt-1">{fmtDate(selected.periodoInicio)} até {fmtDate(selected.periodoFim)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Itens</p>
                    <p className="mt-1">{pluralizeCount(selected.itens.length, "item", "itens")}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Status</p>
                    <p className="mt-1">{selected.status === "cancelada" ? "Cancelada" : "Emitida"}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 md:min-w-52">
                  <Button onClick={() => handlePrintMeasurement(selected)}>
                    <Printer className="mr-1.5 h-4 w-4" /> Imprimir PDF
                  </Button>
                  {selected.status !== "cancelada" ? (
                    <Button variant="outline" onClick={() => openFinancialEditor(selected)}>
                      <WalletCards className="mr-1.5 h-4 w-4" /> Acompanhar
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card className="print:hidden">
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <CardTitle>Histórico de medições</CardTitle>
                <div className="grid w-full gap-2 md:w-auto md:grid-cols-[18rem_14rem]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Buscar número ou cliente..." value={busca} onChange={(event) => setBusca(event.target.value)} />
                  </div>
                  <Select value={financeiroFiltro} onValueChange={(value) => setFinanceiroFiltro(value as MedicaoFinanceiroStatus | "todos")}>
                    <SelectTrigger><SelectValue placeholder="Status financeiro" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os status</SelectItem>
                      {financeiroStatusOrder.map((status) => <SelectItem key={status} value={status}>{financeiroStatusMeta[status].label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredMeasurements.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">Nenhuma medição gerada ainda.</div>
              ) : filteredMeasurements.map((measurement) => {
                const financeiroStatus = financialStatusOf(measurement);
                const financeiroMeta = financeiroStatusMeta[financeiroStatus];
                const draft = financialDrafts[measurement.id] || financialDraftFrom(measurement);
                const isEditingFinancial = financialEditingId === measurement.id && measurement.status !== "cancelada";

                return (
                  <div key={measurement.id} className="space-y-4 rounded-xl border p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-mono text-sm font-bold">{measurement.numero}</p>
                          <Badge variant={measurement.status === "cancelada" ? "destructive" : "default"}>{measurement.status === "cancelada" ? "Cancelada" : "Emitida"}</Badge>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${financeiroMeta.tone}`}>{financeiroMeta.label}</span>
                        </div>
                        <p className="mt-1 text-sm font-semibold">{measurement.clienteNome}</p>
                        <p className="text-xs text-muted-foreground">{fmtDate(measurement.periodoInicio)} até {fmtDate(measurement.periodoFim)} · {pluralizeCount(measurement.itens.length, "item", "itens")} · {money(measurement.total)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {measurement.nfNumero ? `NF ${measurement.nfNumero}` : "NF ainda não informada"}
                          {measurement.pagamentoPrevistoEm ? ` · Previsto para ${fmtDate(measurement.pagamentoPrevistoEm)}` : ""}
                          {measurement.pagoNoErpEm ? ` · Pago no ERP em ${fmtDate(measurement.pagoNoErpEm)}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewMeasurement(measurement)}><CalendarDays className="mr-1.5 h-3.5 w-3.5" /> Ver</Button>
                        <Button variant="outline" size="sm" onClick={() => handlePrintMeasurement(measurement)}><Printer className="mr-1.5 h-3.5 w-3.5" /> Imprimir</Button>
                        {measurement.status !== "cancelada" ? <Button variant="secondary" size="sm" onClick={() => openFinancialEditor(measurement)}><WalletCards className="mr-1.5 h-3.5 w-3.5" /> Acompanhar</Button> : null}
                        {measurement.status !== "cancelada" ? <Button variant="ghost" size="sm" onClick={() => handleCancel(measurement)}><Ban className="mr-1.5 h-3.5 w-3.5" /> Cancelar</Button> : null}
                      </div>
                    </div>

                    {isEditingFinancial ? (
                      <div className="rounded-2xl border bg-muted/30 p-4">
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                          <div className="space-y-1.5 xl:col-span-2">
                            <Label>Status financeiro</Label>
                            <Select value={draft.financeiroStatus} onValueChange={(value) => updateFinancialDraft(measurement.id, { financeiroStatus: value as MedicaoFinanceiroStatus })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {financeiroStatusOrder.map((status) => <SelectItem key={status} value={status}>{financeiroStatusMeta[status].label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label>Número da NF</Label>
                            <Input value={draft.nfNumero} onChange={(event) => updateFinancialDraft(measurement.id, { nfNumero: event.target.value })} placeholder="Ex.: NF-1542" />
                          </div>
                          <div className="space-y-1.5">
                            <Label>NF enviada em</Label>
                            <Input type="date" value={draft.nfEnviadaEm} onChange={(event) => updateFinancialDraft(measurement.id, { nfEnviadaEm: event.target.value })} />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Previsão pagamento</Label>
                            <Input type="date" value={draft.pagamentoPrevistoEm} onChange={(event) => updateFinancialDraft(measurement.id, { pagamentoPrevistoEm: event.target.value })} />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Pago no ERP em</Label>
                            <Input type="date" value={draft.pagoNoErpEm} onChange={(event) => updateFinancialDraft(measurement.id, { pagoNoErpEm: event.target.value })} />
                          </div>
                          <div className="space-y-1.5 md:col-span-2 xl:col-span-4">
                            <Label>Observação financeira</Label>
                            <Textarea value={draft.financeiroObservacao} onChange={(event) => updateFinancialDraft(measurement.id, { financeiroObservacao: event.target.value })} placeholder="Ex.: NF enviada para compras, aguardando aceite do cliente." />
                          </div>
                          <div className="flex items-end">
                            <Button className="w-full" onClick={() => handleSaveFinancial(measurement)} disabled={savingFinancialId === measurement.id}>
                              {savingFinancialId === measurement.id ? "Salvando..." : "Salvar acompanhamento"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {selected ? <MeasurementPrintSaas measurement={selected} data={data} emittedBy={{ name: user?.nome, role: user?.perfis?.[0]?.nome }} /> : null}
        </>
      ) : null}
    </div>
  );
}
