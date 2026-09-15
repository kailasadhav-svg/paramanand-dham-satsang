import assert from "node:assert/strict";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { describe, it } from "node:test";

function generateOtpCode(): string {
  return String(randomInt(100000, 1000000));
}

function allowDebugOtp(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.VERCEL) return false;
  if (env.NODE_ENV === "production") return false;
  return env.WHATSAPP_DRY_RUN === "1" || env.WHATSAPP_DRY_RUN === "true" || env.ALLOW_DEBUG_OTP === "1";
}

function isWeakWhatsappVerifyToken(token: string): boolean {
  const t = token.trim();
  return !t || t === "ajapa-verify" || t === "verify-token" || t.length < 16;
}

function verifyMetaSignature(rawBody: string, signatureHeader: string | null, secret = process.env.WHATSAPP_APP_SECRET || ""): boolean {
  if (!secret) return false;
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const provided = signatureHeader.slice("sha256=".length);
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(provided, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

describe("otp hardening (policy)", () => {
  it("generateOtpCode returns 6 digits", () => {
    for (let i = 0; i < 30; i++) assert.match(generateOtpCode(), /^\d{6}$/);
  });

  it("allowDebugOtp is false on Vercel even when dry-run", () => {
    assert.equal(allowDebugOtp({ VERCEL: "1", WHATSAPP_DRY_RUN: "1" }), false);
    assert.equal(allowDebugOtp({ WHATSAPP_DRY_RUN: "1" }), true);
  });
});

describe("webhook signature policy", () => {
  it("rejects missing/invalid signatures", () => {
    const body = '{"object":"whatsapp_business_account"}';
    assert.equal(verifyMetaSignature(body, null, "test-app-secret"), false);
    assert.equal(verifyMetaSignature(body, "sha256=00", "test-app-secret"), false);
  });

  it("accepts valid sha256 HMAC", () => {
    const body = '{"object":"whatsapp_business_account"}';
    const secret = "test-app-secret";
    const sig = "sha256=" + createHmac("sha256", secret).update(body, "utf8").digest("hex");
    assert.equal(verifyMetaSignature(body, sig, secret), true);
  });

  it("treats default verify tokens as weak", () => {
    assert.equal(isWeakWhatsappVerifyToken(""), true);
    assert.equal(isWeakWhatsappVerifyToken("ajapa-verify"), true);
    assert.equal(isWeakWhatsappVerifyToken("short"), true);
    assert.equal(isWeakWhatsappVerifyToken("a-sufficiently-long-verify-token"), false);
  });
});
