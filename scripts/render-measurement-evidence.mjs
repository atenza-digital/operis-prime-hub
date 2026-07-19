import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { hashPassword, normalizeEmail } from "../server/auth.mjs";
import { pool, withTransaction } from "../server/db.mjs";

const baseUrl = (process.env.MEASUREMENT_EVIDENCE_BASE_URL || "http://127.0.0.1:3011").replace(/\/$/, "");
const tenantSlug = process.env.MEASUREMENT_EVIDENCE_TENANT || "ciperprag";
const email = normalizeEmail(process.env.MEASUREMENT_EVIDENCE_EMAIL || "homolog.medicao.visual@atenza.digital");
const outputDir = path.resolve("docs/evidencias/etapa7_homologacao/medicoes");

function normalizeEvidenceItems() {
  return [
    ["OS-MEDVAL-001", "OS-2670", "CT-001", "Coleta e Análise de Bebedouros", "2026-07-02", 2, "serviços", 180],
    ["OS-MEDVAL-002", "OS-2671", "CT-001", "Controle Integrado de Pragas", "2026-07-05", 1, "visita", 480],
    ["OS-MEDVAL-003", "OS-2672", "CT-002", "Higienização de reservatório", "2026-07-09", 1, "serviço", 620],
    ["OS-MEDVAL-004", "OS-2673", "CT-002", "Roçagem e Limpeza de Área", "2026-07-12", 4, "horas", 150],
    ["OS-MEDVAL-005", "OS-2674", "CT-003", "Manutenção Civil Predial", "2026-07-16", 6, "horas", 95],
  ];
}

async function dataUri(assetPath, mime = "image/png") {
  const bytes = await fs.readFile(path.resolve(assetPath));
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

function makePassword() {
  return `Medicao-${Date.now()}-${Math.random().toString(36).slice(2, 10)}-Atenza`;
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
       VALUES ($1,'Homologacao Medicao Atenza',$2,$3,'ativo',NOW(),FALSE,0,NULL)
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
          AND p.codigo IN ('admin_empresa', 'financeiro')
       ON CONFLICT DO NOTHING`,
      [userId, tenant.id],
    );
  });
}

async function prepareSampleMeasurement() {
  await withTransaction(async (client) => {
    const { rows: tenants } = await client.query(
      "SELECT id FROM ciperprag_hub.tenants WHERE slug = $1 LIMIT 1",
      [tenantSlug],
    );
    const tenant = tenants[0];
    if (!tenant) throw new Error(`Tenant nao encontrado: ${tenantSlug}`);

    const id = "MED-VALIDACAO-P07";
    const number = "MED-VALIDACAO/2026";
    const items = [
      ["OS-2670", "CT-001", "Coleta e Análise de Bebedouros", "2026-07-02", 2, "serviços", 180],
      ["OS-2671", "CT-001", "Controle Integrado de Pragas", "2026-07-05", 1, "visitas", 480],
      ["OS-2672", "CT-002", "Higienização de reservatório", "2026-07-09", 1, "serviço", 620],
      ["OS-2673", "CT-002", "Roçagem e Limpeza de Área", "2026-07-12", 4, "horas", 150],
      ["OS-2674", "CT-003", "Manutenção Civil Predial", "2026-07-16", 6, "horas", 95],
    ];
    const evidenceItems = normalizeEvidenceItems(items);
    const total = evidenceItems.reduce((sum, item) => sum + Number(item[5]) * Number(item[7]), 0);
    const snapshot = {
      emissor: { nome: "Administrador Atenza", cargo: "Administrador da empresa" },
      observacao: "Valores consolidados conforme execução registrada nas OS do período.",
      origem: "Evidência visual local de P0.7",
      classificacao: "parcial",
      parcialAte: "2026-07-19",
      periodo: { inicio: "2026-07-01", fim: "2026-07-31", medidoAte: "2026-07-19" },
    };
    snapshot.emissor = { nome: "Aline Vieira", cargo: "Responsável técnica" };
    snapshot.observacao = "Valores consolidados conforme execução registrada nas OS do período.";
    snapshot.origem = "Evidência visual local de P0.7";

    await client.query("DELETE FROM ciperprag_hub.medicao_itens WHERE medicao_id = $1", [id]);
    await client.query(
      `INSERT INTO ciperprag_hub.medicoes
       (id, tenant_id, numero, cliente_id, cliente_nome, cliente_cnpj, cliente_endereco,
        periodo_inicio, periodo_fim, status, financeiro_status, total, forma_pagamento, local_entrega, snapshot_dados, criado_em, atualizado_em)
       VALUES ($1,$2,$3,'CLI-001','Komatsu Brasil International LTDA','02.336.124/0009-25',
        'Av. Serra Arqueada S/N, QD QNC 205, Nova Carajás, Parauapebas-PA',
        '2026-07-01','2026-07-31','emitida','em_conferencia',$4,
        'Pagamento via boleto bancário após aceite da medição.',
        'Departamento de Compras / Administrativo do contratante',
        $5::jsonb,'2026-07-19T13:58:00.000Z',NOW())
       ON CONFLICT (id) DO UPDATE SET
        numero = EXCLUDED.numero,
        cliente_id = EXCLUDED.cliente_id,
        cliente_nome = EXCLUDED.cliente_nome,
        cliente_cnpj = EXCLUDED.cliente_cnpj,
        cliente_endereco = EXCLUDED.cliente_endereco,
        periodo_inicio = EXCLUDED.periodo_inicio,
        periodo_fim = EXCLUDED.periodo_fim,
        status = EXCLUDED.status,
        financeiro_status = EXCLUDED.financeiro_status,
        total = EXCLUDED.total,
        forma_pagamento = EXCLUDED.forma_pagamento,
        local_entrega = EXCLUDED.local_entrega,
        snapshot_dados = EXCLUDED.snapshot_dados,
        criado_em = EXCLUDED.criado_em,
        atualizado_em = NOW()`,
      [id, tenant.id, number, total, JSON.stringify(snapshot)],
    );
    await client.query(
      `UPDATE ciperprag_hub.medicoes
       SET cliente_endereco = $2,
           forma_pagamento = $3
       WHERE id = $1`,
      [
        id,
        "Av. Serra Arqueada S/N, QD QNC 205, Nova Carajás, Parauapebas-PA",
        "Condição conforme contrato vigente, após aceite da medição.",
      ],
    );

    for (const [osId, osNumber, contractId, service, executionDate, quantity, unit, unitValue] of evidenceItems) {
      await client.query(
        `INSERT INTO ciperprag_hub.medicao_itens
         (medicao_id, tenant_id, os_id, os_numero, contrato_id, servico, data_execucao, quantidade, unidade, valor_unitario, valor_total, medicao_ativa)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,TRUE)`,
        [id, tenant.id, osId, osNumber, contractId, service, executionDate, quantity, unit, unitValue, Number(quantity) * Number(unitValue)],
      );
    }
  });
}

async function main() {
  const password = makePassword();
  await fs.mkdir(outputDir, { recursive: true });
  await prepareUser(password);
  await prepareSampleMeasurement();
  const fallbackLogoUrl = await dataUri("src/assets/logo_ciperprag.png");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
  let selectedMeasurementNumber = "";

  await page.route("**/api/bootstrap", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.companyConfig = {
      ...(body.companyConfig || {}),
      logoUrl: body.companyConfig?.logoUrl || fallbackLogoUrl,
      corPrimaria: body.companyConfig?.corPrimaria || "#0f7f5c",
    };
    const measurements = Array.isArray(body.measurements) ? body.measurements : [];
    const bestMeasurement = measurements
      .filter((item) => item?.status !== "cancelada" && item?.numero === "MED-VALIDACAO/2026")
      .sort((a, b) => (b?.itens?.length || 0) - (a?.itens?.length || 0))[0] || measurements
      .filter((item) => item?.status !== "cancelada")
      .sort((a, b) => (b?.itens?.length || 0) - (a?.itens?.length || 0))[0] || measurements[0];
    selectedMeasurementNumber = bestMeasurement?.numero || selectedMeasurementNumber;
    await route.fulfill({
      status: response.status(),
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify(body),
    });
  });

  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/senha/i).fill(password);
  await page.getByRole("button", { name: /^entrar$/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("login"), { timeout: 20000 });
  await page.waitForLoadState("networkidle");

  await page.goto(`${baseUrl}/medicao`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /histórico de medições/i }).waitFor({ timeout: 20000 });
  if (selectedMeasurementNumber) {
    await page.getByPlaceholder(/buscar número/i).fill(selectedMeasurementNumber);
    await page.waitForTimeout(300);
  }

  const firstViewButton = page.getByRole("button", { name: /^ver$/i }).first();
  if (!(await firstViewButton.count())) {
    throw new Error("Nenhuma medicao encontrada para gerar evidencia visual.");
  }
  await firstViewButton.click();
  await page.waitForSelector(".document-print-root", { state: "attached", timeout: 15000 });
  await page.waitForTimeout(700);

  const selectedNumber = await page.locator(".document-print-root h1").first().textContent().catch(() => "");
  const safeNumber = (selectedNumber || "medicao-amostra").replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();

  const screenshotPath = path.join(outputDir, `${safeNumber || "medicao-amostra"}-tela.png`);
  const pdfPath = path.join(outputDir, `${safeNumber || "medicao-amostra"}-a4-retrato.pdf`);
  const pagePngPath = path.join(outputDir, `${safeNumber || "medicao-amostra"}-page-1.png`);

  await page.screenshot({ path: screenshotPath, fullPage: true, animations: "disabled" });
  await page.emulateMedia({ media: "print" });
  await page.evaluate(() => document.fonts?.ready);
  await page.evaluate(() => {
    document.documentElement.lang = "pt-BR";
    document.title = "Medição de Serviços";
  });
  await page.waitForTimeout(500);
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    tagged: true,
    outline: true,
    margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
  });

  await page.locator(".measurement-document").first().screenshot({ path: pagePngPath, animations: "disabled" });
  await browser.close();

  console.log(JSON.stringify({ baseUrl, pdfPath, pagePngPath, screenshotPath, selectedNumber }, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
