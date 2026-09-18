import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { chintanDeadlineYmd } from "./dates.ts";
import {
  CHINTAN_DEADLINE_HELP,
  CHINTAN_LABEL,
  CHINTAN_MISSING_REMINDER,
  TOPIC_THURSDAY_HELP,
} from "./labels.ts";

describe("चिंतन copy", () => {
  it("uses चिंतन, never टिपणी, in the shared strings", () => {
    assert.equal(CHINTAN_LABEL, "चिंतन");
    assert.match(CHINTAN_DEADLINE_HELP, /चिंतन/);
    assert.match(CHINTAN_DEADLINE_HELP, /बुधवार रात्री १२:००/);
    assert.match(CHINTAN_MISSING_REMINDER, /दररोज आठवण/);
    assert.match(TOPIC_THURSDAY_HELP, /मधुसुदनदास/);
    assert.match(TOPIC_THURSDAY_HELP, /गुरुवारी विषय/);
    for (const s of [
      CHINTAN_LABEL,
      CHINTAN_DEADLINE_HELP,
      CHINTAN_MISSING_REMINDER,
      TOPIC_THURSDAY_HELP,
    ]) {
      assert.equal(s.includes("टिपणी"), false);
      assert.equal(/\bcomment\b/i.test(s), false);
      assert.equal(/\bnote\b/i.test(s), false);
    }
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
    ];
    for (const rel of files) {
      const text = readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
      assert.equal(text.includes("टिपणी"), false, `${rel} still has टिपणी`);
      assert.equal(text.includes("CHINTAN_LABEL") || text.includes("चिंतन") || rel.endsWith("topic/page.tsx"), true);
    }
    const me = readFileSync(new URL("../app/me/page.tsx", import.meta.url), "utf8");
    assert.match(me, /चिंतन लिहा/);
    assert.match(me, /aria-label="चिंतन"/);
    assert.equal(me.includes("उत्तर लिहा"), false);
    assert.equal(me.includes("तुमचे उत्तर"), false);
  });
});
