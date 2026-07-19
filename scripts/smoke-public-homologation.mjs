const baseUrl = (process.env.HOMOLOGATION_BASE_URL || "https://fieldops-homologacao.atenza.digital").replace(/\/+$/, "");

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    redirect: "manual",
    ...options,
  });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("text") || contentType.includes("json")
    ? await response.text().catch(() => "")
    : "";
  return { pathname, status: response.status, ok: response.ok, contentType, body };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestWithRetry(pathname, options = {}) {
  const attempts = Number(process.env.HOMOLOGATION_SMOKE_ATTEMPTS || 8);
  const delayMs = Number(process.env.HOMOLOGATION_SMOKE_DELAY_MS || 3000);
  let last;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      last = await request(pathname, options);
      if (last.ok) return last;
    } catch (error) {
      last = { pathname, status: 0, ok: false, contentType: "", body: error.message };
    }

    if (attempt < attempts) await sleep(delayMs);
  }

  return last;
}

function assertOk(check, message) {
  if (!check) {
    console.error(JSON.stringify({ baseUrl, checks }, null, 2));
    throw new Error(message);
  }
}

const checks = [];

checks.push(await requestWithRetry("/api/health"));
checks.push(await requestWithRetry("/login"));
checks.push(await requestWithRetry("/medicao"));
checks.push(await requestWithRetry("/favicon.png"));
checks.push(await requestWithRetry("/favicon.ico"));

const health = checks.find((check) => check.pathname === "/api/health");
assertOk(health?.ok && health.body.includes('"ok":true'), "Health publico indisponivel.");

for (const page of ["/login", "/medicao"]) {
  const check = checks.find((item) => item.pathname === page);
  assertOk(check?.ok && check.body.includes("Atenza FieldOps"), `${page} nao carregou HTML da aplicacao.`);
  assertOk(!/logo_ciperprag|CIPERPRAG/i.test(check.body), `${page} contem marca fixa de tenant no HTML inicial.`);
  assertOk(check.body.includes("/favicon.png") && check.body.includes("/favicon.ico"), `${page} sem favicons Atenza declarados.`);
}

for (const asset of ["/favicon.png", "/favicon.ico"]) {
  const check = checks.find((item) => item.pathname === asset);
  assertOk(check?.ok, `${asset} indisponivel.`);
  assertOk(!String(check?.contentType || "").includes("text/html"), `${asset} retornou HTML em vez do arquivo de favicon.`);
}

console.log("Smoke publico de homologacao: aprovado");
console.log(JSON.stringify({
  baseUrl,
  checks: checks.map(({ pathname, status, contentType }) => ({ pathname, status, contentType })),
}, null, 2));
