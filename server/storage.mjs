import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const DEFAULT_ENVIRONMENT = "homologacao";
const DEFAULT_PROVIDER = "database";
const EXTERNAL_PROVIDER = "r2";

const DEFAULT_ATTACHMENT_POLICIES = {
  "os.foto": {
    maxFiles: 3,
    maxBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg"],
  },
  "minuta.documento": {
    maxFiles: 1,
    maxBytes: 8 * 1024 * 1024,
    allowedMimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.oasis.opendocument.text",
      "image/png",
      "image/jpeg",
    ],
  },
};

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

export function parseBase64DataUrl(value) {
  const rawValue = String(value || "").trim();
  const match = rawValue.match(/^data:([^;,\s]+);base64,([A-Za-z0-9+/=\r\n]+)$/);
  const mimeType = match ? match[1].trim().toLowerCase() : null;
  const base64Data = match ? match[2].replace(/\s+/g, "") : rawValue.replace(/\s+/g, "");

  if (!base64Data || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64Data) || base64Data.length % 4 !== 0) {
    const error = new Error("Arquivo invalido. Envie um conteudo base64 valido.");
    error.status = 400;
    throw error;
  }

  const buffer = Buffer.from(base64Data, "base64");
  if (!buffer.length || buffer.toString("base64").replace(/=+$/, "") !== base64Data.replace(/=+$/, "")) {
    const error = new Error("Arquivo invalido. O conteudo base64 nao pode ser lido.");
    error.status = 400;
    throw error;
  }

  return {
    mimeType,
    base64Data,
    buffer,
    bytes: buffer.length,
  };
}

function normalizePositiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function normalizeMimeTypes(value, fallback) {
  const source = Array.isArray(value) ? value : [];
  const normalized = source
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean);
  return normalized.length ? normalized : fallback;
}

export function resolveAttachmentPolicy(policyKey, tenantConfig = {}) {
  const fallback = DEFAULT_ATTACHMENT_POLICIES[policyKey] || DEFAULT_ATTACHMENT_POLICIES["minuta.documento"];
  const uploadPolicies = tenantConfig && typeof tenantConfig === "object" && tenantConfig.uploadPolicies && typeof tenantConfig.uploadPolicies === "object"
    ? tenantConfig.uploadPolicies
    : {};
  const override = uploadPolicies[policyKey] && typeof uploadPolicies[policyKey] === "object" ? uploadPolicies[policyKey] : {};

  return {
    key: policyKey,
    maxFiles: Math.floor(normalizePositiveNumber(override.maxFiles, fallback.maxFiles)),
    maxBytes: Math.floor(normalizePositiveNumber(override.maxBytes, fallback.maxBytes)),
    allowedMimeTypes: normalizeMimeTypes(override.allowedMimeTypes, fallback.allowedMimeTypes),
  };
}

function bufferStartsWith(buffer, signature) {
  return buffer.length >= signature.length && signature.every((byte, index) => buffer[index] === byte);
}

function detectAttachmentMimeTypes(buffer) {
  const detected = new Set();
  if (bufferStartsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) detected.add("image/png");
  if (bufferStartsWith(buffer, [0xff, 0xd8, 0xff])) detected.add("image/jpeg");
  if (bufferStartsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) detected.add("application/pdf");
  if (bufferStartsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) detected.add("application/msword");
  if (bufferStartsWith(buffer, [0x50, 0x4b, 0x03, 0x04]) || bufferStartsWith(buffer, [0x50, 0x4b, 0x05, 0x06]) || bufferStartsWith(buffer, [0x50, 0x4b, 0x07, 0x08])) {
    detected.add("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    detected.add("application/vnd.oasis.opendocument.text");
  }
  return detected;
}

export function validateAttachmentPayload({
  contentBase64,
  declaredMimeType,
  allowedMimeTypes,
  maxBytes,
  label = "arquivo",
}) {
  const parsed = parseBase64DataUrl(contentBase64);
  const declared = String(declaredMimeType || parsed.mimeType || "application/octet-stream").trim().toLowerCase();
  const allowed = new Set([...allowedMimeTypes].map((item) => String(item).toLowerCase()));

  if (!allowed.has(declared)) {
    const error = new Error(`Formato de ${label} nao suportado.`);
    error.status = 400;
    throw error;
  }

  if (parsed.mimeType && parsed.mimeType !== declared) {
    const error = new Error(`Formato de ${label} divergente do conteudo enviado.`);
    error.status = 400;
    throw error;
  }

  const detectedMimeTypes = detectAttachmentMimeTypes(parsed.buffer);
  if (detectedMimeTypes.size > 0 && !detectedMimeTypes.has(declared)) {
    const error = new Error(`Assinatura do ${label} nao corresponde ao formato informado.`);
    error.status = 400;
    throw error;
  }

  if (detectedMimeTypes.size === 0) {
    const error = new Error(`Nao foi possivel validar a assinatura do ${label}.`);
    error.status = 400;
    throw error;
  }

  if (parsed.bytes > maxBytes) {
    const maxMb = Math.floor(maxBytes / (1024 * 1024));
    const error = new Error(`O ${label} deve ter no maximo ${maxMb} MB.`);
    error.status = 400;
    throw error;
  }

  return {
    ...parsed,
    mimeType: declared,
    dataUrl: `data:${declared};base64,${parsed.base64Data}`,
  };
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
    accountId: String(env.R2_ACCOUNT_ID || "").trim() || null,
    accessKeyId: String(env.R2_ACCESS_KEY_ID || "").trim() || null,
    secretAccessKey: String(env.R2_SECRET_ACCESS_KEY || "").trim() || null,
    plannedProvider: bucket ? EXTERNAL_PROVIDER : null,
    r2Ready,
  };
}

function createR2Client(config) {
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

async function streamToBuffer(stream) {
  if (!stream) return Buffer.alloc(0);
  if (Buffer.isBuffer(stream)) return stream;
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
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

export async function persistAttachmentContent({
  storagePlan,
  buffer,
  contentBase64,
  mimeType,
  hashSha256,
  fileName,
  metadata = {},
  env = process.env,
}) {
  const plan = storagePlan || {};
  const config = resolveDocumentStorageConfig(env);
  const contentBuffer = buffer || Buffer.from(String(contentBase64 || ""), "utf8");

  if (plan.activeProvider === EXTERNAL_PROVIDER && plan.plannedBucket && plan.plannedKey && config.r2Ready) {
    try {
      const client = createR2Client(config);
      const response = await client.send(new PutObjectCommand({
        Bucket: plan.plannedBucket,
        Key: plan.plannedKey,
        Body: contentBuffer,
        ContentType: mimeType || "application/octet-stream",
        Metadata: {
          hashsha256: String(hashSha256 || ""),
          filename: sanitizeStorageSegment(fileName, "arquivo"),
        },
      }));

      return {
        contentBase64: null,
        provider: EXTERNAL_PROVIDER,
        bucket: plan.plannedBucket,
        key: plan.plannedKey,
        etag: response.ETag || null,
        metadata: {
          ...metadata,
          ...buildStorageMetadata({
            ...plan,
            provider: EXTERNAL_PROVIDER,
            bucket: plan.plannedBucket,
            key: plan.plannedKey,
            etag: response.ETag || null,
          }),
          storageUpload: "r2",
        },
      };
    } catch (error) {
      return {
        contentBase64,
        provider: DEFAULT_PROVIDER,
        bucket: null,
        key: null,
        etag: null,
        metadata: {
          ...metadata,
          ...buildStorageMetadata(plan),
          storageUpload: "fallback_database",
          storageUploadError: String(error?.message || error || "erro_desconhecido").slice(0, 300),
        },
      };
    }
  }

  return {
    contentBase64,
    provider: DEFAULT_PROVIDER,
    bucket: null,
    key: null,
    etag: null,
    metadata: {
      ...metadata,
      ...buildStorageMetadata(plan),
      storageUpload: "database",
    },
  };
}

export async function readAttachmentContentFromStorage({ bucket, key, env = process.env }) {
  const config = resolveDocumentStorageConfig(env);
  if (!config.r2Ready) {
    const error = new Error("Storage R2 nao configurado para leitura.");
    error.status = 503;
    throw error;
  }
  if (!bucket || !key) {
    const error = new Error("Objeto R2 sem bucket ou chave.");
    error.status = 404;
    throw error;
  }

  const client = createR2Client(config);
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return {
    buffer: await streamToBuffer(response.Body),
    mimeType: response.ContentType || null,
    etag: response.ETag || null,
  };
}
