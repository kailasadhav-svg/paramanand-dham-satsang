import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  appDisplayName,
  canAppointSatsangi,
  canAppointSatsangCharansevak,
  canAppointVahak,
  canApproveCharansevak,
  canEditAnyPlaceTopic,
  canEditWeeklyQuestion,
  canSeeAllAjapa,
  canSeeChintanBody,
  canSeeGuideScreens,
  canSeeStaffScreens,
  defaultHomePath,
  detectStaffRole,
  roleLabelMarathi,
} from "./roles.ts";
import {
  defaultThursdayYmd,
  isFridayVahakAppointWindow,
  isFridayVahakAppointWindowForWeek,
  shouldAutoContinueVahak,
  thursdayContainingYmd,
} from "./dates.ts";
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

  it("lets मार्गदर्शक appoint anytime; संगणक never; चरणसेवक only empty + that Friday window", () => {
    assert.equal(canAppointVahak("guru", { hasDuty: true, now: thursday }), true);
    assert.equal(canAppointVahak("software", { hasDuty: true, now: thursday }), false);
    assert.equal(canAppointVahak("software", { hasDuty: false, now: fridayMorning, meetingDate: week }), false);
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

describe("canAppointSatsangCharansevak", () => {
  it("lets मार्गदर्शक appoint anytime; संगणक and generic चरणसेवक never via role", () => {
    assert.equal(canAppointSatsangCharansevak("guru"), true);
    assert.equal(canAppointSatsangCharansevak("software"), false);
    assert.equal(canAppointSatsangCharansevak("charansevak"), false);
  });
});

describe("defaultHomePath", () => {
  it("sends मार्गदर्शक to चिंतन, संगणक to attendance, चरणसेवक to अजपा", () => {
    assert.equal(defaultHomePath("guru"), "/weekly");
    assert.equal(defaultHomePath("software"), "/attendance");
    const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
    assert.match(home, /defaultHomePath\(detectStaffRole\(actor\)\)/);
  });
});

describe("thursdayContainingYmd", () => {
  it("maps any IST day onto that satsang week's Thursday", () => {
    assert.equal(thursdayContainingYmd("2026-09-17"), "2026-09-17");
    assert.equal(thursdayContainingYmd("2026-09-18"), "2026-09-17");
    assert.equal(thursdayContainingYmd("2026-09-23"), "2026-09-17");
    assert.equal(thursdayContainingYmd("2026-09-24"), "2026-09-24");
    assert.equal(thursdayContainingYmd("bad"), defaultThursdayYmd());
  });
});

describe("weekly question limit (non-मार्गदर्शक)", () => {
  it("applies to everyone except मार्गदर्शक (same as !canSeeGuideScreens)", () => {
    assert.equal(canSeeGuideScreens("guru"), true);
    assert.equal(canSeeGuideScreens("software"), false);
    assert.equal(canSeeGuideScreens("charansevak"), false);
    const limits = readFileSync(new URL("./weekly-limits.ts", import.meta.url), "utf8");
    assert.match(limits, /actorNeedsWeeklyQuestionLimit/);
    assert.match(limits, /!canSeeGuideScreens/);
    assert.match(limits, /seekerHasQuestionThisWeek/);
    assert.match(limits, /FROM questions/);
    assert.match(limits, /FROM ajapa_questions/);
  });
});

describe("role isolation", () => {
  it("keeps GPS/report staff screens for संगणक + मार्गदर्शक", () => {
    assert.equal(canSeeStaffScreens("software"), true);
    assert.equal(canSeeStaffScreens("guru"), true);
    assert.equal(canSeeStaffScreens("charansevak"), false);
  });

  it("scopes spiritual screens to मार्गदर्शक only", () => {
    assert.equal(canSeeGuideScreens("guru"), true);
    assert.equal(canSeeGuideScreens("software"), false);
    assert.equal(canSeeGuideScreens("charansevak"), false);
    assert.equal(canEditWeeklyQuestion("guru"), true);
    assert.equal(canEditWeeklyQuestion("software"), false);
    assert.equal(canEditWeeklyQuestion("charansevak"), false);
    assert.equal(canEditAnyPlaceTopic("guru"), true);
    assert.equal(canEditAnyPlaceTopic("software"), false);
    assert.equal(canEditAnyPlaceTopic("charansevak"), false);
    assert.equal(canSeeAllAjapa("guru"), true);
    assert.equal(canSeeAllAjapa("software"), false);
    assert.equal(canSeeAllAjapa("charansevak"), false);
  });
});

describe("user-facing terminology", () => {
  const uiFiles = [
    "app/(app)/attendance/page.tsx",
    "app/(app)/questions/page.tsx",
    "app/(app)/members/page.tsx",
    "app/(app)/ajapa/page.tsx",
    "app/(app)/report/page.tsx",
    "app/member-login/page.tsx",
    "app/login/page.tsx",
    "app/register/page.tsx",
    "components/AuthCoupletFooter.tsx",
    "app/me/page.tsx",
    "app/t/[role]/page.tsx",
    "app/layout.tsx",
    "components/MemberHeader.tsx",
    "components/AppHeader.tsx",
    "components/BottomNav.tsx",
    "components/DutyAppointSection.tsx",
    "lib/bottom-nav.ts",
    "lib/installSlots.ts",
    "lib/api-guard.ts",
    "app/api/satsangi-members/route.ts",
    "app/api/ajapa/questions/[id]/request-otp/route.ts",
    "app/api/ajapa/questions/[id]/verify-otp/route.ts",
    "app/api/ajapa/questions/[id]/answer/route.ts",
    "lib/roles.ts",
  ];

  it("does not show सत्संगी / Satsangi in Marathi UI strings", () => {
    for (const rel of uiFiles) {
      const text = readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
      assert.equal(text.includes("सत्संगी"), false, `${rel} still has सत्संगी`);
      assert.equal(/\bSatsangi\b/.test(text), false, `${rel} still has Satsangi`);
    }
  });

  it("does not show old संवादक / सेवक role labels in UI", () => {
    for (const rel of uiFiles) {
      const text = readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
      assert.equal(text.includes("संवादक"), false, `${rel} still has संवादक`);
      assert.equal(text.includes("प्रशासक"), false, `${rel} still has प्रशासक`);
    }
    const login = readFileSync(new URL("../app/login/page.tsx", import.meta.url), "utf8");
    assert.match(login, /संगणक \/ मार्गदर्शक \/ चरणसेवक/);
    assert.match(login, /परमानंद चरणसेवक/);
    const ajapa = readFileSync(new URL("../app/(app)/ajapa/page.tsx", import.meta.url), "utf8");
    assert.match(ajapa, /GUIDE_LABEL/);
    assert.match(ajapa, /SOFTWARE_LABEL/);
    assert.match(ajapa, /MEMBER_ROLE_LABEL/);
  });

  it("auth entry footers show the couplet and no contact phones", () => {
    const couplet =
      "हंस सोहं अजपा ध्यान असो साधका | नीरक्षीर हंस तू परमानंद चरणसेवका ..!- मधुसूदनदास विजयानंद";
    const footer = readFileSync(
      new URL("../components/AuthCoupletFooter.tsx", import.meta.url),
      "utf8",
    );
    assert.equal(footer.includes(couplet), true);
    const login = readFileSync(new URL("../app/login/page.tsx", import.meta.url), "utf8");
    const memberLogin = readFileSync(
      new URL("../app/member-login/page.tsx", import.meta.url),
      "utf8",
    );
    assert.match(login, /AuthCoupletFooter/);
    assert.match(memberLogin, /AuthCoupletFooter/);
    for (const phone of ["9850120960", "9225118811", "9423078811", "9136443333"]) {
      assert.equal(footer.includes(phone), false, `footer still has ${phone}`);
      assert.equal(login.includes(phone), false, `login still has ${phone}`);
      assert.equal(memberLogin.includes(phone), false, `member-login still has ${phone}`);
    }
    const roles = readFileSync(new URL("./roles.ts", import.meta.url), "utf8");
    assert.match(roles, /9850120960/);
    assert.match(roles, /9225118811/);
    assert.match(roles, /9423078811/);
    assert.match(roles, /9136443333/);
  });
});
