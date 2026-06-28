import { useEffect, useState } from "react";
import { getBootstrap, saveCompanyConfig, saveNumberingConfig, type EmpresaConfig, type NumeracaoConfig } from "@/lib/api";
import logoDefault from "@/assets/logo_ciperprag.png";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings, Building2, Hash, ShieldCheck, Save, Image } from "lucide-react";
import { toast } from "sonner";

const defaultEmpresa: EmpresaConfig = {
  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  endereco: "",
  telefone: "",
  email: "",
  logoUrl: logoDefault,
  alvara: "",
  cr02: "",
  anvisa: "",
  vigilanciaSanitaria: "",
  responsavelTecnico: "",
  responsavelExecucao: "",
  cargoResponsavel: "",
};

const defaultNumeracao: NumeracaoConfig = {
  propostaFormato: "PROP-{SEQ}/{ANO}",
  propostaUltimo: 0,
  contratoFormato: "CT-{SEQ}/{ANO}",
  contratoUltimo: 0,
  osFormato: "OS-{SEQ}/{ANO}",
  osUltimo: 0,
};

function gerarNumero(formato: string, sequencia: number) {
  return formato
    .replace("{SEQ}", String(sequencia).padStart(3, "0"))
    .replace("{ANO}", String(new Date().getFullYear()));
}

export default function Configuracoes() {
  const [empresa, setEmpresa] = useState<EmpresaConfig>(defaultEmpresa);
  const [numeracao, setNumeracao] = useState<NumeracaoConfig>(defaultNumeracao);
  const [loading, setLoading] = useState(true);
  const [savingEmpresa, setSavingEmpresa] = useState(false);
  const [savingNumeracao, setSavingNumeracao] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const data = await getBootstrap();
      setEmpresa({ ...defaultEmpresa, ...data.companyConfig, logoUrl: data.companyConfig?.logoUrl || logoDefault });
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
      await saveCompanyConfig(empresa);
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

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setEmpresa((prev) => ({ ...prev, logoUrl: String(loadEvent.target?.result || "") }));
      toast.success("Logo atualizada na tela. Salve para gravar no banco.");
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Configurações
        </h2>
        <p className="text-muted-foreground text-sm">Dados da empresa, logo e numeração persistidos no banco</p>
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
                  {empresa.logoUrl ? (
                    <img src={empresa.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-muted-foreground text-sm">Sem logo</span>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <Label>Alterar Logo</Label>
                  <Input type="file" accept="image/*" onChange={handleLogoChange} className="w-full max-w-md text-sm" />
                  <p className="text-xs text-muted-foreground">A logo será usada nos documentos e no topo do sistema.</p>
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
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-3"><ShieldCheck className="h-4 w-4 text-primary" />Licenças e Registros</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Alvará</Label>
                    <Input value={empresa.alvara} onChange={(event) => setEmpresa({ ...empresa, alvara: event.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>CR.02 (IBAMA)</Label>
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
                <div className="space-y-2 mt-4">
                  <Label>Responsável Técnico</Label>
                  <Input value={empresa.responsavelTecnico} onChange={(event) => setEmpresa({ ...empresa, responsavelTecnico: event.target.value })} />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveEmpresa} disabled={savingEmpresa}>
                  <Save className="h-4 w-4 mr-2" />
                  {savingEmpresa ? "Salvando..." : "Salvar Dados da Empresa"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Hash className="h-5 w-5" />Configuração de Numeração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">Use <code className="bg-muted px-1 rounded">{"{SEQ}"}</code> para a sequência e <code className="bg-muted px-1 rounded">{"{ANO}"}</code> para o ano.</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-lg border p-4 space-y-3">
                  <h4 className="font-semibold text-sm">Propostas</h4>
                  <div className="space-y-2">
                    <Label className="text-xs">Formato</Label>
                    <Input value={numeracao.propostaFormato} onChange={(event) => setNumeracao({ ...numeracao, propostaFormato: event.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Último Número</Label>
                    <Input type="number" value={numeracao.propostaUltimo} onChange={(event) => setNumeracao({ ...numeracao, propostaUltimo: Number(event.target.value) })} />
                  </div>
                  <p className="text-xs text-muted-foreground">Próximo: <span className="font-mono font-bold">{gerarNumero(numeracao.propostaFormato, numeracao.propostaUltimo + 1)}</span></p>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <h4 className="font-semibold text-sm">Contratos</h4>
                  <div className="space-y-2">
                    <Label className="text-xs">Formato</Label>
                    <Input value={numeracao.contratoFormato} onChange={(event) => setNumeracao({ ...numeracao, contratoFormato: event.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Último Número</Label>
                    <Input type="number" value={numeracao.contratoUltimo} onChange={(event) => setNumeracao({ ...numeracao, contratoUltimo: Number(event.target.value) })} />
                  </div>
                  <p className="text-xs text-muted-foreground">Próximo: <span className="font-mono font-bold">{gerarNumero(numeracao.contratoFormato, numeracao.contratoUltimo + 1)}</span></p>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <h4 className="font-semibold text-sm">Ordens de Serviço</h4>
                  <div className="space-y-2">
                    <Label className="text-xs">Formato</Label>
                    <Input value={numeracao.osFormato} onChange={(event) => setNumeracao({ ...numeracao, osFormato: event.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Último Número</Label>
                    <Input type="number" value={numeracao.osUltimo} onChange={(event) => setNumeracao({ ...numeracao, osUltimo: Number(event.target.value) })} />
                  </div>
                  <p className="text-xs text-muted-foreground">Próximo: <span className="font-mono font-bold">{gerarNumero(numeracao.osFormato, numeracao.osUltimo + 1)}</span></p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveNumeracao} disabled={savingNumeracao}>
                  <Save className="h-4 w-4 mr-2" />
                  {savingNumeracao ? "Salvando..." : "Salvar Numeração"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
