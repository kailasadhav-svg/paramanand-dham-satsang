import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  canAppointSatsangi,
  canApproveCharansevak,
  canSeeStaffScreens,
  detectStaffRole,
  roleLabelMarathi,
} from "./roles.ts";

describe("detectStaffRole", () => {
  it("maps locked phones to सेवक / संवादक / चरणसेवक", () => {
    assert.equal(detectStaffRole("9225118811"), "software");
    assert.equal(detectStaffRole("9850120960"), "guru");
    assert.equal(detectStaffRole("9423078811"), "charansevak");
    assert.equal(detectStaffRole("9136443333"), "charansevak");
  });
});

describe("canApproveCharansevak", () => {
  it("is true only for guru (मधुसुदनदास / super-admin)", () => {
    assert.equal(canApproveCharansevak("guru"), true);
    assert.equal(canApproveCharansevak("software"), false);
    assert.equal(canApproveCharansevak("charansevak"), false);
  });

  it("keeps canAppointSatsangi as the same guru-only gate", () => {
    assert.equal(canAppointSatsangi("guru"), true);
    assert.equal(canAppointSatsangi("software"), false);
    assert.equal(canAppointSatsangi("charansevak"), false);
  });

  it("does not take attendance screens away from चरणसेवक via staff flag", () => {
    // चरणसेवक still use /attendance for counts; they are not staff editors.
    assert.equal(canSeeStaffScreens("charansevak"), false);
    assert.equal(canSeeStaffScreens("guru"), true);
  });
});

describe("role labels", () => {
  it("uses चरणसेवक short label (UI prefers पूर्ण परमानंद चरणसेवक on main titles)", () => {
    assert.equal(roleLabelMarathi("charansevak"), "चरणसेवक");
    assert.equal(roleLabelMarathi("guru"), "संवादक");
    assert.equal(roleLabelMarathi("software"), "सेवक");
  });
});

describe("user-facing terminology", () => {
  const uiFiles = [
    "app/(app)/attendance/page.tsx",
    "app/(app)/questions/page.tsx",
    "app/(app)/members/page.tsx",
    "app/(app)/ajapa/page.tsx",
    "app/member-login/page.tsx",
    "app/login/page.tsx",
    "components/MemberHeader.tsx",
    "app/api/satsangi-members/route.ts",
    "app/api/ajapa/questions/[id]/request-otp/route.ts",
    "app/api/ajapa/questions/[id]/verify-otp/route.ts",
    "lib/roles.ts",
  ];

  it("does not show सत्संगी / Satsangi in Marathi UI strings", () => {
    for (const rel of uiFiles) {
      const text = readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
      assert.equal(text.includes("सत्संगी"), false, `${rel} still has सत्संगी`);
      assert.equal(/\bSatsangi\b/.test(text), false, `${rel} still has Satsangi`);
    }
  });
});
