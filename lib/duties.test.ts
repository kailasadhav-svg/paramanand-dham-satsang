import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { canAppointSatsangCharansevak, canAppointVahak } from "./roles.ts";
import { SATSANG_CHARANSEVAK_LABEL } from "./labels.ts";

describe("duty kinds", () => {
  it("keeps विचार वाहक as default and सत्संग चरणसेवक as a sibling kind", () => {
    const db = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    assert.match(db, /export const DUTY_KIND_VAHAK = "vahak"/);
    assert.match(db, /export const DUTY_KIND_SATSANG = "satsang_charansevak"/);
    assert.match(db, /if \(raw == null \|\| raw === ""\) return DUTY_KIND_VAHAK/);
    assert.match(db, /raw === DUTY_KIND_VAHAK \|\| raw === DUTY_KIND_SATSANG/);
  });
});

describe("duties API role isolation", () => {
  it("does not let संगणक appoint either duty; मार्गदर्शक can appoint both", () => {
    assert.equal(canAppointVahak("software", { hasDuty: false }), false);
    assert.equal(canAppointSatsangCharansevak("software"), false);
    assert.equal(canAppointVahak("guru", { hasDuty: true }), true);
    assert.equal(canAppointSatsangCharansevak("guru"), true);
  });

  it("stores both kinds on /api/duties without mixing them", () => {
    const route = readFileSync(new URL("../app/api/duties/route.ts", import.meta.url), "utf8");
    assert.match(route, /duty_kind/);
    assert.match(route, /can_assign_satsang/);
    assert.match(route, /satsang_duty/);
    assert.match(route, /canAppointSatsangCharansevak/);
    assert.match(route, /DUTY_KIND_SATSANG/);
    assert.match(route, /addDaysYmd\(opts.meetingDate, -7\)/);
    assert.match(route, /canPutVahakDuty/);
    assert.match(route, /SATSANG_CHARANSEVAK_LABEL/);
  });

  it("locks non-staff attendance saves to appointed सत्संग चरणसेवक", () => {
    const meetings = readFileSync(
      new URL("../app/api/meetings/route.ts", import.meta.url),
      "utf8",
    );
    assert.match(meetings, /DUTY_KIND_SATSANG/);
    assert.match(meetings, /फक्त या स्थळाचे \$\{SATSANG_CHARANSEVAK_LABEL\} उपस्थिती नोंद/);
    assert.equal(SATSANG_CHARANSEVAK_LABEL, "सत्संग चरणसेवक");
  });

  it("does not treat विचार वाहक rows as सत्संग चरणसेवक when listing", () => {
    const db = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    assert.match(db, /kind: PlaceDutyKind = DUTY_KIND_VAHAK/);
    assert.match(db, /WHERE d.meeting_date = \? AND d.duty_kind = \?/);
    assert.match(db, /if \(kind === DUTY_KIND_VAHAK\)/);
    assert.match(db, /await continuePreviousVahak\(date\)/);
    assert.match(db, /duty_kind: DUTY_KIND_VAHAK/);
    assert.match(db, /ON CONFLICT\(place_id, meeting_date, duty_kind\)/);
  });
});
