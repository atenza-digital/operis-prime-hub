import { useEffect, useMemo, useState } from "react";
import { Copy, KeyRound, Pencil, Plus, ShieldCheck, UserCog } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { getRoles, getUsers, resetUserPassword, saveUser, type RoleApp, type UserApp } from "@/lib/api";
import { formatDateBr, formatTimeBr } from "@/lib/formatters";

const statusLabels: Record<UserApp["status"], string> = {
  ativo: "Ativo",
  convidado: "Convidado",
  bloqueado: "Bloqueado",
  inativo: "Inativo",
};

const statusVariants: Record<UserApp["status"], "default" | "secondary" | "destructive" | "outline"> = {
  ativo: "default",
  convidado: "secondary",
  bloqueado: "destructive",
  inativo: "outline",
};

const emptyForm = {
  nome: "",
  email: "",
  status: "ativo" as UserApp["status"],
  perfilCodigos: [] as string[],
};

export default function Usuarios() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserApp[]>([]);
  const [roles, setRoles] = useState<RoleApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");

  const activeUsers = useMemo(() => users.filter((item) => item.status === "ativo").length, [users]);
  const blockedUsers = useMemo(() => users.filter((item) => item.status === "bloqueado" || item.status === "inativo").length, [users]);

  async function reload() {
    setLoading(true);
    try {
      const [usersResponse, rolesResponse] = await Promise.all([getUsers(), getRoles()]);
      setUsers(usersResponse.users);
      setRoles(rolesResponse.roles);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  function openNewUser() {
    setEditingId(null);
    setTemporaryPassword("");
    setForm({ ...emptyForm, perfilCodigos: roles.find((role) => role.codigo === "operacao") ? ["operacao"] : [] });
    setDialogOpen(true);
  }

  function openEditUser(item: UserApp) {
    setEditingId(item.id);
    setTemporaryPassword("");
    setForm({
      nome: item.nome,
      email: item.email,
      status: item.status,
      perfilCodigos: item.perfis.map((perfil) => perfil.codigo),
    });
    setDialogOpen(true);
  }

  function toggleRole(code: string) {
    setForm((previous) => ({
      ...previous,
      perfilCodigos: previous.perfilCodigos.includes(code)
        ? previous.perfilCodigos.filter((item) => item !== code)
        : [...previous.perfilCodigos, code],
    }));
  }

  async function copyPassword(password: string) {
    await navigator.clipboard.writeText(password);
    toast.success("Senha copiada");
  }

  async function handleSave() {
    if (!form.nome.trim() || !form.email.trim()) {
      toast.error("Nome e e-mail são obrigatórios");
      return;
    }
    if (form.perfilCodigos.length === 0) {
      toast.error("Selecione pelo menos um perfil");
      return;
    }
    if (editingId === currentUser?.id && form.status !== "ativo") {
      toast.error("Você não pode bloquear ou inativar seu próprio usuário");
      return;
    }

    setSaving(true);
    try {
      const response = await saveUser({ id: editingId ?? undefined, ...form });
      if (response.temporaryPassword) {
        setTemporaryPassword(response.temporaryPassword);
        toast.success("Usuário criado. Copie a senha temporária antes de fechar.");
      } else {
        toast.success("Usuário atualizado");
        setDialogOpen(false);
      }
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar usuário");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(item: UserApp) {
    if (!window.confirm(`Gerar nova senha temporária para ${item.nome}? As sessões atuais serão encerradas.`)) return;
    try {
      const response = await resetUserPassword(item.id);
      setEditingId(item.id);
      setForm({
        nome: item.nome,
        email: item.email,
        status: item.status,
        perfilCodigos: item.perfis.map((perfil) => perfil.codigo),
      });
      setTemporaryPassword(response.temporaryPassword);
      setDialogOpen(true);
      toast.success("Senha temporária gerada");
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao resetar senha");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Segurança"
        title="Usuários e Perfis"
        description="Gerencie acessos internos, perfis operacionais e resets de senha da plataforma."
        crumbs={[
          { label: "Operacional", to: "/" },
          { label: "Usuários" },
        ]}
        actions={[{ label: "Novo usuário", onClick: openNewUser, variant: "default" }]}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700"><UserCog className="h-5 w-5" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Usuários cadastrados</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700"><ShieldCheck className="h-5 w-5" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Ativos</p>
              <p className="text-2xl font-bold">{activeUsers}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-700"><KeyRound className="h-5 w-5" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Bloqueados/inativos</p>
              <p className="text-2xl font-bold">{blockedUsers}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contas da empresa</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Carregando usuários...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Perfis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último login</TableHead>
                  <TableHead className="w-[150px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.nome}</div>
                      <div className="text-xs text-muted-foreground">{item.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {item.perfis.map((perfil) => <Badge key={perfil.codigo} variant="secondary">{perfil.nome}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={statusVariants[item.status]}>{statusLabels[item.status]}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.ultimoLoginEm ? `${formatDateBr(item.ultimoLoginEm)} ${formatTimeBr(item.ultimoLoginEm)}` : "Nunca acessou"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditUser(item)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleResetPassword(item)} title="Resetar senha">
                          <KeyRound className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Nenhum usuário cadastrado.</TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar usuário" : "Novo usuário"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} inputMode="email" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as UserApp["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="convidado">Convidado</SelectItem>
                  <SelectItem value="bloqueado">Bloqueado</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Perfis</Label>
              <div className="grid gap-2 md:grid-cols-2">
                {roles.map((role) => (
                  <label key={role.codigo} className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/40">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={form.perfilCodigos.includes(role.codigo)}
                      onChange={() => toggleRole(role.codigo)}
                    />
                    <span>
                      <span className="block text-sm font-semibold">{role.nome}</span>
                      <span className="block text-xs text-muted-foreground">{role.descricao || role.codigo}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {temporaryPassword ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
                <p className="text-sm font-bold">Senha temporária</p>
                <p className="mt-1 text-xs">Copie e envie ao usuário por canal seguro. A senha não será exibida novamente.</p>
                <div className="mt-3 flex items-center gap-2">
                  <code className="min-w-0 flex-1 rounded-lg bg-white px-3 py-2 text-sm font-bold">{temporaryPassword}</code>
                  <Button type="button" variant="outline" onClick={() => copyPassword(temporaryPassword)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Fechar</Button>
            <Button onClick={handleSave} disabled={saving}>
              <Plus className="mr-2 h-4 w-4" />
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
