import { useEffect, useState } from "react";
import { getBootstrap, saveClient, type Cliente, type ClienteEquipamento, type ClienteLocalExecucao, type ContatoCliente } from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Plus, Pencil, Search, Phone, Mail, MapPin, Building2, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";

const emptyContato: ContatoCliente = { nome: "", cargo: "", funcao: "operacional", telefone: "", email: "", principal: false, observacoes: "" };
const emptyLocal: ClienteLocalExecucao = { nome: "", endereco: "", bairro: "", municipio: "", uf: "", cep: "", observacoes: "", ativo: true };
const emptyEquipamento: ClienteEquipamento = { tag: "", descricao: "", tipo: "", setor: "", localId: "", observacoes: "", ativo: true };

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
  locaisExecucao: [],
  equipamentos: [],
  ativo: true,
};

const funcaoLabels: Record<NonNullable<ContatoCliente["funcao"]>, string> = {
  operacional: "Operacional",
  financeiro: "Financeiro",
  contratos: "Contratos",
  tecnico: "Técnico",
  emergencia: "Emergência",
  outro: "Outro",
};

function cloneClienteBase() {
  return {
    ...emptyCliente,
    contatos: [{ ...emptyContato, principal: true }],
    locaisExecucao: [],
    equipamentos: [],
  };
}

export default function Clientes() {
  const [lista, setLista] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Cliente, "id">>(cloneClienteBase());
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
    (cliente) =>
      cliente.razaoSocial.toLowerCase().includes(busca.toLowerCase()) ||
      cliente.cnpj.includes(busca) ||
      cliente.nomeFantasia.toLowerCase().includes(busca.toLowerCase()),
  );

  function openNew() {
    setEditId(null);
    setForm(cloneClienteBase());
    setDialogOpen(true);
  }

  function openEdit(cliente: Cliente) {
    const { id, ...rest } = cliente;
    setEditId(id);
    setForm({
      ...rest,
      contatos: rest.contatos.length > 0 ? rest.contatos : [{ ...emptyContato, principal: true }],
      locaisExecucao: rest.locaisExecucao ?? [],
      equipamentos: rest.equipamentos ?? [],
    });
    setDialogOpen(true);
  }

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
        locaisExecucao: form.locaisExecucao.filter((item) => item.nome),
        equipamentos: form.equipamentos.filter((item) => item.tag),
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

  function removeContato(index: number) {
    setForm((prev) => ({ ...prev, contatos: prev.contatos.filter((_, itemIndex) => itemIndex !== index) }));
  }

  function updateLocal(index: number, field: keyof ClienteLocalExecucao, value: string | boolean) {
    setForm((prev) => ({
      ...prev,
      locaisExecucao: prev.locaisExecucao.map((local, itemIndex) => (itemIndex === index ? { ...local, [field]: value } : local)),
    }));
  }

  function addLocal() {
    setForm((prev) => ({ ...prev, locaisExecucao: [...prev.locaisExecucao, { ...emptyLocal }] }));
  }

  function removeLocal(index: number) {
    setForm((prev) => ({ ...prev, locaisExecucao: prev.locaisExecucao.filter((_, itemIndex) => itemIndex !== index) }));
  }

  function updateEquipamento(index: number, field: keyof ClienteEquipamento, value: string | boolean) {
    setForm((prev) => ({
      ...prev,
      equipamentos: prev.equipamentos.map((equipamento, itemIndex) => (itemIndex === index ? { ...equipamento, [field]: value } : equipamento)),
    }));
  }

  function addEquipamento() {
    setForm((prev) => ({ ...prev, equipamentos: [...prev.equipamentos, { ...emptyEquipamento }] }));
  }

  function removeEquipamento(index: number) {
    setForm((prev) => ({ ...prev, equipamentos: prev.equipamentos.filter((_, itemIndex) => itemIndex !== index) }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Users className="h-6 w-6 text-primary" />
            Gestão de Clientes
          </h1>
          <p className="text-sm text-muted-foreground">Dados comerciais e operacionais usados em OS, certificados e medições.</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nome, fantasia ou CNPJ..." value={busca} onChange={(event) => setBusca(event.target.value)} className="pl-9" />
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
                  <TableHead>Operação</TableHead>
                  <TableHead>Contato Principal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((cliente) => {
                  const contatoPrincipal = cliente.contatos.find((contato) => contato.principal) || cliente.contatos[0];
                  return (
                    <TableRow key={cliente.id} className="cursor-pointer" onClick={() => setExpandedId(expandedId === cliente.id ? null : cliente.id)}>
                      <TableCell>
                        <p className="font-medium">{cliente.razaoSocial}</p>
                        {cliente.nomeFantasia && <p className="text-xs text-muted-foreground">{cliente.nomeFantasia}</p>}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{cliente.cnpj}</TableCell>
                      <TableCell className="text-sm">{cliente.municipio}/{cliente.uf}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {cliente.locaisExecucao.length} local(is) · {cliente.equipamentos.length} tag(s)
                      </TableCell>
                      <TableCell>
                        {contatoPrincipal && (
                          <div className="space-y-0.5 text-xs">
                            <p className="font-medium">{contatoPrincipal.nome}</p>
                            <p className="text-muted-foreground">{funcaoLabels[contatoPrincipal.funcao || "operacional"]} · {contatoPrincipal.telefone}</p>
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
              <div className="mt-4 space-y-4 rounded-lg border bg-muted/30 p-4">
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Endereço fiscal</p>
                      <p>{cliente.endereco}, {cliente.bairro}</p>
                      <p>{cliente.municipio}/{cliente.uf} - CEP {cliente.cep}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Inscrição Estadual</p>
                      <p>{cliente.inscricaoEstadual || "Isento"}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Contatos ({cliente.contatos.length})</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {cliente.contatos.map((contato, index) => (
                      <div key={`${cliente.id}-contato-${index}`} className="rounded-md border bg-card p-3 text-sm">
                        <p className="font-medium">
                          {contato.nome}
                          {contato.principal && <Badge variant="outline" className="ml-1 text-[10px]">Principal</Badge>}
                        </p>
                        <p className="text-xs text-muted-foreground">{contato.cargo} · {funcaoLabels[contato.funcao || "operacional"]}</p>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs">
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{contato.telefone}</span>
                          <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{contato.email}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Locais de execução ({cliente.locaisExecucao.length})</p>
                    <div className="space-y-2">
                      {cliente.locaisExecucao.map((local) => (
                        <div key={local.id || local.nome} className="rounded-md border bg-card p-3 text-sm">
                          <p className="font-medium">{local.nome}</p>
                          <p className="text-xs text-muted-foreground">{local.endereco || cliente.endereco}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Equipamentos e tags ({cliente.equipamentos.length})</p>
                    <div className="space-y-2">
                      {cliente.equipamentos.map((equipamento) => (
                        <div key={equipamento.id || equipamento.tag} className="rounded-md border bg-card p-3 text-sm">
                          <p className="flex items-center gap-1 font-mono font-bold"><Tag className="h-3.5 w-3.5" />{equipamento.tag}</p>
                          <p className="text-xs text-muted-foreground">{equipamento.descricao || equipamento.tipo || "Sem descrição"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <section className="space-y-4">
              <h3 className="text-sm font-semibold">Dados cadastrais</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Razão Social *</Label>
                  <Input value={form.razaoSocial} onChange={(event) => setForm({ ...form, razaoSocial: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Nome Fantasia</Label>
                  <Input value={form.nomeFantasia} onChange={(event) => setForm({ ...form, nomeFantasia: event.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>CNPJ *</Label>
                  <Input value={form.cnpj} onChange={(event) => setForm({ ...form, cnpj: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Inscrição Estadual</Label>
                  <Input value={form.inscricaoEstadual || ""} onChange={(event) => setForm({ ...form, inscricaoEstadual: event.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2 md:col-span-2">
                  <Label>Endereço</Label>
                  <Input value={form.endereco} onChange={(event) => setForm({ ...form, endereco: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input value={form.bairro} onChange={(event) => setForm({ ...form, bairro: event.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Município</Label>
                  <Input value={form.municipio} onChange={(event) => setForm({ ...form, municipio: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>UF</Label>
                  <Input value={form.uf} onChange={(event) => setForm({ ...form, uf: event.target.value.toUpperCase() })} maxLength={2} />
                </div>
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <Input value={form.cep} onChange={(event) => setForm({ ...form, cep: event.target.value })} />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Contatos por função</h3>
                <Button type="button" variant="outline" size="sm" onClick={addContato}><Plus className="mr-1 h-3 w-3" />Contato</Button>
              </div>
              {form.contatos.map((contato, index) => (
                <div key={index} className="space-y-3 rounded-lg border p-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome</Label>
                      <Input value={contato.nome} onChange={(event) => updateContato(index, "nome", event.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cargo</Label>
                      <Input value={contato.cargo} onChange={(event) => updateContato(index, "cargo", event.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Função no fluxo</Label>
                      <Select value={contato.funcao || "operacional"} onValueChange={(value) => updateContato(index, "funcao", value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(funcaoLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Telefone</Label>
                      <Input value={contato.telefone} onChange={(event) => updateContato(index, "telefone", event.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">E-mail</Label>
                      <Input value={contato.email} onChange={(event) => updateContato(index, "email", event.target.value)} />
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <label className="flex cursor-pointer items-center gap-2 pb-2 text-xs">
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
                      {form.contatos.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeContato(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Locais de execução</h3>
                <Button type="button" variant="outline" size="sm" onClick={addLocal}><Plus className="mr-1 h-3 w-3" />Local</Button>
              </div>
              {form.locaisExecucao.length === 0 && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Cadastre locais quando o serviço puder ocorrer em unidades, setores ou endereços diferentes.</p>}
              {form.locaisExecucao.map((local, index) => (
                <div key={index} className="space-y-3 rounded-lg border p-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome do local *</Label>
                      <Input value={local.nome} onChange={(event) => updateLocal(index, "nome", event.target.value)} placeholder="Ex.: Refeitório, Administração, Unidade 2" />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-xs">Endereço</Label>
                      <Input value={local.endereco || ""} onChange={(event) => updateLocal(index, "endereco", event.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Bairro</Label>
                      <Input value={local.bairro || ""} onChange={(event) => updateLocal(index, "bairro", event.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Município</Label>
                      <Input value={local.municipio || ""} onChange={(event) => updateLocal(index, "municipio", event.target.value)} />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">UF</Label>
                        <Input value={local.uf || ""} onChange={(event) => updateLocal(index, "uf", event.target.value.toUpperCase())} maxLength={2} />
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeLocal(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Equipamentos e tags</h3>
                <Button type="button" variant="outline" size="sm" onClick={addEquipamento}><Plus className="mr-1 h-3 w-3" />Tag</Button>
              </div>
              {form.equipamentos.length === 0 && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Use tags para bebedouros, reservatórios, armadilhas, equipamentos ou pontos atendidos.</p>}
              {form.equipamentos.map((equipamento, index) => (
                <div key={index} className="space-y-3 rounded-lg border p-3">
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Tag *</Label>
                      <Input value={equipamento.tag} onChange={(event) => updateEquipamento(index, "tag", event.target.value)} placeholder="Ex.: TAG 05" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo</Label>
                      <Input value={equipamento.tipo || ""} onChange={(event) => updateEquipamento(index, "tipo", event.target.value)} placeholder="Bebedouro, reservatório..." />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Setor</Label>
                      <Input value={equipamento.setor || ""} onChange={(event) => updateEquipamento(index, "setor", event.target.value)} />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Local</Label>
                        <Select value={equipamento.localId || "sem-local"} onValueChange={(value) => updateEquipamento(index, "localId", value === "sem-local" ? "" : value)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sem-local">Sem local vinculado</SelectItem>
                            {form.locaisExecucao.filter((local) => local.id || local.nome).map((local, localIndex) => (
                              <SelectItem key={local.id || `local-${localIndex}`} value={local.id || `novo-local-${localIndex}`}>
                                {local.nome || `Local ${localIndex + 1}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeEquipamento(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-1 md:col-span-4">
                      <Label className="text-xs">Descrição</Label>
                      <Input value={equipamento.descricao || ""} onChange={(event) => updateEquipamento(index, "descricao", event.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </section>
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
