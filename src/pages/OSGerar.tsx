import { useState, useMemo, useRef } from "react";
import { contratos, tecnicos, licencas } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Printer } from "lucide-react";
import { toast } from "sonner";

export default function OSGerar() {
  const [clienteSel, setClienteSel] = useState("");
  const [contratoSel, setContratoSel] = useState("");
  const [colaborador, setColaborador] = useState("");
  const [cpfColaborador, setCpfColaborador] = useState("");
  const [dataAdmissao, setDataAdmissao] = useState("");
  const [localExecucao, setLocalExecucao] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [tagsSel, setTagsSel] = useState("");
  const [osGerada, setOsGerada] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const clientes = useMemo(() => [...new Set(contratos.map((c) => c.cliente))], []);
  const servicosCliente = useMemo(
    () => contratos.filter((c) => c.cliente === clienteSel),
    [clienteSel]
  );
  const contrato = useMemo(() => contratos.find((c) => c.id === contratoSel), [contratoSel]);

  const osNumero = useMemo(() => {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${num} / 2026`;
  }, []);

  const dataEmissao = new Date().toLocaleDateString("pt-BR");

  const handleGerar = () => {
    if (!contrato || !colaborador) {
      toast.error("Preencha o colaborador e selecione o contrato");
      return;
    }
    setOsGerada(true);
    toast.success("OS gerada com sucesso!");
  };

  const handleImprimir = () => {
    window.print();
  };

  const clienteData = useMemo(() => {
    if (!contrato) return null;
    return { nome: contrato.cliente, cnpj: contrato.cnpj };
  }, [contrato]);

  return (
    <div className="space-y-6">
      {/* Form - hide on print */}
      <div className="print:hidden max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Gerar Ordem de Serviço
          </h1>
          <p className="text-muted-foreground text-sm">
            Preencha os dados para gerar a OS que será levada pela equipe à frente de serviço
          </p>
        </div>

        <Card>
          <CardHeader><CardTitle>Dados do Serviço</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={clienteSel} onValueChange={(v) => { setClienteSel(v); setContratoSel(""); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
                      <SelectItem key={c.id} value={c.id}>{c.servico} ({c.id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Colaborador</Label>
                <Select value={colaborador} onValueChange={setColaborador}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {tecnicos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input placeholder="000.000.000-00" value={cpfColaborador} onChange={(e) => setCpfColaborador(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Admissão</Label>
                <Input type="date" value={dataAdmissao} onChange={(e) => setDataAdmissao(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Local de Execução</Label>
                <Input placeholder="Ex: Planta Industrial" value={localExecucao} onChange={(e) => setLocalExecucao(e.target.value)} />
              </div>
            </div>

            {contrato?.tipo === "sanitario" && (
              <>
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input type="number" placeholder="Ex: 5" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
                </div>
                {contrato.tags && (
                  <div className="space-y-2">
                    <Label>TAGs</Label>
                    <Input placeholder="Ex: BEB-01, BEB-02" value={tagsSel} onChange={(e) => setTagsSel(e.target.value)} />
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3">
              <Button onClick={handleGerar} className="flex-1" size="lg">
                <FileText className="h-4 w-4 mr-2" />
                Gerar OS
              </Button>
              {osGerada && (
                <Button onClick={handleImprimir} variant="outline" size="lg">
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Printable OS Document */}
      {osGerada && contrato && (
        <div ref={printRef} className="bg-white text-black print:m-0 print:p-0">
          <div className="max-w-[210mm] mx-auto border border-gray-300 print:border-none">
            {/* Page 1 */}
            <div className="p-8 print:p-6 space-y-4 text-[11px] leading-relaxed">
              {/* Header */}
              <div className="flex items-start justify-between border-b-2 border-emerald-700 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-md bg-emerald-700 flex items-center justify-center font-bold text-white text-lg">
                    CP
                  </div>
                  <div>
                    <span className="text-xl font-extrabold tracking-tight">
                      <span className="text-emerald-700">CIPER</span><span className="text-gray-700">PRAG</span>
                    </span>
                    <div className="text-[9px] tracking-[0.3em] text-gray-500 font-medium">S E R V I Ç O S</div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">OS Nº <span className="text-lg">{osNumero}</span></p>
                </div>
              </div>

              <h2 className="text-center font-bold text-base uppercase tracking-wide">
                Registro de Ordem de Serviço
              </h2>

              {/* Dados Gerais */}
              <table className="w-full border-collapse text-[11px]">
                <tbody>
                  <tr className="border border-gray-400">
                    <td className="border border-gray-400 px-2 py-1 font-bold w-[120px] bg-gray-50">SETOR:</td>
                    <td className="border border-gray-400 px-2 py-1">OPERACIONAL</td>
                    <td className="border border-gray-400 px-2 py-1 font-bold w-[120px] bg-gray-50" rowSpan={2}>Data de Admissão</td>
                    <td className="border border-gray-400 px-2 py-1" rowSpan={2}>{dataAdmissao || "___/___/______"}</td>
                  </tr>
                  <tr className="border border-gray-400">
                    <td className="border border-gray-400 px-2 py-1 font-bold bg-gray-50">FUNÇÃO:</td>
                    <td className="border border-gray-400 px-2 py-1">
                      {contrato.tipo === "sanitario" ? "Dedetizador" : "Auxiliar de Manutenção"}
                    </td>
                  </tr>
                  <tr className="border border-gray-400">
                    <td className="border border-gray-400 px-2 py-1 font-bold bg-gray-50">COLABORADOR:</td>
                    <td className="border border-gray-400 px-2 py-1">{colaborador}</td>
                    <td className="border border-gray-400 px-2 py-1 font-bold bg-gray-50">CPF</td>
                    <td className="border border-gray-400 px-2 py-1">{cpfColaborador || "___.___.___-__"}</td>
                  </tr>
                  <tr className="border border-gray-400">
                    <td className="border border-gray-400 px-2 py-1 font-bold bg-gray-50">CLIENTE:</td>
                    <td className="border border-gray-400 px-2 py-1">{clienteData?.nome}</td>
                    <td className="border border-gray-400 px-2 py-1 font-bold bg-gray-50">CNPJ</td>
                    <td className="border border-gray-400 px-2 py-1">{clienteData?.cnpj}</td>
                  </tr>
                  <tr className="border border-gray-400">
                    <td className="border border-gray-400 px-2 py-1 font-bold bg-gray-50">Local de execução:</td>
                    <td className="border border-gray-400 px-2 py-1">{localExecucao}</td>
                    <td className="border border-gray-400 px-2 py-1 font-bold bg-gray-50">Contrato</td>
                    <td className="border border-gray-400 px-2 py-1">{contrato.id}</td>
                  </tr>
                </tbody>
              </table>

              {/* Descrição das Atividades */}
              <div className="border border-gray-400">
                <div className="bg-gray-50 px-2 py-1 font-bold border-b border-gray-400">Descrição das Atividades:</div>
                <div className="px-2 py-2 min-h-[40px]">
                  {contrato.tipo === "sanitario" ? (
                    <p>( X ) {contrato.servico.toUpperCase()}</p>
                  ) : (
                    <p>Manutenção Civil — {contrato.servico}</p>
                  )}
                </div>
              </div>

              {/* Observação / Tabela de itens */}
              {contrato.tipo === "sanitario" && (
                <div className="border border-gray-400">
                  <div className="bg-gray-50 px-2 py-1 font-bold border-b border-gray-400">Observação</div>
                  <div className="p-2 space-y-2">
                    <table className="w-auto border-collapse text-[11px]">
                      <thead>
                        <tr>
                          <td className="font-bold pr-4">{contrato.servico.split(" ")[0]}</td>
                          <td></td>
                        </tr>
                        <tr className="border-b border-gray-400">
                          <td className="pr-4 font-bold py-1">Quantidade</td>
                          <td className="font-bold py-1">Descrição/serviços</td>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-300">
                          <td className="pr-4 py-1">{quantidade || "______"}</td>
                          <td className="py-1">{contrato.servico}</td>
                        </tr>
                      </tbody>
                    </table>
                    <p>TAGs: {tagsSel || "___________________________________________"}</p>
                  </div>
                </div>
              )}

              {/* Procedimentos Específicos - Riscos */}
              <div className="border border-gray-400">
                <div className="bg-gray-50 px-2 py-1 font-bold border-b border-gray-400">Procedimentos Específicos:</div>
                <div className="px-2 py-2 space-y-0.5">
                  <p><strong>Risco de acidente:</strong> Queda ou tropeço</p>
                  <p><strong>Risco físico:</strong> Ruído, calor</p>
                  <p><strong>Risco químico:</strong> Emissão de névoa, poeiras, vapores orgânicos.</p>
                  <p><strong>Risco ergonômico:</strong> Esforço físico repetitivo, postura inadequada.</p>
                  <p><strong>Risco Biológico:</strong> {contrato.riscos?.includes("Risco Biológico") ? "Contato com agentes biológicos." : "Não se aplica."}</p>
                </div>
              </div>

              {/* EPIs */}
              <div className="border border-gray-400">
                <div className="grid grid-cols-[140px_1fr]">
                  <div className="bg-gray-50 px-2 py-1 font-bold border-r border-gray-400 flex items-center">Relação de EPI's:</div>
                  <div className="px-2 py-1">
                    {contrato.epis?.join("; ") || "Protetor auricular tipo concha; luva de proteção nitrílica; capacete/jugular; óculos de segurança; calçado de segurança com biqueira; máscara PFF2; máscara respiratória com filtros; Cinto tipo paraquedista com Talabarte e trava quedas"}
                  </div>
                </div>
              </div>

              {/* EPC */}
              <div className="border border-gray-400">
                <div className="grid grid-cols-[220px_1fr]">
                  <div className="bg-gray-50 px-2 py-1 font-bold border-r border-gray-400">Equipamentos de Proteção Coletiva:</div>
                  <div className="px-2 py-1">Cones e correntes</div>
                </div>
              </div>

              {/* Procedimentos */}
              <div className="border border-gray-400">
                <div className="bg-gray-50 px-2 py-1 font-bold border-b border-gray-400">Procedimentos Específicos:</div>
                <ul className="px-4 py-2 list-disc space-y-0.5">
                  <li>Treinamento operacional para uso e higienização dos EPIs;</li>
                  <li>Treinamento em altura (NR35)</li>
                  <li>Treinamento em espaço confinado (NR33)</li>
                  <li>Treinamento máquinas e equipamentos (NR12)</li>
                  <li>Os trabalhos que envolvam manipulação de produtos químicos só poderão ser executados por profissionais devidamente treinados e identificados.</li>
                  <li>Os trabalhos que envolvam manipulação de produtos químicos só poderão ser executados com a FISPQ - Ficha de Informação de Segurança de Produtos Químicos.</li>
                  <li>Em caso de dúvidas procure o Técnico de Segurança da sua Área.</li>
                </ul>
              </div>

              {/* Emergência */}
              <div className="border border-gray-400">
                <div className="bg-gray-50 px-2 py-1 font-bold border-b border-gray-400">Em caso de emergência:</div>
                <div className="px-2 py-2">
                  Caso o alarme de emergência seja acionado os profissionais deverão evacuar a área seguindo as rotas de fuga ao ponto de encontro mais próximo.
                </div>
              </div>

              {/* Rodapé página 1 */}
              <div className="border-t-2 border-emerald-700 pt-2 text-center text-[9px] text-gray-500">
                <p className="font-bold">{licencas.empresa} — CNPJ {licencas.cnpj}</p>
                <p>Rua Tiradentes 190, centro Rondon do Pará, Tel.: (94) 99258-2761</p>
                <p>e-mail: adm@ciperprag.com</p>
              </div>
            </div>

            {/* Page 2 */}
            <div className="p-8 print:p-6 space-y-4 text-[11px] leading-relaxed print:break-before-page border-t border-gray-300 print:border-t-0">
              {/* Medidas Preventivas */}
              <div className="border border-gray-400">
                <div className="bg-gray-50 px-2 py-1 font-bold border-b border-gray-400">Medidas Preventivas:</div>
                <div className="px-2 py-2 space-y-2">
                  <p><strong>Ergonomia:</strong> O transporte manual de peso deverá ser realizado conforme a capacidade física de cada um não ultrapassando a carga ergonomicamente correta de 23 kg por colaborador.</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Para cargas superiores a 23 kg por pessoa a atividade deverá ser realizada por dois colaboradores ou mais conforme a necessidade.</li>
                    <li>O transporte manual deverá ser realizado de forma a não tensionar a coluna vertebral, concentrando o peso nas musculaturas das pernas e braços prevenindo lombalgias.</li>
                  </ul>

                  <p className="font-bold">Movimentação de cargas:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Durante a movimentação dos materiais diversos manualmente os envolvidos deverão posicionar-se de forma a não expor mãos e pés sob os mesmos.</li>
                    <li>Durante a movimentação de materiais de forma mecanizada os envolvidos deverão utilizar cordas guias.</li>
                    <li>Os acessórios de cargas (cabos de aço, cintas e manilhas) deverão ser inspecionados diariamente por profissional qualificado.</li>
                    <li>No local da atividade deverá permanecer apenas o pessoal envolvido na atividade respeitando-se o isolamento de área.</li>
                    <li>Durante as movimentações de cargas deverá ser avaliada a existência de redes elétricas no raio de ação da lança do equipamento.</li>
                  </ul>

                  <p className="font-bold">Disposições Gerais:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>O local deverá permanecer limpo e organizado, eliminando causadores de acidentes.</li>
                    <li>Os colaboradores devem utilizar camisas de manga longa e óculos de segurança.</li>
                    <li>Os envolvidos deverão ingerir bastante líquidos evitando a desidratação.</li>
                  </ul>
                </div>
              </div>

              {/* Obrigações */}
              <div className="border border-gray-400">
                <div className="bg-gray-50 px-2 py-1 font-bold border-b border-gray-400">Obrigações dos Empregados:</div>
                <div className="px-2 py-2 space-y-2">
                  <p className="font-bold">Cabe ao empregado:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Cumprir as disposições legais e regulamentares sobre segurança e medicina do trabalho;</li>
                    <li>Usar o EPI fornecido pelo empregador;</li>
                    <li>Submeter-se aos exames médicos previstos nas Normas Regulamentadoras - NR;</li>
                    <li>Colaborar com a empresa na aplicação das Normas Regulamentadoras - NR.</li>
                  </ul>
                  <p className="text-[10px]">Constitui ato faltoso e, portanto passível de punição, a recusa injustificada do empregado ao cumprimento do disposto acima.</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Não executar qualquer trabalho para o qual não tenha sido orientado e autorizado.</li>
                    <li>Todos os acidentes ocorridos devem ser comunicados ao Supervisor do Setor ou ao Setor de Segurança do Trabalho.</li>
                    <li>Caso alguma irregularidade ou risco de acidente seja constatado, a atividade deve ser suspensa imediatamente.</li>
                  </ul>
                </div>
              </div>

              {/* Declaração */}
              <div className="border border-gray-400 p-2 text-[10px]">
                Recebi da empresa {licencas.empresa}, o treinamento de segurança, saúde e meio ambiente para o desenvolvimento de minha atividade, juntamente com a cópia desta Ordem de Serviço, tomando conhecimento das ações preventivas que devo tomar para evitar acidentes de trabalho, doenças ocupacionais e impactos ambientais, as quais me comprometo seguir e cumprir.
              </div>

              {/* Assinaturas */}
              <div className="space-y-4 pt-2">
                <div className="flex items-end gap-2">
                  <span className="text-[10px]">Assinatura do Colaborador:</span>
                  <div className="flex-1 border-b border-gray-400" />
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-[10px]">Assinatura do Colaborador:</span>
                  <div className="flex-1 border-b border-gray-400" />
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-[10px]">Assinatura do Colaborador:</span>
                  <div className="flex-1 border-b border-gray-400" />
                </div>
              </div>

              {/* Rodapé final */}
              <div className="grid grid-cols-2 gap-8 pt-4 border-t border-gray-400">
                <div className="space-y-3">
                  <p className="font-bold text-[11px]">Data de Emissão: {dataEmissao}</p>
                  <div>
                    <p className="text-[10px]">Responsável técnica</p>
                    <p className="text-[10px]">CRT02: {licencas.cr02}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-end gap-2">
                    <span className="text-[10px] font-bold">Guarita:</span>
                    <div className="flex-1 border-b border-gray-400" />
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-[10px]">Acompanhante</span>
                    <div className="flex-1 border-b border-gray-400" />
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-[10px]">Matrícula:</span>
                    <div className="flex-1 border-b border-gray-400" />
                  </div>
                </div>
              </div>

              {/* Rodapé empresa */}
              <div className="border-t-2 border-emerald-700 pt-2 text-center text-[9px] text-gray-500 mt-4">
                <p className="font-bold">{licencas.empresa} — CNPJ {licencas.cnpj}</p>
                <p>Rua Tiradentes 190, centro Rondon do Pará, Tel.: (94) 99258-2761</p>
                <p>e-mail: adm@ciperprag.com</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
