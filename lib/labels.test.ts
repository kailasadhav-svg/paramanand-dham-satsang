import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { chintanDeadlineYmd } from "./dates.ts";
import {
  CHINTAN_DEADLINE_HELP,
  CHINTAN_LABEL,
  CHINTAN_MISSING_REMINDER,
  TOPIC_THURSDAY_HELP,
  VAHAK_JOB_HELP,
  VAHAK_LABEL,
  VAHAK_LABEL_SHORT,
  VAHAK_APPOINT_HELP,
  GUIDE_LABEL,
  GUIDE_QUEUE_LABEL,
  GUIDE_CHINTAN_RANK_HELP,
  GUIDE_QUESTION_HELP,
  GUIDE_TOPIC_HELP,
  ONE_QUESTION_HELP,
  QUESTION_AI_FIRST_HELP,
  QUESTION_ID_HELP,
  HANDWRITTEN_PHOTO_HELP,
  PANCHANG_TITHI_HELP,
  WEEKLY_ARCHIVE_HELP,
  WEEKLY_ARCHIVE_SUMMARY_HELP,
  WEEKLY_ARCHIVE_VAHAK_HELP,
} from "./labels.ts";

describe("चिंतन copy", () => {
  it("uses चिंतन, never टिपणी, in the shared strings", () => {
    assert.equal(CHINTAN_LABEL, "चिंतन");
    assert.match(CHINTAN_DEADLINE_HELP, /अनिवार्य/);
    assert.match(CHINTAN_MISSING_REMINDER, /अनिवार्य/);
    assert.match(CHINTAN_DEADLINE_HELP, /बुधवार रात्री १२:००/);
    assert.match(CHINTAN_MISSING_REMINDER, /दररोज आठवण/);
    assert.match(TOPIC_THURSDAY_HELP, /मधुसुदनदास/);
    assert.match(TOPIC_THURSDAY_HELP, /गुरुवारी विषय/);
    for (const s of [
      CHINTAN_LABEL,
      CHINTAN_DEADLINE_HELP,
      CHINTAN_MISSING_REMINDER,
      TOPIC_THURSDAY_HELP,
      VAHAK_JOB_HELP,
      VAHAK_APPOINT_HELP,
    ]) {
      assert.equal(s.includes("टिपणी"), false);
      assert.equal(/\bcomment\b/i.test(s), false);
      assert.equal(/\bnote\b/i.test(s), false);
    }
  });

  it("names the weekly conductor परमानंद विचार वाहक", () => {
    assert.equal(VAHAK_LABEL, "परमानंद विचार वाहक");
    assert.equal(VAHAK_LABEL_SHORT, "विचार वाहक");
    assert.match(VAHAK_JOB_HELP, /पाठपुरावा/);
    assert.match(VAHAK_JOB_HELP, /चिंतन/);
    assert.match(VAHAK_JOB_HELP, /मधुसुदनदास/);
    assert.match(VAHAK_JOB_HELP, /परमानंद चरणसेवकांपैकी एक/);
    assert.match(TOPIC_THURSDAY_HELP, /गावानुसार/);
    assert.match(GUIDE_TOPIC_HELP, /सर्व गावांना/);
    assert.match(GUIDE_CHINTAN_RANK_HELP, /क्रमवार योग्य तीन/);
    assert.match(GUIDE_QUESTION_HELP, /एकसमान/);
    assert.match(GUIDE_QUESTION_HELP, /मार्गदर्शक चरणसेवकांकडे/);
    assert.ok(GUIDE_QUEUE_LABEL.length <= 20, "WhatsApp button title must be ≤20");
    assert.equal(GUIDE_QUEUE_LABEL, "मार्गदर्शकांकडे");
    assert.match(VAHAK_APPOINT_HELP, /शुक्रवार/);
    assert.match(VAHAK_APPOINT_HELP, /सत्संग चरणसेवक/);
    assert.match(VAHAK_APPOINT_HELP, /दुपारी १२/);
    assert.match(VAHAK_APPOINT_HELP, /परमानंद चरणसेवकांपैकी एक/);
  });

  it("puts चिंतन due on the Wednesday after Thursday satsang", () => {
    assert.equal(chintanDeadlineYmd("2026-09-17"), "2026-09-23");
  });

  it("does not show टिपणी or English comment/note on weekly topic UI", () => {
    const files = [
      "app/me/page.tsx",
      "app/(app)/weekly/page.tsx",
      "app/(app)/topic/page.tsx",
      "lib/weekly.ts",
      "lib/roles.ts",
    ];
    for (const rel of files) {
      const text = readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
      assert.equal(text.includes("टिपणी"), false, `${rel} still has टिपणी`);
      assert.equal(text.includes("CHINTAN_LABEL") || text.includes("चिंतन") || rel.endsWith("topic/page.tsx"), true);
    }
    const weekly = readFileSync(new URL("../app/(app)/weekly/page.tsx", import.meta.url), "utf8");
    assert.match(weekly, /GUIDE_TOPIC_HELP/);
    assert.match(weekly, /GUIDE_CHINTAN_RANK_HELP/);
    const questions = readFileSync(new URL("../app/(app)/questions/page.tsx", import.meta.url), "utf8");
    assert.match(questions, /GUIDE_QUESTION_HELP/);
    const ajapa = readFileSync(new URL("../app/(app)/ajapa/page.tsx", import.meta.url), "utf8");
    assert.match(ajapa, /GUIDE_QUESTION_HELP/);
    const topic = readFileSync(new URL("../app/(app)/topic/page.tsx", import.meta.url), "utf8");
    assert.match(topic, /GUIDE_TOPIC_HELP/);
    const roles = readFileSync(new URL("./roles.ts", import.meta.url), "utf8");
    assert.match(roles, /क्रमवार योग्य तीन/);
    assert.match(roles, /एकसमान/);
    const me = readFileSync(new URL("../app/me/page.tsx", import.meta.url), "utf8");
    assert.match(me, /चिंतन लिहा/);
    assert.match(me, /aria-label="चिंतन"/);
    assert.equal(me.includes("उत्तर लिहा"), false);
    assert.equal(me.includes("तुमचे उत्तर"), false);
  });

  it("documents one-question / AI-first / escalate copy", () => {
    assert.match(ONE_QUESTION_HELP, /फक्त एकच प्रश्न/);
    assert.match(QUESTION_AI_FIRST_HELP, /साहित्य \(AI\) उत्तर/);
    assert.match(QUESTION_AI_FIRST_HELP, /मार्गदर्शक चरणसेवकांकडे पाठवा/);
    const questions = readFileSync(new URL("../app/(app)/questions/page.tsx", import.meta.url), "utf8");
    assert.match(questions, /ONE_QUESTION_HELP/);
    assert.match(questions, /QUESTION_AI_FIRST_HELP/);
    assert.match(questions, /asked_this_week/);
    const ajapa = readFileSync(new URL("../app/(app)/ajapa/page.tsx", import.meta.url), "utf8");
    assert.match(ajapa, /ONE_QUESTION_HELP/);
    assert.match(ajapa, /QUESTION_AI_FIRST_HELP/);
    const weeklyUi = readFileSync(new URL("../app/(app)/weekly/page.tsx", import.meta.url), "utf8");
    assert.match(weeklyUi, /chintan-pdf/);
    assert.match(weeklyUi, /गावानुसार चिंतन PDF \(stub\)/);
    const qRoute = readFileSync(new URL("../app/api/questions/route.ts", import.meta.url), "utf8");
    assert.match(qRoute, /seekerHasQuestionThisWeek/);
    assert.match(qRoute, /ONE_QUESTION_HELP/);
    assert.match(qRoute, /mirrorWeeklyQuestionToAjapa/);
    const bot = readFileSync(new URL("./ajapa/bot.ts", import.meta.url), "utf8");
    assert.match(bot, /seekerHasQuestionThisWeek/);
    assert.match(bot, /generateAjapaAiAnswer/);
    const pdf = readFileSync(new URL("./chintan-pdf.ts", import.meta.url), "utf8");
    assert.match(pdf, /TODO/);
    assert.match(pdf, /json-stub/);
    const pdfRoute = readFileSync(new URL("../app/api/weekly/chintan-pdf/route.ts", import.meta.url), "utf8");
    assert.match(pdfRoute, /requireGuideActor/);
    const weeklyLib = readFileSync(new URL("./weekly.ts", import.meta.url), "utf8");
    assert.match(weeklyLib, /चिंतन लिहा/);
    assert.match(QUESTION_ID_HELP, /FIFO/);
    assert.match(QUESTION_ID_HELP, /२०२६-०१-०१/);
    assert.match(HANDWRITTEN_PHOTO_HELP, /हस्तलिखित/);
    assert.match(PANCHANG_TITHI_HELP, /तिथि/);
    const qPage = readFileSync(new URL("../app/(app)/questions/page.tsx", import.meta.url), "utf8");
    assert.match(qPage, /ThursdayTithiBar/);
    assert.match(qPage, /handwritten/);
    assert.match(qPage, /QUESTION_ID_HELP/);
    const attendance = readFileSync(new URL("../app/(app)/attendance/page.tsx", import.meta.url), "utf8");
    assert.match(attendance, /ThursdayTithiBar/);
    const topic = readFileSync(new URL("../app/(app)/topic/page.tsx", import.meta.url), "utf8");
    assert.match(topic, /ThursdayTithiBar/);
    const weeklyPage = readFileSync(new URL("../app/(app)/weekly/page.tsx", import.meta.url), "utf8");
    assert.match(weeklyPage, /ThursdayTithiBar/);
    const report = readFileSync(new URL("../app/(app)/report/page.tsx", import.meta.url), "utf8");
    assert.match(report, /ThursdayTithiBar/);
    const me = readFileSync(new URL("../app/me/page.tsx", import.meta.url), "utf8");
    assert.match(me, /ThursdayTithiBar/);
    assert.match(WEEKLY_ARCHIVE_HELP, /१७:००|५ वाजता/);
    assert.match(WEEKLY_ARCHIVE_SUMMARY_HELP, /अनिवार्य/);
    assert.match(WEEKLY_ARCHIVE_VAHAK_HELP, /विचार वाहक/);
    const weeklyArchiveUi = readFileSync(new URL("../app/(app)/weekly/page.tsx", import.meta.url), "utf8");
    assert.match(weeklyArchiveUi, /WEEKLY_ARCHIVE_HELP/);
    assert.match(weeklyArchiveUi, /गुरुवार १७:०० संग्रह/);
  });
});
