import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getCertificados, getOrdens, addCertificado, generateHash, nextCertNumber, CertificadoApp, addDays } from "@/lib/appStore";
import { servicosCatalogo, clientes as clientesCad } from "@/data/comercialData";
import { licencas } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Award, Download, Eye, Plus, Search, CheckCircle2, XCircle, Clock, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
import CertificadoImpressao from "@/components/CertificadoImpressao";

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}

function validadeStatus(cert: CertificadoApp) {
  if (!cert.validadeDias) return "valid";
  const expiry = new Date(addDays(cert.dataExecucao, cert.validadeDias) + "T23:59:59");
  const today = new Date();
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "expiring";
  return "valid";
}

export default function Certificados() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [certificados, setCertificados] = useState<CertificadoApp[]>([]);
  const [ordens, setOrdens] = useState(getOrdens());
  const [busca, setBusca] = useState(searchParams.get("hash") || "");
  const [certVer, setCertVer] = useState<CertificadoApp | null>(null);
  const [gerando, setGerando] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCertificados(getCertificados());
    setOrdens(getOrdens());
  }, []);

  // OS encerradas que ainda não têm certificado gerado E cujo serviço gera certificado
  const osSemCert = useMemo(() => {
    const hashsGerados = new Set(certificados.map(c => c.osId));
    return ordens.filter(o => {
      if (o.status !== "encerrada") return false;
      if (hashsGerados.has(o.id)) return false;
      const svc = servicosCatalogo.find(s => s.nome === o.servico);
      return svc?.geraCertificado ?? (o.tipo === "sanitario");
    });
  }, [ordens, certificados]);

  const certsFiltrados = useMemo(() => {
    const q = busca.toLowerCase();
    return [...certificados]
      .reverse()
      .filter(c =>
        !q ||
        c.clienteNome.toLowerCase().includes(q) ||
        c.hash.toLowerCase().includes(q) ||
        c.servico.toLowerCase().includes(q) ||
        c.numero.includes(q)
      );
  }, [certificados, busca]);

  function handleGerarCert(osId: string) {
    const os = ordens.find(o => o.id === osId);
    if (!os) return;
    setGerando(true);
    const svc = servicosCatalogo.find(s => s.nome === os.servico);
    const clienteCad = clientesCad.find(c => c.razaoSocial === os.clienteNome);
    const hash = generateHash();
    const cert: CertificadoApp = {
      id: Date.now().toString(),
      hash,
      numero: nextCertNumber(),
      osId: os.id,
      osNumero: os.numero,
      clienteId: os.clienteId,
      clienteNome: os.clienteNome,
      clienteCnpj: os.clienteCnpj,
      clienteEndereco: clienteCad
        ? `${clienteCad.endereco}, ${clienteCad.bairro}, ${clienteCad.municipio}-${clienteCad.uf}`
        : os.clienteEndereco,
      clienteLogoUrl: clienteCad?.logoUrl,
      contratoId: os.contratoId,
      servico: os.servico,
      tecnicoNome: os.tecnicoNome,
      localExecucao: os.localExecucao,
      dataExecucao: os.dataExecucao || os.dataEmissao,
      emitidoEm: new Date().toISOString(),
      validadeDias: svc?.validadeCertificadoDias ?? 180,
      produtosQuimicos: svc?.produtosQuimicos,
    };
    addCertificado(cert);
    setCertificados(getCertificados());
    setOrdens(getOrdens());
    setGerando(false);
    toast.success(`Certificado ${hash} gerado com sucesso!`);
    setCertVer(cert);
  }

  function handleImprimir() {
    window.print();
  }

  async function handleCompartilhar(cert: CertificadoApp) {
    const text = `Certificado Ciperprag\nCliente: ${cert.clienteNome}\nServiço: ${cert.servico}\nData: ${fmtDate(cert.dataExecucao)}\nCódigo: ${cert.hash}\nVerifique em: https://ciperprag.com.br/verificar/${cert.hash}`;
    if (navigator.share) {
      await navigator.share({ title: "Certificado Ciperprag", text });
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Informações copiadas para a área de transferência");
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            Certificados
          </h1>
          <p className="text-muted-foreground text-sm">Gerencie e emita certificados de serviços executados</p>
        </div>
        <div className="flex gap-2 text-sm">
          <div className="flex items-center gap-1.5 rounded-lg border px-3 py-2 bg-card">
            <Award className="h-4 w-4 text-primary" />
            <span className="font-bold">{certificados.length}</span>
            <span className="text-muted-foreground">emitidos</span>
          </div>
          {osSemCert.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-3 py-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="font-bold text-amber-700 dark:text-amber-400">{osSemCert.length}</span>
              <span className="text-amber-600 dark:text-amber-400">pendente(s)</span>
            </div>
          )}
        </div>
      </div>

      {/* ── OS pendentes de certificado ── */}
      {osSemCert.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <Clock className="h-4 w-4" /> OS encerradas aguardando certificado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {osSemCert.map(os => (
              <div key={os.id} className="flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-white dark:bg-card p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{os.numero}</span>
                    <Badge variant="outline" className="text-[10px]">{os.tipo === "sanitario" ? "Sanitário" : "Manutenção"}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{os.clienteNome} · {os.servico}</p>
                  <p className="text-xs text-muted-foreground">Executado em {fmtDate(os.dataExecucao || os.dataEmissao)}</p>
                </div>
                <Button size="sm" onClick={() => handleGerarCert(os.id)} disabled={gerando}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Gerar Cert.
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Busca ── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar por cliente, hash, serviço ou número..."
          className="pl-9"
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      {/* ── Lista de certificados ── */}
      {certsFiltrados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Award className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">{busca ? "Nenhum certificado encontrado" : "Nenhum certificado emitido ainda"}</p>
            <p className="text-xs mt-1">Os certificados são gerados ao encerrar uma OS com serviço configurado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {certsFiltrados.map(cert => {
            const vStatus = validadeStatus(cert);
            const expiry = cert.validadeDias > 0 ? addDays(cert.dataExecucao, cert.validadeDias) : null;
            return (
              <Card key={cert.id} className={`transition-all hover:shadow-md ${vStatus === "expired" ? "border-destructive/30 bg-destructive/5" : vStatus === "expiring" ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/10" : ""}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="font-mono text-xs font-bold text-primary">{cert.hash}</span>
                        {vStatus === "valid" && <Badge className="text-[9px] h-4 bg-green-600">Válido</Badge>}
                        {vStatus === "expiring" && <Badge className="text-[9px] h-4 bg-amber-500">A vencer</Badge>}
                        {vStatus === "expired" && <Badge variant="destructive" className="text-[9px] h-4">Vencido</Badge>}
                      </div>
                      <p className="font-semibold text-sm truncate">{cert.clienteNome}</p>
                      <p className="text-xs text-muted-foreground truncate">{cert.servico}</p>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>📅 Executado: <span className="text-foreground font-medium">{fmtDate(cert.dataExecucao)}</span></p>
                    {expiry && <p>⏳ Validade até: <span className={`font-medium ${vStatus === "expired" ? "text-destructive" : vStatus === "expiring" ? "text-amber-600" : "text-foreground"}`}>{fmtDate(expiry)}</span></p>}
                    <p>📍 {cert.localExecucao}</p>
                    <p className="font-mono">Nº {cert.numero}</p>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setCertVer(cert)}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> Ver
                    </Button>
                    <Button size="sm" variant="ghost" className="px-2" onClick={() => handleCompartilhar(cert)} title="Compartilhar">
                      <Share2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Dialog Visualizar/Imprimir Certificado ── */}
      <Dialog open={!!certVer} onOpenChange={v => { if (!v) setCertVer(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 pb-0 print:hidden">
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Certificado {certVer?.hash}
              </span>
              <Button size="sm" onClick={handleImprimir} className="mr-6">
                <Printer className="h-4 w-4 mr-1.5" /> Imprimir / PDF
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div ref={printRef} className="p-4">
            {certVer && <CertificadoImpressao cert={certVer} />}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Print styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,600;0,700;1,700&display=swap');
        @media print {
          body * { visibility: hidden !important; }
          #certificado-print, #certificado-print * { visibility: visible !important; }
          #certificado-print { position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
