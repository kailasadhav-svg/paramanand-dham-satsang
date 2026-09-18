import type { EnvLike } from "./runtime.ts";

export const PRODUCTION_APP_HOST = "satsang.dhyeyapurti.in";
/** Canonical Vercel production alias for this project. */
export const VERCEL_PRODUCTION_HOST = "paramanand-dham-satsang.vercel.app";
/** Project slug used for Vercel production + preview hostnames. */
export const VERCEL_PROJECT_SLUG = "paramanand-dham-satsang";

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

function addHttpsHost(out: Set<string>, raw: string | undefined) {
  if (!raw) return;
  const host = raw.replace(/^https?:\/\//, "").replace(/\/+$/, "").split("/")[0];
  if (host) out.add(`https://${host}`);
}

/**
 * Vercel hosts for this repo only:
 * - paramanand-dham-satsang.vercel.app (production alias)
 * - paramanand-dham-satsang-*.vercel.app (preview / git / unique deployment URLs)
 */
export function isProjectVercelHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === VERCEL_PRODUCTION_HOST) return true;
  return host.endsWith(".vercel.app") && host.startsWith(`${VERCEL_PROJECT_SLUG}-`);
}

export function allowedOrigins(env: EnvLike = process.env): string[] {
  const out = new Set<string>();
  out.add(`https://${PRODUCTION_APP_HOST}`);
  out.add(`https://${VERCEL_PRODUCTION_HOST}`);

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

  addHttpsHost(out, env.VERCEL_URL);
  addHttpsHost(out, env.VERCEL_BRANCH_URL);
  addHttpsHost(out, env.VERCEL_PROJECT_PRODUCTION_URL);

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
    const url = new URL(normalized);
    const host = url.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
    if (url.protocol === "https:" && isProjectVercelHost(host)) return true;
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
