import assert from "node:assert/strict";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { describe, it } from "node:test";
import {
  DEFAULT_ADMIN_PIN,
  DEFAULT_SESSION_SECRET,
  hasWeakAuthSecrets,
  productionAuthBlockedReason,
  sessionCookieOptions,
} from "./auth-policy.ts";
import { csrfExemptPath, csrfOriginOk, isAllowedOrigin } from "./csrf.ts";
import { isProductionReady } from "./health.ts";
import {
  canApproveCharansevak,
  canAppointSatsangi,
  canSeeStaffScreens,
  detectStaffRole,
} from "./roles.ts";
import {
  cookieSecureEnabled,
  isServingProduction,
  productionFileStoreBlockedReason,
  remoteDatabaseUrl,
} from "./runtime.ts";

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

function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret = "test-app-secret",
): boolean {
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

  it("allowDebugOtp is false on Vercel / production even when dry-run", () => {
    assert.equal(allowDebugOtp({ VERCEL: "1", WHATSAPP_DRY_RUN: "1" }), false);
    assert.equal(allowDebugOtp({ NODE_ENV: "production", WHATSAPP_DRY_RUN: "1" }), false);
    assert.equal(allowDebugOtp({ WHATSAPP_DRY_RUN: "1" }), true);
  });
});

describe("webhook signature policy", () => {
  it("rejects missing/invalid signatures", () => {
    const body = '{"object":"whatsapp_business_account"}';
    assert.equal(verifyMetaSignature(body, null), false);
    assert.equal(verifyMetaSignature(body, "sha256=00"), false);
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

describe("production runtime gates (not Vercel-only)", () => {
  it("treats NODE_ENV=production as serving production", () => {
    assert.equal(isServingProduction({ NODE_ENV: "production" }), true);
    assert.equal(isServingProduction({ VERCEL: "1" }), true);
    assert.equal(isServingProduction({ NODE_ENV: "development" }), false);
    assert.equal(
      isServingProduction({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build" }),
      false,
    );
  });

  it("blocks default PIN / session secret on VPS production", () => {
    assert.equal(
      productionAuthBlockedReason({ NODE_ENV: "production" }),
      "Production secrets missing: set a unique ADMIN_PIN (not 1960) and a long SESSION_SECRET, then restart.",
    );
    assert.equal(
      productionAuthBlockedReason({
        NODE_ENV: "production",
        ADMIN_PIN: "not-1960-strong",
        SESSION_SECRET: "a-long-unique-session-secret",
      }),
      null,
    );
    assert.equal(productionAuthBlockedReason({ NODE_ENV: "development" }), null);
    assert.equal(hasWeakAuthSecrets({}).weakPin, true);
    assert.equal(hasWeakAuthSecrets({ ADMIN_PIN: DEFAULT_ADMIN_PIN }).weakPin, true);
    assert.equal(
      hasWeakAuthSecrets({ SESSION_SECRET: DEFAULT_SESSION_SECRET }).weakSessionSecret,
      true,
    );
  });

  it("requires Turso in production unless ALLOW_FILE_STORE", () => {
    assert.match(
      productionFileStoreBlockedReason({ NODE_ENV: "production" }) || "",
      /TURSO_DATABASE_URL/,
    );
    assert.equal(
      productionFileStoreBlockedReason({
        NODE_ENV: "production",
        TURSO_DATABASE_URL: "libsql://db.turso.io",
      }),
      null,
    );
    assert.equal(
      productionFileStoreBlockedReason({ NODE_ENV: "production", ALLOW_FILE_STORE: "1" }),
      null,
    );
    assert.equal(productionFileStoreBlockedReason({ NODE_ENV: "development" }), null);
    assert.equal(remoteDatabaseUrl({ LIBSQL_URL: "libsql://x" }), "libsql://x");
  });

  it("marks cookies Secure in production by default", () => {
    assert.equal(cookieSecureEnabled({ NODE_ENV: "production" }), true);
    assert.equal(cookieSecureEnabled({ NODE_ENV: "development" }), false);
    assert.equal(cookieSecureEnabled({ NODE_ENV: "production", COOKIE_SECURE: "false" }), false);
    const opts = sessionCookieOptions({ NODE_ENV: "production" });
    assert.equal(opts.httpOnly, true);
    assert.equal(opts.sameSite, "lax");
    assert.equal(opts.secure, true);
  });
});

describe("health production_ready", () => {
  const readySecrets = {
    weak_admin_pin: false,
    weak_session_secret: false,
    whatsapp_verify_token_ok: true,
    whatsapp_app_secret_set: true,
    vercel: false,
    production: true,
    cookie_secure: true,
  };

  it("is false on live-like file store + weak pin", () => {
    assert.equal(
      isProductionReady({
        dbOk: true,
        store: "file",
        secrets: {
          ...readySecrets,
          weak_admin_pin: true,
          whatsapp_verify_token_ok: false,
          whatsapp_app_secret_set: false,
          cookie_secure: false,
        },
      }),
      false,
    );
  });

  it("is true with Turso + strong secrets + WhatsApp webhook secrets", () => {
    assert.equal(
      isProductionReady({ dbOk: true, store: "turso", secrets: readySecrets }),
      true,
    );
  });

  it("is true with file store when ALLOW_FILE_STORE / fileStoreAllowed", () => {
    assert.equal(
      isProductionReady({
        dbOk: true,
        store: "file",
        secrets: readySecrets,
        fileStoreAllowed: true,
      }),
      true,
    );
    const prev = process.env.ALLOW_FILE_STORE;
    process.env.ALLOW_FILE_STORE = "1";
    try {
      assert.equal(
        isProductionReady({ dbOk: true, store: "file", secrets: readySecrets }),
        true,
      );
    } finally {
      if (prev === undefined) delete process.env.ALLOW_FILE_STORE;
      else process.env.ALLOW_FILE_STORE = prev;
    }
  });

  it("is false with file store without allow", () => {
    assert.equal(
      isProductionReady({
        dbOk: true,
        store: "file",
        secrets: readySecrets,
        fileStoreAllowed: false,
      }),
      false,
    );
    const prev = process.env.ALLOW_FILE_STORE;
    delete process.env.ALLOW_FILE_STORE;
    try {
      assert.equal(
        isProductionReady({ dbOk: true, store: "file", secrets: readySecrets }),
        false,
      );
    } finally {
      if (prev === undefined) delete process.env.ALLOW_FILE_STORE;
      else process.env.ALLOW_FILE_STORE = prev;
    }
  });

  it("is false on Vercel file store even when fileStoreAllowed", () => {
    assert.equal(
      isProductionReady({
        dbOk: true,
        store: "file",
        secrets: { ...readySecrets, vercel: true },
        fileStoreAllowed: true,
      }),
      false,
    );
  });
});

describe("CSRF origin allowlist", () => {
  it("allows satsang.dhyeyapurti.in and localhost", () => {
    assert.equal(isAllowedOrigin("https://satsang.dhyeyapurti.in"), true);
    assert.equal(isAllowedOrigin("http://localhost:43123"), true);
    assert.equal(isAllowedOrigin("https://evil.example"), false);
  });

  it("rejects cross-origin mutating requests with Origin", () => {
    const req = new Request("https://satsang.dhyeyapurti.in/api/auth/login", {
      method: "POST",
      headers: { origin: "https://evil.example" },
    });
    assert.equal(csrfOriginOk(req), false);
  });

  it("allows same-origin and missing Origin (non-browser)", () => {
    const same = new Request("https://satsang.dhyeyapurti.in/api/auth/login", {
      method: "POST",
      headers: { origin: "https://satsang.dhyeyapurti.in" },
    });
    assert.equal(csrfOriginOk(same), true);
    const curl = new Request("https://satsang.dhyeyapurti.in/api/auth/login", {
      method: "POST",
    });
    assert.equal(csrfOriginOk(curl), true);
  });

  it("exempts health and WhatsApp webhook", () => {
    assert.equal(csrfExemptPath("/api/health"), true);
    assert.equal(csrfExemptPath("/api/whatsapp/webhook"), true);
    assert.equal(csrfExemptPath("/api/auth/login"), false);
  });
});

describe("row isolation for चरणसेवक", () => {
  it("forces own seeker scope for non-staff", () => {
    const actor = "919423078811";
    const role = detectStaffRole(actor);
    assert.equal(role, "charansevak");
    assert.equal(canSeeStaffScreens(role), false);
    const requested = "919850120960";
    const seeker = canSeeStaffScreens(role) ? requested : actor;
    assert.equal(seeker, actor);
  });

  it("lets संवादक / सेवक list others", () => {
    assert.equal(canSeeStaffScreens(detectStaffRole("9225118811")), true);
    assert.equal(canSeeStaffScreens(detectStaffRole("9850120960")), true);
  });
});

describe("app access approval — परमानंद चरणसेवक", () => {
  it("only संवादक (guru / मधुसुदनदास super-admin) may approve", () => {
    assert.equal(canApproveCharansevak("guru"), true);
    assert.equal(canApproveCharansevak(detectStaffRole("9850120960")), true);
    assert.equal(canAppointSatsangi("guru"), true);
  });

  it("denies सेवक and चरणसेवक admin appoint/approve power", () => {
    assert.equal(canApproveCharansevak("software"), false);
    assert.equal(canApproveCharansevak("charansevak"), false);
    assert.equal(canApproveCharansevak(detectStaffRole("9225118811")), false);
    assert.equal(canApproveCharansevak(detectStaffRole("9423078811")), false);
    assert.equal(canAppointSatsangi("charansevak"), false);
  });

  it("keeps attendance staff screens for सेवक / संवादक, not चरणसेवक", () => {
    assert.equal(canSeeStaffScreens("software"), true);
    assert.equal(canSeeStaffScreens("guru"), true);
    assert.equal(canSeeStaffScreens("charansevak"), false);
  });
});
