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

function assertOk(check, message) {
  if (!check) throw new Error(message);
}

const checks = [];

checks.push(await request("/api/health"));
checks.push(await request("/login"));
checks.push(await request("/medicao"));
checks.push(await request("/favicon.png"));
checks.push(await request("/favicon.ico"));

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
