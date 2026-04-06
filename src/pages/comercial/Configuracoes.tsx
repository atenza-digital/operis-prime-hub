import { useState } from "react";
import { empresaConfig as empresaMock, numeracaoConfig as numMock, gerarNumero, type EmpresaConfig, type NumeracaoConfig } from "@/data/empresaData";
import logoDefault from "@/assets/logo_ciperprag.png";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings, Building2, Hash, ShieldCheck, Save, Image } from "lucide-react";
import { toast } from "sonner";

export default function Configuracoes() {
  const [empresa, setEmpresa] = useState<EmpresaConfig>({ ...empresaMock, logoUrl: logoDefault });
  const [numeracao, setNumeracao] = useState<NumeracaoConfig>({ ...numMock });

  const handleSaveEmpresa = () => {
    toast.success("Configurações da empresa salvas com sucesso");
  };

  const handleSaveNumeracao = () => {
    toast.success("Configurações de numeração salvas");
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setEmpresa((prev) => ({ ...prev, logoUrl: ev.target?.result as string }));
        toast.success("Logo atualizada");
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Configurações
        </h1>
        <p className="text-muted-foreground text-sm">Dados da empresa, logo e configuração de numeração</p>
      </div>

      {/* Logo & Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Image className="h-5 w-5" />Identidade Visual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="w-48 h-20 border rounded-lg flex items-center justify-center bg-card overflow-hidden">
              {empresa.logoUrl ? (
                <img src={empresa.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-muted-foreground text-sm">Sem logo</span>
              )}
            </div>
            <div className="space-y-2">
              <Label>Alterar Logo</Label>
              <Input type="file" accept="image/*" onChange={handleLogoChange} className="max-w-xs" />
              <p className="text-xs text-muted-foreground">A logo será usada em todos os documentos e no header do sistema.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Building2 className="h-5 w-5" />Dados da Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Razão Social</Label>
              <Input value={empresa.razaoSocial} onChange={(e) => setEmpresa({ ...empresa, razaoSocial: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Nome Fantasia</Label>
              <Input value={empresa.nomeFantasia} onChange={(e) => setEmpresa({ ...empresa, nomeFantasia: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input value={empresa.cnpj} onChange={(e) => setEmpresa({ ...empresa, cnpj: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={empresa.telefone} onChange={(e) => setEmpresa({ ...empresa, telefone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={empresa.email} onChange={(e) => setEmpresa({ ...empresa, email: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Endereço</Label>
            <Input value={empresa.endereco} onChange={(e) => setEmpresa({ ...empresa, endereco: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Responsável pela Execução</Label>
              <Input value={empresa.responsavelExecucao} onChange={(e) => setEmpresa({ ...empresa, responsavelExecucao: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Input value={empresa.cargoResponsavel} onChange={(e) => setEmpresa({ ...empresa, cargoResponsavel: e.target.value })} />
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-3"><ShieldCheck className="h-4 w-4 text-primary" />Licenças e Registros</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Alvará</Label>
                <Input value={empresa.alvara} onChange={(e) => setEmpresa({ ...empresa, alvara: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>CR.02 (IBAMA)</Label>
                <Input value={empresa.cr02} onChange={(e) => setEmpresa({ ...empresa, cr02: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>ANVISA</Label>
                <Input value={empresa.anvisa} onChange={(e) => setEmpresa({ ...empresa, anvisa: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Vigilância Sanitária</Label>
                <Input value={empresa.vigilanciaSanitaria} onChange={(e) => setEmpresa({ ...empresa, vigilanciaSanitaria: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2 mt-4">
              <Label>Responsável Técnico</Label>
              <Input value={empresa.responsavelTecnico} onChange={(e) => setEmpresa({ ...empresa, responsavelTecnico: e.target.value })} />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveEmpresa}><Save className="h-4 w-4 mr-2" />Salvar Dados da Empresa</Button>
          </div>
        </CardContent>
      </Card>

      {/* Numbering Config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Hash className="h-5 w-5" />Configuração de Numeração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">Use <code className="bg-muted px-1 rounded">{"{SEQ}"}</code> para o número sequencial e <code className="bg-muted px-1 rounded">{"{ANO}"}</code> para o ano atual.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Proposta */}
            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="font-semibold text-sm">Propostas</h4>
              <div className="space-y-2">
                <Label className="text-xs">Formato</Label>
                <Input value={numeracao.propostaFormato} onChange={(e) => setNumeracao({ ...numeracao, propostaFormato: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Último Número</Label>
                <Input type="number" value={numeracao.propostaUltimo} onChange={(e) => setNumeracao({ ...numeracao, propostaUltimo: Number(e.target.value) })} />
              </div>
              <p className="text-xs text-muted-foreground">
                Próximo: <span className="font-mono font-bold">{gerarNumero(numeracao.propostaFormato, numeracao.propostaUltimo + 1)}</span>
              </p>
            </div>

            {/* Contrato */}
            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="font-semibold text-sm">Contratos</h4>
              <div className="space-y-2">
                <Label className="text-xs">Formato</Label>
                <Input value={numeracao.contratoFormato} onChange={(e) => setNumeracao({ ...numeracao, contratoFormato: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Último Número</Label>
                <Input type="number" value={numeracao.contratoUltimo} onChange={(e) => setNumeracao({ ...numeracao, contratoUltimo: Number(e.target.value) })} />
              </div>
              <p className="text-xs text-muted-foreground">
                Próximo: <span className="font-mono font-bold">{gerarNumero(numeracao.contratoFormato, numeracao.contratoUltimo + 1)}</span>
              </p>
            </div>

            {/* OS */}
            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="font-semibold text-sm">Ordens de Serviço</h4>
              <div className="space-y-2">
                <Label className="text-xs">Formato</Label>
                <Input value={numeracao.osFormato} onChange={(e) => setNumeracao({ ...numeracao, osFormato: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Último Número</Label>
                <Input type="number" value={numeracao.osUltimo} onChange={(e) => setNumeracao({ ...numeracao, osUltimo: Number(e.target.value) })} />
              </div>
              <p className="text-xs text-muted-foreground">
                Próximo: <span className="font-mono font-bold">{gerarNumero(numeracao.osFormato, numeracao.osUltimo + 1)}</span>
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveNumeracao}><Save className="h-4 w-4 mr-2" />Salvar Numeração</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
