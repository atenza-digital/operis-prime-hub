const LOCAL_DEVELOPMENT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3011",
  "http://127.0.0.1:3011",
];

export function parseCorsOrigins(env = process.env) {
  const configured = String(env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
  if (configured.length) return new Set(configured);

  return new Set([
    ...LOCAL_DEVELOPMENT_ORIGINS,
    String(env.PUBLIC_APP_URL || env.APP_PUBLIC_URL || "").trim().replace(/\/$/, ""),
  ].filter(Boolean));
}

export function isCorsOriginAllowed(origin, allowedOrigins) {
  return !origin || allowedOrigins.has(String(origin).replace(/\/$/, ""));
}

export function securityHeaders({ secure = false } = {}) {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    ...(secure ? { "Strict-Transport-Security": "max-age=31536000" } : {}),
  };
}
