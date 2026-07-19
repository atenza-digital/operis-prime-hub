const DEFAULT_ENVIRONMENT = "homologacao";
const DEFAULT_PROVIDER = "database";
const EXTERNAL_PROVIDER = "r2";

export function sanitizeStorageSegment(value, fallback = "item") {
  const normalized = String(value || fallback)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "");
  return normalized.slice(0, 96) || fallback;
}

function resolveStorageEnvironment(env = process.env) {
  return sanitizeStorageSegment(env.RUNTIME_ENV || env.APP_ENV || env.NODE_ENV || DEFAULT_ENVIRONMENT, DEFAULT_ENVIRONMENT);
}

function resolveBucket(env = process.env) {
  return String(env.R2_BUCKET_DOCUMENTS || env.DOCUMENT_STORAGE_BUCKET || "").trim() || null;
}

function isR2Ready(env = process.env) {
  return Boolean(
    resolveBucket(env)
      && env.R2_ACCOUNT_ID
      && env.R2_ACCESS_KEY_ID
      && env.R2_SECRET_ACCESS_KEY,
  );
}

export function resolveDocumentStorageConfig(env = process.env) {
  const requestedProvider = String(env.DOCUMENT_STORAGE_PROVIDER || env.STORAGE_PROVIDER || DEFAULT_PROVIDER).trim().toLowerCase();
  const bucket = resolveBucket(env);
  const r2Ready = isR2Ready(env);
  const activeProvider = requestedProvider === EXTERNAL_PROVIDER && r2Ready ? EXTERNAL_PROVIDER : DEFAULT_PROVIDER;

  return {
    environment: resolveStorageEnvironment(env),
    requestedProvider,
    activeProvider,
    bucket,
    plannedProvider: bucket ? EXTERNAL_PROVIDER : null,
    r2Ready,
  };
}

export function buildTenantObjectKey({
  environment,
  tenantSlug,
  entityType,
  entityId,
  category = "documento",
  fileName,
  hashSha256,
  issuedAt = new Date(),
}) {
  const issued = issuedAt instanceof Date ? issuedAt : new Date(issuedAt);
  const validIssuedAt = Number.isNaN(issued.getTime()) ? new Date() : issued;
  const year = String(validIssuedAt.getUTCFullYear());
  const month = String(validIssuedAt.getUTCMonth() + 1).padStart(2, "0");
  const hashPrefix = sanitizeStorageSegment(String(hashSha256 || "sem-hash").slice(0, 16), "sem-hash");
  const safeFileName = sanitizeStorageSegment(fileName, "documento.bin");

  return [
    sanitizeStorageSegment(environment, DEFAULT_ENVIRONMENT),
    "tenants",
    sanitizeStorageSegment(tenantSlug, "tenant"),
    sanitizeStorageSegment(entityType, "entidade"),
    sanitizeStorageSegment(entityId, "sem-id"),
    sanitizeStorageSegment(category, "documento"),
    year,
    month,
    `${hashPrefix}-${safeFileName}`,
  ].join("/");
}

export function createAttachmentStoragePlan({
  tenantSlug,
  entityType,
  entityId,
  category = "documento",
  fileName,
  hashSha256,
  issuedAt,
  env = process.env,
}) {
  const config = resolveDocumentStorageConfig(env);
  const plannedKey = buildTenantObjectKey({
    environment: config.environment,
    tenantSlug,
    entityType,
    entityId,
    category,
    fileName,
    hashSha256,
    issuedAt,
  });

  return {
    provider: DEFAULT_PROVIDER,
    bucket: null,
    key: null,
    etag: null,
    plannedProvider: config.plannedProvider,
    plannedBucket: config.bucket,
    plannedKey: config.plannedProvider ? plannedKey : null,
    requestedProvider: config.requestedProvider,
    activeProvider: config.activeProvider,
    r2Ready: config.r2Ready,
  };
}

export function buildStorageMetadata(storagePlan) {
  const plan = storagePlan || {};
  return {
    storageProvider: plan.provider || DEFAULT_PROVIDER,
    storageBucket: plan.bucket || null,
    storageKey: plan.key || null,
    storageEtag: plan.etag || null,
    plannedStorageProvider: plan.plannedProvider || null,
    plannedStorageBucket: plan.plannedBucket || null,
    plannedStorageKey: plan.plannedKey || null,
    requestedStorageProvider: plan.requestedProvider || null,
    storageReady: Boolean(plan.r2Ready),
  };
}
