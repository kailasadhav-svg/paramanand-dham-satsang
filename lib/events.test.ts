import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  parseEventInput,
  parseImageUrl,
  parsePhotoInput,
  splitEventsByDate,
} from "./events.ts";

describe("parseEventInput", () => {
  it("accepts a full event and trims text", () => {
    const r = parseEventInput({
      title: "  गुरुपौर्णिमा सत्संग ",
      event_date: "2026-07-29",
      event_time: "20:00",
      location: " नाशिक ",
      description: "आरती व प्रवचन",
    });
    assert.ok(r.ok);
    assert.deepEqual(r.value, {
      title: "गुरुपौर्णिमा सत्संग",
      event_date: "2026-07-29",
      event_time: "20:00",
      location: "नाशिक",
      description: "आरती व प्रवचन",
    });
  });

  it("makes blank optional fields null", () => {
    const r = parseEventInput({ title: "सत्संग", event_date: "2026-01-01", event_time: "", location: "" });
    assert.ok(r.ok);
    assert.equal(r.value.event_time, null);
    assert.equal(r.value.location, null);
    assert.equal(r.value.description, null);
  });

  it("rejects missing title, bad date and bad time", () => {
    assert.equal(parseEventInput({ event_date: "2026-01-01" }).ok, false);
    assert.equal(parseEventInput({ title: "x", event_date: "01-01-2026" }).ok, false);
    assert.equal(parseEventInput({ title: "x", event_date: "2026-01-01", event_time: "8pm" }).ok, false);
    assert.equal(parseEventInput(null).ok, false);
  });
});

describe("parseImageUrl / parsePhotoInput", () => {
  it("keeps only absolute http(s) links", () => {
    assert.equal(parseImageUrl("https://example.com/a.jpg"), "https://example.com/a.jpg");
    assert.equal(parseImageUrl(" http://example.com/a b.jpg "), "http://example.com/a%20b.jpg");
    assert.equal(parseImageUrl("javascript:alert(1)"), null);
    assert.equal(parseImageUrl("data:image/png;base64,AAAA"), null);
    assert.equal(parseImageUrl("/relative.jpg"), null);
    assert.equal(parseImageUrl(""), null);
  });

  it("parses event_id from a form string and rejects garbage", () => {
    const ok = parsePhotoInput({ image_url: "https://x.in/p.jpg", caption: "", taken_on: "", event_id: "3" });
    assert.ok(ok.ok);
    assert.deepEqual(ok.value, {
      image_url: "https://x.in/p.jpg",
      caption: null,
      taken_on: null,
      event_id: 3,
    });
    assert.equal(parsePhotoInput({ image_url: "https://x.in/p.jpg", event_id: "abc" }).ok, false);
    assert.equal(parsePhotoInput({ image_url: "https://x.in/p.jpg", taken_on: "yesterday" }).ok, false);
    assert.equal(parsePhotoInput({ image_url: "ftp://x.in/p.jpg" }).ok, false);
  });
});

describe("splitEventsByDate", () => {
  const events = [
    { id: 1, event_date: "2026-10-30", event_time: null },
    { id: 2, event_date: "2026-11-05", event_time: "20:00" },
    { id: 3, event_date: "2026-10-31", event_time: "18:00" },
    { id: 4, event_date: "2026-10-31", event_time: "08:00" },
    { id: 5, event_date: "2026-01-01", event_time: null },
  ];

  it("counts today as upcoming, soonest first; past most-recent first", () => {
    const { upcoming, past } = splitEventsByDate(events, "2026-10-31");
    assert.deepEqual(upcoming.map((e) => e.id), [4, 3, 2]);
    assert.deepEqual(past.map((e) => e.id), [1, 5]);
  });
});

describe("header navigation wiring", () => {
  it("links कार्यक्रम and फोटो from the app header", () => {
    const header = readFileSync(
      new URL("../components/AppHeader.tsx", import.meta.url),
      "utf8",
    );
    assert.match(header, /href="\/events"/);
    assert.match(header, /href="\/photos"/);
  });
});
