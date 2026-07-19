import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool, query } from "../server/db.mjs";
import { sanitizeStorageSegment } from "../server/storage.mjs";

const schemaName = "ciperprag_hub";
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidenceDir = path.join(rootDir, "docs", "evidencias", "etapa8_infra_saas");
const outputFile = path.join(evidenceDir, "TRI_TENANT_ISOLATION_2026-07-19.md");

const args = new Map(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith("--") && arg.includes("="))
    .map((arg) => {
      const [key, ...value] = arg.slice(2).split("=");
      return [key, value.join("=")];
    }),
);

const explicitTenants = (args.get("tenants") || process.env.TRI_TENANT_SLUGS || "")
  .split(",")
  .map((slug) => slug.trim())
  .filter(Boolean);
const maxAttachments = Number(args.get("limit") || process.env.TRI_TENANT_LIMIT || 2000);

const ciperpragLeakPatterns = [
  /ciperprag/i,
  /15\.722\.292/i,
  /adm@ciperprag/i,
  /operacional@ciperprag/i,
  /logo_ciperprag/i,
  /Rua Tiradentes/i,
  /Rondon do Par[aá]/i,
];

const scopedTables = [
  "empresa_config",
  "numeracao_config",
  "clientes",
  "tecnicos",
  "veiculos",
  "alocacoes_semanais",
  "servicos_catalogo",
  "servico_pops",
  "contratos_templates",
  "contratos",
  "agendamentos",
  "ordens_servico",
  "certificados",
  "medicoes",
  "medicao_itens",
  "recorrencia_sugestoes",
  "evidencias_anexos",
  "usuarios",
  "perfis",
  "audit_logs",
];

const snapshotTables = [
  "ordens_servico",
  "certificados",
  "medicoes",
  "contratos_templates",
  "evidencias_anexos",
];

function quoteIdent(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function brDateTime(value = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Fortaleza",
  }).format(value);
}

function markdownTable(headers, rows) {
  if (!rows.length) return "_Sem registros._";
  const sanitize = (value) => String(value ?? "").replaceAll("|", "\\|").replace(/\r?\n/g, " ");
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(sanitize).join(" | ")} |`),
  ].join("\n");
}

function collectStrings(value, output = []) {
  if (value === null || value === undefined) return output;
  if (typeof value === "string") {
    if (value.trim()) output.push(value);
    return output;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    output.push(String(value));
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, output);
    return output;
  }
  if (typeof value === "object") {
    for (const item of Object.values(value)) collectStrings(item, output);
  }
  return output;
}

function hasLeak(value) {
  const haystack = collectStrings(value).join("\n");
  return ciperpragLeakPatterns
    .filter((pattern) => pattern.test(haystack))
    .map((pattern) => pattern.source);
}

function normalizeJson(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function extractAssetStrings(company) {
  const config = normalizeJson(company?.certificado_config);
  return [
    company?.logo_url,
    config.logoPrincipalUrl,
    config.logoInterfaceUrl,
    config.documentLogoLightUrl,
    config.sidebarLogoDarkUrl,
    config.brandIconUrl,
    config.arteFundoUrl,
    config.seloInstitucionalUrl,
    config.assinaturaUrl,
  ].filter(Boolean);
}

function addFinding(findings, severity, scope, message, details = {}) {
  findings.push({
    severity,
    scope,
    message,
    details,
  });
}

async function tableExists(tableName) {
  const { rows } = await query(
    `SELECT 1
       FROM information_schema.tables
      WHERE table_schema = $1
        AND table_name = $2
      LIMIT 1`,
    [schemaName, tableName],
  );
  return rows.length > 0;
}

async function hasColumn(tableName, columnName) {
  const { rows } = await query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = $1
        AND table_name = $2
        AND column_name = $3
      LIMIT 1`,
    [schemaName, tableName, columnName],
  );
  return rows.length > 0;
}

async function getTenants() {
  if (!(await tableExists("tenants"))) {
    throw new Error("Tabela tenants nao encontrada. A fundacao SaaS precisa estar aplicada.");
  }

  const { rows } = await query(
    `SELECT id, slug, razao_social, nome_fantasia, cnpj, status
       FROM ${quoteIdent(schemaName)}.tenants
      ORDER BY CASE WHEN slug = 'ciperprag' THEN 0 ELSE 1 END, slug`,
  );
  return rows;
}

async function getCompanies(tenantIds) {
  if (!tenantIds.length || !(await tableExists("empresa_config")) || !(await hasColumn("empresa_config", "tenant_id"))) {
    return new Map();
  }

  const { rows } = await query(
    `SELECT id, tenant_id, razao_social, nome_fantasia, cnpj, email, telefone, logo_url, certificado_config
       FROM ${quoteIdent(schemaName)}.empresa_config
      WHERE tenant_id = ANY($1::uuid[])
      ORDER BY tenant_id, id`,
    [tenantIds],
  );

  const companies = new Map();
  for (const row of rows) {
    if (!companies.has(String(row.tenant_id))) companies.set(String(row.tenant_id), row);
  }
  return companies;
}

function chooseTenants(allTenants, companies) {
  if (explicitTenants.length) {
    return explicitTenants
      .map((slug) => allTenants.find((tenant) => tenant.slug === slug))
      .filter(Boolean);
  }

  const selected = [];
  const add = (tenant) => {
    if (tenant && !selected.some((item) => item.id === tenant.id)) selected.push(tenant);
  };

  const ciperprag = allTenants.find((tenant) => tenant.slug === "ciperprag");
  const nonCiperprag = allTenants.filter((tenant) => tenant.slug !== "ciperprag");
  const withAssets = nonCiperprag.find((tenant) => extractAssetStrings(companies.get(String(tenant.id))).length > 0);
  const withoutAssets = nonCiperprag.find((tenant) => extractAssetStrings(companies.get(String(tenant.id))).length === 0);

  add(ciperprag);
  add(withAssets);
  add(withoutAssets);
  for (const tenant of nonCiperprag) add(tenant);

  return selected.slice(0, 3);
}

async function auditScopedNullTenants(findings) {
  for (const tableName of scopedTables) {
    if (!(await tableExists(tableName)) || !(await hasColumn(tableName, "tenant_id"))) continue;
    const { rows } = await query(
      `SELECT COUNT(*)::int AS total
         FROM ${quoteIdent(schemaName)}.${quoteIdent(tableName)}
        WHERE tenant_id IS NULL`,
    );
    const total = Number(rows[0]?.total || 0);
    if (total > 0) {
      addFinding(findings, "falha", tableName, "Registros sem tenant_id em tabela escopada.", { total });
    }
  }
}

async function auditCompanyAssets(tenants, companies, findings) {
  for (const tenant of tenants) {
    const company = companies.get(String(tenant.id));
    const assetStrings = extractAssetStrings(company);

    if (!company) {
      addFinding(findings, "alerta", tenant.slug, "Tenant sem empresa_config; documentos devem cair em fallback neutro.", {});
      continue;
    }

    if (tenant.slug === "ciperprag" && assetStrings.length === 0) {
      addFinding(findings, "alerta", tenant.slug, "Tenant Ciperprag sem assets documentais configurados.", {});
    }

    if (tenant.slug !== "ciperprag") {
      const leaks = hasLeak(company);
      if (leaks.length) {
        addFinding(findings, "falha", tenant.slug, "Possivel vazamento de dados/assets Ciperprag em empresa_config de outro tenant.", {
          patterns: leaks.join(", "),
        });
      }
    }
  }
}

async function auditStorageKeys(tenants, findings) {
  if (!(await tableExists("evidencias_anexos")) || !(await hasColumn("evidencias_anexos", "tenant_id"))) return;

  const selectedTenantIds = tenants.map((tenant) => tenant.id);
  const tenantById = new Map(tenants.map((tenant) => [String(tenant.id), tenant]));
  const { rows } = await query(
    `SELECT id, tenant_id, entidade_tipo, entidade_id, categoria, storage_provider, storage_bucket, storage_key, metadados
       FROM ${quoteIdent(schemaName)}.evidencias_anexos
      WHERE tenant_id = ANY($1::uuid[])
      ORDER BY criado_em DESC NULLS LAST, id
      LIMIT $2`,
    [selectedTenantIds, maxAttachments],
  );

  const selectedSlugs = tenants.map((tenant) => sanitizeStorageSegment(tenant.slug));
  for (const row of rows) {
    const tenant = tenantById.get(String(row.tenant_id));
    if (!tenant) continue;

    const expectedSegment = `/tenants/${sanitizeStorageSegment(tenant.slug)}/`;
    const storageKeys = [
      row.storage_key,
      normalizeJson(row.metadados).plannedStorageKey,
      normalizeJson(row.metadados).storageKey,
    ].filter(Boolean);

    for (const key of storageKeys) {
      const normalizedKey = `/${String(key).replace(/^\/+/, "")}`;
      if (row.storage_provider === "r2" && !normalizedKey.includes(expectedSegment)) {
        addFinding(findings, "falha", tenant.slug, "Anexo R2 sem prefixo do tenant correto.", {
          attachmentId: row.id,
          storageKey: key,
          expectedSegment,
        });
      }

      for (const otherSlug of selectedSlugs.filter((slug) => slug !== sanitizeStorageSegment(tenant.slug))) {
        if (normalizedKey.includes(`/tenants/${otherSlug}/`)) {
          addFinding(findings, "falha", tenant.slug, "Chave de storage aponta para slug de outro tenant.", {
            attachmentId: row.id,
            storageKey: key,
            leakedTenantSlug: otherSlug,
          });
        }
      }
    }
  }

  const { rows: duplicateRows } = await query(
    `SELECT storage_key, COUNT(DISTINCT tenant_id)::int AS tenants, COUNT(*)::int AS total
       FROM ${quoteIdent(schemaName)}.evidencias_anexos
      WHERE storage_key IS NOT NULL
      GROUP BY storage_key
     HAVING COUNT(DISTINCT tenant_id) > 1
      ORDER BY tenants DESC, total DESC
      LIMIT 20`,
  );
  for (const row of duplicateRows) {
    addFinding(findings, "falha", "evidencias_anexos", "Mesma storage_key usada por mais de um tenant.", row);
  }
}

async function auditSnapshots(tenants, findings) {
  const nonCiperprag = tenants.filter((tenant) => tenant.slug !== "ciperprag");
  if (!nonCiperprag.length) return;

  for (const tableName of snapshotTables) {
    if (!(await tableExists(tableName)) || !(await hasColumn(tableName, "tenant_id"))) continue;
    const snapshotColumns = [];
    for (const columnName of ["snapshot_dados", "metadados"]) {
      if (await hasColumn(tableName, columnName)) snapshotColumns.push(columnName);
    }
    if (!snapshotColumns.length) continue;

    for (const tenant of nonCiperprag) {
      const selectColumns = ["id", ...snapshotColumns].map(quoteIdent).join(", ");
      const { rows } = await query(
        `SELECT ${selectColumns}
           FROM ${quoteIdent(schemaName)}.${quoteIdent(tableName)}
          WHERE tenant_id = $1
          ORDER BY 1
          LIMIT 100`,
        [tenant.id],
      );
      for (const row of rows) {
        for (const columnName of snapshotColumns) {
          const leaks = hasLeak(row[columnName]);
          if (leaks.length) {
            addFinding(findings, "falha", tenant.slug, "Possivel vazamento Ciperprag em snapshot/metadados de outro tenant.", {
              table: tableName,
              id: row.id,
              column: columnName,
              patterns: leaks.join(", "),
            });
          }
        }
      }
    }
  }
}

async function getCounters(tenants) {
  const counters = [];
  for (const tenant of tenants) {
    for (const tableName of ["clientes", "contratos_templates", "agendamentos", "ordens_servico", "certificados", "medicoes", "evidencias_anexos"]) {
      if (!(await tableExists(tableName)) || !(await hasColumn(tableName, "tenant_id"))) continue;
      const { rows } = await query(
        `SELECT COUNT(*)::int AS total
           FROM ${quoteIdent(schemaName)}.${quoteIdent(tableName)}
          WHERE tenant_id = $1`,
        [tenant.id],
      );
      counters.push([tenant.slug, tableName, rows[0]?.total || 0]);
    }
  }
  return counters;
}

function buildReport({ tenants, companies, findings, counters }) {
  const failures = findings.filter((finding) => finding.severity === "falha");
  const warnings = findings.filter((finding) => finding.severity === "alerta");
  const tenantRows = tenants.map((tenant) => {
    const company = companies.get(String(tenant.id));
    const assets = extractAssetStrings(company);
    return [
      tenant.slug,
      tenant.nome_fantasia || tenant.razao_social,
      tenant.status,
      company ? "sim" : "nao",
      assets.length,
      assets.length ? "configurado" : "fallback neutro",
    ];
  });

  const findingRows = findings.map((finding) => [
    finding.severity,
    finding.scope,
    finding.message,
    JSON.stringify(finding.details || {}),
  ]);

  return [
    "# Validacao tri-tenant de isolamento SaaS",
    "",
    `Gerado em: ${brDateTime()}`,
    `Modo: somente leitura`,
    "",
    "## Resultado",
    "",
    `- Tenants avaliados: ${tenants.length}.`,
    `- Falhas bloqueantes: ${failures.length}.`,
    `- Alertas: ${warnings.length}.`,
    `- Status tecnico: ${failures.length ? "REPROVADO" : "APROVADO COM ALERTAS CONTROLADOS"}.`,
    "",
    "## Tenants avaliados",
    "",
    markdownTable(["Slug", "Nome", "Status", "Empresa config", "Assets", "Comportamento visual"], tenantRows),
    "",
    "## Contagens por tenant",
    "",
    markdownTable(["Tenant", "Tabela", "Total"], counters),
    "",
    "## Achados",
    "",
    markdownTable(["Severidade", "Escopo", "Mensagem", "Detalhes"], findingRows),
    "",
    "## Criterios verificados",
    "",
    "- Tenants selecionados para matriz Ciperprag + ate dois tenants nao-Ciperprag quando existirem.",
    "- Registros de tabelas SaaS escopadas sem `tenant_id`.",
    "- Configuracao visual documental sem vazamento de Ciperprag para outro tenant.",
    "- Chaves R2/plano R2 com prefixo por ambiente/tenant/entidade/categoria/hash.",
    "- Chaves de storage repetidas entre tenants.",
    "- Snapshots e metadados de documentos sem dados/assets de outro tenant.",
    "",
    "## Observacao",
    "",
    "Quando a base possuir apenas o tenant Ciperprag, a auditoria aprova a infraestrutura existente e registra alerta operacional para criar os tenants de demonstracao e sem identidade visual antes da validacao SaaS final.",
    "",
  ].join("\n");
}

async function main() {
  const allTenants = await getTenants();
  const allCompanies = await getCompanies(allTenants.map((tenant) => tenant.id));
  const selectedTenants = chooseTenants(allTenants, allCompanies);
  const selectedCompanies = await getCompanies(selectedTenants.map((tenant) => tenant.id));
  const findings = [];

  if (selectedTenants.length < 3) {
    addFinding(findings, "alerta", "tri-tenant", "Base ainda nao possui tres tenants para matriz completa.", {
      tenantsEncontrados: allTenants.length,
      tenantsAvaliados: selectedTenants.map((tenant) => tenant.slug).join(", "),
    });
  }

  if (!selectedTenants.some((tenant) => tenant.slug === "ciperprag")) {
    addFinding(findings, "alerta", "tri-tenant", "Tenant Ciperprag nao encontrado na selecao avaliada.", {});
  }

  await auditScopedNullTenants(findings);
  await auditCompanyAssets(selectedTenants, selectedCompanies, findings);
  await auditStorageKeys(selectedTenants, findings);
  await auditSnapshots(selectedTenants, findings);

  const counters = await getCounters(selectedTenants);
  const report = buildReport({ tenants: selectedTenants, companies: selectedCompanies, findings, counters });

  await fs.mkdir(evidenceDir, { recursive: true });
  await fs.writeFile(outputFile, report, "utf8");

  const failures = findings.filter((finding) => finding.severity === "falha");
  console.log(`Auditoria tri-tenant gerada: ${path.relative(rootDir, outputFile)}`);
  console.log(`Tenants avaliados: ${selectedTenants.map((tenant) => tenant.slug).join(", ") || "nenhum"}`);
  console.log(`Falhas: ${failures.length}`);
  console.log(`Alertas: ${findings.filter((finding) => finding.severity === "alerta").length}`);

  if (failures.length) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
