import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  SATSANG_WEEK1_THURSDAY,
  firstThursdayOfJanuary,
  satsangWeekNumber,
} from "./dates.ts";
import { assignPublicQuestionIds, formatPublicQuestionId } from "./question-id.ts";
import { panchangTithiStub } from "./panchang.ts";

describe("satsang week numbering", () => {
  it("uses 2026-01-01 as week 1 and counts later Thursdays within the year", () => {
    assert.equal(SATSANG_WEEK1_THURSDAY, "2026-01-01");
    assert.equal(firstThursdayOfJanuary(2026), "2026-01-01");
    assert.equal(firstThursdayOfJanuary(2027), "2027-01-07");
    assert.deepEqual(satsangWeekNumber("2026-01-01"), { year: 2026, week: 1 });
    assert.deepEqual(satsangWeekNumber("2026-01-08"), { year: 2026, week: 2 });
    assert.deepEqual(satsangWeekNumber("2026-09-17"), { year: 2026, week: 38 });
    assert.deepEqual(satsangWeekNumber("2026-12-31"), { year: 2026, week: 53 });
    assert.deepEqual(satsangWeekNumber("2027-01-07"), { year: 2027, week: 1 });
    assert.equal(satsangWeekNumber("2025-12-25"), null);
  });
});

describe("FIFO public question ids", () => {
  it("formats village + year-week + sequence", () => {
    assert.equal(formatPublicQuestionId("nashik", 2026, 38, 1), "nashik-2026w38-001");
    assert.equal(formatPublicQuestionId("शिंदी", 2026, 1, 12), "shindi-2026w01-012");
  });

  it("assigns sequence in created_at order per village-week", () => {
    const rows = [
      {
        id: 2,
        asked_on: "2026-09-18",
        created_at: "2026-09-18T10:00:00.000Z",
        place_name: "नाशिक",
      },
      {
        id: 1,
        asked_on: "2026-09-17",
        created_at: "2026-09-17T09:00:00.000Z",
        place_name: "नाशिक",
      },
      {
        id: 3,
        asked_on: "2026-09-17",
        created_at: "2026-09-17T08:00:00.000Z",
        place_name: "शिंदी",
      },
    ];
    const numbered = assignPublicQuestionIds(rows);
    assert.equal(numbered[0].id, 3);
    assert.equal(numbered[0].public_id, "shindi-2026w38-001");
    assert.equal(numbered[1].id, 1);
    assert.equal(numbered[1].public_id, "nashik-2026w38-001");
    assert.equal(numbered[2].id, 2);
    assert.equal(numbered[2].public_id, "nashik-2026w38-002");
  });
});

describe("panchang tithi stub", () => {
  it("labels the stub and includes week number", () => {
    const stub = panchangTithiStub("2026-09-18");
    assert.equal(stub.todo, true);
    assert.equal(stub.thursday, "2026-09-17");
    assert.match(stub.week_label, /आठवडा 38/);
    assert.match(stub.tithi, /पंचांग stub/);
    const route = readFileSync(
      new URL("../app/api/questions/[id]/handwritten/route.ts", import.meta.url),
      "utf8",
    );
    assert.match(route, /requireGuideActor/);
    assert.match(route, /TODO/);
    const qRoute = readFileSync(new URL("../app/api/questions/route.ts", import.meta.url), "utf8");
    assert.match(qRoute, /assignPublicQuestionIds/);
  });
});
