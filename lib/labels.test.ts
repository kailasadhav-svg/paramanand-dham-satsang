import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { chintanDeadlineYmd } from "./dates.ts";
import {
  CHINTAN_DEADLINE_HELP,
  CHINTAN_LABEL,
  CHINTAN_MISSING_REMINDER,
  CHINTAN_WRITE_PLACEHOLDER,
  TOPIC_EDIT_GUIDE_ONLY_HELP,
  TOPIC_THURSDAY_HELP,
  VAHAK_JOB_HELP,
  VAHAK_LABEL,
  VAHAK_LABEL_SHORT,
  VAHAK_APPOINT_HELP,
  VAHAK_APPOINT_UNSET,
  vahakDutyPersonLabel,
  VAHAK_NO_TOPIC_EDIT_HELP,
  SATSANG_CHARANSEVAK_APPOINT_HELP,
  SATSANG_CHARANSEVAK_JOB_HELP,
  SATSANG_CHARANSEVAK_LABEL,
  GUIDE_LABEL,
  GUIDE_MAIN_WORK_HELP,
  GUIDE_QUEUE_LABEL,
  GUIDE_CHINTAN_RANK_HELP,
  GUIDE_QUESTION_HELP,
  GUIDE_TOPIC_HELP,
  PLACE_TOPIC_LOCKED_HELP,
  PLACE_TOPIC_LOCK_SCOPE_HELP,
  ONE_QUESTION_HELP,
  LITERATURE_ANSWER_LABEL,
  LITERATURE_ANSWERS_LABEL,
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
    assert.equal(CHINTAN_WRITE_PLACEHOLDER, "चिंतन लिहा…");
    assert.match(CHINTAN_DEADLINE_HELP, /अनिवार्य/);
    assert.match(CHINTAN_MISSING_REMINDER, /अनिवार्य/);
    assert.match(CHINTAN_DEADLINE_HELP, /बुधवार रात्री १२:००/);
    assert.match(CHINTAN_MISSING_REMINDER, /दररोज आठवण/);
    assert.match(TOPIC_THURSDAY_HELP, /मधुसुदनदास/);
    assert.match(TOPIC_THURSDAY_HELP, /गुरुवारी विषय/);
    for (const s of [
      CHINTAN_LABEL,
      CHINTAN_WRITE_PLACEHOLDER,
      CHINTAN_DEADLINE_HELP,
      CHINTAN_MISSING_REMINDER,
      TOPIC_EDIT_GUIDE_ONLY_HELP,
      TOPIC_THURSDAY_HELP,
      VAHAK_JOB_HELP,
      VAHAK_NO_TOPIC_EDIT_HELP,
      VAHAK_APPOINT_HELP,
      PLACE_TOPIC_LOCKED_HELP,
      PLACE_TOPIC_LOCK_SCOPE_HELP,
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
    assert.equal(TOPIC_EDIT_GUIDE_ONLY_HELP, "विषय तयार / दुरुस्ती फक्त मार्गदर्शक.");
    assert.equal(
      VAHAK_NO_TOPIC_EDIT_HELP,
      "विषय तयार/दुरुस्ती विचार वाहकांचे काम नाही — फक्त मार्गदर्शक.",
    );
    assert.match(VAHAK_NO_TOPIC_EDIT_HELP, /काम नाही/);
    assert.match(VAHAK_NO_TOPIC_EDIT_HELP, /फक्त मार्गदर्शक/);
    assert.equal(VAHAK_JOB_HELP.includes("विषय दुरुस्त करतात"), false);
    assert.equal(VAHAK_JOB_HELP.includes("विषय तयार"), false);
    assert.equal(VAHAK_JOB_HELP.includes("दुरुस्त"), false);
    assert.equal(VAHAK_JOB_HELP.includes("दुरुस्ती"), false);
    assert.equal(VAHAK_NO_TOPIC_EDIT_HELP.includes("विषय दुरुस्त करतात"), false);
    assert.equal(VAHAK_NO_TOPIC_EDIT_HELP.includes("विचार वाहक विषय"), false);
    assert.match(TOPIC_THURSDAY_HELP, /गावानुसार/);
    assert.match(GUIDE_TOPIC_HELP, /सर्व गावांना/);
    assert.match(PLACE_TOPIC_LOCKED_HELP, /चिंतन आले आहे/);
    assert.match(PLACE_TOPIC_LOCKED_HELP, /मार्गदर्शकही नाही/);
    assert.match(PLACE_TOPIC_LOCK_SCOPE_HELP, /विषय पडदा/);
    assert.match(PLACE_TOPIC_LOCK_SCOPE_HELP, /साप्ताहिक विषय/);
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

  it("formats a compact one-line विचार वाहक appointment", () => {
    assert.equal(vahakDutyPersonLabel(null), VAHAK_APPOINT_UNSET);
    assert.equal(
      vahakDutyPersonLabel({
        charansevak_name: "राम देशमुख",
        charansevak_phone_display: "9021555060",
      }),
      "राम देशमुख · 9021555060",
    );
    assert.equal(
      vahakDutyPersonLabel({
        charansevak_name: "  ",
        charansevak_phone_display: "9021555060",
      }),
      "9021555060",
    );
    assert.equal(
      vahakDutyPersonLabel({
        charansevak_name: null,
        charansevak_phone_display: "",
      }),
      VAHAK_APPOINT_UNSET,
    );
  });

  it("cannot be skimmed as विचार वाहक editing विषय", () => {
    const skimAsVahakEditsTopic = [
      "विषय दुरुस्त करतात",
      "विषय तयार करतात",
      "विचार वाहक विषय दुरुस्त",
      "विचार वाहक विषय तयार",
      "परमानंद विचार वाहक विषय",
    ];
    const copy = [
      VAHAK_JOB_HELP,
      VAHAK_NO_TOPIC_EDIT_HELP,
      TOPIC_EDIT_GUIDE_ONLY_HELP,
      VAHAK_APPOINT_HELP,
      TOPIC_THURSDAY_HELP,
      GUIDE_TOPIC_HELP,
      PLACE_TOPIC_LOCKED_HELP,
      PLACE_TOPIC_LOCK_SCOPE_HELP,
    ];
    for (const s of copy) {
      for (const bad of skimAsVahakEditsTopic) {
        assert.equal(s.includes(bad), false, `${s} contains ${bad}`);
      }
      for (const sent of s.split(/(?<=[।.])\s*/).filter(Boolean)) {
        if (/या आठवड्याचे परमानंद विचार वाहक/.test(sent)) {
          assert.equal(/विषय/.test(sent), false, sent);
          assert.equal(/दुरुस्त/.test(sent), false, sent);
        }
      }
    }
    const topic = readFileSync(new URL("../app/(app)/topic/page.tsx", import.meta.url), "utf8");
    const weekly = readFileSync(new URL("../app/(app)/weekly/page.tsx", import.meta.url), "utf8");
    for (const [rel, text] of [
      ["topic", topic],
      ["weekly", weekly],
    ] as const) {
      assert.match(text, /TOPIC_EDIT_GUIDE_ONLY_HELP/);
      assert.match(text, /VAHAK_NO_TOPIC_EDIT_HELP/);
      assert.match(text, /VAHAK_JOB_HELP/);
      for (const bad of skimAsVahakEditsTopic) {
        assert.equal(text.includes(bad), false, `${rel} contains ${bad}`);
      }
    }
  });

  it("forbids the old Vahak/software topic-edit copy", () => {
    const forbidden = [
      "विषय दुरुस्ती फक्त या स्थळाचे",
      "या स्थळाचे परमानंद विचार वाहक",
      "या स्थळाचे {VAHAK_LABEL}",
      "विचार वाहक किंवा मार्गदर्शक / संगणक",
      "{VAHAK_LABEL} किंवा मार्गदर्शक / संगणक",
      "किंवा मार्गदर्शक विषय दुरुस्त",
      "विषय एडिट",
      "own place topic",
    ];
    const files = [
      "lib/labels.ts",
      "app/(app)/topic/page.tsx",
      "app/(app)/weekly/page.tsx",
      "app/api/meetings/route.ts",
      "app/me/page.tsx",
      "README.md",
      "docs/AJAPA_QA_FLOW.md",
      "docs/AJAPA_WABA_TEMPLATES.md",
      "docs/META_TEMPLATE_STEP_BY_STEP.md",
      "docs/LOCAL_FIRST_PWA.md",
    ];
    for (const rel of files) {
      const text = readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
      for (const bad of forbidden) {
        assert.equal(text.includes(bad), false, `${rel} still has ${bad}`);
      }
    }
    assert.equal(TOPIC_EDIT_GUIDE_ONLY_HELP.includes("या स्थळाचे"), false);
    assert.equal(TOPIC_EDIT_GUIDE_ONLY_HELP.includes("विचार वाहक"), false);
    assert.equal(TOPIC_EDIT_GUIDE_ONLY_HELP.includes("संगणक"), false);
    assert.equal(VAHAK_NO_TOPIC_EDIT_HELP.includes("या स्थळाचे"), false);
    assert.equal(VAHAK_NO_TOPIC_EDIT_HELP.includes("संगणक"), false);
    const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
    assert.match(readme, /Never create\/edit विषय/);
    assert.match(readme, /create\/edit \*\*मार्गदर्शक only\*\*/);
  });

  it("puts चिंतन due on the Wednesday after Thursday satsang", () => {
    assert.equal(chintanDeadlineYmd("2026-09-17"), "2026-09-23");
  });

  it("does not show टिपणी or English comment/note on weekly topic UI", () => {
    const files = [
      "app/me/page.tsx",
      "app/(app)/weekly/page.tsx",
      "app/(app)/topic/page.tsx",
      "components/FormBits.tsx",
      "lib/weekly.ts",
      "lib/topic-lock.ts",
      "lib/roles.ts",
      "lib/report.ts",
    ];
    for (const rel of files) {
      const text = readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
      assert.equal(text.includes("टिपणी"), false, `${rel} still has टिपणी`);
      assert.equal(
        text.includes("CHINTAN_LABEL") || text.includes("चिंतन") || rel.endsWith("FormBits.tsx"),
        true,
      );
    }
    const weekly = readFileSync(new URL("../app/(app)/weekly/page.tsx", import.meta.url), "utf8");
    assert.match(weekly, /GUIDE_TOPIC_HELP/);
    assert.match(weekly, /GUIDE_CHINTAN_RANK_HELP/);
    assert.match(weekly, /PLACE_TOPIC_LOCK_SCOPE_HELP/);
    const questions = readFileSync(new URL("../app/(app)/questions/page.tsx", import.meta.url), "utf8");
    assert.match(questions, /GUIDE_QUESTION_HELP/);
    const ajapa = readFileSync(new URL("../app/(app)/ajapa/page.tsx", import.meta.url), "utf8");
    assert.match(ajapa, /GUIDE_QUESTION_HELP/);
    const topic = readFileSync(new URL("../app/(app)/topic/page.tsx", import.meta.url), "utf8");
    assert.match(topic, /GUIDE_TOPIC_HELP/);
    assert.match(topic, /VAHAK_NO_TOPIC_EDIT_HELP/);
    assert.match(topic, /TOPIC_EDIT_GUIDE_ONLY_HELP/);
    assert.match(topic, /PLACE_TOPIC_LOCKED_HELP/);
    assert.match(topic, /PLACE_TOPIC_LOCK_SCOPE_HELP/);
    assert.match(topic, /topic_locked/);
    assert.match(topic, /topicEditable/);
    assert.equal(topic.includes("या स्थळाचे"), false);
    assert.match(topic, /CHINTAN_LABEL/);
    assert.match(topic, /CHINTAN_WRITE_PLACEHOLDER/);
    assert.match(topic, /aria-label=\{CHINTAN_LABEL\}/);
    assert.equal(topic.includes("विषय तपशील"), false);
    const roles = readFileSync(new URL("./roles.ts", import.meta.url), "utf8");
    assert.match(roles, /क्रमवार योग्य तीन/);
    assert.match(roles, /एकसमान/);
    const me = readFileSync(new URL("../app/me/page.tsx", import.meta.url), "utf8");
    assert.match(me, /CHINTAN_WRITE_PLACEHOLDER/);
    assert.match(me, /aria-label=\{CHINTAN_LABEL\}/);
    assert.equal(me.includes("उत्तर लिहा"), false);
    assert.equal(me.includes("तुमचे उत्तर"), false);
    const report = readFileSync(new URL("./report.ts", import.meta.url), "utf8");
    assert.match(report, /CHINTAN_LABEL/);
    assert.match(report, /📝 \$\{CHINTAN_LABEL\}: \$\{m\.notes\}/);
  });

  it("documents one-question / literature-first / escalate copy", () => {
    assert.match(ONE_QUESTION_HELP, /फक्त एकच प्रश्न/);
    assert.equal(LITERATURE_ANSWER_LABEL, "परमानंद साहित्य उत्तर");
    assert.equal(LITERATURE_ANSWERS_LABEL, "परमानंद साहित्य उत्तरे");
    assert.match(QUESTION_AI_FIRST_HELP, /परमानंद साहित्य उत्तर/);
    assert.equal(QUESTION_AI_FIRST_HELP.includes("AI"), false);
    assert.equal(QUESTION_AI_FIRST_HELP.includes("एआय"), false);
    assert.match(QUESTION_AI_FIRST_HELP, /मार्गदर्शक चरणसेवकांकडे पाठवा/);
    const questions = readFileSync(new URL("../app/(app)/questions/page.tsx", import.meta.url), "utf8");
    assert.match(questions, /ONE_QUESTION_HELP/);
    assert.match(questions, /QUESTION_AI_FIRST_HELP/);
    assert.match(questions, /asked_this_week/);
    const ajapa = readFileSync(new URL("../app/(app)/ajapa/page.tsx", import.meta.url), "utf8");
    assert.match(ajapa, /ONE_QUESTION_HELP/);
    assert.match(ajapa, /QUESTION_AI_FIRST_HELP/);
    assert.match(ajapa, /LITERATURE_ANSWER_LABEL/);
    assert.match(ajapa, /LITERATURE_ANSWERS_LABEL/);
    assert.match(questions, /LITERATURE_ANSWER_LABEL/);
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
    const dutyUi = readFileSync(
      new URL("../components/DutyAppointSection.tsx", import.meta.url),
      "utf8",
    );
    assert.match(attendance, /ThursdayTithiBar/);
    assert.match(attendance, /primary/);
    assert.match(attendance, /उपस्थिती आकडे · सत्संग चरणसेवक मुख्य/);
    assert.match(attendance, /<details/);
    assert.ok(
      attendance.indexOf("SATSANG_CHARANSEVAK_LABEL} नेमणूक") <
        attendance.indexOf("VAHAK_LABEL} नेमणूक"),
      "सत्संग चरणसेवक नेमणूक must appear before विचार वाहक नेमणूक",
    );
    assert.match(attendance, /DUTY_KIND_SATSANG/);
    assert.match(attendance, /DUTY_KIND_VAHAK/);
    assert.match(attendance, /ariaLabel="नेमणूक स्थळ निवडा"/);
    assert.match(attendance, /ariaLabel="सत्संग चरणसेवक नेमणूक स्थळ निवडा"/);
    assert.match(dutyUi, /नेमणूक स्थळ \(ड्रॉपडाउन\)/);
    assert.match(dutyUi, /इतर स्थळांच्या नेमणुका/);
    assert.equal(
      attendance.includes("dutyRows.map((row) => {"),
      false,
      "vahak appoint should not repeat a full form per place",
    );
    assert.equal(
      attendance.includes('staff ? "उपस्थिती · एडिट"'),
      false,
      "staff attendance heading must still name सत्संग चरणसेवक",
    );
    assert.match(attendance, /SATSANG_CHARANSEVAK_LABEL/);
    assert.match(attendance, /VAHAK_APPOINT_HELP/);
    assert.match(attendance, /SATSANG_CHARANSEVAK_APPOINT_HELP/);
    assert.equal(SATSANG_CHARANSEVAK_LABEL, "सत्संग चरणसेवक");
    assert.match(SATSANG_CHARANSEVAK_JOB_HELP, /उपस्थिती नोंद/);
    assert.match(SATSANG_CHARANSEVAK_JOB_HELP, /विचार वाहक वेगळे/);
    assert.match(SATSANG_CHARANSEVAK_APPOINT_HELP, /संगणक नेमत नाहीत/);
    assert.match(attendance, /GUIDE_MAIN_WORK_HELP/);
    assert.match(attendance, /canSeeGuideScreens/);
    assert.match(attendance, /href="\/weekly"/);
    assert.equal(
      attendance.includes('href="/questions"'),
      false,
      "मार्गदर्शक attendance must not link to प्रश्न",
    );
    assert.equal(GUIDE_MAIN_WORK_HELP.includes("सत्संग चरणसेवक"), true);
    assert.match(GUIDE_MAIN_WORK_HELP, /चिंतनावर उत्तर/);
    const topic = readFileSync(new URL("../app/(app)/topic/page.tsx", import.meta.url), "utf8");
    assert.match(topic, /ThursdayTithiBar/);
    const weeklyPage = readFileSync(new URL("../app/(app)/weekly/page.tsx", import.meta.url), "utf8");
    assert.match(weeklyPage, /ThursdayTithiBar/);
    assert.match(weeklyPage, /VAHAK_NO_TOPIC_EDIT_HELP/);
    assert.match(weeklyPage, /TOPIC_EDIT_GUIDE_ONLY_HELP/);
    assert.equal(weeklyPage.includes("या स्थळाचे"), false);
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

  it("does not expose the word AI to members", () => {
    const memberFacing = [
      CHINTAN_LABEL,
      CHINTAN_WRITE_PLACEHOLDER,
      CHINTAN_DEADLINE_HELP,
      CHINTAN_MISSING_REMINDER,
      TOPIC_EDIT_GUIDE_ONLY_HELP,
      TOPIC_THURSDAY_HELP,
      VAHAK_JOB_HELP,
      VAHAK_NO_TOPIC_EDIT_HELP,
      VAHAK_LABEL,
      VAHAK_LABEL_SHORT,
      VAHAK_APPOINT_HELP,
      VAHAK_APPOINT_UNSET,
      SATSANG_CHARANSEVAK_APPOINT_HELP,
      SATSANG_CHARANSEVAK_JOB_HELP,
      SATSANG_CHARANSEVAK_LABEL,
      GUIDE_LABEL,
      GUIDE_MAIN_WORK_HELP,
      GUIDE_QUEUE_LABEL,
      GUIDE_CHINTAN_RANK_HELP,
      GUIDE_QUESTION_HELP,
      GUIDE_TOPIC_HELP,
      PLACE_TOPIC_LOCKED_HELP,
      PLACE_TOPIC_LOCK_SCOPE_HELP,
      ONE_QUESTION_HELP,
      LITERATURE_ANSWER_LABEL,
      LITERATURE_ANSWERS_LABEL,
      QUESTION_AI_FIRST_HELP,
      QUESTION_ID_HELP,
      HANDWRITTEN_PHOTO_HELP,
      PANCHANG_TITHI_HELP,
      WEEKLY_ARCHIVE_HELP,
      WEEKLY_ARCHIVE_SUMMARY_HELP,
      WEEKLY_ARCHIVE_VAHAK_HELP,
    ];
    for (const s of memberFacing) {
      assert.equal(/\bAI\b/i.test(s), false, `label leaks AI: ${s}`);
      assert.equal(s.includes("एआय"), false, `label leaks एआय: ${s}`);
      assert.equal(/AI\s*उत्तर|AI\s*answer/i.test(s), false, `label leaks AI उत्तर: ${s}`);
    }

    const uiFiles = [
      "app/(app)/ajapa/page.tsx",
      "app/(app)/questions/page.tsx",
      "app/(app)/weekly/page.tsx",
      "app/me/page.tsx",
      "lib/ajapa/whatsapp.ts",
      "lib/ajapa/bot.ts",
      "scripts/submit-waba-templates.ts",
    ];
    for (const rel of uiFiles) {
      const text = readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
      const withoutComments = text
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/.*$/gm, "$1");
      const quoted: string[] = [];
      const re = /(["'`])(?:\\.|(?!\1)[\s\S])*\1/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(withoutComments))) {
        quoted.push(m[0].slice(1, -1));
      }
      for (const q of quoted) {
        const visible = q
          .replace(/\$\{[^}]+\}/g, "")
          .replace(/\bajapa_ai_\w+\b/gi, "")
          .replace(/\b(aiAnswer|ai_answer|ai_answered|AJAPA_AI_\w+|OPENAI)\b/g, "");
        const leaksAiLabel =
          /AI\s+उत्तर/.test(visible) ||
          /AI\s+answer/i.test(visible) ||
          /एआय/.test(visible) ||
          /\(AI\)/.test(visible) ||
          /(^|[^A-Za-z_])AI([^A-Za-z_]|$)/.test(visible);
        assert.equal(
          leaksAiLabel,
          false,
          `${rel} quoted string leaks AI to members: ${q.slice(0, 120)}`,
        );
      }
    }
  });
});
