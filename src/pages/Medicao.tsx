import { useState, useMemo } from "react";
import { contratos, ordensServico, licencas } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Receipt, Printer } from "lucide-react";
import { toast } from "sonner";

export default function Medicao() {
  const [clienteSel, setClienteSel] = useState("");
  const [mesRef, setMesRef] = useState("");
  const [gerada, setGerada] = useState(false);

  const clientes = useMemo(() => [...new Set(contratos.map((c) => c.cliente))], []);

  const clienteData = useMemo(() => {
    const c = contratos.find((ct) => ct.cliente === clienteSel);
    return c ? { nome: c.cliente, cnpj: c.cnpj } : null;
  }, [clienteSel]);

  const osCliente = useMemo(
    () => ordensServico.filter((os) => os.cliente === clienteSel && os.status === "encerrada"),
    [clienteSel]
  );

  const itensComValor = useMemo(() => {
    return osCliente.map((os) => {
      const contrato = contratos.find((c) => c.id === os.contratoId);
      const valorUnit = contrato?.valorUnitario || 0;
      return {
        ...os,
        valorUnitario: valorUnit,
        valorTotal: valorUnit * os.quantidade,
      };
    });
  }, [osCliente]);

  const totalMedicao = useMemo(
    () => itensComValor.reduce((acc, item) => acc + item.valorTotal, 0),
    [itensComValor]
  );

  const numMedicao = useMemo(() => `${Math.floor(100 + Math.random() * 900)}/2026`, []);

  const handleGerar = () => {
    if (!clienteSel || !mesRef) {
      toast.error("Selecione o cliente e o mês de referência");
      return;
    }
    setGerada(true);
    toast.success("Medição gerada com sucesso!");
  };

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="print:hidden max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            Gerar Medição
          </h1>
          <p className="text-muted-foreground text-sm">Gere a medição mensal para envio ao cliente</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Dados da Medição</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={clienteSel} onValueChange={(v) => { setClienteSel(v); setGerada(false); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mês de Referência</Label>
              <Input type="month" value={mesRef} onChange={(e) => setMesRef(e.target.value)} />
            </div>

            {clienteSel && (
              <div className="rounded-lg border p-3 bg-muted/50">
                <p className="text-xs text-muted-foreground">
                  {itensComValor.length} serviço(s) encerrado(s) para este cliente. Total estimado:{" "}
                  <span className="font-bold text-foreground">
                    R$ {totalMedicao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handleGerar} className="flex-1" size="lg">
                <Receipt className="h-4 w-4 mr-2" />
                Gerar Medição
              </Button>
              {gerada && (
                <Button onClick={() => window.print()} variant="outline" size="lg">
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Printable Medição */}
      {gerada && clienteData && (
        <div className="bg-white text-black print:m-0 print:p-0">
          <div className="max-w-[210mm] mx-auto border border-gray-300 print:border-none p-8 print:p-6 space-y-5 text-[11px]">
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-emerald-700 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-md bg-emerald-700 flex items-center justify-center font-bold text-white text-lg">
                  CP
                </div>
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

            <h2 className="text-center font-bold text-lg uppercase underline">
              Medição {numMedicao}
            </h2>

            <p className="text-[11px]">
              Prezados, vem através deste, encaminhar a medição referente aos serviços executados, para CONFERÊNCIA E VALIDAÇÃO da mesma.
            </p>

            {/* Dados Contratantes */}
            <div className="border border-gray-400">
              <div className="bg-gray-50 px-2 py-1 font-bold text-center border-b border-gray-400 text-sm uppercase">
                Dados Contratantes
              </div>
              <div className="p-2 space-y-0.5 text-[11px]">
                <p><strong>RAZÃO SOCIAL:</strong> {clienteData.nome}</p>
                <p><strong>CNPJ:</strong> {clienteData.cnpj}</p>
              </div>
            </div>

            {/* Tabela de itens */}
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 px-2 py-1.5 text-center font-bold w-[50px]">ITEM</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-center font-bold">DESCRIÇÃO DE SERVIÇOS</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-center font-bold w-[80px]">ORDEM DE SERVIÇOS</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-center font-bold w-[50px]">QNT.</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-center font-bold w-[90px]">VALOR UNIT.</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-center font-bold w-[100px]">VALOR TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {itensComValor.map((item, i) => (
                  <tr key={item.id}>
                    <td className="border border-gray-400 px-2 py-1.5 text-center">O{i + 1}</td>
                    <td className="border border-gray-400 px-2 py-1.5">{item.servico}</td>
                    <td className="border border-gray-400 px-2 py-1.5 text-center font-mono">{item.id.replace("OS-", "")}</td>
                    <td className="border border-gray-400 px-2 py-1.5 text-center">{item.quantidade}</td>
                    <td className="border border-gray-400 px-2 py-1.5 text-right">
                      R$ {item.valorUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="border border-gray-400 px-2 py-1.5 text-right font-medium">
                      R$ {item.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={5} className="border border-gray-400 px-2 py-2 font-bold text-right">
                    TOTAL DA MEDIÇÃO:
                  </td>
                  <td className="border border-gray-400 px-2 py-2 text-right font-bold text-emerald-700">
                    R$ {totalMedicao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="space-y-1 text-[11px] border border-gray-400 p-2">
              <p>Forma de Pagamento: medição - nota fiscal/boleto</p>
              <p>Medição de {mesRef ? new Date(mesRef + "-01").toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : "—"}</p>
            </div>

            {/* Assinatura */}
            <div className="grid grid-cols-2 gap-8 pt-8">
              <div className="text-center space-y-1">
                <div className="border-b border-gray-400 pb-8" />
                <p className="font-bold text-[11px]">{licencas.responsavelExecucao}</p>
                <p className="text-[10px] text-gray-500">Resp. execução</p>
                <p className="text-[10px] text-gray-500">{licencas.cargoResponsavel}</p>
              </div>
              <div>
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr>
                      <th className="border border-gray-400 px-2 py-1 font-bold">NOME SOLICITANTE</th>
                      <th className="border border-gray-400 px-2 py-1 font-bold">CARGO/FUNÇÃO</th>
                      <th className="border border-gray-400 px-2 py-1 font-bold">ASSINATURA</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-400 px-2 py-4" />
                      <td className="border border-gray-400 px-2 py-4" />
                      <td className="border border-gray-400 px-2 py-4" />
                    </tr>
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
