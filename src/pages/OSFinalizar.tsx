import { useState, useMemo } from "react";
import { contratos, tecnicos } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, ImagePlus, FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function OSFinalizar() {
  const navigate = useNavigate();
  const [contratoSel, setContratoSel] = useState("");
  const [tecnico, setTecnico] = useState("");
  const [dataExecucao, setDataExecucao] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);

  const contrato = useMemo(() => contratos.find((c) => c.id === contratoSel), [contratoSel]);

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

    if (contrato.tipo === "sanitario") {
      const hash = `HSH-2026-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      toast.success(`Certificado gerado com Hash: ${hash}`);
      navigate(`/visualizar?hash=${hash}&contrato=${contrato.id}&tecnico=${tecnico}&data=${dataExecucao}`);
    } else {
      toast.success("OS encerrada com sucesso. Serviço não sanitário — certificado não aplicável.");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-primary" />
          Encerramento de OS
        </h1>
        <p className="text-muted-foreground text-sm">Registre a execução e gere o certificado sanitário</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Dados da Execução</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Contrato / Serviço</Label>
            <Select value={contratoSel} onValueChange={setContratoSel}>
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

          <Button onClick={handleGerarCertificado} className="w-full" size="lg">
            {contrato?.tipo === "sanitario" ? "Encerrar OS e Gerar Certificado" : "Encerrar OS"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
