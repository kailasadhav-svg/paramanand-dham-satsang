import {
  cookieSecureEnabled,
  isServingProduction,
  isVercelRuntime as vercelFromEnv,
  type EnvLike,
} from "./runtime.ts";

export const DEFAULT_ADMIN_PIN = "1960";
export const DEFAULT_SESSION_SECRET = "paramanand-dham-satsang-session";

export function isVercelRuntime(env: EnvLike = process.env): boolean {
  return vercelFromEnv(env);
}

export function adminPin(env: EnvLike = process.env): string {
  return env.ADMIN_PIN || DEFAULT_ADMIN_PIN;
}

export function sessionSecret(env: EnvLike = process.env): string {
  return env.SESSION_SECRET || DEFAULT_SESSION_SECRET;
}

export function hasWeakAuthSecrets(env: EnvLike = process.env): {
  weakPin: boolean;
  weakSessionSecret: boolean;
} {
  const pin = env.ADMIN_PIN || "";
  const secret = env.SESSION_SECRET || "";
  return {
    weakPin: !pin || pin === DEFAULT_ADMIN_PIN,
    weakSessionSecret:
      !secret ||
      secret === DEFAULT_SESSION_SECRET ||
      secret === "change-me-in-production",
  };
}

/** Refuse login / actor bind / member session while defaults remain in production. */
export function productionAuthBlockedReason(env: EnvLike = process.env): string | null {
  if (!isServingProduction(env)) return null;
  const weak = hasWeakAuthSecrets(env);
  if (weak.weakPin || weak.weakSessionSecret) {
    return "Production secrets missing: set a unique ADMIN_PIN (not 1960) and a long SESSION_SECRET, then restart.";
  }
  return null;
}

export function sessionCookieOptions(env: EnvLike = process.env) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: cookieSecureEnabled(env),
  };
}

/** Match set-cookie attributes so Secure/httpOnly cookies actually clear. */
export function clearCookieOptions(env: EnvLike = process.env) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
    secure: cookieSecureEnabled(env),
  };
}
