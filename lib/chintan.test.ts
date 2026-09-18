import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { redactChintanRoster, type ChintanStatusRow } from "./chintan-roster.ts";
import { canSeeChintanBody } from "./roles.ts";
import { VAHAK_LABEL, VAHAK_LABEL_SHORT } from "./labels.ts";

const sample: ChintanStatusRow[] = [
  {
    member_id: 1,
    member_name: "कैलास",
    place_code: "nashik",
    place_label: "नाशिक",
    submitted: true,
    answer: "गुप्त चिंतन मजकूर",
  },
  {
    member_id: 2,
    member_name: "बाकी",
    place_code: "nashik",
    place_label: "नाशिक",
    submitted: false,
  },
];

describe("redactChintanRoster", () => {
  it("strips चिंतन body unless seeBody", () => {
    const hidden = redactChintanRoster(sample, false);
    assert.equal(hidden[0].submitted, true);
    assert.equal(hidden[0].answer, undefined);
    assert.equal(hidden[1].submitted, false);
    assert.equal("answer" in hidden[1], false);

    const shown = redactChintanRoster(sample, true);
    assert.equal(shown[0].answer, "गुप्त चिंतन मजकूर");
    assert.equal(shown[1].answer, undefined);
  });

  it("matches guru-only canSeeChintanBody", () => {
    const rows = redactChintanRoster(sample, canSeeChintanBody("guru"));
    assert.equal(rows[0].answer, "गुप्त चिंतन मजकूर");
    const sevak = redactChintanRoster(sample, canSeeChintanBody("software"));
    assert.equal(sevak[0].answer, undefined);
    const vahak = redactChintanRoster(sample, canSeeChintanBody("charansevak"));
    assert.equal(vahak[0].answer, undefined);
  });
});

describe("विचार वाहक label", () => {
  it("uses पूर्ण परमानंद विचार वाहक", () => {
    assert.equal(VAHAK_LABEL, "परमानंद विचार वाहक");
    assert.equal(VAHAK_LABEL_SHORT, "विचार वाहक");
  });
});

describe("one विचार वाहक per place per Thursday", () => {
  it("keeps UNIQUE(place_id, meeting_date) on place_duties", () => {
    const schema = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    assert.match(
      schema,
      /CREATE TABLE IF NOT EXISTS place_duties[\s\S]*UNIQUE \(place_id, meeting_date\)/,
    );
  });

  it("redacts roster answers on the weekly API path", () => {
    const weekly = readFileSync(new URL("../app/api/weekly/route.ts", import.meta.url), "utf8");
    assert.match(weekly, /chintanViewForActor/);
    const view = readFileSync(new URL("./chintan.ts", import.meta.url), "utf8");
    assert.match(view, /redactChintanRoster\(raw, seeBody\)/);
    assert.match(view, /canSeeChintanBody/);
  });
});
