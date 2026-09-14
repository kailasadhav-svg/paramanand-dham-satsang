import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allocateLoginCode, last4OfMobile, normalizeMobile } from "./login-code.ts";

describe("normalizeMobile", () => {
  it("accepts a 10-digit India mobile", () => {
    assert.equal(normalizeMobile("9876543210"), "9876543210");
  });
  it("strips +91 and spaces", () => {
    assert.equal(normalizeMobile("+91 98765 43210"), "9876543210");
  });
  it("rejects landline-like and short numbers", () => {
    assert.equal(normalizeMobile("12345"), null);
    assert.equal(normalizeMobile("0123456789"), null);
    assert.equal(normalizeMobile("5876543210"), null);
  });
});

describe("allocateLoginCode", () => {
  it("uses last 4 when unused", async () => {
    const used = new Set<string>();
    const result = await allocateLoginCode("9225118811", (c) => used.has(c));
    assert.deepEqual(result, { login_code: "8811", collision: false });
    assert.equal(last4OfMobile("9225118811"), "8811");
  });

  it("keeps the first member last-4 and assigns a unique 6-digit to the next", async () => {
    const used = new Set(["8811"]);
    const result = await allocateLoginCode("9999988811", (c) => used.has(c), () => "246801");
    assert.deepEqual(result, { login_code: "246801", collision: true });
    used.add(result.login_code);
    assert.ok(used.has("8811"));
  });

  it("retries until a free 6-digit is found", async () => {
    const used = new Set(["8811", "111111"]);
    let n = 0;
    const result = await allocateLoginCode(
      "8888888811",
      (c) => used.has(c),
      () => (n++ === 0 ? "111111" : "222222"),
    );
    assert.deepEqual(result, { login_code: "222222", collision: true });
  });
});
