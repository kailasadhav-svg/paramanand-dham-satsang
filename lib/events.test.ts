import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  MAX_THUMB_BYTES,
  MAX_UPLOAD_BYTES,
  parseEventInput,
  parseImageUrl,
  parsePhotoInput,
  parsePhotoMeta,
  sniffImageMime,
  splitEventsByDate,
  validateUploadBytes,
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

describe("parsePhotoMeta (multipart form fields)", () => {
  it("accepts strings from FormData and treats a File-like event_id as invalid", () => {
    const ok = parsePhotoMeta({ caption: " आरती ", taken_on: "2026-10-22", event_id: "7" });
    assert.ok(ok.ok);
    assert.deepEqual(ok.value, { caption: "आरती", taken_on: "2026-10-22", event_id: 7 });
    const empty = parsePhotoMeta({ caption: null, taken_on: null, event_id: null });
    assert.ok(empty.ok);
    assert.deepEqual(empty.value, { caption: null, taken_on: null, event_id: null });
    assert.equal(parsePhotoMeta({ event_id: { name: "x.jpg" } }).ok, false);
  });
});

describe("sniffImageMime / validateUploadBytes", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  const webp = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56,
  ]);

  it("recognises JPEG, PNG and WebP by magic bytes only", () => {
    assert.equal(sniffImageMime(jpeg), "image/jpeg");
    assert.equal(sniffImageMime(png), "image/png");
    assert.equal(sniffImageMime(webp), "image/webp");
    assert.equal(sniffImageMime(new TextEncoder().encode("<svg xmlns=…>")), null);
    assert.equal(sniffImageMime(new TextEncoder().encode("GIF89a")), null);
    assert.equal(sniffImageMime(new Uint8Array(0)), null);
  });

  it("rejects empty, oversized and non-image uploads", () => {
    assert.equal(validateUploadBytes(new Uint8Array(0), MAX_UPLOAD_BYTES, "x").ok, false);
    assert.equal(validateUploadBytes(new TextEncoder().encode("hello"), MAX_UPLOAD_BYTES, "x").ok, false);
    const big = new Uint8Array(MAX_THUMB_BYTES + 1);
    big.set(jpeg);
    assert.equal(validateUploadBytes(big, MAX_THUMB_BYTES, "x").ok, false);
    const fine = validateUploadBytes(jpeg, MAX_THUMB_BYTES, "x");
    assert.ok(fine.ok);
    assert.equal(fine.value, "image/jpeg");
    assert.ok(MAX_THUMB_BYTES < MAX_UPLOAD_BYTES);
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
