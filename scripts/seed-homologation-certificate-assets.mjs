import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool, query } from "../server/db.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetDir = path.join(rootDir, "scripts", "seed-assets", "ciperprag");
const tenantSlug = String(process.env.HOMOLOG_CERTIFICATE_ASSET_TENANT || "ciperprag").trim();

function dataUrl(bytes, mimeType) {
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

async function asset(fileName, mimeType) {
  return dataUrl(await fs.readFile(path.join(assetDir, fileName)), mimeType);
}

function mergeInstitutionalLogos(current, anvisaUrl) {
  const existing = Array.isArray(current) ? current.filter((item) => item && typeof item === "object" && item.url) : [];
  const withoutAnvisa = existing.filter((item) => String(item.nome || "").trim().toLowerCase() !== "anvisa");
  return [...withoutAnvisa, { nome: "ANVISA", url: anvisaUrl }];
}

function shouldForceOfficialAssets(slug) {
  // Homologacao must be reproducible: stale tenant URLs must not override the
  // approved reference assets committed with this environment.
  return slug.toLowerCase() === "ciperprag";
}

async function main() {
  const [logo, watermark, municipalSeal, signature, anvisa] = await Promise.all([
    asset("logo-ciperprag-documental.png", "image/png"),
    asset("marca-dagua-icone-ciperprag.png", "image/png"),
    asset("brasao-municipio-parauapebas.png", "image/png"),
    asset("assinatura-aline-costa-vieira.png", "image/png"),
    asset("logo-anvisa.png", "image/png"),
  ]);

  const { rows } = await query(
    `SELECT ec.id, ec.certificado_config
       FROM ciperprag_hub.empresa_config ec
       JOIN ciperprag_hub.tenants t ON t.id = ec.tenant_id
      WHERE t.slug = $1
      ORDER BY ec.id
      LIMIT 1`,
    [tenantSlug],
  );

  if (!rows[0]) throw new Error(`Tenant de homologacao nao encontrado: ${tenantSlug}`);

  const current = rows[0].certificado_config && typeof rows[0].certificado_config === "object"
    ? rows[0].certificado_config
    : {};
  const forceOfficialAssets = shouldForceOfficialAssets(tenantSlug);
  const next = {
    ...current,
    documentLogoLightUrl: forceOfficialAssets ? logo : (current.documentLogoLightUrl || logo),
    logoPrincipalUrl: forceOfficialAssets ? logo : (current.logoPrincipalUrl || logo),
    brandIconUrl: forceOfficialAssets ? watermark : (current.brandIconUrl || watermark),
    seloInstitucionalUrl: forceOfficialAssets ? municipalSeal : (current.seloInstitucionalUrl || municipalSeal),
    assinaturaUrl: forceOfficialAssets ? signature : (current.assinaturaUrl || signature),
    logoAnvisaUrl: forceOfficialAssets ? anvisa : (current.logoAnvisaUrl || anvisa),
    logosInstitucionais: mergeInstitutionalLogos(current.logosInstitucionais, forceOfficialAssets ? anvisa : (current.logoAnvisaUrl || anvisa)),
  };

  await query(
    `UPDATE ciperprag_hub.empresa_config
        SET certificado_config = $1::jsonb, atualizado_em = NOW()
      WHERE id = $2`,
    [JSON.stringify(next), rows[0].id],
  );

  console.log(JSON.stringify({
    ok: true,
    tenantSlug,
    configured: [
      "documentLogoLightUrl",
      "logoPrincipalUrl",
      "brandIconUrl",
      "seloInstitucionalUrl",
      "assinaturaUrl",
      "logoAnvisaUrl",
      "logosInstitucionais[ANVISA]",
    ],
    notSeededBecauseNotFoundInReference: ["logoEstadoUrl", "logoMeioAmbienteUrl"],
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
