import { useState } from "react";
import { tecnicos as tecMock, veiculos as veiMock, alocacoesMock, type Tecnico, type Veiculo, type AlocacaoSemanal } from "@/data/equipesData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
const turnoColor: Record<string, string> = { manha: "bg-info/15 text-info border-info/30", tarde: "bg-warning/15 text-warning border-warning/30", integral: "bg-primary/15 text-primary border-primary/30" };

export default function Equipes() {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>(tecMock);
  const [veiculos, setVeiculos] = useState<Veiculo[]>(veiMock);
  const [alocacoes, setAlocacoes] = useState<AlocacaoSemanal[]>(alocacoesMock);

  // Dialogs
  const [tecDialog, setTecDialog] = useState(false);
  const [editTecId, setEditTecId] = useState<string | null>(null);
  const [tecForm, setTecForm] = useState<Omit<Tecnico, "id">>({ nome: "", cpf: "", cargo: "", dataAdmissao: "", telefone: "", ativo: true });

  const [veiDialog, setVeiDialog] = useState(false);
  const [editVeiId, setEditVeiId] = useState<string | null>(null);
  const [veiForm, setVeiForm] = useState<Omit<Veiculo, "id">>({ placa: "", modelo: "", ano: 2024, ativo: true });

  const [alocDialog, setAlocDialog] = useState(false);
  const [alocForm, setAlocForm] = useState<Omit<AlocacaoSemanal, "id">>({ tecnicoId: "", diaSemana: 1, cliente: "", servico: "", turno: "integral" });

  // Technician CRUD
  const saveTec = () => {
    if (!tecForm.nome) { toast.error("Nome obrigatório"); return; }
    if (editTecId) {
      setTecnicos((p) => p.map((t) => t.id === editTecId ? { ...tecForm, id: editTecId } : t));
      toast.success("Técnico atualizado");
    } else {
      setTecnicos((p) => [...p, { ...tecForm, id: `TEC-${String(p.length + 1).padStart(3, "0")}` }]);
      toast.success("Técnico cadastrado");
    }
    setTecDialog(false);
  };

  const saveVei = () => {
    if (!veiForm.placa) { toast.error("Placa obrigatória"); return; }
    if (editVeiId) {
      setVeiculos((p) => p.map((v) => v.id === editVeiId ? { ...veiForm, id: editVeiId } : v));
      toast.success("Veículo atualizado");
    } else {
      setVeiculos((p) => [...p, { ...veiForm, id: `VEI-${String(p.length + 1).padStart(3, "0")}` }]);
      toast.success("Veículo cadastrado");
    }
    setVeiDialog(false);
  };

  const saveAloc = () => {
    if (!alocForm.tecnicoId || !alocForm.cliente) { toast.error("Técnico e cliente obrigatórios"); return; }
    setAlocacoes((p) => [...p, { ...alocForm, id: `AL-${String(p.length + 1).padStart(3, "0")}` }]);
    toast.success("Alocação adicionada");
    setAlocDialog(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Gestão de Equipes
        </h1>
        <p className="text-muted-foreground text-sm">Cadastro de técnicos, veículos e alocação semanal</p>
      </div>

      <Tabs defaultValue="quadro">
        <TabsList>
          <TabsTrigger value="quadro"><CalendarDays className="h-4 w-4 mr-1.5" />Quadro Semanal</TabsTrigger>
          <TabsTrigger value="tecnicos"><Users className="h-4 w-4 mr-1.5" />Técnicos</TabsTrigger>
          <TabsTrigger value="veiculos"><Car className="h-4 w-4 mr-1.5" />Veículos</TabsTrigger>
        </TabsList>

        {/* Weekly Board */}
        <TabsContent value="quadro" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setAlocForm({ tecnicoId: "", diaSemana: 1, cliente: "", servico: "", turno: "integral" }); setAlocDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />Alocar
            </Button>
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-muted-foreground w-32">Técnico</th>
                    {[1, 2, 3, 4, 5, 6].map((d) => (
                      <th key={d} className="text-center p-3 font-medium text-muted-foreground">{diasSemana[d]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tecnicos.filter((t) => t.ativo).map((tec) => (
                    <tr key={tec.id} className="border-b last:border-0">
                      <td className="p-3 font-medium text-xs whitespace-nowrap">{tec.nome}</td>
                      {[1, 2, 3, 4, 5, 6].map((dia) => {
                        const items = alocacoes.filter((a) => a.tecnicoId === tec.id && a.diaSemana === dia);
                        const veiculo = items[0]?.veiculoId ? veiculos.find((v) => v.id === items[0].veiculoId) : null;
                        return (
                          <td key={dia} className="p-2 align-top">
                            {items.length > 0 ? (
                              <div className="space-y-1">
                                {items.map((item) => (
                                  <div key={item.id} className={`rounded border px-2 py-1.5 text-[11px] ${turnoColor[item.turno]}`}>
                                    <p className="font-semibold">{item.cliente}</p>
                                    <p className="opacity-80">{item.servico}</p>
                                    <p className="opacity-60">{turnoLabel[item.turno]}</p>
                                  </div>
                                ))}
                                {veiculo && <p className="text-[10px] text-muted-foreground">🚗 {veiculo.placa}</p>}
                              </div>
                            ) : (
                              <div className="text-center text-muted-foreground/30 text-xs py-2">—</div>
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

        {/* Technicians */}
        <TabsContent value="tecnicos" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditTecId(null); setTecForm({ nome: "", cpf: "", cargo: "", dataAdmissao: "", telefone: "", ativo: true }); setTecDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />Novo Técnico
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
                  {tecnicos.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.nome}</TableCell>
                      <TableCell className="font-mono text-xs">{t.cpf}</TableCell>
                      <TableCell className="text-sm">{t.cargo}</TableCell>
                      <TableCell className="text-xs">{new Date(t.dataAdmissao).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" />{t.telefone}</TableCell>
                      <TableCell><Badge variant={t.ativo ? "default" : "secondary"}>{t.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => { setEditTecId(t.id); const { id, ...r } = t; setTecForm(r); setTecDialog(true); }}>
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

        {/* Vehicles */}
        <TabsContent value="veiculos" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditVeiId(null); setVeiForm({ placa: "", modelo: "", ano: 2024, ativo: true }); setVeiDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />Novo Veículo
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
                  {veiculos.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono font-bold">{v.placa}</TableCell>
                      <TableCell>{v.modelo}</TableCell>
                      <TableCell>{v.ano}</TableCell>
                      <TableCell><Badge variant={v.ativo ? "default" : "secondary"}>{v.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => { setEditVeiId(v.id); const { id, ...r } = v; setVeiForm(r); setVeiDialog(true); }}>
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
      </Tabs>

      {/* Technician Dialog */}
      <Dialog open={tecDialog} onOpenChange={setTecDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editTecId ? "Editar" : "Novo"} Técnico</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Nome *</Label><Input value={tecForm.nome} onChange={(e) => setTecForm({ ...tecForm, nome: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">CPF</Label><Input value={tecForm.cpf} onChange={(e) => setTecForm({ ...tecForm, cpf: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Cargo</Label><Input value={tecForm.cargo} onChange={(e) => setTecForm({ ...tecForm, cargo: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Admissão</Label><Input type="date" value={tecForm.dataAdmissao} onChange={(e) => setTecForm({ ...tecForm, dataAdmissao: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Telefone</Label><Input value={tecForm.telefone} onChange={(e) => setTecForm({ ...tecForm, telefone: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={tecForm.ativo} onChange={(e) => setTecForm({ ...tecForm, ativo: e.target.checked })} className="rounded" />Ativo</label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTecDialog(false)}>Cancelar</Button>
            <Button onClick={saveTec}>{editTecId ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vehicle Dialog */}
      <Dialog open={veiDialog} onOpenChange={setVeiDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editVeiId ? "Editar" : "Novo"} Veículo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Placa *</Label><Input value={veiForm.placa} onChange={(e) => setVeiForm({ ...veiForm, placa: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Modelo</Label><Input value={veiForm.modelo} onChange={(e) => setVeiForm({ ...veiForm, modelo: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Ano</Label><Input type="number" value={veiForm.ano} onChange={(e) => setVeiForm({ ...veiForm, ano: Number(e.target.value) })} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={veiForm.ativo} onChange={(e) => setVeiForm({ ...veiForm, ativo: e.target.checked })} className="rounded" />Ativo</label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVeiDialog(false)}>Cancelar</Button>
            <Button onClick={saveVei}>{editVeiId ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Allocation Dialog */}
      <Dialog open={alocDialog} onOpenChange={setAlocDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Alocação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Técnico *</Label>
              <Select value={alocForm.tecnicoId} onValueChange={(v) => setAlocForm({ ...alocForm, tecnicoId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{tecnicos.filter((t) => t.ativo).map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Dia da Semana</Label>
                <Select value={String(alocForm.diaSemana)} onValueChange={(v) => setAlocForm({ ...alocForm, diaSemana: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1, 2, 3, 4, 5, 6].map((d) => <SelectItem key={d} value={String(d)}>{diasSemana[d]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Turno</Label>
                <Select value={alocForm.turno} onValueChange={(v) => setAlocForm({ ...alocForm, turno: v as AlocacaoSemanal["turno"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manha">Manhã</SelectItem>
                    <SelectItem value="tarde">Tarde</SelectItem>
                    <SelectItem value="integral">Integral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Cliente *</Label><Input value={alocForm.cliente} onChange={(e) => setAlocForm({ ...alocForm, cliente: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Serviço</Label><Input value={alocForm.servico} onChange={(e) => setAlocForm({ ...alocForm, servico: e.target.value })} /></div>
            <div className="space-y-1">
              <Label className="text-xs">Veículo</Label>
              <Select value={alocForm.veiculoId || ""} onValueChange={(v) => setAlocForm({ ...alocForm, veiculoId: v || undefined })}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {veiculos.filter((v) => v.ativo).map((v) => <SelectItem key={v.id} value={v.id}>{v.placa} - {v.modelo}</SelectItem>)}
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
