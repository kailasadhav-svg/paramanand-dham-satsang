import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allowedOrigins,
  csrfExemptPath,
  csrfOriginOk,
  isAllowedOrigin,
  isProjectVercelHost,
  PRODUCTION_APP_HOST,
  VERCEL_PRODUCTION_HOST,
} from "./csrf.ts";

const emptyEnv = {};

describe("isProjectVercelHost", () => {
  it("allows production alias and this project's preview hosts", () => {
    assert.equal(isProjectVercelHost("paramanand-dham-satsang.vercel.app"), true);
    assert.equal(
      isProjectVercelHost("paramanand-dham-satsang-git-main-kailasadhav-svg.vercel.app"),
      true,
    );
    assert.equal(
      isProjectVercelHost("paramanand-dham-satsang-abc123xyz-kailasadhav-svg.vercel.app"),
      true,
    );
  });

  it("rejects other Vercel projects and lookalikes", () => {
    assert.equal(isProjectVercelHost("evil.vercel.app"), false);
    assert.equal(isProjectVercelHost("other-project.vercel.app"), false);
    assert.equal(isProjectVercelHost("paramanand-dham-satsang.vercel.app.evil.com"), false);
    assert.equal(isProjectVercelHost("not-paramanand-dham-satsang.vercel.app"), false);
  });
});

describe("isAllowedOrigin — Vercel + VPS + localhost", () => {
  it("allows satsang.dhyeyapurti.in without env extras", () => {
    assert.equal(isAllowedOrigin("https://satsang.dhyeyapurti.in", emptyEnv), true);
    assert.equal(isAllowedOrigin("https://satsang.dhyeyapurti.in/", emptyEnv), true);
    assert.equal(allowedOrigins(emptyEnv).includes(`https://${PRODUCTION_APP_HOST}`), true);
  });

  it("allows paramanand-dham-satsang.vercel.app without VERCEL_URL", () => {
    assert.equal(
      isAllowedOrigin("https://paramanand-dham-satsang.vercel.app", emptyEnv),
      true,
    );
    assert.equal(
      allowedOrigins(emptyEnv).includes(`https://${VERCEL_PRODUCTION_HOST}`),
      true,
    );
  });

  it("allows this project's Vercel preview / unique deployment URLs", () => {
    assert.equal(
      isAllowedOrigin(
        "https://paramanand-dham-satsang-git-fix-csrf-kailasadhav-svg.vercel.app",
        emptyEnv,
      ),
      true,
    );
    assert.equal(
      isAllowedOrigin(
        "https://paramanand-dham-satsang-a1b2c3d-kailasadhav-svg.vercel.app",
        emptyEnv,
      ),
      true,
    );
  });

  it("allows localhost (any port) and 127.0.0.1", () => {
    assert.equal(isAllowedOrigin("http://localhost:43123", emptyEnv), true);
    assert.equal(isAllowedOrigin("http://localhost:3000", emptyEnv), true);
    assert.equal(isAllowedOrigin("http://localhost:9999", emptyEnv), true);
    assert.equal(isAllowedOrigin("http://127.0.0.1:43123", emptyEnv), true);
    assert.equal(isAllowedOrigin("http://127.0.0.1:5173", emptyEnv), true);
  });

  it("rejects unrelated origins", () => {
    assert.equal(isAllowedOrigin("https://evil.example", emptyEnv), false);
    assert.equal(isAllowedOrigin("https://evil.vercel.app", emptyEnv), false);
    assert.equal(isAllowedOrigin("https://other-app.vercel.app", emptyEnv), false);
    assert.equal(
      isAllowedOrigin("https://paramanand-dham-satsang.vercel.app.attacker.com", emptyEnv),
      false,
    );
    assert.equal(isAllowedOrigin("http://paramanand-dham-satsang.vercel.app", emptyEnv), false);
  });

  it("includes Vercel system URLs from env", () => {
    const env = {
      VERCEL_URL: "paramanand-dham-satsang-xyz.vercel.app",
      VERCEL_BRANCH_URL: "paramanand-dham-satsang-git-main-team.vercel.app",
      VERCEL_PROJECT_PRODUCTION_URL: "paramanand-dham-satsang.vercel.app",
    };
    const origins = allowedOrigins(env);
    assert.ok(origins.includes("https://paramanand-dham-satsang-xyz.vercel.app"));
    assert.ok(origins.includes("https://paramanand-dham-satsang-git-main-team.vercel.app"));
    assert.ok(origins.includes("https://paramanand-dham-satsang.vercel.app"));
  });
});

describe("csrfOriginOk — WhatsApp mobile bind (POST /api/auth/actor)", () => {
  function actorPost(origin: string | null, referer?: string) {
    const headers: Record<string, string> = {};
    if (origin) headers.origin = origin;
    if (referer) headers.referer = referer;
    return new Request("https://paramanand-dham-satsang.vercel.app/api/auth/actor", {
      method: "POST",
      headers,
    });
  }

  it("allows Vercel production origin (the Forbidden origin bug)", () => {
    assert.equal(
      csrfOriginOk(actorPost("https://paramanand-dham-satsang.vercel.app"), emptyEnv),
      true,
    );
  });

  it("allows Vercel preview origin and VPS origin", () => {
    assert.equal(
      csrfOriginOk(
        actorPost("https://paramanand-dham-satsang-git-main-kailasadhav-svg.vercel.app"),
        emptyEnv,
      ),
      true,
    );
    assert.equal(
      csrfOriginOk(
        new Request("https://satsang.dhyeyapurti.in/api/auth/actor", {
          method: "POST",
          headers: { origin: "https://satsang.dhyeyapurti.in" },
        }),
        emptyEnv,
      ),
      true,
    );
  });

  it("allows localhost origin for dev", () => {
    assert.equal(
      csrfOriginOk(
        new Request("http://localhost:43123/api/auth/actor", {
          method: "POST",
          headers: { origin: "http://localhost:43123" },
        }),
        emptyEnv,
      ),
      true,
    );
  });

  it("rejects cross-site Origin (CSRF still blocked)", () => {
    assert.equal(csrfOriginOk(actorPost("https://evil.example"), emptyEnv), false);
    assert.equal(csrfOriginOk(actorPost("https://evil.vercel.app"), emptyEnv), false);
  });

  it("allows missing Origin (non-browser) and Referer-only Vercel", () => {
    assert.equal(csrfOriginOk(actorPost(null), emptyEnv), true);
    assert.equal(
      csrfOriginOk(
        actorPost(null, "https://paramanand-dham-satsang.vercel.app/login"),
        emptyEnv,
      ),
      true,
    );
  });

  it("does not exempt actor bind from CSRF", () => {
    assert.equal(csrfExemptPath("/api/auth/actor"), false);
    assert.equal(csrfExemptPath("/api/auth/login"), false);
  });
});
