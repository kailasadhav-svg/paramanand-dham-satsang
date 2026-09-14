import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyRegisterReply,
  parseAjpaMessage,
  registerPrompt,
  resolveAjpaIntent,
} from "./ajpa.ts";

describe("parseAjpaMessage", () => {
  it("treats अजपा and ajpa as start words", () => {
    assert.deepEqual(parseAjpaMessage("अजपा"), { kind: "keyword_only" });
    assert.deepEqual(parseAjpaMessage("  AJPA  "), { kind: "keyword_only" });
    assert.deepEqual(parseAjpaMessage("ajpa: गुरुवारी गेलो"), {
      kind: "keyword_plus",
      rest: "गुरुवारी गेलो",
    });
  });

  it("does not treat नोंदणी as a start word", () => {
    assert.equal(parseAjpaMessage("नोंदणी").kind, "none");
    assert.equal(parseAjpaMessage("नोंदणी कमल").kind, "none");
  });
});

describe("resolveAjpaIntent", () => {
  it("unknown user + only keyword starts registration", () => {
    assert.deepEqual(resolveAjpaIntent("अजपा", false), { action: "start_register" });
    assert.deepEqual(resolveAjpaIntent("ajpa", false), { action: "start_register" });
  });

  it("unknown user + keyword + extra still starts registration (no नोंदणी)", () => {
    assert.deepEqual(resolveAjpaIntent("अजपा कमल", false), { action: "start_register" });
  });

  it("registered + keyword + text is weekly answer", () => {
    assert.deepEqual(resolveAjpaIntent("ajpa गुरुवारी उपस्थित", true), {
      action: "weekly_answer",
      answer: "गुरुवारी उपस्थित",
    });
  });

  it("registered + keyword only prompts for the weekly answer", () => {
    assert.deepEqual(resolveAjpaIntent("अजपा", true), { action: "weekly_prompt" });
  });
});

describe("register chat steps", () => {
  it("asks name, mobile, place one by one", () => {
    assert.equal(registerPrompt("ask_name"), "नाव लिहा");
    let state = applyRegisterReply("ask_name", "कमल पाटील");
    assert.equal(state.step, "ask_mobile");
    state = applyRegisterReply(state.step, "9876511122", state.draft);
    assert.equal(state.step, "ask_place");
    state = applyRegisterReply(state.step, "नाशिक", state.draft);
    assert.equal(state.step, "done");
    assert.deepEqual(state.draft, {
      name: "कमल पाटील",
      mobile: "9876511122",
      place_code: "nashik",
    });
  });
});
