import { useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import { contratos, licencas } from "@/data/mockData";
import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck } from "lucide-react";

export default function Visualizador() {
  const [params] = useSearchParams();
  const hash = params.get("hash") || "HSH-2026-X89";
  const contratoId = params.get("contrato") || "CT-001";
  const tecnico = params.get("tecnico") || "João Silva";
  const dataExec = params.get("data") || "2026-03-18";

  const contrato = useMemo(() => contratos.find((c) => c.id === contratoId), [contratoId]);

  if (!contrato) {
    return <p className="text-center text-muted-foreground py-12">Contrato não encontrado.</p>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="border rounded-xl bg-card shadow-lg overflow-hidden print:shadow-none">
        {/* Header bar */}
        <div className="bg-surface-dark text-surface-dark-foreground px-8 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">{licencas.empresa}</h2>
            <p className="text-xs text-surface-dark-foreground/60 mt-0.5">CNPJ: {licencas.cnpj}</p>
          </div>
          <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center font-bold text-primary-foreground text-lg">
            CP
          </div>
        </div>

        {/* Title */}
        <div className="text-center py-5 border-b">
          <h1 className="text-lg font-bold uppercase tracking-widest text-foreground">
            Certificado de Execução de Serviço Sanitário
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Documento com validade técnica e jurídica</p>
        </div>

        <div className="px-8 py-6 space-y-5 text-sm">
          {/* Client info */}
          <section className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Cliente</p>
              <p className="font-semibold">{contrato.cliente}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">CNPJ</p>
              <p className="font-mono">{contrato.cnpj}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Serviço</p>
              <p className="font-semibold">{contrato.servico}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Data de Execução</p>
              <p>{new Date(dataExec).toLocaleDateString("pt-BR")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Técnico Responsável</p>
              <p>{tecnico}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Contrato</p>
              <p className="font-mono">{contrato.id}</p>
            </div>
          </section>

          {/* Products */}
          {contrato.produtosQuimicos && (
            <section>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Produtos Utilizados</p>
              <ul className="list-disc list-inside text-sm space-y-0.5">
                {contrato.produtosQuimicos.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </section>
          )}

          {/* Licences */}
          <section className="rounded-lg border p-4 bg-accent/50 space-y-1.5">
            <p className="text-xs uppercase tracking-wide font-semibold text-accent-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" /> Licenças e Registros
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
              <p><span className="text-muted-foreground">Alvará:</span> {licencas.alvara}</p>
              <p><span className="text-muted-foreground">CR.02:</span> {licencas.cr02}</p>
              <p><span className="text-muted-foreground">ANVISA:</span> {licencas.anvisa}</p>
              <p><span className="text-muted-foreground">Vig. Sanitária:</span> {licencas.vigilanciaSanitaria}</p>
              <p className="col-span-2"><span className="text-muted-foreground">Resp. Técnico:</span> {licencas.responsavelTecnico}</p>
            </div>
          </section>

          {/* Security elements */}
          <section className="flex items-start justify-between gap-6 border-t pt-5">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Código de Validação</p>
              <p className="font-mono text-lg font-bold text-primary">{hash}</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Este certificado pode ser verificado através do QR Code ou do código hash acima. Documento com validade de 180 dias a partir da data de execução.
              </p>
            </div>
            <div className="shrink-0 rounded-lg border p-2 bg-card">
              <QRCodeSVG
                value={`https://ciperprag.com.br/verificar/${hash}`}
                size={96}
                level="H"
              />
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="bg-surface-dark text-surface-dark-foreground/60 px-8 py-3 text-xs text-center">
          {licencas.empresa} · CNPJ {licencas.cnpj} · Alvará {licencas.alvara} · Documento gerado automaticamente
        </div>
      </div>
    </div>
  );
}
