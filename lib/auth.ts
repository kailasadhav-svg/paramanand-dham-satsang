import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import {
  cookieSecureEnabled,
  isServingProduction,
  isVercelRuntime as vercelFromEnv,
  type EnvLike,
} from "./runtime";

export const SESSION_COOKIE = "satsang_session";
export const MEMBER_COOKIE = "satsang_member";
export const ACTOR_COOKIE = "satsang_actor";

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

function safeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function expectedSessionToken(): string {
  return createHmac("sha256", sessionSecret())
    .update(`admin:${adminPin()}`)
    .digest("hex");
}

export function verifyPin(pin: string): boolean {
  return safeEqualString(pin.trim(), adminPin());
}

export function isSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  return safeEqualString(token, expectedSessionToken());
}

export function memberSessionToken(memberId: number): string {
  const hmac = createHmac("sha256", sessionSecret())
    .update(`member:${memberId}`)
    .digest("hex");
  return `${memberId}.${hmac}`;
}

export function parseMemberSessionToken(token: string | undefined | null): number | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const id = Number(token.slice(0, dot));
  if (!Number.isInteger(id) || id <= 0) return null;
  const expected = memberSessionToken(id);
  if (!safeEqualString(token, expected)) return null;
  return id;
}

export function actorSessionToken(phone: string): string {
  const hmac = createHmac("sha256", sessionSecret())
    .update(`actor:${phone}`)
    .digest("hex");
  return `${phone}.${hmac}`;
}

export function parseActorSessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const phone = token.slice(0, dot);
  if (!/^\d{10,15}$/.test(phone)) return null;
  const expected = actorSessionToken(phone);
  if (!safeEqualString(token, expected)) return null;
  return phone;
}

export async function getSession(): Promise<boolean> {
  const jar = await cookies();
  return isSessionToken(jar.get(SESSION_COOKIE)?.value);
}

export async function getMemberId(): Promise<number | null> {
  const jar = await cookies();
  return parseMemberSessionToken(jar.get(MEMBER_COOKIE)?.value);
}

/** Verified actor phone from signed cookie — never trust x-actor-phone. */
export async function getActorPhone(): Promise<string | null> {
  const jar = await cookies();
  return parseActorSessionToken(jar.get(ACTOR_COOKIE)?.value);
}

export async function requireSession(): Promise<void> {
  const ok = await getSession();
  if (!ok) {
    const err = new Error("Unauthorized");
    (err as Error & { status: number }).status = 401;
    throw err;
  }
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
