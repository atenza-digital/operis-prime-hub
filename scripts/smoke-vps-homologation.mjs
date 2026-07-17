import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashPassword, normalizeEmail } from "../server/auth.mjs";
import { pool, query, withTransaction } from "../server/db.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidenceDir = path.join(rootDir, "docs", "evidencias", "etapa7_homologacao");
const baseUrl = (process.env.HOMOLOGATION_BASE_URL || "http://89.116.214.65:3010").replace(/\/$/, "");
const tenantSlug = process.argv.find((arg) => arg.startsWith("--tenant="))?.split("=")[1] || "ciperprag";
const smokeEmail = normalizeEmail(process.env.HOMOLOGATION_SMOKE_EMAIL || "homolog.smoke@atenza.digital");

function brDateTime(value = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Fortaleza",
  }).format(value);
}

function makePassword() {
  return crypto.randomBytes(18).toString("base64url");
}

function markdownTable(headers, rows) {
  const header = `| ${headers.join(" | ")} |`;
  const divider = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.map((cell) => String(cell ?? "").replaceAll("|", "\\|")).join(" | ")} |`);
  return [header, divider, ...body].join("\n");
}

async function prepareSmokeUser(password) {
  const passwordHash = await hashPassword(password);

  return withTransaction(async (client) => {
    const { rows: tenantRows } = await client.query(
      "SELECT id FROM ciperprag_hub.tenants WHERE slug = $1 LIMIT 1",
      [tenantSlug],
    );
    const tenant = tenantRows[0];
    if (!tenant) throw new Error(`Tenant nao encontrado: ${tenantSlug}`);

    const { rows: userRows } = await client.query(
      `INSERT INTO ciperprag_hub.usuarios
       (tenant_id, nome, email, senha_hash, status, senha_alterada_em, senha_temporaria, tentativas_login, bloqueado_ate)
       VALUES ($1,'Smoke Homologacao Atenza',$2,$3,'ativo',NOW(),FALSE,0,NULL)
       ON CONFLICT (tenant_id, email) DO UPDATE SET
         nome = EXCLUDED.nome,
         senha_hash = EXCLUDED.senha_hash,
         status = 'ativo',
         senha_temporaria = FALSE,
         senha_alterada_em = NOW(),
         tentativas_login = 0,
         bloqueado_ate = NULL,
         updated_at = NOW()
       RETURNING id, email`,
      [tenant.id, smokeEmail, passwordHash],
    );

    const user = userRows[0];

    await client.query(
      `DELETE FROM ciperprag_hub.usuario_perfis
        WHERE usuario_id = $1`,
      [user.id],
    );

    await client.query(
      `INSERT INTO ciperprag_hub.usuario_perfis (usuario_id, perfil_id)
       SELECT $1, p.id
         FROM ciperprag_hub.perfis p
        WHERE p.tenant_id = $2
          AND p.codigo = 'admin_empresa'
       ON CONFLICT DO NOTHING`,
      [user.id, tenant.id],
    );

    await client.query(
      `INSERT INTO ciperprag_hub.audit_logs
       (tenant_id, usuario_id, entidade_tipo, entidade_id, acao, resumo)
       VALUES ($1,$2,'usuario',$3,'homologation_smoke_prepared','Usuario tecnico de smoke preparado')`,
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

  return {
    status: response.status,
    ok: response.ok,
    body,
  };
}

async function main() {
  const password = makePassword();
  await prepareSmokeUser(password);

  const login = await requestJson("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: smokeEmail, password }),
  });

  if (!login.ok || !login.body?.token) {
    throw new Error(`Falha no login smoke: HTTP ${login.status}`);
  }

  const token = login.body.token;
  const authHeaders = { Authorization: `Bearer ${token}` };

  const endpointChecks = [];

  for (const check of [
    { label: "Health publico", path: "/api/health", auth: false },
    { label: "Usuario autenticado", path: "/api/auth/me", auth: true },
    { label: "Bootstrap operacional", path: "/api/bootstrap", auth: true },
    { label: "Perfis", path: "/api/roles", auth: true },
    { label: "Usuarios", path: "/api/users", auth: true },
    { label: "Auditoria", path: "/api/audit-logs?limit=5", auth: true },
  ]) {
    const result = await requestJson(check.path, { headers: check.auth ? authHeaders : undefined });
    endpointChecks.push({
      ...check,
      status: result.status,
      ok: result.ok,
      body: result.body,
    });
  }

  const bootstrap = endpointChecks.find((check) => check.path === "/api/bootstrap")?.body;
  const firstCertificate = bootstrap?.certificates?.[0];
  const certificateCheck = firstCertificate
    ? await requestJson(`/api/certificates/${encodeURIComponent(firstCertificate.hash)}`, { headers: authHeaders })
    : null;

  if (certificateCheck) {
    endpointChecks.push({
      label: "Validacao de certificado",
      path: `/api/certificates/${firstCertificate.hash}`,
      auth: true,
      status: certificateCheck.status,
      ok: certificateCheck.ok,
      body: certificateCheck.body,
    });
  }

  const summary = {
    clientes: bootstrap?.clients?.length ?? 0,
    servicos: bootstrap?.services?.length ?? 0,
    contratosOperacionais: bootstrap?.contracts?.length ?? 0,
    propostasContratos: bootstrap?.contractTemplates?.length ?? 0,
    agendamentos: bootstrap?.schedules?.length ?? 0,
    ordensServico: bootstrap?.orders?.length ?? 0,
    certificados: bootstrap?.certificates?.length ?? 0,
    medicoes: bootstrap?.measurements?.length ?? 0,
    recorrencias: bootstrap?.recurrenceSuggestions?.length ?? 0,
    anexos: bootstrap?.attachments?.length ?? 0,
  };

  const failed = endpointChecks.filter((check) => !check.ok);
  const report = [
    "# Smoke VPS de Homologacao",
    "",
    `Ambiente: ${baseUrl}`,
    `Tenant: ${tenantSlug}`,
    `Executado em: ${brDateTime()}`,
    "",
    "## Resultado",
    "",
    failed.length === 0 ? "Status geral: Aprovado" : "Status geral: Verificar",
    "",
    "## Endpoints",
    "",
    markdownTable(
      ["Verificacao", "Endpoint", "HTTP", "Resultado"],
      endpointChecks.map((check) => [
        check.label,
        check.path,
        check.status,
        check.ok ? "OK" : "Falhou",
      ]),
    ),
    "",
    "## Dados carregados no bootstrap",
    "",
    markdownTable(
      ["Area", "Quantidade"],
      Object.entries(summary).map(([label, value]) => [label, value]),
    ),
    "",
    "## Observacoes",
    "",
    "- Este smoke cria/atualiza um usuario tecnico interno apenas para validar a API publicada.",
    "- A senha usada no smoke e aleatoria e nao e persistida em documentacao.",
    "- O teste manual assistido continua necessario para validar UX, documentos e aderencia operacional.",
    "",
  ].join("\n");

  await fs.mkdir(evidenceDir, { recursive: true });
  const outputPath = path.join(evidenceDir, "smoke-vps-api.md");
  await fs.writeFile(outputPath, report, "utf8");

  console.log(`Smoke VPS: ${failed.length === 0 ? "aprovado" : "verificar"}`);
  console.log(`Relatorio: ${outputPath}`);
  console.log(JSON.stringify({ endpoints: endpointChecks.length, failed: failed.length, summary }, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
