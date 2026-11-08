import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkNewStaffPin,
  digitsOnly,
  firstTimeCode,
  hashStaffPin,
  safeEqualDigits,
  validStaffPin,
  verifyStaffPinHash,
} from "./staff-pin.ts";

describe("firstTimeCode", () => {
  it("is the last 4 digits of the mobile, however it is written", () => {
    assert.equal(firstTimeCode("9225118811"), "8811");
    assert.equal(firstTimeCode("+91 92251 18811"), "8811");
    assert.equal(firstTimeCode("919225118811"), "8811");
  });
});

describe("validStaffPin", () => {
  it("accepts 4 to 6 digits only", () => {
    assert.ok(validStaffPin("2468"));
    assert.ok(validStaffPin("246813"));
    assert.ok(!validStaffPin("246"));
    assert.ok(!validStaffPin("2468135"));
    assert.ok(!validStaffPin("24a8"));
    assert.ok(!validStaffPin(""));
  });
});

describe("checkNewStaffPin", () => {
  it("rejects the first-time code and repeated digits", () => {
    assert.equal(checkNewStaffPin("8811", "9225118811").ok, false);
    assert.equal(checkNewStaffPin("1111", "9225118811").ok, false);
    assert.equal(checkNewStaffPin("12", "9225118811").ok, false);
  });

  it("accepts a normal pin", () => {
    assert.deepEqual(checkNewStaffPin("2468", "9225118811"), { ok: true });
  });
});

describe("hashStaffPin / verifyStaffPinHash", () => {
  it("round-trips and salts each hash", () => {
    const h1 = hashStaffPin("2468");
    const h2 = hashStaffPin("2468");
    assert.notEqual(h1, h2);
    assert.ok(h1.startsWith("scrypt$"));
    assert.ok(verifyStaffPinHash("2468", h1));
    assert.ok(verifyStaffPinHash("2468", h2));
    assert.ok(!verifyStaffPinHash("2469", h1));
  });

  it("rejects missing or malformed stored hashes", () => {
    assert.ok(!verifyStaffPinHash("2468", null));
    assert.ok(!verifyStaffPinHash("2468", ""));
    assert.ok(!verifyStaffPinHash("2468", "plain"));
    assert.ok(!verifyStaffPinHash("2468", "md5$abc$def"));
  });
});

describe("safeEqualDigits / digitsOnly", () => {
  it("compares equal-length strings and never matches empty", () => {
    assert.ok(safeEqualDigits("8811", "8811"));
    assert.ok(!safeEqualDigits("8811", "8812"));
    assert.ok(!safeEqualDigits("881", "8811"));
    assert.ok(!safeEqualDigits("", ""));
  });

  it("strips everything but digits", () => {
    assert.equal(digitsOnly(" 24-68 "), "2468");
    assert.equal(digitsOnly(undefined), "");
  });
});
