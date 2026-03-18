import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { contratos } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarPlus, ShieldAlert, Send } from "lucide-react";
import { toast } from "sonner";

export default function Agendamento() {
  const navigate = useNavigate();
  const [clienteSel, setClienteSel] = useState("");
  const [contratoSel, setContratoSel] = useState("");
  const [dataAgendada, setDataAgendada] = useState("");
  const [descricao, setDescricao] = useState("");
  const [horasEstimadas, setHorasEstimadas] = useState("");
  const [tagSel, setTagSel] = useState("");
  const [enviado, setEnviado] = useState(false);

  const clientes = useMemo(() => [...new Set(contratos.map((c) => c.cliente))], []);

  const servicosCliente = useMemo(
    () => contratos.filter((c) => c.cliente === clienteSel),
    [clienteSel]
  );

  const contratoAtivo = useMemo(
    () => contratos.find((c) => c.id === contratoSel),
    [contratoSel]
  );

  const handleAgendar = () => {
    setEnviado(true);
    toast.success("Card operacional enviado para o Helena CRM", {
      description: `Agendamento criado para ${contratoAtivo?.servico}`,
    });
    setTimeout(() => setEnviado(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CalendarPlus className="h-6 w-6 text-primary" />
          Agendamento Inteligente
        </h1>
        <p className="text-muted-foreground text-sm">Selecione o cliente e o serviço para criar um agendamento</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Filtro de Contrato</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={clienteSel} onValueChange={(v) => { setClienteSel(v); setContratoSel(""); }}>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {clienteSel && (
            <div className="space-y-2">
              <Label>Serviço / Contrato</Label>
              <Select value={contratoSel} onValueChange={setContratoSel}>
                <SelectTrigger><SelectValue placeholder="Selecione o serviço" /></SelectTrigger>
                <SelectContent>
                  {servicosCliente.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.servico} ({c.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dynamic form */}
      {contratoAtivo && (
        <Card>
          <CardHeader>
            <CardTitle>
              {contratoAtivo.tipo === "sanitario"
                ? "Formulário — Serviço Sanitário"
                : "Formulário — Manutenção Civil (HH)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Data do Agendamento</Label>
              <Input type="date" value={dataAgendada} onChange={(e) => setDataAgendada(e.target.value)} />
            </div>

            {contratoAtivo.tipo === "sanitario" ? (
              <>
                {contratoAtivo.tags && (
                  <div className="space-y-2">
                    <Label>TAG do Equipamento</Label>
                    <Select value={tagSel} onValueChange={setTagSel}>
                      <SelectTrigger><SelectValue placeholder="Selecione a TAG" /></SelectTrigger>
                      <SelectContent>
                        {contratoAtivo.tags.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {contratoAtivo.produtosQuimicos && (
                  <div className="space-y-1.5">
                    <Label>Produto Químico</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {contratoAtivo.produtosQuimicos.map((p) => (
                        <Badge key={p} variant="secondary">{p}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ShieldAlert className="h-4 w-4 text-warning" />
                    EPIs e Riscos Obrigatórios
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {contratoAtivo.epis?.map((e) => (
                      <Badge key={e} className="bg-primary/10 text-primary border-primary/20">{e}</Badge>
                    ))}
                    {contratoAtivo.riscos?.map((r) => (
                      <Badge key={r} variant="destructive">{r}</Badge>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Descrição do Problema</Label>
                  <Textarea
                    placeholder="Descreva o serviço a ser executado..."
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estimativa de Horas</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 8"
                    value={horasEstimadas}
                    onChange={(e) => setHorasEstimadas(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Saldo disponível: {contratoAtivo.contratado - contratoAtivo.executado} {contratoAtivo.unidade}
                  </p>
                </div>
              </>
            )}

            <Button onClick={handleAgendar} className="w-full" size="lg" disabled={enviado}>
              <Send className="h-4 w-4 mr-2" />
              {enviado ? "Card enviado ao Helena CRM ✓" : "Agendar e Criar Card"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
