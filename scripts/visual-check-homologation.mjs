import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { hashPassword, normalizeEmail } from "../server/auth.mjs";
import { pool, withTransaction } from "../server/db.mjs";

const baseUrl = (process.env.VISUAL_CHECK_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const tenantSlug = process.env.VISUAL_CHECK_TENANT || "ciperprag";
const email = normalizeEmail(process.env.VISUAL_CHECK_EMAIL || "homolog.visual@atenza.digital");
const outputDir = path.resolve("docs/evidencias/etapa7_homologacao/prints_visuais");

function makePassword() {
  return `Visual-${Date.now()}-${Math.random().toString(36).slice(2, 10)}-Atenza`;
}

async function prepareUser(password) {
  const passwordHash = await hashPassword(password);

  await withTransaction(async (client) => {
    const { rows: tenants } = await client.query(
      "SELECT id FROM ciperprag_hub.tenants WHERE slug = $1 LIMIT 1",
      [tenantSlug],
    );
    const tenant = tenants[0];
    if (!tenant) throw new Error(`Tenant nao encontrado: ${tenantSlug}`);

    const { rows: users } = await client.query(
      `INSERT INTO ciperprag_hub.usuarios
       (tenant_id, nome, email, senha_hash, status, senha_alterada_em, senha_temporaria, tentativas_login, bloqueado_ate)
       VALUES ($1,'Homologacao Visual Atenza',$2,$3,'ativo',NOW(),FALSE,0,NULL)
       ON CONFLICT (tenant_id, email) DO UPDATE SET
         nome = EXCLUDED.nome,
         senha_hash = EXCLUDED.senha_hash,
         status = 'ativo',
         senha_temporaria = FALSE,
         senha_alterada_em = NOW(),
         tentativas_login = 0,
         bloqueado_ate = NULL,
         updated_at = NOW()
       RETURNING id`,
      [tenant.id, email, passwordHash],
    );

    const userId = users[0].id;
    await client.query("DELETE FROM ciperprag_hub.usuario_perfis WHERE usuario_id = $1", [userId]);
    await client.query(
      `INSERT INTO ciperprag_hub.usuario_perfis (usuario_id, perfil_id)
       SELECT $1, p.id
         FROM ciperprag_hub.perfis p
        WHERE p.tenant_id = $2
          AND p.codigo = 'admin_empresa'
       ON CONFLICT DO NOTHING`,
      [userId, tenant.id],
    );
  });
}

async function main() {
  const password = makePassword();
  await fs.mkdir(outputDir, { recursive: true });
  await prepareUser(password);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });

  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/senha/i).fill(password);
  await page.getByRole("button", { name: /^entrar$/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("login"), { timeout: 20000 });
  await page.waitForLoadState("networkidle");
  await page.getByRole("heading", { name: /Painel de Operação/i }).waitFor({ timeout: 20000 });
  await page.getByText(/Contratos ativos/i).first().waitFor({ timeout: 20000 });

  const dashboardPath = path.join(outputDir, "dashboard-checagem-visual.png");
  await page.screenshot({ path: dashboardPath, fullPage: true });

  await page.goto(`${baseUrl}/medicao`, { waitUntil: "networkidle" });
  const firstViewButton = page.getByRole("button", { name: /ver/i }).first();
  if (await firstViewButton.count()) {
    await firstViewButton.click();
    await page.waitForTimeout(700);
  }

  const medicaoPath = path.join(outputDir, "medicao-checagem-visual.png");
  await page.screenshot({ path: medicaoPath, fullPage: true });

  const result = {
    baseUrl,
    email,
    selectedMeasurementPanel: (await page.locator("text=Medição selecionada").count()) > 0,
    screenshots: [dashboardPath, medicaoPath],
  };

  await browser.close();
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
