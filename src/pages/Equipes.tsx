import { useEffect, useState } from "react";
import { getBootstrap, saveAllocation, saveTechnician, saveVehicle, type AlocacaoSemanal, type BootstrapData, type Tecnico, type Veiculo } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Car, CalendarDays, Plus, Pencil, Phone } from "lucide-react";
import { toast } from "sonner";

const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const turnoLabel: Record<string, string> = { manha: "Manhã", tarde: "Tarde", integral: "Integral" };
const turnoColor: Record<string, string> = {
  manha: "bg-info/15 text-info border-info/30",
  tarde: "bg-warning/15 text-warning border-warning/30",
  integral: "bg-primary/15 text-primary border-primary/30",
};

export default function Equipes() {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(true);

  const [tecDialog, setTecDialog] = useState(false);
  const [editTecId, setEditTecId] = useState<string | null>(null);
  const [tecForm, setTecForm] = useState<Omit<Tecnico, "id">>({ nome: "", cpf: "", cargo: "", dataAdmissao: "", telefone: "", ativo: true });

  const [veiDialog, setVeiDialog] = useState(false);
  const [editVeiId, setEditVeiId] = useState<string | null>(null);
  const [veiForm, setVeiForm] = useState<Omit<Veiculo, "id">>({ placa: "", modelo: "", ano: new Date().getFullYear(), ativo: true });

  const [alocDialog, setAlocDialog] = useState(false);
  const [alocForm, setAlocForm] = useState<Omit<AlocacaoSemanal, "id">>({ tecnicoId: "", diaSemana: 1, cliente: "", servico: "", turno: "integral" });

  async function reload() {
    setLoading(true);
    try {
      setData(await getBootstrap());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar equipes e veículos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const tecnicos = data?.technicians ?? [];
  const veiculos = data?.vehicles ?? [];
  const alocacoes = data?.allocations ?? [];

  async function saveTec() {
    if (!tecForm.nome) {
      toast.error("Nome obrigatório");
      return;
    }
    try {
      await saveTechnician({ ...tecForm, id: editTecId ?? undefined });
      toast.success(editTecId ? "Técnico atualizado" : "Técnico cadastrado");
      setTecDialog(false);
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar técnico");
    }
  }

  async function saveVei() {
    if (!veiForm.placa) {
      toast.error("Placa obrigatória");
      return;
    }
    try {
      await saveVehicle({ ...veiForm, id: editVeiId ?? undefined });
      toast.success(editVeiId ? "Veículo atualizado" : "Veículo cadastrado");
      setVeiDialog(false);
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar veículo");
    }
  }

  async function saveAloc() {
    if (!alocForm.tecnicoId || !alocForm.cliente) {
      toast.error("Técnico e cliente são obrigatórios");
      return;
    }
    try {
      await saveAllocation(alocForm);
      toast.success("Alocação adicionada");
      setAlocDialog(false);
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar alocação");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Equipes e veículos
        </h1>
        <p className="text-muted-foreground text-sm">
          Cadastre técnicos e veículos da empresa. A alocação semanal é um apoio visual e será revisada junto ao fluxo de agendamentos.
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">Carregando equipes...</CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="tecnicos">
          <TabsList>
            <TabsTrigger value="tecnicos"><Users className="h-4 w-4 mr-1.5" />Técnicos</TabsTrigger>
            <TabsTrigger value="veiculos"><Car className="h-4 w-4 mr-1.5" />Veículos</TabsTrigger>
            <TabsTrigger value="quadro"><CalendarDays className="h-4 w-4 mr-1.5" />Alocação semanal</TabsTrigger>
          </TabsList>

          <TabsContent value="tecnicos" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditTecId(null); setTecForm({ nome: "", cpf: "", cargo: "", dataAdmissao: "", telefone: "", ativo: true }); setTecDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo técnico
              </Button>
            </div>
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Admissão</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tecnicos.map((tecnico) => (
                      <TableRow key={tecnico.id}>
                        <TableCell className="font-medium">{tecnico.nome}</TableCell>
                        <TableCell className="font-mono text-xs">{tecnico.cpf}</TableCell>
                        <TableCell className="text-sm">{tecnico.cargo}</TableCell>
                        <TableCell className="text-xs">{tecnico.dataAdmissao ? new Date(`${tecnico.dataAdmissao}T12:00:00`).toLocaleDateString("pt-BR") : "-"}</TableCell>
                        <TableCell className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" />{tecnico.telefone}</TableCell>
                        <TableCell><Badge variant={tecnico.ativo ? "default" : "secondary"}>{tecnico.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => { setEditTecId(tecnico.id); const { id, ...rest } = tecnico; setTecForm(rest); setTecDialog(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="veiculos" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditVeiId(null); setVeiForm({ placa: "", modelo: "", ano: new Date().getFullYear(), ativo: true }); setVeiDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo veículo
              </Button>
            </div>
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Placa</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Ano</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {veiculos.map((veiculo) => (
                      <TableRow key={veiculo.id}>
                        <TableCell className="font-mono font-bold">{veiculo.placa}</TableCell>
                        <TableCell>{veiculo.modelo}</TableCell>
                        <TableCell>{veiculo.ano}</TableCell>
                        <TableCell><Badge variant={veiculo.ativo ? "default" : "secondary"}>{veiculo.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => { setEditVeiId(veiculo.id); const { id, ...rest } = veiculo; setVeiForm(rest); setVeiDialog(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quadro" className="space-y-4">
            <div className="flex flex-col gap-3 rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
              <p>Esta visão mostra a ocupação semanal da equipe. A programação oficial de serviços deve nascer em Agendamentos.</p>
              <Button onClick={() => { setAlocForm({ tecnicoId: "", diaSemana: 1, cliente: "", servico: "", turno: "integral" }); setAlocDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nova alocação
              </Button>
            </div>
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-muted-foreground w-32">Técnico</th>
                      {[1, 2, 3, 4, 5, 6].map((dia) => (
                        <th key={dia} className="text-center p-3 font-medium text-muted-foreground">{diasSemana[dia]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tecnicos.filter((item) => item.ativo).map((tecnico) => (
                      <tr key={tecnico.id} className="border-b last:border-0">
                        <td className="p-3 font-medium text-xs whitespace-nowrap">{tecnico.nome}</td>
                        {[1, 2, 3, 4, 5, 6].map((dia) => {
                          const items = alocacoes.filter((item) => item.tecnicoId === tecnico.id && item.diaSemana === dia);
                          return (
                            <td key={`${tecnico.id}-${dia}`} className="p-2 align-top">
                              {items.length > 0 ? (
                                <div className="space-y-1">
                                  {items.map((item) => {
                                    const veiculo = item.veiculoId ? veiculos.find((entry) => entry.id === item.veiculoId) : null;
                                    return (
                                      <div key={item.id} className={`rounded border px-2 py-1.5 text-[11px] ${turnoColor[item.turno]}`}>
                                        <p className="font-semibold">{item.cliente}</p>
                                        <p className="opacity-80">{item.servico}</p>
                                        <p className="opacity-60">{turnoLabel[item.turno]}</p>
                                        {veiculo && <p className="opacity-60">{veiculo.placa} - {veiculo.modelo}</p>}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-center text-muted-foreground/30 text-xs py-2">-</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={tecDialog} onOpenChange={setTecDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editTecId ? "Editar" : "Novo"} técnico</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Nome *</Label><Input value={tecForm.nome} onChange={(event) => setTecForm({ ...tecForm, nome: event.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">CPF</Label><Input value={tecForm.cpf} onChange={(event) => setTecForm({ ...tecForm, cpf: event.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Cargo</Label><Input value={tecForm.cargo} onChange={(event) => setTecForm({ ...tecForm, cargo: event.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Admissão</Label><Input type="date" value={tecForm.dataAdmissao} onChange={(event) => setTecForm({ ...tecForm, dataAdmissao: event.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Telefone</Label><Input value={tecForm.telefone} onChange={(event) => setTecForm({ ...tecForm, telefone: event.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={tecForm.ativo} onChange={(event) => setTecForm({ ...tecForm, ativo: event.target.checked })} className="rounded" />Ativo</label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTecDialog(false)}>Cancelar</Button>
            <Button onClick={saveTec}>{editTecId ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={veiDialog} onOpenChange={setVeiDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editVeiId ? "Editar" : "Novo"} veículo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Placa *</Label><Input value={veiForm.placa} onChange={(event) => setVeiForm({ ...veiForm, placa: event.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Modelo</Label><Input value={veiForm.modelo} onChange={(event) => setVeiForm({ ...veiForm, modelo: event.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Ano</Label><Input type="number" value={veiForm.ano} onChange={(event) => setVeiForm({ ...veiForm, ano: Number(event.target.value) })} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={veiForm.ativo} onChange={(event) => setVeiForm({ ...veiForm, ativo: event.target.checked })} className="rounded" />Ativo</label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVeiDialog(false)}>Cancelar</Button>
            <Button onClick={saveVei}>{editVeiId ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={alocDialog} onOpenChange={setAlocDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova alocação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Técnico *</Label>
              <Select value={alocForm.tecnicoId} onValueChange={(value) => setAlocForm({ ...alocForm, tecnicoId: value })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{tecnicos.filter((item) => item.ativo).map((item) => <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Dia da semana</Label>
                <Select value={String(alocForm.diaSemana)} onValueChange={(value) => setAlocForm({ ...alocForm, diaSemana: Number(value) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1, 2, 3, 4, 5, 6].map((dia) => <SelectItem key={dia} value={String(dia)}>{diasSemana[dia]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Turno</Label>
                <Select value={alocForm.turno} onValueChange={(value) => setAlocForm({ ...alocForm, turno: value as AlocacaoSemanal["turno"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manha">Manhã</SelectItem>
                    <SelectItem value="tarde">Tarde</SelectItem>
                    <SelectItem value="integral">Integral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Cliente *</Label><Input value={alocForm.cliente} onChange={(event) => setAlocForm({ ...alocForm, cliente: event.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Serviço</Label><Input value={alocForm.servico} onChange={(event) => setAlocForm({ ...alocForm, servico: event.target.value })} /></div>
            <div className="space-y-1">
              <Label className="text-xs">Veículo</Label>
              <Select value={alocForm.veiculoId || "none"} onValueChange={(value) => setAlocForm({ ...alocForm, veiculoId: value === "none" ? undefined : value })}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {veiculos.filter((item) => item.ativo).map((item) => <SelectItem key={item.id} value={item.id}>{item.placa} - {item.modelo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlocDialog(false)}>Cancelar</Button>
            <Button onClick={saveAloc}>Alocar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
