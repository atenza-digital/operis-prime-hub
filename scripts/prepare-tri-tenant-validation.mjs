import crypto from "node:crypto";
import { hashPassword, normalizeEmail } from "../server/auth.mjs";
import { pool, withTransaction } from "../server/db.mjs";

const schemaName = "ciperprag_hub";
const apply = process.argv.includes("--apply") || process.env.TRI_TENANT_APPLY === "true";
const withUsers = process.argv.includes("--with-users") || process.env.TRI_TENANT_WITH_USERS === "true";
const resetPasswords = process.argv.includes("--reset-passwords") || process.env.TRI_TENANT_RESET_PASSWORDS === "true";

const roleSeeds = [
  ["admin_empresa", "Administrador da empresa", "Acesso administrativo completo ao tenant"],
  ["comercial", "Comercial", "Clientes, propostas, contratos e valores comerciais"],
  ["administrativo", "Contratos/Administrativo", "Contratos, agenda, OS e documentos administrativos"],
  ["operacao", "Operacao/Agendamento", "Agenda, OS, equipe e execucao operacional"],
  ["tecnico", "Tecnico", "Execucao de campo com acesso operacional limitado"],
  ["responsavel_tecnico", "Responsavel tecnico", "Certificados, validacoes tecnicas e documentacao operacional"],
  ["financeiro", "Financeiro", "Medicoes, notas, pagamentos e valores"],
  ["consulta_auditoria", "Consulta/Auditoria", "Consulta de dados e auditoria sem edicao ampla"],
];

const rolePermissions = {
  admin_empresa: "all",
  comercial: ["dashboard.view", "clientes.manage", "servicos.manage", "estoque.manage", "contratos.manage", "financeiro.view"],
  administrativo: ["dashboard.view", "clientes.manage", "estoque.manage", "contratos.manage", "agenda.manage", "os.manage", "certificados.manage", "medicoes.manage"],
  operacao: ["dashboard.view", "agenda.manage", "os.manage", "os.close", "equipes.manage"],
  tecnico: ["dashboard.view", "os.manage", "os.close"],
  responsavel_tecnico: ["dashboard.view", "servicos.manage", "os.manage", "certificados.manage"],
  financeiro: ["dashboard.view", "medicoes.manage", "financeiro.view"],
  consulta_auditoria: ["dashboard.view", "auditoria.view"],
};

const demoLogoSvg = encodeSvg(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 160">
  <rect width="560" height="160" rx="28" fill="#f8fafc"/>
  <circle cx="78" cy="80" r="44" fill="#0f766e"/>
  <path d="M54 82h48M78 55v52M62 66l32 32M94 66 62 98" stroke="#fff" stroke-width="10" stroke-linecap="round"/>
  <text x="145" y="78" font-family="Montserrat, Arial, sans-serif" font-size="38" font-weight="700" fill="#0f172a">EMPRESA DEMO</text>
  <text x="147" y="112" font-family="Montserrat, Arial, sans-serif" font-size="18" font-weight="600" fill="#0f766e" letter-spacing="6">SERVICOS TECNICOS</text>
</svg>
`);

const demoIconSvg = encodeSvg(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="36" fill="#0f766e"/>
  <path d="M45 82h70M80 45v70M58 58l44 44M102 58 58 102" stroke="#fff" stroke-width="14" stroke-linecap="round"/>
</svg>
`);

const tenantSeeds = [
  {
    slug: "empresa-demonstracao",
    razaoSocial: "Empresa Demonstracao de Servicos Tecnicos LTDA",
    nomeFantasia: "Empresa Demonstracao",
    cnpj: "11.222.333/0001-44",
    endereco: "Av. Exemplo SaaS, 1000 - Centro - Parauapebas/PA",
    telefone: "(94) 99999-0000",
    email: "contato@empresademonstracao.com.br",
    responsavelTecnico: "Responsavel Tecnico Demonstracao",
    responsavelExecucao: "Administrador Demonstracao",
    cargoResponsavel: "Responsavel tecnico",
    corPrimaria: "#0f766e",
    certificadoConfig: {
      documentLogoLightUrl: demoLogoSvg,
      sidebarLogoDarkUrl: demoLogoSvg,
      brandIconUrl: demoIconSvg,
      corPrimaria: "#0f766e",
      tituloCertificado: "Certificado de Execucao",
      subtituloCertificado: "Comprovacao tecnica do servico executado",
      assinaturaModo: "linha",
      templateCodigo: "certificado-garantia",
      templateVersao: "saas-tenant-v1",
    },
    user: {
      nome: "Administrador Demonstracao",
      email: "admin.demo@atenza.digital",
      perfis: ["admin_empresa"],
    },
  },
  {
    slug: "tenant-sem-logo",
    razaoSocial: "Tenant Sem Identidade Visual LTDA",
    nomeFantasia: "Tenant Sem Logo",
    cnpj: "22.333.444/0001-55",
    endereco: "Rua Sem Logo, 200 - Centro - Maraba/PA",
    telefone: "(94) 98888-0000",
    email: "contato@tenantsemlogo.com.br",
    responsavelTecnico: "Responsavel Tecnico Sem Logo",
    responsavelExecucao: "Administrador Sem Logo",
    cargoResponsavel: "Responsavel tecnico",
    corPrimaria: null,
    certificadoConfig: {
      assinaturaModo: "linha",
      templateCodigo: "certificado-garantia",
      templateVersao: "saas-tenant-v1",
    },
    user: {
      nome: "Administrador Sem Logo",
      email: "admin.semlogo@atenza.digital",
      perfis: ["admin_empresa"],
    },
  },
];

function encodeSvg(svg) {
  const compact = svg.trim().replace(/\s+/g, " ");
  return `data:image/svg+xml;base64,${Buffer.from(compact, "utf8").toString("base64")}`;
}

function quoteIdent(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function makeTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#";
  return Array.from(crypto.randomBytes(14), (byte) => alphabet[byte % alphabet.length]).join("");
}

async function hasColumn(client, tableName, columnName) {
  const { rows } = await client.query(
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

async function tableExists(client, tableName) {
  const { rows } = await client.query(
    `SELECT 1
       FROM information_schema.tables
      WHERE table_schema = $1
        AND table_name = $2
      LIMIT 1`,
    [schemaName, tableName],
  );
  return rows.length > 0;
}

async function insertTenant(client, seed) {
  const { rows } = await client.query(
    `INSERT INTO ${quoteIdent(schemaName)}.tenants (slug, razao_social, nome_fantasia, cnpj, status)
     VALUES ($1,$2,$3,$4,'ativo')
     ON CONFLICT (slug) DO UPDATE SET
       razao_social = EXCLUDED.razao_social,
       nome_fantasia = EXCLUDED.nome_fantasia,
       cnpj = EXCLUDED.cnpj,
       status = 'ativo',
       updated_at = NOW()
     RETURNING id, slug`,
    [seed.slug, seed.razaoSocial, seed.nomeFantasia, seed.cnpj],
  );
  return rows[0];
}

async function upsertCompanyConfig(client, tenant, seed) {
  const configColumns = {
    tenant_id: tenant.id,
    razao_social: seed.razaoSocial,
    nome_fantasia: seed.nomeFantasia,
    cnpj: seed.cnpj,
    endereco: seed.endereco,
    telefone: seed.telefone,
    email: seed.email,
    logo_url: seed.certificadoConfig.documentLogoLightUrl || null,
    responsavel_tecnico: seed.responsavelTecnico,
    responsavel_execucao: seed.responsavelExecucao,
    cargo_responsavel: seed.cargoResponsavel,
    cor_primaria: seed.corPrimaria,
    cor_secundaria: null,
    cor_destaque: null,
    certificado_config: JSON.stringify(seed.certificadoConfig),
  };

  const availableEntries = [];
  for (const [column, value] of Object.entries(configColumns)) {
    if (await hasColumn(client, "empresa_config", column)) {
      availableEntries.push([column, value]);
    }
  }

  const existing = await client.query(
    `SELECT id
       FROM ${quoteIdent(schemaName)}.empresa_config
      WHERE tenant_id = $1
      ORDER BY id
      LIMIT 1`,
    [tenant.id],
  );

  if (existing.rows[0]) {
    const updates = availableEntries
      .filter(([column]) => column !== "tenant_id")
      .map(([column], index) => `${quoteIdent(column)} = $${index + 2}`);
    if (await hasColumn(client, "empresa_config", "atualizado_em")) {
      updates.push("atualizado_em = NOW()");
    }

    await client.query(
      `UPDATE ${quoteIdent(schemaName)}.empresa_config
          SET ${updates.join(", ")}
        WHERE id = $1`,
      [existing.rows[0].id, ...availableEntries.filter(([column]) => column !== "tenant_id").map(([, value]) => value)],
    );
    return "updated";
  }

  const columns = availableEntries.map(([column]) => quoteIdent(column));
  const params = availableEntries.map((_, index) => `$${index + 1}`);
  await client.query(
    `INSERT INTO ${quoteIdent(schemaName)}.empresa_config (${columns.join(", ")})
     VALUES (${params.join(", ")})`,
    availableEntries.map(([, value]) => value),
  );
  return "inserted";
}

async function upsertNumbering(client, tenant) {
  if (!(await tableExists(client, "numeracao_config")) || !(await hasColumn(client, "numeracao_config", "tenant_id"))) {
    return "skipped";
  }

  const { rows } = await client.query(
    `SELECT id
       FROM ${quoteIdent(schemaName)}.numeracao_config
      WHERE tenant_id = $1
      ORDER BY id
      LIMIT 1`,
    [tenant.id],
  );
  if (rows[0]) return "exists";

  await client.query(
    `INSERT INTO ${quoteIdent(schemaName)}.numeracao_config
     (tenant_id, proposta_formato, proposta_ultimo, contrato_formato, contrato_ultimo, os_formato, os_ultimo, certificado_formato, certificado_ultimo, medicao_formato, medicao_ultimo)
     VALUES ($1,'PC-{SEQ}/{ANO}',0,'CT-{SEQ}/{ANO}',0,'OS-{SEQ}',0,'CERT-{SEQ}/{ANO}',0,'MED-{SEQ}/{ANO}',0)`,
    [tenant.id],
  );
  return "inserted";
}

async function ensureRoles(client, tenant) {
  const created = [];
  for (const [codigo, nome, descricao] of roleSeeds) {
    const { rows } = await client.query(
      `INSERT INTO ${quoteIdent(schemaName)}.perfis (tenant_id, codigo, nome, descricao, escopo, sistema)
       VALUES ($1,$2,$3,$4,'tenant',TRUE)
       ON CONFLICT (tenant_id, codigo) DO UPDATE SET
         nome = EXCLUDED.nome,
         descricao = EXCLUDED.descricao,
         sistema = TRUE,
         updated_at = NOW()
       RETURNING id, codigo`,
      [tenant.id, codigo, nome, descricao],
    );
    const role = rows[0];
    created.push(role.codigo);

    const permissionCodes = rolePermissions[codigo] === "all" ? null : rolePermissions[codigo];
    const { rows: permissionRows } = await client.query(
      permissionCodes
        ? `SELECT id FROM ${quoteIdent(schemaName)}.permissoes WHERE codigo = ANY($1::text[])`
        : `SELECT id FROM ${quoteIdent(schemaName)}.permissoes`,
      permissionCodes ? [permissionCodes] : [],
    );
    for (const permission of permissionRows) {
      await client.query(
        `INSERT INTO ${quoteIdent(schemaName)}.perfil_permissoes (perfil_id, permissao_id)
         VALUES ($1,$2)
         ON CONFLICT DO NOTHING`,
        [role.id, permission.id],
      );
    }
  }
  return created;
}

async function ensureAdminUser(client, tenant, seed) {
  if (!withUsers) return null;

  const email = normalizeEmail(seed.user.email);
  const temporaryPassword = makeTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const { rows: existingRows } = await client.query(
    `SELECT id
       FROM ${quoteIdent(schemaName)}.usuarios
      WHERE tenant_id = $1
        AND email = $2
      LIMIT 1`,
    [tenant.id, email],
  );
  const shouldResetPassword = resetPasswords || !existingRows[0];

  const { rows: userRows } = await client.query(
    `INSERT INTO ${quoteIdent(schemaName)}.usuarios
     (tenant_id, nome, email, senha_hash, status, senha_alterada_em, senha_temporaria, tentativas_login, bloqueado_ate)
     VALUES ($1,$2,$3,$4,'ativo',NOW(),TRUE,0,NULL)
     ON CONFLICT (tenant_id, email) DO UPDATE SET
       nome = EXCLUDED.nome,
       status = 'ativo',
       senha_hash = CASE WHEN $5 THEN EXCLUDED.senha_hash ELSE ${quoteIdent(schemaName)}.usuarios.senha_hash END,
       senha_temporaria = CASE WHEN $5 THEN TRUE ELSE ${quoteIdent(schemaName)}.usuarios.senha_temporaria END,
       senha_alterada_em = CASE WHEN $5 THEN NOW() ELSE ${quoteIdent(schemaName)}.usuarios.senha_alterada_em END,
       tentativas_login = 0,
       bloqueado_ate = NULL,
       updated_at = NOW()
     RETURNING id, email, nome`,
    [tenant.id, seed.user.nome, email, passwordHash, shouldResetPassword],
  );

  const roleRows = await client.query(
    `SELECT id
       FROM ${quoteIdent(schemaName)}.perfis
      WHERE tenant_id = $1
        AND codigo = ANY($2::text[])`,
    [tenant.id, seed.user.perfis],
  );

  await client.query(`DELETE FROM ${quoteIdent(schemaName)}.usuario_perfis WHERE usuario_id = $1`, [userRows[0].id]);
  for (const role of roleRows.rows) {
    await client.query(
      `INSERT INTO ${quoteIdent(schemaName)}.usuario_perfis (usuario_id, perfil_id)
       VALUES ($1,$2)
       ON CONFLICT DO NOTHING`,
      [userRows[0].id, role.id],
    );
  }

  return {
    email: userRows[0].email,
    senhaTemporaria: shouldResetPassword ? temporaryPassword : "(mantida)",
  };
}

async function main() {
  const plan = {
    mode: apply ? "apply" : "dry-run",
    withUsers,
    resetPasswords,
    tenants: tenantSeeds.map((seed) => ({
      slug: seed.slug,
      razaoSocial: seed.razaoSocial,
      cnpj: seed.cnpj,
      assets: Object.values(seed.certificadoConfig).filter((value) => typeof value === "string" && value.startsWith("data:image")).length,
      usuario: withUsers ? seed.user.email : "(nao criar)",
    })),
  };

  if (!apply) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  const result = await withTransaction(async (client) => {
    if (!(await tableExists(client, "tenants"))) throw new Error("Tabela tenants nao encontrada.");
    if (!(await tableExists(client, "empresa_config"))) throw new Error("Tabela empresa_config nao encontrada.");

    const prepared = [];
    for (const seed of tenantSeeds) {
      const tenant = await insertTenant(client, seed);
      const companyStatus = await upsertCompanyConfig(client, tenant, seed);
      const numberingStatus = await upsertNumbering(client, tenant);
      const roles = await ensureRoles(client, tenant);
      const user = await ensureAdminUser(client, tenant, seed);

      prepared.push({
        slug: tenant.slug,
        tenantId: tenant.id,
        empresaConfig: companyStatus,
        numeracaoConfig: numberingStatus,
        perfis: roles.length,
        usuario: user,
      });
    }
    return prepared;
  });

  console.log(JSON.stringify({ ok: true, ...plan, prepared: result }, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
