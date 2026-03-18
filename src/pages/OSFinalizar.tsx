import { useState, useMemo } from "react";
import { contratos, tecnicos } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, ImagePlus, FileCheck2, CalendarPlus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function OSFinalizar() {
  const navigate = useNavigate();
  const [contratoSel, setContratoSel] = useState("");
  const [tecnico, setTecnico] = useState("");
  const [dataExecucao, setDataExecucao] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [fotos, setFotos] = useState<string[]>([]);
  const [encerrada, setEncerrada] = useState(false);
  const [sugestaoData, setSugestaoData] = useState("");

  const contrato = useMemo(() => contratos.find((c) => c.id === contratoSel), [contratoSel]);

  const saldoAtual = useMemo(() => {
    if (!contrato) return 0;
    return contrato.contratado - contrato.executado;
  }, [contrato]);

  const saldoApos = useMemo(() => {
    if (!contrato) return 0;
    return saldoAtual - Number(quantidade);
  }, [saldoAtual, quantidade, contrato]);

  const handleFoto = () => {
    if (fotos.length >= 3) return;
    setFotos((prev) => [...prev, `evidencia_${prev.length + 1}.jpg`]);
    toast.info(`Foto ${fotos.length + 1} adicionada`);
  };

  const handleGerarCertificado = () => {
    if (!contrato || !tecnico || !dataExecucao) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (fotos.length < 3) {
      toast.error("Adicione 3 fotos de evidência");
      return;
    }

    setEncerrada(true);

    // Calculate suggested next date based on recurrence
    if (contrato.validadeDias > 0 && saldoApos > 0) {
      const dataExec = new Date(dataExecucao);
      dataExec.setDate(dataExec.getDate() + contrato.validadeDias);
      setSugestaoData(dataExec.toISOString().split("T")[0]);
    }

    if (contrato.tipo === "sanitario") {
      const hash = `HSH-2026-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      toast.success(`OS encerrada! Certificado gerado: ${hash}`, {
        description: `Saldo atualizado: ${saldoApos} ${contrato.unidade}`,
      });
    } else {
      toast.success("OS encerrada com sucesso!", {
        description: `Saldo atualizado: ${saldoApos} ${contrato.unidade}. Serviço não sanitário — certificado não aplicável.`,
      });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-primary" />
          Encerramento de OS
        </h1>
        <p className="text-muted-foreground text-sm">Registre a execução, dê baixa no contrato e gere o certificado</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Dados da Execução</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Contrato / Serviço</Label>
            <Select value={contratoSel} onValueChange={(v) => { setContratoSel(v); setEncerrada(false); }}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {contratos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.cliente} — {c.servico} ({c.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {contrato && (
            <div className="rounded-lg border p-3 bg-muted/50 space-y-1">
              <p className="text-xs text-muted-foreground">
                Saldo atual: <span className="font-bold text-foreground">{saldoAtual} {contrato.unidade}</span>
                {" "}(Contratado: {contrato.contratado} | Executado: {contrato.executado})
              </p>
              {contrato.validadeDias > 0 && (
                <p className="text-xs text-muted-foreground">
                  Recorrência: a cada <span className="font-bold text-foreground">{contrato.validadeDias} dias</span>
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Técnico Responsável</Label>
              <Select value={tecnico} onValueChange={setTecnico}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {tecnicos.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data da Execução</Label>
              <Input type="date" value={dataExecucao} onChange={(e) => setDataExecucao(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Quantidade Executada</Label>
            <Input
              type="number"
              min="1"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
            {contrato && Number(quantidade) > 0 && (
              <p className="text-xs text-muted-foreground">
                Saldo após baixa: <span className={`font-bold ${saldoApos < 0 ? "text-destructive" : "text-foreground"}`}>
                  {saldoApos} {contrato.unidade}
                </span>
                {saldoApos < 0 && <span className="text-destructive ml-1">(excede o saldo!)</span>}
              </p>
            )}
          </div>

          {/* Fotos */}
          <div className="space-y-2">
            <Label>Fotos de Evidência (3 obrigatórias)</Label>
            <div className="flex gap-3">
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  onClick={handleFoto}
                  disabled={fotos.length > i}
                  className={`h-24 w-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-xs transition-colors ${
                    fotos.length > i
                      ? "border-primary bg-accent text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {fotos.length > i ? (
                    <>
                      <FileCheck2 className="h-5 w-5 mb-1" />
                      {fotos[i]}
                    </>
                  ) : (
                    <>
                      <ImagePlus className="h-5 w-5 mb-1" />
                      Foto {i + 1}
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

          {contrato && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">
                Tipo: <Badge variant={contrato.tipo === "sanitario" ? "default" : "secondary"} className="ml-1">
                  {contrato.tipo === "sanitario" ? "Sanitário — Certificado será gerado" : "Manutenção — Sem certificado"}
                </Badge>
              </p>
            </div>
          )}

          {!encerrada ? (
            <Button onClick={handleGerarCertificado} className="w-full" size="lg">
              {contrato?.tipo === "sanitario" ? "Encerrar OS e Gerar Certificado" : "Encerrar OS"}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {/* Post-closure: Balance update + Next date suggestion */}
      {encerrada && contrato && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="h-5 w-5" />
              OS Encerrada com Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Saldo Anterior</p>
                <p className="font-bold">{saldoAtual} {contrato.unidade}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo Atualizado</p>
                <p className="font-bold">{saldoApos} {contrato.unidade}</p>
              </div>
            </div>

            {saldoApos > 0 && contrato.validadeDias > 0 && sugestaoData && (
              <div className="rounded-lg border border-primary/20 bg-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarPlus className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">Sugestão de Próximo Agendamento</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Com base na recorrência de <strong>{contrato.validadeDias} dias</strong>, a próxima execução é sugerida para:
                </p>
                <p className="text-lg font-bold text-primary">
                  {new Date(sugestaoData).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                </p>
                <p className="text-xs text-muted-foreground">
                  Restam <strong>{saldoApos} {contrato.unidade}</strong> no contrato.
                  A atendente pode entrar em contato com o cliente para confirmar esta data ou propor uma nova.
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate("/agendar")}
                  className="w-full"
                >
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Ir para Agendamento
                </Button>
              </div>
            )}

            {saldoApos <= 0 && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <p className="text-sm font-medium text-destructive">Contrato sem saldo</p>
                <p className="text-xs text-muted-foreground mt-1">
                  O saldo deste contrato foi esgotado. É necessário renovação para novos agendamentos.
                </p>
              </div>
            )}

            {contrato.tipo === "sanitario" && (
              <Button
                onClick={() => navigate(`/visualizar?contrato=${contrato.id}&tecnico=${tecnico}&data=${dataExecucao}`)}
                variant="outline"
                className="w-full"
              >
                <FileCheck2 className="h-4 w-4 mr-2" />
                Visualizar Certificado Gerado
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
