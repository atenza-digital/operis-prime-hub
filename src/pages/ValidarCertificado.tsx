import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import logoCiperprag from "@/assets/logo_ciperprag_certificado.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCertificateVerification, type CertificateVerification } from "@/lib/api";
import { formatDateBr, formatTimeBr } from "@/lib/formatters";
import { AlertTriangle, CheckCircle2, QrCode, Search, ShieldAlert, ShieldCheck } from "lucide-react";

export default function ValidarCertificado() {
  const { hash = "" } = useParams();
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState(hash);
  const [certificate, setCertificate] = useState<CertificateVerification | null>(null);
  const [verifiedAt, setVerifiedAt] = useState<string>("");
  const [loading, setLoading] = useState(Boolean(hash));
  const [error, setError] = useState("");

  async function loadCertificate(targetHash: string) {
    const normalized = targetHash.trim().toUpperCase();
    if (!normalized) {
      setCertificate(null);
      setError("");
      setVerifiedAt("");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await getCertificateVerification(normalized);
      setCertificate(response.certificate);
      setVerifiedAt(response.verifiedAt);
      setCodigo(response.certificate.hash);
    } catch (err) {
      setCertificate(null);
      setVerifiedAt("");
      setError(err instanceof Error ? err.message : "Não foi possível validar o certificado.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (hash) {
      setCodigo(hash);
      loadCertificate(hash);
    }
  }, [hash]);

  const status = certificate?.status ?? null;
  const statusBlock = useMemo(() => {
    if (!certificate) return null;
    if (status === "valid") {
      return {
        icon: ShieldCheck,
        title: "Certificado válido",
        description: "Este certificado foi localizado na base oficial da Ciperprag. Confira abaixo se os dados batem com o documento impresso.",
        tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
      };
    }
    return {
      icon: ShieldAlert,
      title: "Certificado localizado, porém vencido",
      description: "O certificado existe na base oficial, mas o prazo de validade informado já foi encerrado.",
      tone: "border-amber-200 bg-amber-50 text-amber-900",
    };
  }, [certificate, status]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7faf7_0%,#edf4ef_100%)] px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-lg border border-emerald-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <img src={logoCiperprag} alt="Ciperprag" className="h-16 w-auto object-contain" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Validação oficial</p>
                <h1 className="text-3xl font-black tracking-tight text-slate-950">Autenticidade de certificado</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Leia o QR Code do certificado ou informe o código abaixo. A validação considera exclusivamente os dados oficiais gravados no banco da aplicação.
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-950">
              <div className="flex items-center gap-2 font-semibold">
                <QrCode className="h-4 w-4" />
                Verificação antifraude
              </div>
              <p className="mt-1 max-w-xs text-xs leading-5 text-emerald-800">
                O certificado só deve ser considerado autêntico quando o código e os dados desta tela coincidirem com o documento apresentado.
              </p>
            </div>
          </div>
        </div>

        <Card className="border-emerald-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Consultar código</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-3 md:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                const normalized = codigo.trim().toUpperCase();
                navigate(normalized ? `/validar-certificado/${encodeURIComponent(normalized)}` : "/validar-certificado");
                loadCertificate(normalized);
              }}
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={codigo}
                  onChange={(event) => setCodigo(event.target.value.toUpperCase())}
                  placeholder="Ex.: HSH-2026-ABCD-EF89"
                  className="h-11 pl-9 font-mono"
                />
              </div>
              <Button type="submit" className="h-11 px-6">Validar certificado</Button>
            </form>
            {loading ? <p className="mt-3 text-sm text-slate-500">Validando código oficial...</p> : null}
            {!loading && error ? (
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Certificado não localizado</p>
                  <p className="text-sm text-red-800">
                    {error}. Se o documento apresentar este código, trate como suspeita e confirme com a equipe responsável.
                  </p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {certificate && statusBlock ? (
          <>
            <div className={`rounded-lg border p-5 ${statusBlock.tone}`}>
              <div className="flex items-start gap-3">
                <statusBlock.icon className="mt-0.5 h-6 w-6 shrink-0" />
                <div>
                  <h2 className="text-lg font-bold">{statusBlock.title}</h2>
                  <p className="mt-1 text-sm leading-6">{statusBlock.description}</p>
                  <p className="mt-2 text-xs font-medium">
                    Última verificação: {formatDateBr(verifiedAt)} {formatTimeBr(verifiedAt)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["Código do certificado", certificate.hash],
                ["Número do certificado", certificate.numero],
                ["Ordem de serviço", certificate.osNumero || "—"],
                ["Cliente", certificate.clienteNome],
                ["CNPJ", certificate.clienteCnpj],
                ["Serviço", certificate.servico],
                ["Local de execução", certificate.localExecucao || "—"],
                ["Técnico responsável", certificate.tecnicoNome || "—"],
                ["Data de execução", formatDateBr(certificate.dataExecucao)],
                ["Emissão", formatDateBr(certificate.emitidoEm)],
                ["Validade até", certificate.validadeAte ? formatDateBr(certificate.validadeAte) : "Indeterminada"],
                ["Tag do equipamento", certificate.tagEquipamentoServico || "—"],
              ].map(([label, value]) => (
                <Card key={label} className="border-slate-200 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="flex flex-col gap-3 p-5 text-sm text-slate-700">
                <div className="flex items-center gap-2 font-semibold text-slate-950">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Como validar sem dúvida
                </div>
                <p>Compare o código, cliente, serviço, data de execução e local desta tela com o certificado apresentado.</p>
                <p>Se qualquer dado divergir, considere o documento inconsistente, mesmo que o layout visual esteja parecido.</p>
                <p className="text-slate-500">
                  Consulta interna: <Link to="/certificados" className="font-semibold text-emerald-700 hover:text-emerald-800">abrir módulo de certificados</Link>
                </p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
