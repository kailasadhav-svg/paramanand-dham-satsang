import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  appDisplayName,
  canAppointSatsangi,
  canAppointVahak,
  canApproveCharansevak,
  canSeeChintanBody,
  canSeeStaffScreens,
  detectStaffRole,
  roleLabelMarathi,
} from "./roles.ts";
import { isFridayVahakAppointWindow, isFridayVahakAppointWindowForWeek, shouldAutoContinueVahak } from "./dates.ts";
import {
  GUIDE_LABEL,
  MEMBER_ROLE_LABEL,
  SOFTWARE_LABEL,
} from "./labels.ts";

describe("detectStaffRole", () => {
  it("maps locked phones to संगणक / मार्गदर्शक / चरणसेवक", () => {
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

describe("canSeeChintanBody", () => {
  it("is true only for guru (मधुसुदनदास)", () => {
    assert.equal(canSeeChintanBody("guru"), true);
    assert.equal(canSeeChintanBody("software"), false);
    assert.equal(canSeeChintanBody("charansevak"), false);
  });
});

describe("role labels", () => {
  it("uses official चरणसेवक family names", () => {
    assert.equal(roleLabelMarathi("charansevak"), "चरणसेवक");
    assert.equal(roleLabelMarathi("guru"), "मार्गदर्शक");
    assert.equal(roleLabelMarathi("software"), "संगणक");
    assert.equal(appDisplayName("charansevak"), MEMBER_ROLE_LABEL);
    assert.equal(appDisplayName("guru"), GUIDE_LABEL);
    assert.equal(appDisplayName("software"), SOFTWARE_LABEL);
  });
});

describe("canAppointVahak", () => {
  const fridayMorning = new Date("2026-09-18T01:30:00.000Z"); // 07:00 IST
  const fridayNoon = new Date("2026-09-18T06:30:00.000Z"); // 12:00 IST
  const fridayAfternoon = new Date("2026-09-18T07:00:00.000Z"); // 12:30 IST
  const thursday = new Date("2026-09-17T04:00:00.000Z");
  const week = "2026-09-17";
  const olderWeek = "2026-09-10";

  it("is Friday 06:00–12:00 IST for that week’s सत्संग चरणसेवक window", () => {
    assert.equal(isFridayVahakAppointWindow(fridayMorning), true);
    assert.equal(isFridayVahakAppointWindowForWeek(week, fridayMorning), true);
    assert.equal(isFridayVahakAppointWindowForWeek(week, fridayNoon), true);
    assert.equal(isFridayVahakAppointWindowForWeek(week, fridayAfternoon), false);
    assert.equal(isFridayVahakAppointWindowForWeek(week, thursday), false);
    assert.equal(isFridayVahakAppointWindowForWeek(olderWeek, fridayMorning), false);
    assert.equal(isFridayVahakAppointWindow(thursday), false);
  });

  it("auto-continues last week’s वाहक only after Friday noon", () => {
    assert.equal(shouldAutoContinueVahak(week, thursday), false);
    assert.equal(shouldAutoContinueVahak(week, fridayMorning), false);
    assert.equal(shouldAutoContinueVahak(week, fridayNoon), false);
    assert.equal(shouldAutoContinueVahak(week, fridayAfternoon), true);
    assert.equal(shouldAutoContinueVahak("2026-09-24", fridayMorning), false);
  });

  it("lets मार्गदर्शक / संगणक appoint anytime; चरणसेवक only empty + that Friday window", () => {
    assert.equal(canAppointVahak("guru", { hasDuty: true, now: thursday }), true);
    assert.equal(canAppointVahak("software", { hasDuty: true, now: thursday }), true);
    assert.equal(
      canAppointVahak("charansevak", { hasDuty: false, now: fridayMorning, meetingDate: week }),
      true,
    );
    assert.equal(
      canAppointVahak("charansevak", { hasDuty: true, now: fridayMorning, meetingDate: week }),
      false,
    );
    assert.equal(
      canAppointVahak("charansevak", { hasDuty: false, now: thursday, meetingDate: week }),
      false,
    );
    assert.equal(
      canAppointVahak("charansevak", {
        hasDuty: false,
        now: fridayMorning,
        meetingDate: olderWeek,
      }),
      false,
    );
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
