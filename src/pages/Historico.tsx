import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { contratos, ordensServico } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, FileCheck2, Eye } from "lucide-react";

export default function Historico() {
  const navigate = useNavigate();
  const [clienteSel, setClienteSel] = useState("");

  const clientes = useMemo(() => [...new Set(contratos.map((c) => c.cliente))], []);

  const contratosCliente = useMemo(
    () => contratos.filter((c) => c.cliente === clienteSel),
    [clienteSel]
  );

  const osCliente = useMemo(
    () => ordensServico.filter((os) => os.cliente === clienteSel && os.status === "encerrada"),
    [clienteSel]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <History className="h-6 w-6 text-primary" />
          Histórico de Serviços
        </h1>
        <p className="text-muted-foreground text-sm">Consulte os serviços prestados por cliente e gere certificados</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Selecione o Cliente</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-md">
            <Label>Cliente</Label>
            <Select value={clienteSel} onValueChange={setClienteSel}>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>
                {clientes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {clienteSel && (
        <>
          {/* Contratos do cliente */}
          <Card>
            <CardHeader><CardTitle>Contratos Ativos — {clienteSel}</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4 font-medium">ID</th>
                    <th className="text-left py-2 pr-4 font-medium">Serviço</th>
                    <th className="text-left py-2 pr-4 font-medium">Tipo</th>
                    <th className="text-left py-2 pr-4 font-medium">Saldo</th>
                    <th className="text-left py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {contratosCliente.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-mono text-xs">{c.id}</td>
                      <td className="py-3 pr-4">{c.servico}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={c.tipo === "sanitario" ? "default" : "secondary"}>
                          {c.tipo === "sanitario" ? "Sanitário" : "Manutenção"}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs">
                        {c.contratado - c.executado} {c.unidade}
                      </td>
                      <td className="py-3">
                        <Badge variant={c.status === "ativo" ? "default" : c.status === "vencido" ? "destructive" : "secondary"}>
                          {c.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Histórico de OS */}
          <Card>
            <CardHeader><CardTitle>Serviços Executados</CardTitle></CardHeader>
            <CardContent>
              {osCliente.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhum serviço encerrado encontrado.</p>
              ) : (
                <div className="space-y-3">
                  {osCliente.map((os) => (
                    <div key={os.id} className="rounded-lg border p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground">{os.id}</span>
                          <Badge variant={os.tipo === "sanitario" ? "default" : "secondary"} className="text-[10px]">
                            {os.tipo === "sanitario" ? "Sanitário" : "Manutenção"}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm mt-1">{os.servico}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>Técnico: {os.tecnico}</span>
                          <span>Data: {new Date(os.dataExecucao).toLocaleDateString("pt-BR")}</span>
                          <span>Qtd: {os.quantidade} {os.unidade}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {os.certificadoHash ? (
                          <>
                            <Badge variant="outline" className="font-mono text-[10px]">{os.certificadoHash}</Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/visualizar?hash=${os.certificadoHash}&contrato=${os.contratoId}&tecnico=${os.tecnico}&data=${os.dataExecucao}`)}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Ver
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                navigate(`/visualizar?hash=${os.certificadoHash}&contrato=${os.contratoId}&tecnico=${os.tecnico}&data=${os.dataExecucao}`);
                                setTimeout(() => window.print(), 500);
                              }}
                            >
                              <FileCheck2 className="h-3.5 w-3.5 mr-1" />
                              PDF
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Sem certificado</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
