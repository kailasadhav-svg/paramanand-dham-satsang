import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  archiveSourceWeekStart,
  isAtOrAfterThursdayArchiveTime,
} from "./dates.ts";
import {
  ArchiveError,
  applyArchiveAckRead,
  applyArchiveShare,
  applyArchiveSummary,
  applyArchiveVisibility,
  buildVillageArchives,
  filterArchivesForActor,
  isArchiveSummaryComplete,
  resetArchiveStoreForTests,
  upsertGeneratedArchives,
} from "./weekly-archive.ts";

describe("Thursday 17:00 archive clock", () => {
  it("seals the previous week at this Thursday 17:00 IST", () => {
    assert.equal(archiveSourceWeekStart("2026-09-17"), "2026-09-10");
    const before = new Date("2026-09-17T11:29:00.000Z"); // 16:59 IST
    const at = new Date("2026-09-17T11:30:00.000Z"); // 17:00 IST
    const friday = new Date("2026-09-18T04:00:00.000Z");
    assert.equal(isAtOrAfterThursdayArchiveTime("2026-09-17", before), false);
    assert.equal(isAtOrAfterThursdayArchiveTime("2026-09-17", at), true);
    assert.equal(isAtOrAfterThursdayArchiveTime("2026-09-17", friday), true);
  });
});

describe("village archive stub rules", () => {
  it("keeps first generate immutable and requires summary before visible", () => {
    resetArchiveStoreForTests();
    const built = buildVillageArchives({
      weekStart: "2026-09-10",
      generatedAt: "2026-09-17T11:30:00.000Z",
      villages: [
        {
          place_code: "nashik",
          place_label: "नाशिक",
          submitted: [{ member_name: "कैलास", answer: "चिंतन" }],
          pending: ["बाकी"],
        },
      ],
      questions: [
        { place_code: "nashik", question: "प्रश्न", answer: "उत्तर", public_id: "nashik-2026w37-001" },
      ],
    });
    const first = upsertGeneratedArchives(built);
    assert.equal(first[0].immutable, true);
    assert.equal(first[0].owner, "मार्गदर्शक");
    assert.equal(first[0].visible, false);
    const again = upsertGeneratedArchives([
      { ...first[0], chintan_file: { ...first[0].chintan_file, pending: [] } },
    ]);
    assert.deepEqual(again[0].chintan_file.pending, ["बाकी"]);

    assert.throws(
      () => applyArchiveVisibility(first[0], true),
      (err: unknown) => err instanceof ArchiveError && err.status === 400,
    );
    const withSummary = applyArchiveSummary(first[0], { kind: "text", text: "सारांश" });
    assert.equal(isArchiveSummaryComplete(null), false);
    assert.equal(isArchiveSummaryComplete({ kind: "text", text: "  " }), false);
    assert.equal(isArchiveSummaryComplete({ kind: "text", text: "सारांश" }), true);
    assert.equal(isArchiveSummaryComplete({ kind: "photo", filename: "sum.jpg" }), true);
    assert.equal(isArchiveSummaryComplete({ kind: "voice", filename: "sum.m4a" }), true);
    assert.equal(isArchiveSummaryComplete({ kind: "photo", filename: "" }), false);
    const visible = applyArchiveVisibility(withSummary, true);
    assert.equal(visible.visible, true);
    const shared = applyArchiveShare(visible, true);
    assert.equal(shared.share_to_village_admin, true);
    const read = applyArchiveAckRead(shared);
    assert.equal(read.summary_read, true);

    const hiddenFromVahak = filterArchivesForActor(first, {
      guide: false,
      vahakPlaceCodes: ["nashik"],
    });
    assert.equal(hiddenFromVahak.length, 0);
    const shown = filterArchivesForActor([visible], {
      guide: false,
      vahakPlaceCodes: ["nashik"],
    });
    assert.equal(shown.length, 1);
  });

  it("is मार्गदर्शक-only generate on the API path", () => {
    const route = readFileSync(
      new URL("../app/api/weekly/archive/route.ts", import.meta.url),
      "utf8",
    );
    assert.match(route, /requireGuideActor/);
    assert.match(route, /ack_read/);
    assert.match(route, /TODO|todo: true/);
    const weekly = readFileSync(new URL("../app/(app)/weekly/page.tsx", import.meta.url), "utf8");
    assert.match(weekly, /\/api\/weekly\/archive/);
    assert.match(weekly, /WEEKLY_ARCHIVE_HELP/);
    assert.match(weekly, /PLACE_TOPIC_PRIOR_SUMMARY_HELP/);
    assert.match(weekly, /action === "summary"|runArchive\("summary"/);
    assert.match(weekly, /kind: summaryKind/);
  });
});
