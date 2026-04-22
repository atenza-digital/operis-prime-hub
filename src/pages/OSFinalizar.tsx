import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { contratos } from "@/data/mockData";
import { servicosCatalogo } from "@/data/comercialData";
import { getOrdens, updateOrdem, updateAgendamento, addCertificado, getAgendamentos, generateHash, nextCertNumber } from "@/lib/appStore";
import { OSApp, CertificadoApp } from "@/lib/appStore";
import { tecnicos as tecnicosList } from "@/data/equipesData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, ImagePlus, FileCheck2, CalendarPlus, CheckCircle2, X, Upload } from "lucide-react";
import { toast } from "sonner";
import { clientes as clientesCad } from "@/data/comercialData";

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}

export default function OSFinalizar() {
  const navigate = useNavigate();
  const [ordens, setOrdens] = useState<OSApp[]>([]);
  const [osSel, setOsSel] = useState("");
  const [dataExecucao, setDataExecucao] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [fotos, setFotos] = useState<{ preview: string; base64: string }[]>([]);
  const [encerrada, setEncerrada] = useState(false);
  const [certHash, setCertHash] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setOrdens(getOrdens()); }, []);
  function reloadOrdens() { setOrdens(getOrdens()); }

  const ordensAbertas = useMemo(() => ordens.filter(o => o.status === "aberta"), [ordens]);
  const os = useMemo(() => ordens.find(o => o.id === osSel), [osSel, ordens]);
  const contrato = useMemo(() => os ? contratos.find(c => c.id === os.contratoId) : null, [os]);
  const servicoCat = useMemo(() => os ? servicosCatalogo.find(s => s.nome === os.servico) : null, [os]);

  const saldoAtual = useMemo(() => {
    if (!contrato) return 0;
    return contrato.contratado - contrato.executado;
  }, [contrato]);
  const saldoApos = useMemo(() => saldoAtual - Number(quantidade), [saldoAtual, quantidade]);

  // ── foto upload ──────────────────────────────────────────
  function handleFotoClick() {
    if (fotos.length >= 3) { toast.error("Máximo de 3 fotos"); return; }
    fileInputRef.current?.click();
  }

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    files.slice(0, 3 - fotos.length).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        setFotos(prev => [...prev, { preview: base64, base64 }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  function removeFoto(i: number) {
    setFotos(prev => prev.filter((_, idx) => idx !== i));
  }

  // ── encerrar OS ──────────────────────────────────────────
  function handleEncerrar() {
    if (!os) { toast.error("Selecione uma OS"); return; }
    if (!dataExecucao) { toast.error("Informe a data de execução"); return; }
    if (fotos.length < 3) { toast.error("Adicione 3 fotos de evidência"); return; }

    const geraCert = servicoCat?.geraCertificado ?? (os.tipo === "sanitario");
    const hash = geraCert ? generateHash() : undefined;

    // atualiza OS
    updateOrdem(os.id, {
      status: "encerrada",
      dataExecucao,
      quantidade: Number(quantidade),
      fotos: fotos.map(f => f.base64),
      certificadoHash: hash,
    });

    // atualiza agendamento vinculado
    if (os.agendamentoId) {
      updateAgendamento(os.agendamentoId, { status: "encerrado" });
    }

    // gera certificado se aplicável
    if (hash) {
      const clienteCad = clientesCad.find(c => c.razaoSocial === os.clienteNome);
      const cert: CertificadoApp = {
        id: Date.now().toString(),
        hash,
        numero: nextCertNumber(),
        osId: os.id,
        clienteNome: os.clienteNome,
        clienteCnpj: os.clienteCnpj,
        clienteEndereco: clienteCad?.endereco ? `${clienteCad.endereco}, ${clienteCad.bairro}, ${clienteCad.municipio}-${clienteCad.uf}` : os.clienteEndereco,
        clienteLogoUrl: clienteCad?.logoUrl,
        contratoId: os.contratoId,
        servico: os.servico,
        tecnicoNome: os.tecnicoNome,
        localExecucao: os.localExecucao,
        dataExecucao,
        emitidoEm: new Date().toISOString(),
        validadeDias: servicoCat?.validadeCertificadoDias ?? 180,
      };
      addCertificado(cert);
      setCertHash(hash);
      toast.success(`OS encerrada! Certificado gerado: ${hash}`, { description: `Saldo atualizado: ${saldoApos} ${contrato?.unidade}` });
    } else {
      toast.success("OS encerrada com sucesso!", { description: `Saldo atualizado: ${saldoApos} ${contrato?.unidade}` });
    }

    setEncerrada(true);
    reloadOrdens();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-primary" />
          Encerramento de OS
        </h1>
        <p className="text-muted-foreground text-sm">Registre a execução, adicione as fotos e encerre a OS</p>
      </div>

      {ordensAbertas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ClipboardCheck className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">Nenhuma OS aberta encontrada</p>
            <p className="text-xs mt-1">Gere uma OS a partir dos agendamentos</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/agendar")}>
              <CalendarPlus className="h-4 w-4 mr-2" /> Ir para Agendamentos
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 items-start">
          {/* ── Formulário ── */}
          <Card className="lg:sticky lg:top-20">
            <CardHeader><CardTitle>Dados da Execução</CardTitle></CardHeader>
            <CardContent className="space-y-4">

              {/* Seletor de OS */}
              <div className="space-y-1.5">
                <Label>Selecionar OS <span className="text-destructive">*</span></Label>
                <Select value={osSel} onValueChange={v => { setOsSel(v); setEncerrada(false); setFotos([]); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione a OS aberta" /></SelectTrigger>
                  <SelectContent>
                    {ordensAbertas.map(o => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.numero} — {o.clienteNome.split(" ").slice(0, 2).join(" ")} · {o.servico.split(" ").slice(0, 3).join(" ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Info da OS selecionada */}
              {os && (
                <>
                  <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                    <p><span className="text-muted-foreground">Cliente:</span> <strong>{os.clienteNome}</strong></p>
                    <p><span className="text-muted-foreground">Serviço:</span> {os.servico}</p>
                    <p><span className="text-muted-foreground">Local:</span> {os.localExecucao}</p>
                    <p><span className="text-muted-foreground">Técnico:</span> {os.tecnicoNome}</p>
                    {os.tags && <p><span className="text-muted-foreground">TAGs:</span> {os.tags}</p>}
                    <p>
                      <span className="text-muted-foreground">Saldo do contrato: </span>
                      <span className="font-bold">{saldoAtual} {contrato?.unidade}</span>
                    </p>
                    {servicoCat && (
                      <p>
                        <span className="text-muted-foreground">Gera certificado: </span>
                        <Badge variant={servicoCat.geraCertificado ? "default" : "secondary"} className="text-[10px]">
                          {servicoCat.geraCertificado ? "Sim" : "Não"}
                        </Badge>
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Data de Execução <span className="text-destructive">*</span></Label>
                      <Input type="date" value={dataExecucao} onChange={e => setDataExecucao(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Quantidade</Label>
                      <Input type="number" min="1" value={quantidade} onChange={e => setQuantidade(e.target.value)} />
                      {Number(quantidade) > 0 && (
                        <p className={`text-[10px] ${saldoApos < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                          Saldo após: <strong>{saldoApos} {contrato?.unidade}</strong>
                          {saldoApos < 0 && " ⚠️ excede saldo!"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Upload de fotos */}
                  <div className="space-y-2">
                    <Label>Fotos de Evidência <span className="text-destructive">*</span> (3 obrigatórias)</Label>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFotoChange} />
                    <div className="flex gap-3">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="relative">
                          {fotos[i] ? (
                            <div className="h-24 w-24 rounded-lg border-2 border-primary overflow-hidden relative group">
                              <img src={fotos[i].preview} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                              {!encerrada && (
                                <button onClick={() => removeFoto(i)}
                                  className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <X className="h-3 w-3 text-white" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <button onClick={handleFotoClick} disabled={encerrada}
                              className="h-24 w-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-xs text-muted-foreground hover:border-primary/50 transition-colors disabled:opacity-50">
                              <ImagePlus className="h-5 w-5 mb-1" />
                              Foto {i + 1}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{fotos.length}/3 fotos adicionadas</p>
                  </div>

                  {!encerrada && (
                    <Button onClick={handleEncerrar} className="w-full" size="lg">
                      <FileCheck2 className="h-4 w-4 mr-2" />
                      {servicoCat?.geraCertificado ? "Encerrar e Gerar Certificado" : "Encerrar OS"}
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* ── Resultado após encerramento ── */}
          <div className="space-y-4">
            {encerrada && os ? (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <CheckCircle2 className="h-5 w-5" /> OS Encerrada com Sucesso
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><p className="text-xs text-muted-foreground">OS</p><p className="font-bold">{os.numero}</p></div>
                    <div><p className="text-xs text-muted-foreground">Data</p><p className="font-bold">{fmtDate(dataExecucao)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Saldo Anterior</p><p className="font-bold">{saldoAtual} {contrato?.unidade}</p></div>
                    <div><p className="text-xs text-muted-foreground">Saldo Atual</p><p className={`font-bold ${saldoApos <= 0 ? "text-destructive" : ""}`}>{saldoApos} {contrato?.unidade}</p></div>
                  </div>

                  {certHash && (
                    <div className="rounded-lg border border-primary/20 bg-card p-4 space-y-2">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <FileCheck2 className="h-4 w-4 text-primary" /> Certificado Gerado
                      </p>
                      <p className="font-mono text-lg font-bold text-primary">{certHash}</p>
                      <Button variant="outline" className="w-full" onClick={() => navigate(`/certificados?hash=${certHash}`)}>
                        <FileCheck2 className="h-4 w-4 mr-2" /> Ver Certificado
                      </Button>
                    </div>
                  )}

                  {saldoApos <= 0 && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                      <p className="text-sm font-medium text-destructive">Contrato sem saldo</p>
                      <p className="text-xs text-muted-foreground mt-1">Necessário renovação para novos agendamentos.</p>
                    </div>
                  )}

                  {/* Fotos adicionadas */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Fotos registradas:</p>
                    <div className="flex gap-2">
                      {fotos.map((f, i) => (
                        <img key={i} src={f.preview} alt={`Evidência ${i + 1}`} className="h-20 w-20 rounded-lg object-cover border" />
                      ))}
                    </div>
                  </div>

                  <Button variant="outline" onClick={() => { setOsSel(""); setEncerrada(false); setFotos([]); setCertHash(""); }} className="w-full">
                    Encerrar outra OS
                  </Button>
                </CardContent>
              </Card>
            ) : (
              /* ── Lista de OS abertas ── */
              <Card>
                <CardHeader><CardTitle>OS Abertas ({ordensAbertas.length})</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {ordensAbertas.map(o => (
                    <div key={o.id} className={`rounded-lg border p-3 cursor-pointer transition-colors hover:bg-muted/50 ${osSel === o.id ? "border-primary bg-primary/5" : ""}`}
                      onClick={() => { setOsSel(o.id); setEncerrada(false); setFotos([]); }}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{o.numero}</p>
                          <p className="text-xs text-muted-foreground">{o.clienteNome}</p>
                          <p className="text-xs text-muted-foreground">{o.servico}</p>
                          <p className="text-xs text-muted-foreground">📍 {o.localExecucao}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0">Aberta</Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
