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
});
