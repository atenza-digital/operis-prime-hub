import { useEffect, useMemo, useState } from "react";
import { Cloud, Download, ExternalLink, FileSearch, FileText, Image as ImageIcon, LockKeyhole, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchAttachmentBlob, getBootstrap, type BootstrapData, type EvidenciaAnexoApp } from "@/lib/api";
import { formatDateBr, formatTimeBr } from "@/lib/formatters";

const entityLabels: Record<EvidenciaAnexoApp["entidadeTipo"], string> = {
  os: "OS",
  certificado: "Certificado",
  medicao: "Medição",
  servico_pop: "POP",
  cliente: "Cliente",
  contrato: "Contrato",
  proposta: "Proposta",
  minuta: "Minuta",
};

const categoryLabels: Record<EvidenciaAnexoApp["categoria"], string> = {
  evidencia: "Evidência",
  foto: "Foto",
  documento: "Documento",
  pop_aprovado: "POP aprovado",
  pdf_historico: "Histórico",
  outro: "Outro",
};

type StatusTone = "success" | "warning" | "info" | "muted";

function formatBytes(value?: number) {
  if (!value) return "Não informado";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function hashPreview(hash?: string) {
  if (!hash) return "Sem hash";
  return `${hash.slice(0, 12)}...${hash.slice(-8)}`;
}

function metadataText(anexo: EvidenciaAnexoApp, key: string) {
  const value = anexo.metadados?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function metadataBoolean(anexo: EvidenciaAnexoApp, key: string) {
  return anexo.metadados?.[key] === true;
}

function storageStatus(anexo: EvidenciaAnexoApp): { label: string; detail: string; tone: StatusTone } {
  const provider = anexo.storageProvider || metadataText(anexo, "storageProvider") || "database";
  const upload = metadataText(anexo, "storageUpload");
  const plannedProvider = metadataText(anexo, "plannedStorageProvider");
  const ready = anexo.metadados?.storageReady === true;

  if (provider === "r2") {
    return { label: "R2 ativo", detail: "Arquivo servido pelo storage externo.", tone: "success" };
  }
  if (upload === "fallback_database") {
    return { label: "Fallback banco", detail: "Tentou storage externo e preservou cópia no banco.", tone: "warning" };
  }
  if (plannedProvider === "r2" || ready) {
    return { label: "Plano R2", detail: "Chave planejada para migração controlada.", tone: "info" };
  }
  return { label: "Banco", detail: "Conteúdo ainda persistido no banco.", tone: "muted" };
}

function securityStatus(anexo: EvidenciaAnexoApp): { label: string; detail: string; quarantine: string; tone: StatusTone } {
  const scanStatus = metadataText(anexo, "securityScanStatus") || (metadataBoolean(anexo, "securityScanRequired") ? "pendente" : "validacao_basica");
  const quarantineStatus = metadataText(anexo, "quarantineStatus") || "desativada";
  const provider = metadataText(anexo, "securityScanProvider") || "validação local";

  if (scanStatus === "clean") {
    return { label: "Verificado", detail: provider, quarantine: quarantineStatus, tone: "success" };
  }
  if (scanStatus === "pending" || scanStatus === "pendente") {
    return { label: "Pendente", detail: provider, quarantine: quarantineStatus, tone: "warning" };
  }
  if (scanStatus === "validacao_basica") {
    return { label: "Validação básica", detail: "MIME, tamanho, base64 e assinatura.", quarantine: quarantineStatus, tone: "info" };
  }
  return { label: scanStatus, detail: provider, quarantine: quarantineStatus, tone: "muted" };
}

function policyLabel(anexo: EvidenciaAnexoApp) {
  return metadataText(anexo, "uploadPolicyKey") || `${anexo.entidadeTipo}.${anexo.categoria}`;
}

function toneClass(tone: StatusTone) {
  if (tone === "success") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-800";
  if (tone === "info") return "border-blue-200 bg-blue-50 text-blue-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

async function openAttachment(anexo: EvidenciaAnexoApp) {
  const result = await fetchAttachmentBlob(anexo.id);
  const url = URL.createObjectURL(result.blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function downloadAttachment(anexo: EvidenciaAnexoApp) {
  const result = await fetchAttachmentBlob(anexo.id, true);
  const url = URL.createObjectURL(result.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = result.fileName || anexo.nomeArquivo || `${anexo.id}.bin`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export default function AuditoriaAnexos() {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("todos");
  const [categoryFilter, setCategoryFilter] = useState("todas");
  const [immutabilityFilter, setImmutabilityFilter] = useState("todos");
  const [storageFilter, setStorageFilter] = useState("todos");
  const [securityFilter, setSecurityFilter] = useState("todos");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    getBootstrap()
      .then(setData)
      .catch((error) => toast.error(error instanceof Error ? error.message : "Erro ao carregar auditoria de anexos"))
      .finally(() => setLoading(false));
  }, []);

  const attachments = useMemo(() => data?.attachments ?? [], [data?.attachments]);

  const filteredAttachments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return attachments.filter((anexo) => {
      const storage = storageStatus(anexo);
      const security = securityStatus(anexo);
      const matchesSearch =
        !term ||
        [
          anexo.id,
          anexo.entidadeId,
          anexo.nomeArquivo,
          anexo.mimeType,
          anexo.hashSha256,
          categoryLabels[anexo.categoria],
          entityLabels[anexo.entidadeTipo],
          storage.label,
          security.label,
          policyLabel(anexo),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      const matchesEntity = entityFilter === "todos" || anexo.entidadeTipo === entityFilter;
      const matchesCategory = categoryFilter === "todas" || anexo.categoria === categoryFilter;
      const matchesImmutability =
        immutabilityFilter === "todos" ||
        (immutabilityFilter === "imutaveis" && anexo.imutavel) ||
        (immutabilityFilter === "editaveis" && !anexo.imutavel);
      const matchesStorage =
        storageFilter === "todos" ||
        (storageFilter === "r2" && storage.label === "R2 ativo") ||
        (storageFilter === "plano-r2" && storage.label === "Plano R2") ||
        (storageFilter === "banco" && storage.label === "Banco") ||
        (storageFilter === "fallback" && storage.label === "Fallback banco");
      const matchesSecurity =
        securityFilter === "todos" ||
        (securityFilter === "validacao-basica" && security.label === "Validação básica") ||
        (securityFilter === "pendente" && security.label === "Pendente") ||
        (securityFilter === "verificado" && security.label === "Verificado");

      return matchesSearch && matchesEntity && matchesCategory && matchesImmutability && matchesStorage && matchesSecurity;
    });
  }, [attachments, categoryFilter, entityFilter, immutabilityFilter, search, securityFilter, storageFilter]);

  const totals = useMemo(
    () => ({
      all: attachments.length,
      immutable: attachments.filter((item) => item.imutavel).length,
      historical: attachments.filter((item) => item.categoria === "pdf_historico").length,
      serverPdf: attachments.filter((item) => item.mimeType === "application/pdf" && item.templateCodigo).length,
      images: attachments.filter((item) => item.mimeType?.startsWith("image/")).length,
      r2: attachments.filter((item) => storageStatus(item).label === "R2 ativo").length,
      plannedR2: attachments.filter((item) => storageStatus(item).label === "Plano R2").length,
      basicValidated: attachments.filter((item) => securityStatus(item).label === "Validação básica").length,
      securityPending: attachments.filter((item) => securityStatus(item).label === "Pendente").length,
    }),
    [attachments],
  );

  async function runAttachmentAction(anexo: EvidenciaAnexoApp, action: "open" | "download") {
    setBusyId(`${action}:${anexo.id}`);
    try {
      if (action === "open") {
        await openAttachment(anexo);
      } else {
        await downloadAttachment(anexo);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao acessar anexo");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operacional"
        title="Auditoria de Anexos"
        description="Rastreie evidências de campo, documentos históricos, hashes, políticas de upload e arquivos imutáveis gerados pela operação."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <FileSearch className="h-9 w-9 rounded-xl bg-emerald-50 p-2 text-emerald-700" />
            <div>
              <p className="text-sm text-muted-foreground">Anexos no banco</p>
              <p className="text-3xl font-bold">{totals.all}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <LockKeyhole className="h-9 w-9 rounded-xl bg-slate-100 p-2 text-slate-700" />
            <div>
              <p className="text-sm text-muted-foreground">Imutáveis</p>
              <p className="text-3xl font-bold">{totals.immutable}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <FileText className="h-9 w-9 rounded-xl bg-amber-50 p-2 text-amber-700" />
            <div>
              <p className="text-sm text-muted-foreground">Históricos</p>
              <p className="text-3xl font-bold">{totals.historical}</p>
              <p className="text-xs text-muted-foreground">{totals.serverPdf} PDF server-side</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <ImageIcon className="h-9 w-9 rounded-xl bg-blue-50 p-2 text-blue-700" />
            <div>
              <p className="text-sm text-muted-foreground">Fotos</p>
              <p className="text-3xl font-bold">{totals.images}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <Cloud className="h-9 w-9 rounded-xl bg-blue-50 p-2 text-blue-700" />
            <div>
              <p className="text-sm text-muted-foreground">Storage externo</p>
              <p className="text-2xl font-bold">{totals.r2}</p>
              <p className="text-xs text-muted-foreground">{totals.plannedR2} com plano R2 preparado</p>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardContent className="grid gap-3 p-5 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold">Segurança de anexos</p>
              <p className="mt-1 text-sm text-muted-foreground">
                A homologação já bloqueia tipo indevido, base64 inválido, tamanho acima do limite e assinatura de arquivo divergente.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <Badge variant="outline">{totals.basicValidated} com validação básica</Badge>
              <Badge variant={totals.securityPending ? "destructive" : "secondary"}>{totals.securityPending} pendente(s) de provedor externo</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Consulta auditável
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr]">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por arquivo, hash, entidade ou ID..."
            />
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Entidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as entidades</SelectItem>
                {Object.entries(entityLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as categorias</SelectItem>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={immutabilityFilter} onValueChange={setImmutabilityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Integridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="imutaveis">Somente imutáveis</SelectItem>
                <SelectItem value="editaveis">Somente editáveis</SelectItem>
              </SelectContent>
            </Select>
            <Select value={storageFilter} onValueChange={setStorageFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Storage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todo storage</SelectItem>
                <SelectItem value="banco">Banco</SelectItem>
                <SelectItem value="plano-r2">Plano R2</SelectItem>
                <SelectItem value="r2">R2 ativo</SelectItem>
                <SelectItem value="fallback">Fallback banco</SelectItem>
              </SelectContent>
            </Select>
            <Select value={securityFilter} onValueChange={setSecurityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Segurança" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Toda segurança</SelectItem>
                <SelectItem value="validacao-basica">Validação básica</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="verificado">Verificado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead>Política e segurança</TableHead>
                  <TableHead>Hash SHA-256</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      Carregando anexos...
                    </TableCell>
                  </TableRow>
                ) : null}
                {!loading && filteredAttachments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      Nenhum anexo encontrado para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : null}
                {filteredAttachments.map((anexo) => {
                  const storage = storageStatus(anexo);
                  const security = securityStatus(anexo);
                  return (
                    <TableRow key={anexo.id}>
                      <TableCell className="min-w-[220px]">
                        <div className="font-medium">{anexo.nomeArquivo}</div>
                        <div className="text-xs text-muted-foreground">
                          {anexo.mimeType || "Tipo não informado"} • {formatBytes(anexo.tamanhoBytes)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{entityLabels[anexo.entidadeTipo]}</Badge>
                        <div className="mt-1 text-xs text-muted-foreground">{anexo.entidadeId}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={anexo.categoria === "pdf_historico" ? "default" : "secondary"}>{categoryLabels[anexo.categoria]}</Badge>
                          {anexo.imutavel ? <Badge variant="outline">Imutável</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[150px]">
                        <Badge variant="outline" className={toneClass(storage.tone)}>
                          {storage.label}
                        </Badge>
                        <div className="mt-1 max-w-[220px] text-xs text-muted-foreground">{storage.detail}</div>
                      </TableCell>
                      <TableCell className="min-w-[190px]">
                        <div className="text-xs font-semibold">{policyLabel(anexo)}</div>
                        <Badge variant="outline" className={`mt-1 ${toneClass(security.tone)}`}>
                          {security.label}
                        </Badge>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {security.detail} · Quarentena: {security.quarantine}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-2 py-1 text-xs">{hashPreview(anexo.hashSha256)}</code>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateBr(anexo.criadoEm)}
                        <div className="text-xs text-muted-foreground">{formatTimeBr(anexo.criadoEm)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={busyId === `open:${anexo.id}`}
                            onClick={() => runAttachmentAction(anexo, "open")}
                          >
                            <ExternalLink className="mr-1 h-3.5 w-3.5" />
                            Abrir
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={busyId === `download:${anexo.id}`}
                            onClick={() => runAttachmentAction(anexo, "download")}
                          >
                            <Download className="mr-1 h-3.5 w-3.5" />
                            Baixar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
