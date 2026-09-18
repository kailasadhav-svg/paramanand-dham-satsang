import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { canEditWeeklyQuestion, canSeeChintanBody, canSeeGuideScreens } from "./roles.ts";
import { VAHAK_LABEL, VAHAK_LABEL_SHORT } from "./labels.ts";
import { groupChintanByVillage, redactChintanRoster, scopeChintanRoster, type ChintanStatusRow } from "./chintan-roster.ts";

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
    assert.equal(canSeeGuideScreens("software"), false);
    assert.equal(canEditWeeklyQuestion("software"), false);
    assert.equal(canEditWeeklyQuestion("guru"), true);
  });
});

describe("scopeChintanRoster", () => {
  it("treats [] as nobody and null as every place", () => {
    assert.equal(scopeChintanRoster(sample, []).length, 0);
    assert.equal(scopeChintanRoster(sample, null).length, 2);
    const nashik = scopeChintanRoster(sample, ["nashik"]);
    assert.equal(nashik.length, 2);
    assert.equal(scopeChintanRoster(sample, ["shindi"]).length, 0);
  });
});

describe("groupChintanByVillage", () => {
  it("bundles submitted and pending per place for the PDF stub", () => {
    const extra: ChintanStatusRow = {
      member_id: 3,
      member_name: "शिंदी",
      place_code: "shindi",
      place_label: "शिंदी",
      submitted: true,
      answer: "गाव चिंतन",
    };
    const groups = groupChintanByVillage([...sample, extra]);
    assert.equal(groups.length, 2);
    assert.equal(groups[0].place_code, "nashik");
    assert.equal(groups[0].submitted.length, 1);
    assert.equal(groups[0].pending.length, 1);
    assert.equal(groups[1].place_code, "shindi");
    assert.equal(groups[1].submitted[0].answer, "गाव चिंतन");
  });
});

describe("village चिंतन PDF stub", () => {
  it("is मार्गदर्शक-only JSON until a real renderer exists", () => {
    const pdf = readFileSync(new URL("./chintan-pdf.ts", import.meta.url), "utf8");
    assert.match(pdf, /TODO/);
    assert.match(pdf, /groupChintanByVillage/);
    const route = readFileSync(
      new URL("../app/api/weekly/chintan-pdf/route.ts", import.meta.url),
      "utf8",
    );
    assert.match(route, /requireGuideActor/);
    assert.match(route, /villageChintanPdfStub/);
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
    assert.match(view, /canEditWeeklyQuestion/);
    assert.match(view, /placeCodes = \[\]/);
    assert.match(view, /canEditAnyPlaceTopic\(detectStaffRole/);
    assert.equal(view.includes("actorIsVahak(phone, date, placeId)"), false);
  });

  it("does not let विचार वाहक edit the village topic", () => {
    const meetings = readFileSync(
      new URL("../app/api/meetings/route.ts", import.meta.url),
      "utf8",
    );
    assert.match(meetings, /फक्त मार्गदर्शक विषय तयार \/ दुरुस्त करू शकतात/);
    assert.equal(meetings.includes("विचार वाहक किंवा मार्गदर्शक विषय"), false);
    const places = readFileSync(new URL("../app/api/places/route.ts", import.meta.url), "utf8");
    assert.match(places, /can_edit_topic: false/);
    assert.equal(/is_vahak: true[\s\S]*can_edit_topic: true/.test(places), false);
  });
});
