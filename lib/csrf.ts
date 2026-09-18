import type { EnvLike } from "./runtime.ts";

export const PRODUCTION_APP_HOST = "satsang.dhyeyapurti.in";

function trimSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function originFromUrl(raw: string): string | null {
  try {
    return trimSlash(new URL(raw).origin);
  } catch {
    return null;
  }
}

export function allowedOrigins(env: EnvLike = process.env): string[] {
  const out = new Set<string>();
  out.add(`https://${PRODUCTION_APP_HOST}`);

  const extras = [
    env.APP_PUBLIC_URL,
    env.NEXT_PUBLIC_APP_URL,
    env.ALLOWED_ORIGINS,
  ]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const extra of extras) {
    const origin = extra.includes("://") ? originFromUrl(extra) : null;
    if (origin) out.add(origin);
    else if (/^[a-z0-9.-]+$/i.test(extra)) out.add(`https://${extra}`);
  }

  if (env.VERCEL_URL) {
    const host = env.VERCEL_URL.replace(/^https?:\/\//, "");
    out.add(`https://${host}`);
  }

  out.add("http://localhost:43123");
  out.add("http://127.0.0.1:43123");
  out.add("http://localhost:3000");
  out.add("http://127.0.0.1:3000");

  return [...out];
}

export function isAllowedOrigin(origin: string, env: EnvLike = process.env): boolean {
  const normalized = originFromUrl(origin) || trimSlash(origin);
  if (!normalized) return false;
  if (allowedOrigins(env).includes(normalized)) return true;

  try {
    const host = new URL(normalized).hostname;
    if (host === "localhost" || host === "127.0.0.1") return true;
  } catch {
    return false;
  }
  return false;
}

export function csrfOriginOk(request: Request, env: EnvLike = process.env): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  if (!origin && !referer) return true;
  if (origin) return isAllowedOrigin(origin, env);
  const refOrigin = originFromUrl(referer || "");
  return refOrigin ? isAllowedOrigin(refOrigin, env) : false;
}

export function csrfExemptPath(pathname: string): boolean {
  return (
    pathname === "/api/health" ||
    pathname === "/api/whatsapp/webhook" ||
    pathname.startsWith("/api/whatsapp/webhook/")
  );
}
