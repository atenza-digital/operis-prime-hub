import crypto from "node:crypto";
import fs from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

export function resolveChromiumExecutable() {
  const candidates = [
    process.env.CHROMIUM_PATH,
    process.platform === "win32" ? `${process.env.ProgramFiles || "C:\\Program Files"}\\Google\\Chrome\\Application\\chrome.exe` : null,
    process.platform === "win32" ? `${process.env.LOCALAPPDATA || ""}\\Google\\Chrome\\Application\\chrome.exe` : null,
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
  ].filter(Boolean);
  const executable = candidates.find((candidate) => fs.existsSync(candidate));
  if (!executable) throw new Error("Chromium nao encontrado para renderizacao PDF server-side.");
  return executable;
}

export async function renderHtmlToPdf(html) {
  const directory = path.join(os.tmpdir(), "atenza-fieldops-pdf");
  await mkdir(directory, { recursive: true });
  const id = `${Date.now()}-${crypto.randomUUID()}`;
  const htmlPath = path.join(directory, `${id}.html`);
  const pdfPath = path.join(directory, `${id}.pdf`);
  await writeFile(htmlPath, html, "utf8");
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(resolveChromiumExecutable(), [
        "--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--no-pdf-header-footer",
        `--print-to-pdf=${pdfPath}`, `file://${htmlPath.replaceAll("\\", "/")}`,
      ], { stdio: ["ignore", "ignore", "pipe"] });
      let stderr = "";
      child.stderr.on("data", (chunk) => { stderr += String(chunk); });
      child.on("error", reject);
      child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`Falha na renderizacao PDF server-side (${code}): ${stderr.slice(-500)}`)));
    });
    return await readFile(pdfPath);
  } finally {
    await rm(htmlPath, { force: true }).catch(() => undefined);
    await rm(pdfPath, { force: true }).catch(() => undefined);
  }
}
