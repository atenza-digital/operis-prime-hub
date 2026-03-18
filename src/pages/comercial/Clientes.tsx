import { useState } from "react";
import { clientes as clientesMock, type Cliente, type ContatoCliente } from "@/data/comercialData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Plus, Pencil, Search, Phone, Mail, MapPin, Building2 } from "lucide-react";
import { toast } from "sonner";

const emptyContato: ContatoCliente = { nome: "", cargo: "", telefone: "", email: "", principal: false };
const emptyCliente: Omit<Cliente, "id"> = {
  razaoSocial: "", nomeFantasia: "", cnpj: "", inscricaoEstadual: "",
  endereco: "", bairro: "", municipio: "", uf: "", cep: "",
  contatos: [{ ...emptyContato, principal: true }], ativo: true,
};

export default function Clientes() {
  const [lista, setLista] = useState<Cliente[]>(clientesMock);
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Cliente, "id">>(emptyCliente);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtrados = lista.filter(
    (c) =>
      c.razaoSocial.toLowerCase().includes(busca.toLowerCase()) ||
      c.cnpj.includes(busca) ||
      c.nomeFantasia.toLowerCase().includes(busca.toLowerCase())
  );

  const openNew = () => {
    setEditId(null);
    setForm({ ...emptyCliente, contatos: [{ ...emptyContato, principal: true }] });
    setDialogOpen(true);
  };

  const openEdit = (c: Cliente) => {
    setEditId(c.id);
    const { id, ...rest } = c;
    setForm({ ...rest, contatos: rest.contatos.length > 0 ? rest.contatos : [{ ...emptyContato, principal: true }] });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.razaoSocial || !form.cnpj) {
      toast.error("Razão Social e CNPJ são obrigatórios");
      return;
    }
    if (editId) {
      setLista((prev) => prev.map((c) => (c.id === editId ? { ...form, id: editId } : c)));
      toast.success("Cliente atualizado");
    } else {
      const newId = `CLI-${String(lista.length + 1).padStart(3, "0")}`;
      setLista((prev) => [...prev, { ...form, id: newId }]);
      toast.success("Cliente cadastrado");
    }
    setDialogOpen(false);
  };

  const updateContato = (idx: number, field: keyof ContatoCliente, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      contatos: prev.contatos.map((ct, i) => (i === idx ? { ...ct, [field]: value } : ct)),
    }));
  };

  const addContato = () => {
    setForm((prev) => ({ ...prev, contatos: [...prev.contatos, { ...emptyContato }] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Gestão de Clientes
          </h1>
          <p className="text-muted-foreground text-sm">Cadastre e gerencie os dados dos clientes</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, fantasia ou CNPJ..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razão Social</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Município/UF</TableHead>
                <TableHead>Contato Principal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((c) => {
                const contatoPrincipal = c.contatos.find((ct) => ct.principal) || c.contatos[0];
                return (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{c.razaoSocial}</p>
                        {c.nomeFantasia && <p className="text-xs text-muted-foreground">{c.nomeFantasia}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{c.cnpj}</TableCell>
                    <TableCell className="text-sm">{c.municipio}/{c.uf}</TableCell>
                    <TableCell>
                      {contatoPrincipal && (
                        <div className="text-xs space-y-0.5">
                          <p className="font-medium">{contatoPrincipal.nome}</p>
                          <p className="text-muted-foreground">{contatoPrincipal.telefone}</p>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.ativo ? "default" : "secondary"}>
                        {c.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Expanded details */}
          {expandedId && (() => {
            const c = lista.find((cl) => cl.id === expandedId);
            if (!c) return null;
            return (
              <div className="mt-4 rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Endereço</p>
                      <p>{c.endereco}, {c.bairro}</p>
                      <p>{c.municipio}/{c.uf} - CEP {c.cep}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Inscrição Estadual</p>
                      <p>{c.inscricaoEstadual || "Isento"}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-2">Contatos ({c.contatos.length})</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {c.contatos.map((ct, i) => (
                      <div key={i} className="rounded-md border bg-card p-3 text-sm flex items-start gap-3">
                        <div className="flex-1">
                          <p className="font-medium">{ct.nome} {ct.principal && <Badge variant="outline" className="ml-1 text-[10px]">Principal</Badge>}</p>
                          <p className="text-xs text-muted-foreground">{ct.cargo}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs">
                            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{ct.telefone}</span>
                            <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{ct.email}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Razão Social *</Label>
                <Input value={form.razaoSocial} onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nome Fantasia</Label>
                <Input value={form.nomeFantasia} onChange={(e) => setForm({ ...form, nomeFantasia: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CNPJ *</Label>
                <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-2">
                <Label>Inscrição Estadual</Label>
                <Input value={form.inscricaoEstadual || ""} onChange={(e) => setForm({ ...form, inscricaoEstadual: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Endereço</Label>
                <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Município</Label>
                <Input value={form.municipio} onChange={(e) => setForm({ ...form, municipio: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>UF</Label>
                <Input value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value })} maxLength={2} />
              </div>
              <div className="space-y-2">
                <Label>CEP</Label>
                <Input value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} />
              </div>
            </div>

            {/* Contatos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Contatos</Label>
                <Button type="button" variant="outline" size="sm" onClick={addContato}>
                  <Plus className="h-3 w-3 mr-1" />Contato
                </Button>
              </div>
              {form.contatos.map((ct, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome</Label>
                      <Input value={ct.nome} onChange={(e) => updateContato(i, "nome", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cargo</Label>
                      <Input value={ct.cargo} onChange={(e) => updateContato(i, "cargo", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Telefone</Label>
                      <Input value={ct.telefone} onChange={(e) => updateContato(i, "telefone", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">E-mail</Label>
                      <Input value={ct.email} onChange={(e) => updateContato(i, "email", e.target.value)} />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ct.principal}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setForm((prev) => ({
                            ...prev,
                            contatos: prev.contatos.map((c2, j) => ({ ...c2, principal: j === i })),
                          }));
                        }
                      }}
                      className="rounded"
                    />
                    Contato principal
                  </label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editId ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
