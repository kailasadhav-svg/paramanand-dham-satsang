import { createHmac } from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "satsang_session";

export function adminPin(): string {
  return process.env.ADMIN_PIN || "1960";
}

export function sessionSecret(): string {
  return process.env.SESSION_SECRET || "paramanand-dham-satsang-session";
}

export function expectedSessionToken(): string {
  return createHmac("sha256", sessionSecret())
    .update(`admin:${adminPin()}`)
    .digest("hex");
}

export function verifyPin(pin: string): boolean {
  return pin.trim() === adminPin();
}

export function isSessionToken(token: string | undefined | null): boolean {
  return Boolean(token && token === expectedSessionToken());
}

export async function getSession(): Promise<boolean> {
  const jar = await cookies();
  return isSessionToken(jar.get(SESSION_COOKIE)?.value);
}

export async function requireSession(): Promise<void> {
  const ok = await getSession();
  if (!ok) {
    const err = new Error("Unauthorized");
    (err as Error & { status: number }).status = 401;
    throw err;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    // HTTPS (Vercel) needs Secure cookies; keep false for local http:// unless forced.
    secure:
      process.env.COOKIE_SECURE === "true" ||
      (process.env.COOKIE_SECURE !== "false" && Boolean(process.env.VERCEL)),
  };
}
