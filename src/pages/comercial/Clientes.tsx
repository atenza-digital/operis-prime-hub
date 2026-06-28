import { useEffect, useState } from "react";
import { getBootstrap, saveClient, type Cliente, type ContatoCliente } from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  inscricaoEstadual: "",
  endereco: "",
  bairro: "",
  municipio: "",
  uf: "",
  cep: "",
  contatos: [{ ...emptyContato, principal: true }],
  ativo: true,
};

export default function Clientes() {
  const [lista, setLista] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Cliente, "id">>(emptyCliente);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const data = await getBootstrap();
      setLista(data.clients);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const filtrados = lista.filter(
    (c) =>
      c.razaoSocial.toLowerCase().includes(busca.toLowerCase()) ||
      c.cnpj.includes(busca) ||
      c.nomeFantasia.toLowerCase().includes(busca.toLowerCase()),
  );

  const openNew = () => {
    setEditId(null);
    setForm({ ...emptyCliente, contatos: [{ ...emptyContato, principal: true }] });
    setDialogOpen(true);
  };

  const openEdit = (cliente: Cliente) => {
    setEditId(cliente.id);
    const { id, ...rest } = cliente;
    setForm({ ...rest, contatos: rest.contatos.length > 0 ? rest.contatos : [{ ...emptyContato, principal: true }] });
    setDialogOpen(true);
  };

  async function handleSave() {
    if (!form.razaoSocial || !form.cnpj) {
      toast.error("Razão social e CNPJ são obrigatórios");
      return;
    }

    setSaving(true);
    try {
      await saveClient({
        ...form,
        id: editId ?? undefined,
        contatos: form.contatos.filter((item) => item.nome || item.telefone || item.email),
      });
      toast.success(editId ? "Cliente atualizado" : "Cliente cadastrado");
      setDialogOpen(false);
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar cliente");
    } finally {
      setSaving(false);
    }
  }

  function updateContato(index: number, field: keyof ContatoCliente, value: string | boolean) {
    setForm((prev) => ({
      ...prev,
      contatos: prev.contatos.map((contato, itemIndex) => (itemIndex === index ? { ...contato, [field]: value } : contato)),
    }));
  }

  function addContato() {
    setForm((prev) => ({ ...prev, contatos: [...prev.contatos, { ...emptyContato }] }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Gestão de Clientes
          </h1>
          <p className="text-muted-foreground text-sm">Cadastre e gerencie os dados dos clientes direto no banco</p>
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
              onChange={(event) => setBusca(event.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Carregando clientes...</div>
          ) : (
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
                {filtrados.map((cliente) => {
                  const contatoPrincipal = cliente.contatos.find((contato) => contato.principal) || cliente.contatos[0];
                  return (
                    <TableRow
                      key={cliente.id}
                      className="cursor-pointer"
                      onClick={() => setExpandedId(expandedId === cliente.id ? null : cliente.id)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{cliente.razaoSocial}</p>
                          {cliente.nomeFantasia && <p className="text-xs text-muted-foreground">{cliente.nomeFantasia}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{cliente.cnpj}</TableCell>
                      <TableCell className="text-sm">{cliente.municipio}/{cliente.uf}</TableCell>
                      <TableCell>
                        {contatoPrincipal && (
                          <div className="text-xs space-y-0.5">
                            <p className="font-medium">{contatoPrincipal.nome}</p>
                            <p className="text-muted-foreground">{contatoPrincipal.telefone}</p>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cliente.ativo ? "default" : "secondary"}>{cliente.ativo ? "Ativo" : "Inativo"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEdit(cliente);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {expandedId && (() => {
            const cliente = lista.find((item) => item.id === expandedId);
            if (!cliente) return null;
            return (
              <div className="mt-4 rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Endereço</p>
                      <p>{cliente.endereco}, {cliente.bairro}</p>
                      <p>{cliente.municipio}/{cliente.uf} - CEP {cliente.cep}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Inscrição Estadual</p>
                      <p>{cliente.inscricaoEstadual || "Isento"}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-2">Contatos ({cliente.contatos.length})</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {cliente.contatos.map((contato, index) => (
                      <div key={`${cliente.id}-${index}`} className="rounded-md border bg-card p-3 text-sm flex items-start gap-3">
                        <div className="flex-1">
                          <p className="font-medium">
                            {contato.nome}
                            {contato.principal && <Badge variant="outline" className="ml-1 text-[10px]">Principal</Badge>}
                          </p>
                          <p className="text-xs text-muted-foreground">{contato.cargo}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs">
                            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{contato.telefone}</span>
                            <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{contato.email}</span>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Razão Social *</Label>
                <Input value={form.razaoSocial} onChange={(event) => setForm({ ...form, razaoSocial: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nome Fantasia</Label>
                <Input value={form.nomeFantasia} onChange={(event) => setForm({ ...form, nomeFantasia: event.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CNPJ *</Label>
                <Input value={form.cnpj} onChange={(event) => setForm({ ...form, cnpj: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Inscrição Estadual</Label>
                <Input value={form.inscricaoEstadual || ""} onChange={(event) => setForm({ ...form, inscricaoEstadual: event.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Endereço</Label>
                <Input value={form.endereco} onChange={(event) => setForm({ ...form, endereco: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input value={form.bairro} onChange={(event) => setForm({ ...form, bairro: event.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Município</Label>
                <Input value={form.municipio} onChange={(event) => setForm({ ...form, municipio: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>UF</Label>
                <Input value={form.uf} onChange={(event) => setForm({ ...form, uf: event.target.value })} maxLength={2} />
              </div>
              <div className="space-y-2">
                <Label>CEP</Label>
                <Input value={form.cep} onChange={(event) => setForm({ ...form, cep: event.target.value })} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Contatos</Label>
                <Button type="button" variant="outline" size="sm" onClick={addContato}>
                  <Plus className="h-3 w-3 mr-1" />
                  Contato
                </Button>
              </div>
              {form.contatos.map((contato, index) => (
                <div key={index} className="rounded-lg border p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome</Label>
                      <Input value={contato.nome} onChange={(event) => updateContato(index, "nome", event.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cargo</Label>
                      <Input value={contato.cargo} onChange={(event) => updateContato(index, "cargo", event.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Telefone</Label>
                      <Input value={contato.telefone} onChange={(event) => updateContato(index, "telefone", event.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">E-mail</Label>
                      <Input value={contato.email} onChange={(event) => updateContato(index, "email", event.target.value)} />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={contato.principal}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setForm((prev) => ({
                            ...prev,
                            contatos: prev.contatos.map((item, itemIndex) => ({ ...item, principal: itemIndex === index })),
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
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : editId ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
