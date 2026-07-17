import { spawn } from "node:child_process";

const port = Number(process.env.VISUAL_CHECK_PORT || 3011);
const baseUrl = `http://127.0.0.1:${port}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      await wait(800);
    }
  }
  throw new Error("Timeout aguardando servidor local de checagem visual.");
}

function run(command, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: { ...process.env, ...env },
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} finalizou com codigo ${code}`));
    });
    child.on("error", reject);
  });
}

async function main() {
  const server = spawn("node", ["--env-file=.env", "server/index.mjs"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
    },
  });

  try {
    await waitForServer();
    await run("node", ["--env-file=.env", "scripts/visual-check-homologation.mjs"], {
      VISUAL_CHECK_BASE_URL: baseUrl,
    });
  } finally {
    if (!server.killed) server.kill();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
