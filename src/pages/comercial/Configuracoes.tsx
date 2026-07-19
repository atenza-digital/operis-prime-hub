import { useEffect, useMemo, useState } from "react";
import { getBootstrap, saveCompanyConfig, saveNumberingConfig, type EmpresaConfig, type NumeracaoConfig } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Building2, Hash, ShieldCheck, Save, Image, FileCheck2, ReceiptText, Upload } from "lucide-react";
import { toast } from "sonner";

const defaultEmpresa: EmpresaConfig = {
  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  endereco: "",
  telefone: "",
  email: "",
  logoUrl: "",
  corPrimaria: "#0b7a53",
  corSecundaria: "#64748b",
  corDestaque: "#0f5138",
  alvara: "",
  cr02: "",
  anvisa: "",
  vigilanciaSanitaria: "",
  responsavelTecnico: "",
  responsavelExecucao: "",
  cargoResponsavel: "",
  certificadoValidadePadraoDias: 30,
  certificadoTextoLegal: "",
  certificadoTextoFixacao: "FIXAR OBRIGATORIAMENTE EM LOCAL VISÍVEL",
  telefoneEmergencia: "",
  medicaoFormaPagamentoPadrao: "Medição mensal - NF/Boleto",
  medicaoLocalEntregaPadrao: "",
  certificadoConfig: {
    templateCodigo: "certificado-garantia",
    templateVersao: "saas-tenant-v1",
    titulo: "Certificado de Garantia",
    subtitulo: "",
    exibirQrCode: true,
    exibirFotos: true,
    limiteFotos: 3,
    exibirProdutosQuimicos: true,
  },
};

const defaultNumeracao: NumeracaoConfig = {
  propostaFormato: "PROP-{SEQ}/{ANO}",
  propostaUltimo: 0,
  contratoFormato: "CT-{SEQ}/{ANO}",
  contratoUltimo: 0,
  osFormato: "OS-{SEQ}/{ANO}",
  osUltimo: 0,
  certificadoFormato: "CERT-{SEQ}/{ANO}",
  certificadoUltimo: 0,
  medicaoFormato: "MED-{SEQ}/{ANO}",
  medicaoUltimo: 0,
};

function gerarNumero(formato: string, sequencia: number) {
  return formato
    .replace("{SEQ}", String(sequencia).padStart(3, "0"))
    .replace("{ANO}", String(new Date().getFullYear()));
}

function NumberingCard({
  title,
  formato,
  ultimo,
  onFormato,
  onUltimo,
}: {
  title: string;
  formato: string;
  ultimo: number;
  onFormato: (value: string) => void;
  onUltimo: (value: number) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h4 className="text-sm font-semibold">{title}</h4>
      <div className="space-y-2">
        <Label className="text-xs">Formato</Label>
        <Input value={formato} onChange={(event) => onFormato(event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Último número</Label>
        <Input type="number" value={ultimo} onChange={(event) => onUltimo(Number(event.target.value))} />
      </div>
      <p className="text-xs text-muted-foreground">Próximo: <span className="font-mono font-bold">{gerarNumero(formato, ultimo + 1)}</span></p>
    </div>
  );
}

function readImageFile(file: File, onLoad: (value: string) => void) {
  const reader = new FileReader();
  reader.onload = (loadEvent) => onLoad(String(loadEvent.target?.result || ""));
  reader.readAsDataURL(file);
}

function AssetUploadCard({
  title,
  description,
  value,
  previewClassName = "bg-muted",
  onChange,
}: {
  title: string;
  description: string;
  value?: string;
  previewClassName?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className={`mb-4 flex h-24 items-center justify-center overflow-hidden rounded-xl ${previewClassName}`}>
        {value ? (
          <img src={value} alt={title} className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-xs text-muted-foreground">Não configurado</span>
        )}
      </div>
      <div className="space-y-2">
        <Label>{title}</Label>
        <Input
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            readImageFile(file, onChange);
            event.target.value = "";
          }}
          className="text-sm"
        />
        <Input value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder="URL ou Data URL/base64" />
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export default function Configuracoes() {
  const [empresa, setEmpresa] = useState<EmpresaConfig>(defaultEmpresa);
  const [numeracao, setNumeracao] = useState<NumeracaoConfig>(defaultNumeracao);
  const [loading, setLoading] = useState(true);
  const [savingEmpresa, setSavingEmpresa] = useState(false);
  const [savingNumeracao, setSavingNumeracao] = useState(false);
  const [certificadoConfigText, setCertificadoConfigText] = useState("{}");

  async function reload() {
    setLoading(true);
    try {
      const data = await getBootstrap();
      const mergedEmpresa = { ...defaultEmpresa, ...data.companyConfig, logoUrl: data.companyConfig?.logoUrl || "" };
      setEmpresa(mergedEmpresa);
      setCertificadoConfigText(JSON.stringify(mergedEmpresa.certificadoConfig || {}, null, 2));
      setNumeracao({ ...defaultNumeracao, ...data.numberingConfig });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleSaveEmpresa() {
    setSavingEmpresa(true);
    try {
      const certificadoConfig = certificadoConfigText.trim() ? JSON.parse(certificadoConfigText) : {};
      await saveCompanyConfig({ ...empresa, certificadoConfig });
      toast.success("Configurações da empresa salvas");
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar empresa");
    } finally {
      setSavingEmpresa(false);
    }
  }

  async function handleSaveNumeracao() {
    setSavingNumeracao(true);
    try {
      await saveNumberingConfig(numeracao);
      toast.success("Configurações de numeração salvas");
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar numeração");
    } finally {
      setSavingNumeracao(false);
    }
  }

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    readImageFile(file, (value) => {
      setEmpresa((prev) => ({ ...prev, logoUrl: value }));
      const currentConfig = readCertificadoConfig();
      setCertificadoConfigText(JSON.stringify({ ...currentConfig, documentLogoLightUrl: value, logoPrincipalUrl: value }, null, 2));
      toast.success("Logo atualizada na tela. Salve para gravar no banco.");
    });
    event.target.value = "";
  }

  function readCertificadoConfig() {
    try {
      return certificadoConfigText.trim() ? JSON.parse(certificadoConfigText) : {};
    } catch {
      return {};
    }
  }

  function updateCertificadoConfig(key: string, value: unknown) {
    const currentConfig = readCertificadoConfig();
    setCertificadoConfigText(JSON.stringify({ ...currentConfig, [key]: value }, null, 2));
  }

  function handleInterfaceLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    readImageFile(file, (value) => {
      const currentConfig = readCertificadoConfig();
      setCertificadoConfigText(JSON.stringify({ ...currentConfig, sidebarLogoDarkUrl: value, logoInterfaceUrl: value }, null, 2));
      toast.success("Logo da interface atualizada na tela. Salve para gravar no banco.");
    });
    event.target.value = "";
  }

  const certificadoConfig = useMemo(() => {
    try {
      return certificadoConfigText.trim() ? JSON.parse(certificadoConfigText) : {};
    } catch {
      return {};
    }
  }, [certificadoConfigText]);
  const interfaceLogoUrl = (certificadoConfig.sidebarLogoDarkUrl || certificadoConfig.logoInterfaceUrl) as string | undefined;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Settings className="h-6 w-6 text-primary" />
          Configurações
        </h2>
        <p className="text-sm text-muted-foreground">Identidade, licenças, textos e numerações usados nos documentos operacionais.</p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">Carregando configurações...</CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Image className="h-5 w-5" />Identidade Visual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                <div className="flex h-20 w-full max-w-60 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-card">
                  {empresa.logoUrl ? <img src={empresa.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" /> : <span className="text-sm text-muted-foreground">Sem logo</span>}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <Label>Alterar logo</Label>
                  <Input type="file" accept="image/*" onChange={handleLogoChange} className="w-full max-w-md text-sm" />
                  <p className="text-xs text-muted-foreground">A logo será usada como fallback documental do tenant.</p>
                </div>
              </div>
              <div className="flex flex-col gap-4 rounded-2xl border bg-slate-950 p-4 sm:flex-row sm:items-center sm:gap-6">
                <div className="flex h-20 w-full max-w-60 shrink-0 items-center justify-center overflow-hidden">
                  {interfaceLogoUrl ? <img src={interfaceLogoUrl} alt="Logo da interface" className="max-h-full max-w-full object-contain" /> : <span className="text-sm text-white/60">Sem logo de interface</span>}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <Label className="text-white">Logo da interface</Label>
                  <Input type="file" accept="image/*" onChange={handleInterfaceLogoChange} className="w-full max-w-md bg-white text-sm" />
                  <p className="text-xs text-white/65">Usada no menu lateral e em áreas internas com fundo escuro. Ideal para versões claras da marca.</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Cor primaria</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={empresa.corPrimaria || "#0b7a53"}
                      onChange={(event) => setEmpresa({ ...empresa, corPrimaria: event.target.value })}
                      className="h-10 w-14 p-1"
                    />
                    <Input value={empresa.corPrimaria || ""} onChange={(event) => setEmpresa({ ...empresa, corPrimaria: event.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cor secundaria</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={empresa.corSecundaria || "#64748b"}
                      onChange={(event) => setEmpresa({ ...empresa, corSecundaria: event.target.value })}
                      className="h-10 w-14 p-1"
                    />
                    <Input value={empresa.corSecundaria || ""} onChange={(event) => setEmpresa({ ...empresa, corSecundaria: event.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cor de destaque</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={empresa.corDestaque || "#0f5138"}
                      onChange={(event) => setEmpresa({ ...empresa, corDestaque: event.target.value })}
                      className="h-10 w-14 p-1"
                    />
                    <Input value={empresa.corDestaque || ""} onChange={(event) => setEmpresa({ ...empresa, corDestaque: event.target.value })} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Building2 className="h-5 w-5" />Dados da Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Razão Social</Label>
                  <Input value={empresa.razaoSocial} onChange={(event) => setEmpresa({ ...empresa, razaoSocial: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Nome Fantasia</Label>
                  <Input value={empresa.nomeFantasia} onChange={(event) => setEmpresa({ ...empresa, nomeFantasia: event.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input value={empresa.cnpj} onChange={(event) => setEmpresa({ ...empresa, cnpj: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={empresa.telefone} onChange={(event) => setEmpresa({ ...empresa, telefone: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input value={empresa.email} onChange={(event) => setEmpresa({ ...empresa, email: event.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input value={empresa.endereco} onChange={(event) => setEmpresa({ ...empresa, endereco: event.target.value })} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Responsável pela Execução</Label>
                  <Input value={empresa.responsavelExecucao} onChange={(event) => setEmpresa({ ...empresa, responsavelExecucao: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Input value={empresa.cargoResponsavel} onChange={(event) => setEmpresa({ ...empresa, cargoResponsavel: event.target.value })} />
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary" />Licenças e registros</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Alvará</Label>
                    <Input value={empresa.alvara} onChange={(event) => setEmpresa({ ...empresa, alvara: event.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>CR.02 / Registro ambiental</Label>
                    <Input value={empresa.cr02} onChange={(event) => setEmpresa({ ...empresa, cr02: event.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>ANVISA</Label>
                    <Input value={empresa.anvisa} onChange={(event) => setEmpresa({ ...empresa, anvisa: event.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Vigilância Sanitária</Label>
                    <Input value={empresa.vigilanciaSanitaria} onChange={(event) => setEmpresa({ ...empresa, vigilanciaSanitaria: event.target.value })} />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Label>Responsável Técnico</Label>
                  <Input value={empresa.responsavelTecnico} onChange={(event) => setEmpresa({ ...empresa, responsavelTecnico: event.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><FileCheck2 className="h-5 w-5" />Certificados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-4">
                <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
                  <Upload className="h-4 w-4 text-primary" />
                  Assets documentais do tenant
                </h3>
                <p className="text-xs text-muted-foreground">
                  Configure os elementos visuais que podem aparecer no certificado e nos documentos do cliente SaaS. Para cada cliente,
                  a logo, a assinatura, o selo e a arte de fundo devem vir da configuração do próprio tenant.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <AssetUploadCard
                  title="Logo dos documentos"
                  description="Logo para fundo claro, usada em certificados, propostas, contratos, OS, relatórios e medições."
                  value={(certificadoConfig.documentLogoLightUrl as string) || (certificadoConfig.logoPrincipalUrl as string) || empresa.logoUrl}
                  onChange={(value) => {
                    setEmpresa((prev) => ({ ...prev, logoUrl: value }));
                    const currentConfig = readCertificadoConfig();
                    setCertificadoConfigText(JSON.stringify({ ...currentConfig, documentLogoLightUrl: value, logoPrincipalUrl: value }, null, 2));
                  }}
                />
                <AssetUploadCard
                  title="Ícone da marca"
                  description="Ícone compacto para menu retraído, marca d'água e usos visuais menores."
                  value={(certificadoConfig.brandIconUrl as string) || (certificadoConfig.arteFundoUrl as string)}
                  previewClassName="bg-slate-100"
                  onChange={(value) => {
                    const currentConfig = readCertificadoConfig();
                    setCertificadoConfigText(JSON.stringify({ ...currentConfig, brandIconUrl: value, arteFundoUrl: value }, null, 2));
                  }}
                />
                <AssetUploadCard
                  title="Logo fundo escuro"
                  description="Logo para menu lateral expandido e fundos escuros, preferencialmente PNG/SVG com transparência."
                  value={(certificadoConfig.sidebarLogoDarkUrl as string) || (certificadoConfig.logoInterfaceUrl as string)}
                  previewClassName="bg-slate-950"
                  onChange={(value) => {
                    const currentConfig = readCertificadoConfig();
                    setCertificadoConfigText(JSON.stringify({ ...currentConfig, sidebarLogoDarkUrl: value, logoInterfaceUrl: value }, null, 2));
                  }}
                />
                <AssetUploadCard
                  title="Selo institucional"
                  description="Selo, brasão, certificação ou marca complementar do tenant."
                  value={certificadoConfig.seloInstitucionalUrl as string}
                  onChange={(value) => updateCertificadoConfig("seloInstitucionalUrl", value)}
                />
                <AssetUploadCard
                  title="Assinatura"
                  description="Imagem da assinatura do responsável configurado para sair nos documentos permitidos."
                  value={certificadoConfig.assinaturaUrl as string}
                  onChange={(value) => updateCertificadoConfig("assinaturaUrl", value)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Título do certificado</Label>
                  <Input
                    value={(certificadoConfig.titulo as string) || ""}
                    onChange={(event) => updateCertificadoConfig("titulo", event.target.value)}
                    placeholder="Certificado de Garantia"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtítulo</Label>
                  <Input
                    value={(certificadoConfig.subtitulo as string) || ""}
                    onChange={(event) => updateCertificadoConfig("subtitulo", event.target.value)}
                    placeholder="Texto complementar opcional"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Validade padrão (dias)</Label>
                  <Input type="number" value={empresa.certificadoValidadePadraoDias} onChange={(event) => setEmpresa({ ...empresa, certificadoValidadePadraoDias: Number(event.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone de emergência/toxicologia</Label>
                  <Input value={empresa.telefoneEmergencia || ""} onChange={(event) => setEmpresa({ ...empresa, telefoneEmergencia: event.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Uso da assinatura no certificado</Label>
                  <select
                    value={(certificadoConfig.assinaturaModo as string) || "imagem"}
                    onChange={(event) => updateCertificadoConfig("assinaturaModo", event.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="imagem">Usar imagem quando houver</option>
                    <option value="linha">Deixar linha para assinatura física/digital</option>
                    <option value="ocultar">Não exibir assinatura</option>
                    <option value="obrigatoria">Bloquear emissão sem assinatura configurada</option>
                  </select>
                  <p className="text-xs text-muted-foreground">A configuração poderá ser refinada por família documental na etapa SaaS de perfis documentais.</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Texto legal padrão</Label>
                <Textarea value={empresa.certificadoTextoLegal || ""} onChange={(event) => setEmpresa({ ...empresa, certificadoTextoLegal: event.target.value })} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Texto de fixação</Label>
                <Input value={empresa.certificadoTextoFixacao || ""} onChange={(event) => setEmpresa({ ...empresa, certificadoTextoFixacao: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Configuração avançada do certificado (JSON)</Label>
                <Textarea
                  value={certificadoConfigText}
                  onChange={(event) => setCertificadoConfigText(event.target.value)}
                  rows={10}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Use para parametrizar brandIconUrl, sidebarLogoDarkUrl, documentLogoLightUrl, seloInstitucionalUrl,
                  assinaturaUrl, assinaturaModo, titulo, subtitulo, publicBaseUrl, licencas, rodapeLinhas, cit, limiteFotos e exibições do template.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><ReceiptText className="h-5 w-5" />Medição</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Forma de pagamento padrão</Label>
                <Input value={empresa.medicaoFormaPagamentoPadrao || ""} onChange={(event) => setEmpresa({ ...empresa, medicaoFormaPagamentoPadrao: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Local de entrega padrão</Label>
                <Input value={empresa.medicaoLocalEntregaPadrao || ""} onChange={(event) => setEmpresa({ ...empresa, medicaoLocalEntregaPadrao: event.target.value })} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveEmpresa} disabled={savingEmpresa}>
              <Save className="mr-2 h-4 w-4" />
              {savingEmpresa ? "Salvando..." : "Salvar configurações da empresa"}
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Hash className="h-5 w-5" />Configuração de Numeração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">Use <code className="rounded bg-muted px-1">{"{SEQ}"}</code> para a sequência e <code className="rounded bg-muted px-1">{"{ANO}"}</code> para o ano.</p>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <NumberingCard title="Propostas" formato={numeracao.propostaFormato} ultimo={numeracao.propostaUltimo} onFormato={(value) => setNumeracao({ ...numeracao, propostaFormato: value })} onUltimo={(value) => setNumeracao({ ...numeracao, propostaUltimo: value })} />
                <NumberingCard title="Contratos" formato={numeracao.contratoFormato} ultimo={numeracao.contratoUltimo} onFormato={(value) => setNumeracao({ ...numeracao, contratoFormato: value })} onUltimo={(value) => setNumeracao({ ...numeracao, contratoUltimo: value })} />
                <NumberingCard title="Ordens de Serviço" formato={numeracao.osFormato} ultimo={numeracao.osUltimo} onFormato={(value) => setNumeracao({ ...numeracao, osFormato: value })} onUltimo={(value) => setNumeracao({ ...numeracao, osUltimo: value })} />
                <NumberingCard title="Certificados" formato={numeracao.certificadoFormato} ultimo={numeracao.certificadoUltimo} onFormato={(value) => setNumeracao({ ...numeracao, certificadoFormato: value })} onUltimo={(value) => setNumeracao({ ...numeracao, certificadoUltimo: value })} />
                <NumberingCard title="Medições" formato={numeracao.medicaoFormato} ultimo={numeracao.medicaoUltimo} onFormato={(value) => setNumeracao({ ...numeracao, medicaoFormato: value })} onUltimo={(value) => setNumeracao({ ...numeracao, medicaoUltimo: value })} />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveNumeracao} disabled={savingNumeracao}>
                  <Save className="mr-2 h-4 w-4" />
                  {savingNumeracao ? "Salvando..." : "Salvar numeração"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
