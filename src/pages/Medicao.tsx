import { useState, useMemo, useEffect } from "react";
import { contratos, ordensServico, licencas } from "@/data/mockData";
import { clientes as clientesCad } from "@/data/comercialData";
import { getOrdens, OSApp } from "@/lib/appStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Receipt, Printer, FileCheck2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}

export default function Medicao() {
  const [clienteSel, setClienteSel] = useState("");
  const [mesRef, setMesRef] = useState("");
  const [gerada, setGerada] = useState(false);
  const [ordens, setOrdens] = useState<OSApp[]>([]);

  useEffect(() => { setOrdens(getOrdens()); }, []);

  // Clientes únicos das OS encerradas + clientes do cadastro
  const clientesDisponiveis = useMemo(() => {
    const nomesComOS = new Set(ordens.filter(o => o.status === "encerrada").map(o => o.clienteNome));
    const todos = [...new Set(contratos.map(c => c.cliente))];
    return todos; // Mostra todos os clientes
  }, [ordens]);

  const clienteObj = useMemo(() => clientesCad.find(c => c.razaoSocial === clienteSel), [clienteSel]);
  const clienteContrato = useMemo(() => contratos.find(c => c.cliente === clienteSel), [clienteSel]);

  // OS encerradas do cliente no mês selecionado
  const osCliente = useMemo(() => {
    // Combina OS do appStore + OS mock
    const osStore = ordens.filter(o => o.status === "encerrada" && o.clienteNome === clienteSel);
    const osMock = ordensServico.filter((os: any) => os.cliente === clienteSel && os.status === "encerrada");

    // Filtra por mês se informado
    if (!mesRef) return { store: osStore, mock: osMock };
    const [ano, mes] = mesRef.split("-");
    const filtrarPorMes = (d: string) => {
      if (!d) return true;
      return d.startsWith(`${ano}-${mes}`);
    };
    return {
      store: osStore.filter(o => filtrarPorMes(o.dataExecucao || o.dataEmissao)),
      mock: osMock.filter((o: any) => filtrarPorMes(o.dataExecucao)),
    };
  }, [clienteSel, mesRef, ordens]);

  const itens = useMemo(() => {
    const resultado: Array<{
      id: string; numero: string; servico: string;
      quantidade: number; unidade: string;
      valorUnitario: number; valorTotal: number;
      data: string; tipo: string;
    }> = [];

    // OS do appStore
    for (const os of osCliente.store) {
      const contrato = contratos.find(c => c.id === os.contratoId);
      const valorUnit = contrato?.valorUnitario || 0;
      resultado.push({
        id: os.id, numero: os.numero, servico: os.servico,
        quantidade: os.quantidade, unidade: os.unidade,
        valorUnitario: valorUnit, valorTotal: valorUnit * os.quantidade,
        data: os.dataExecucao || os.dataEmissao, tipo: os.tipo,
      });
    }

    // OS mock
    for (const os of osCliente.mock) {
      const contrato = contratos.find((c: any) => c.id === os.contratoId);
      const valorUnit = contrato?.valorUnitario || 0;
      // Evita duplicatas
      if (resultado.find(r => r.id === os.id)) continue;
      resultado.push({
        id: os.id, numero: os.id, servico: os.servico,
        quantidade: os.quantidade, unidade: os.unidade,
        valorUnitario: valorUnit, valorTotal: valorUnit * os.quantidade,
        data: os.dataExecucao, tipo: os.tipo,
      });
    }

    return resultado;
  }, [osCliente]);

  const totalMedicao = useMemo(() => itens.reduce((acc, i) => acc + i.valorTotal, 0), [itens]);

  const numMedicao = useMemo(() => {
    const n = Math.floor(100 + Math.random() * 900);
    return `${n}/${new Date().getFullYear()}`;
  }, [clienteSel]);

  function handleGerar() {
    if (!clienteSel || !mesRef) {
      toast.error("Selecione o cliente e o mês de referência");
      return;
    }
    if (itens.length === 0) {
      toast.warning("Nenhuma OS encerrada encontrada para este cliente no período");
      return;
    }
    setGerada(true);
    toast.success("Medição gerada com sucesso!");
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="print:hidden max-w-2xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" /> Medição
          </h1>
          <p className="text-muted-foreground text-sm">Gere a medição mensal com base nas OS encerradas</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Dados da Medição</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Select value={clienteSel} onValueChange={v => { setClienteSel(v); setGerada(false); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>
                    {clientesDisponiveis.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Mês de Referência</Label>
                <Input type="month" value={mesRef} onChange={e => { setMesRef(e.target.value); setGerada(false); }} />
              </div>
            </div>

            {clienteSel && (
              <div className="rounded-lg border p-3 bg-muted/40 text-sm">
                {itens.length > 0 ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary">
                      <FileCheck2 className="h-4 w-4" />
                      <span><strong>{itens.length}</strong> OS encerrada(s) {mesRef ? "no período" : "no total"}</span>
                    </div>
                    <span className="font-bold">
                      R$ {totalMedicao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">Nenhuma OS encerrada {mesRef ? "neste período" : "para este cliente"}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handleGerar} className="flex-1 gap-2" size="lg" disabled={!clienteSel || !mesRef || itens.length === 0}>
                <Receipt className="h-4 w-4" /> Gerar Medição
              </Button>
              {gerada && (
                <Button onClick={() => window.print()} variant="outline" size="lg" className="gap-2">
                  <Printer className="h-4 w-4" /> Imprimir
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preview da tabela antes de gerar */}
        {clienteSel && itens.length > 0 && !gerada && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Prévia das OS ({itens.length})</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-3">OS</th>
                    <th className="text-left py-2 pr-3">Serviço</th>
                    <th className="text-left py-2 pr-3">Data</th>
                    <th className="text-right py-2 pr-3">Qtd</th>
                    <th className="text-right py-2 pr-3">Valor Unit.</th>
                    <th className="text-right py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map(item => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-mono">{item.numero}</td>
                      <td className="py-2 pr-3">{item.servico}</td>
                      <td className="py-2 pr-3">{fmtDate(item.data)}</td>
                      <td className="py-2 pr-3 text-right">{item.quantidade} {item.unidade}</td>
                      <td className="py-2 pr-3 text-right">R$ {item.valorUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                      <td className="py-2 text-right font-medium">R$ {item.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} className="text-right py-2 font-bold text-sm pr-3">TOTAL</td>
                    <td className="text-right py-2 font-bold text-sm text-primary">R$ {totalMedicao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          DOCUMENTO IMPRIMÍVEL
      ══════════════════════════════════════════════════════ */}
      {gerada && clienteSel && (
        <div className="bg-white text-black print:m-0 print:p-0">
          <div className="max-w-[210mm] mx-auto border border-gray-300 print:border-none p-8 print:p-6 space-y-5 text-[11px]">
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-emerald-700 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-md bg-emerald-700 flex items-center justify-center font-bold text-white text-lg">CP</div>
                <div>
                  <span className="text-xl font-extrabold tracking-tight">
                    <span className="text-emerald-700">CIPER</span><span className="text-gray-700">PRAG</span>
                  </span>
                  <div className="text-[9px] tracking-[0.3em] text-gray-500 font-medium">S E R V I Ç O S</div>
                </div>
              </div>
              <div className="text-right text-[10px]">
                <p className="font-bold">{licencas.empresa}</p>
                <p>CNPJ: {licencas.cnpj}</p>
              </div>
            </div>

            <h2 className="text-center font-bold text-lg uppercase underline">Medição {numMedicao}</h2>
            <p className="text-[11px]">Prezados, encaminhamos a medição referente aos serviços executados para CONFERÊNCIA E VALIDAÇÃO.</p>

            <div className="border border-gray-400">
              <div className="bg-gray-50 px-2 py-1 font-bold text-center border-b border-gray-400 text-sm uppercase">Dados do Contratante</div>
              <div className="p-2 text-[11px] space-y-0.5">
                <p><strong>RAZÃO SOCIAL:</strong> {clienteSel}</p>
                {clienteContrato && <p><strong>CNPJ:</strong> {clienteContrato.cnpj}</p>}
                {clienteObj && <p><strong>ENDEREÇO:</strong> {clienteObj.endereco}, {clienteObj.municipio}-{clienteObj.uf}</p>}
                <p><strong>MÊS REFERÊNCIA:</strong> {mesRef ? new Date(mesRef + "-01").toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : "—"}</p>
              </div>
            </div>

            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-gray-100">
                  {["ITEM","DESCRIÇÃO DE SERVIÇOS","ORDEM DE SERVIÇOS","DATA","QNT.","VALOR UNIT.","VALOR TOTAL"].map(h => (
                    <th key={h} className="border border-gray-400 px-2 py-1.5 text-center font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {itens.map((item, i) => (
                  <tr key={item.id}>
                    <td className="border border-gray-400 px-2 py-1.5 text-center">O{i + 1}</td>
                    <td className="border border-gray-400 px-2 py-1.5">{item.servico}</td>
                    <td className="border border-gray-400 px-2 py-1.5 text-center font-mono">{item.numero}</td>
                    <td className="border border-gray-400 px-2 py-1.5 text-center">{fmtDate(item.data)}</td>
                    <td className="border border-gray-400 px-2 py-1.5 text-center">{item.quantidade} {item.unidade}</td>
                    <td className="border border-gray-400 px-2 py-1.5 text-right">R$ {item.valorUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    <td className="border border-gray-400 px-2 py-1.5 text-right font-medium">R$ {item.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={6} className="border border-gray-400 px-2 py-2 font-bold text-right">TOTAL DA MEDIÇÃO:</td>
                  <td className="border border-gray-400 px-2 py-2 text-right font-bold text-emerald-700">
                    R$ {totalMedicao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="text-[11px] border border-gray-400 p-2">
              <p>Forma de Pagamento: medição - nota fiscal / boleto</p>
              <p>Período: {mesRef ? new Date(mesRef + "-01").toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : "—"}</p>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-8">
              <div className="text-center">
                <div className="border-b border-gray-400 pb-12 mb-1" />
                <p className="font-bold text-[11px]">{licencas.responsavelExecucao}</p>
                <p className="text-[10px] text-gray-500">{licencas.cargoResponsavel}</p>
              </div>
              <div>
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr>
                      {["NOME SOLICITANTE","CARGO/FUNÇÃO","ASSINATURA"].map(h => (
                        <th key={h} className="border border-gray-400 px-2 py-1 font-bold text-center">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="border border-gray-400 px-2 py-6"/><td className="border border-gray-400 px-2 py-6"/><td className="border border-gray-400 px-2 py-6"/></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
