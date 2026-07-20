import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashPassword, normalizeEmail } from "../server/auth.mjs";
import { withTransaction } from "../server/db.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidenceDir = path.join(rootDir, "docs", "evidencias", "etapa7_homologacao", "anexos");
const baseUrl = (process.env.HOMOLOGATION_BASE_URL || "https://fieldops-homologacao.atenza.digital").replace(/\/$/, "");
const tenantSlug = process.env.HOMOLOGATION_TENANT_SLUG || "ciperprag";
const smokeEmail = normalizeEmail(process.env.HOMOLOGATION_ATTACHMENTS_EMAIL || "homolog.attachments@atenza.digital");

function makePassword() {
  return crypto.randomBytes(18).toString("base64url");
}

function brDateTime(value = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Fortaleza",
  }).format(value);
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(" | ")} |`),
  ].join("\n");
}

async function prepareSmokeUser(password) {
  const passwordHash = await hashPassword(password);
  return withTransaction(async (client) => {
    const { rows: tenantRows } = await client.query(
      "SELECT id FROM ciperprag_hub.tenants WHERE slug = $1 LIMIT 1",
      [tenantSlug],
    );
    const tenant = tenantRows[0];
    if (!tenant) throw new Error(`Tenant not found: ${tenantSlug}`);

    const { rows: userRows } = await client.query(
      `INSERT INTO ciperprag_hub.usuarios
       (tenant_id, nome, email, senha_hash, status, senha_alterada_em, senha_temporaria, tentativas_login, bloqueado_ate)
       VALUES ($1,'Attachment Validation Homologation',$2,$3,'ativo',NOW(),FALSE,0,NULL)
       ON CONFLICT (tenant_id, email) DO UPDATE SET
         nome = EXCLUDED.nome, senha_hash = EXCLUDED.senha_hash, status = 'ativo',
         senha_temporaria = FALSE, senha_alterada_em = NOW(), tentativas_login = 0,
         bloqueado_ate = NULL, updated_at = NOW()
       RETURNING id, email`,
      [tenant.id, smokeEmail, passwordHash],
    );
    const user = userRows[0];
    await client.query("DELETE FROM ciperprag_hub.usuario_perfis WHERE usuario_id = $1", [user.id]);
    await client.query(
      `INSERT INTO ciperprag_hub.usuario_perfis (usuario_id, perfil_id)
       SELECT $1, p.id FROM ciperprag_hub.perfis p
        WHERE p.tenant_id = $2 AND p.codigo = 'admin_empresa'
       ON CONFLICT DO NOTHING`,
      [user.id, tenant.id],
    );
    await client.query(
      `INSERT INTO ciperprag_hub.audit_logs
       (tenant_id, usuario_id, entidade_tipo, entidade_id, acao, resumo)
       VALUES ($1,$2,'usuario',$3,'homologation_attachment_validation','Validacao tecnica de anexos em homologacao')`,
      [tenant.id, user.id, user.id],
    );
    return user;
  });
}

async function requestJson(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");
  return { status: response.status, ok: response.ok, body };
}

async function requestAttachment(pathname, headers) {
  const response = await fetch(`${baseUrl}${pathname}`, { headers });
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    status: response.status,
    ok: response.ok,
    bytes: buffer.length,
    contentType: response.headers.get("content-type") || "",
    disposition: response.headers.get("content-disposition") || "",
    storageProvider: response.headers.get("x-storage-provider") || "",
    hashHeader: response.headers.get("x-document-hash-sha256") || "",
    contentHash: crypto.createHash("sha256").update(buffer).digest("hex"),
  };
}

function selectSamples(attachments) {
  const selected = [];
  const seen = new Set();
  for (const attachment of attachments) {
    const key = `${attachment.entidadeTipo}:${attachment.categoria}`;
    if (!seen.has(key)) {
      selected.push(attachment);
      seen.add(key);
    }
  }
  for (const attachment of attachments) {
    if (selected.length >= 8) break;
    if (!selected.some((item) => item.id === attachment.id)) selected.push(attachment);
  }
  return selected.slice(0, 8);
}

function short(value, length = 40) {
  const text = String(value || "");
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

async function main() {
  const password = makePassword();
  await prepareSmokeUser(password);
  const login = await requestJson("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: smokeEmail, password }),
  });
  if (!login.ok || !login.body?.token) throw new Error(`Attachment smoke login failed: HTTP ${login.status}`);

  const authHeaders = { Authorization: `Bearer ${login.body.token}` };
  const bootstrap = await requestJson("/api/bootstrap", { headers: authHeaders });
  if (!bootstrap.ok || !Array.isArray(bootstrap.body?.attachments)) {
    const detail = typeof bootstrap.body === "string"
      ? bootstrap.body.slice(0, 500)
      : JSON.stringify(bootstrap.body || {}).slice(0, 500);
    throw new Error(`Bootstrap attachments unavailable: HTTP ${bootstrap.status}; detail: ${detail}`);
  }
  const attachments = bootstrap.body.attachments;
  if (attachments.length === 0) throw new Error("No attachments available in homologation for validation.");

  const checks = [];
  for (const attachment of selectSamples(attachments)) {
    const endpoint = `/api/attachments/${encodeURIComponent(attachment.id)}/download`;
    const view = await requestAttachment(endpoint, authHeaders);
    const download = await requestAttachment(`${endpoint}?download=1`, authHeaders);
    const expectedHash = String(attachment.hashSha256 || "").toLowerCase();
    const validHash = expectedHash.length === 64
      && view.hashHeader.toLowerCase() === expectedHash
      && view.contentHash === expectedHash
      && download.contentHash === expectedHash;
    checks.push({ attachment, view, download, validHash,
      passed: view.ok && download.ok && view.bytes > 0 && download.bytes > 0 && validHash });
  }

  const failed = checks.filter((check) => !check.passed);
  const reportPath = path.join(evidenceDir, `VALIDACAO_ANEXOS_HOMOLOGACAO_${new Date().toISOString().slice(0, 10)}.md`);
  const rows = checks.map(({ attachment, view, download, validHash, passed }) => [
    attachment.id,
    `${attachment.entidadeTipo}/${attachment.categoria}`,
    short(attachment.nomeArquivo || "sem nome"),
    attachment.storageProvider || "n/d",
    `${view.status}/${download.status}`,
    `${view.bytes}/${download.bytes}`,
    validHash ? "SHA-256 conferido" : "SHA-256 divergente/ausente",
    passed ? "OK" : "FALHA",
  ]);
  const report = [
    "# Validacao de anexos em homologacao", "",
    `Ambiente: ${baseUrl}`, `Tenant: ${tenantSlug}`, `Executado em: ${brDateTime()}`, "",
    "## Resultado", "", `Status geral: ${failed.length === 0 ? "Aprovado" : "Verificar"}`,
    `Anexos catalogados: ${attachments.length}`, `Amostras validadas: ${checks.length}`, `Falhas: ${failed.length}`, "",
    "## Cobertura", "",
    markdownTable(["Anexo", "Entidade/categoria", "Arquivo", "Storage", "HTTP ver/download", "Bytes ver/download", "Integridade", "Resultado"], rows), "",
    "## Criterios", "",
    "- Login tecnico realizado sem registrar a senha temporaria no relatorio.",
    "- Bootstrap autenticado retornou os anexos do tenant.",
    "- Cada amostra respondeu tanto para visualizacao quanto para download.",
    "- O corpo recebido foi comparado com o SHA-256 persistido e com o header de integridade.",
    "- O provedor de armazenamento retornado pela aplicacao foi registrado por amostra.", "",
    "## Observacao", "",
    "Este relatorio valida o fluxo autenticado de anexos. A validacao visual de arquivos PDF e imagens permanece coberta pelos roteiros documentais e pela auditoria visual do navegador.", "",
  ].join("\n");
  await fs.mkdir(evidenceDir, { recursive: true });
  await fs.writeFile(reportPath, report, "utf8");
  console.log(JSON.stringify({ reportPath, attachments: attachments.length, samples: checks.length, failed: failed.length }, null, 2));
  if (failed.length > 0) {
    console.error(JSON.stringify(failed.map(({ attachment, view, download, validHash }) => ({
      id: attachment.id,
      entity: attachment.entidadeTipo,
      category: attachment.categoria,
      provider: attachment.storageProvider || "n/d",
      expectedHashLength: String(attachment.hashSha256 || "").length,
      viewStatus: view.status,
      downloadStatus: download.status,
      viewBytes: view.bytes,
      downloadBytes: download.bytes,
      headerHashPresent: Boolean(view.hashHeader),
      validHash,
    })), null, 2));
  }
  if (failed.length > 0) throw new Error(`Attachment validation failed for ${failed.length} sample(s).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
