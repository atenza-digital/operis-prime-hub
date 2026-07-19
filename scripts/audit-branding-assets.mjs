import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = path.join(rootDir, "index.html");
const faviconPngPath = path.join(rootDir, "public", "favicon.png");
const faviconIcoPath = path.join(rootDir, "public", "favicon.ico");

function fail(message) {
  console.error(`Branding audit: ${message}`);
  process.exitCode = 1;
}

async function fileSize(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.size;
  } catch {
    return 0;
  }
}

const indexHtml = await fs.readFile(indexPath, "utf8");
const pngSize = await fileSize(faviconPngPath);
const icoSize = await fileSize(faviconIcoPath);

const requiredSnippets = [
  '<title>Atenza FieldOps</title>',
  '<meta name="author" content="Atenza" />',
  '<link rel="icon" type="image/png" href="/favicon.png" />',
  '<link rel="icon" type="image/x-icon" href="/favicon.ico" />',
  '<link rel="shortcut icon" href="/favicon.ico" />',
  '<link rel="apple-touch-icon" href="/favicon.png" />',
];

for (const snippet of requiredSnippets) {
  if (!indexHtml.includes(snippet)) fail(`index.html sem trecho obrigatorio: ${snippet}`);
}

if (/ciperprag/i.test(indexHtml)) {
  fail("index.html nao deve conter marca fixa de tenant no login SaaS neutro.");
}

if (pngSize < 1024) fail("public/favicon.png ausente ou pequeno demais para ser o favicon Atenza.");
if (icoSize < 1024) fail("public/favicon.ico ausente ou pequeno demais para ser o favicon Atenza.");

if (!process.exitCode) {
  console.log("Branding audit: aprovado");
  console.log(JSON.stringify({ faviconPngBytes: pngSize, faviconIcoBytes: icoSize }, null, 2));
}
