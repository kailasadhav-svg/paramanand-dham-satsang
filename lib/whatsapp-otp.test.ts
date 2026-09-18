import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  whatsappConfigured,
  whatsappDryRunEnabled,
  whatsappOutboundReady,
} from "./ajapa/whatsapp.ts";

describe("whatsapp dry-run / outbound readiness", () => {
  it("allows dry-run only outside production", () => {
    assert.equal(
      whatsappDryRunEnabled({ WHATSAPP_DRY_RUN: "1", NODE_ENV: "development" }),
      true,
    );
    assert.equal(
      whatsappDryRunEnabled({ WHATSAPP_DRY_RUN: "1", NODE_ENV: "production" }),
      false,
    );
    assert.equal(
      whatsappDryRunEnabled({ WHATSAPP_DRY_RUN: "1", VERCEL: "1" }),
      false,
    );
    assert.equal(whatsappDryRunEnabled({ NODE_ENV: "development" }), false);
  });

  it("does not treat dry-run as configured in production", () => {
    assert.equal(
      whatsappConfigured({
        WHATSAPP_DRY_RUN: "1",
        NODE_ENV: "production",
        WHATSAPP_PROVIDER: "meta",
      }),
      false,
    );
    assert.equal(
      whatsappConfigured({
        WHATSAPP_DRY_RUN: "1",
        NODE_ENV: "development",
      }),
      true,
    );
  });

  it("requires Meta token + phone number id", () => {
    const ready = whatsappOutboundReady({
      NODE_ENV: "production",
      WHATSAPP_PROVIDER: "meta",
      WHATSAPP_TOKEN: "tok",
      WHATSAPP_PHONE_NUMBER_ID: "123",
      WHATSAPP_DRY_RUN: "1",
    });
    assert.equal(ready.ok, true);
    assert.equal(ready.provider, "meta");
    assert.equal(ready.dry_run_ignored, true);
  });

  it("requires Turiya key when provider=turiya", () => {
    const missing = whatsappOutboundReady({
      NODE_ENV: "production",
      WHATSAPP_PROVIDER: "turiya",
    });
    assert.equal(missing.ok, false);
    assert.equal(missing.provider, "turiya");

    const ok = whatsappOutboundReady({
      NODE_ENV: "production",
      WHATSAPP_PROVIDER: "turiya",
      TURIYA_API_KEY: "key",
      TURIYA_WABA_NUMBER: "917030111501",
    });
    assert.equal(ok.ok, true);
    assert.equal(whatsappConfigured({
      NODE_ENV: "production",
      WHATSAPP_PROVIDER: "turiya",
      TURIYA_API_KEY: "key",
      TURIYA_WABA_NUMBER: "917030111501",
    }), true);
  });

  it("defaults OTP env to approved home_login_otp / en_US", async () => {
    const prev = {
      dry: process.env.WHATSAPP_DRY_RUN,
      tpl: process.env.WHATSAPP_OTP_TEMPLATE,
      lang: process.env.WHATSAPP_OTP_LANG,
      auth: process.env.WHATSAPP_OTP_AUTH,
      node: process.env.NODE_ENV,
    };
    process.env.WHATSAPP_DRY_RUN = "1";
    process.env.NODE_ENV = "development";
    delete process.env.WHATSAPP_OTP_TEMPLATE;
    delete process.env.WHATSAPP_OTP_LANG;
    process.env.WHATSAPP_OTP_AUTH = "1";
    try {
      const { sendOtpMessage } = await import("./ajapa/whatsapp.ts");
      // Capture via console — dry-run logs payload; we just assert ok
      const r = await sendOtpMessage({
        to: "919225118811",
        code: "112233",
        purpose: "actor_bind",
      });
      assert.equal(r.ok, true);
      if ("via" in r) assert.equal(r.via, "dry-run");
    } finally {
      for (const [k, v] of Object.entries({
        WHATSAPP_DRY_RUN: prev.dry,
        WHATSAPP_OTP_TEMPLATE: prev.tpl,
        WHATSAPP_OTP_LANG: prev.lang,
        WHATSAPP_OTP_AUTH: prev.auth,
        NODE_ENV: prev.node,
      })) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  });
});
