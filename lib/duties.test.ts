import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { createClient } from "@libsql/client";
import {
  asDutyKind,
  DUTY_KIND_SATSANG,
  DUTY_KIND_VAHAK,
} from "./duty-kind.ts";
import { ensurePlaceDutiesDutyKind } from "./place-duties-migrate.ts";
import { canAppointSatsangCharansevak, canAppointVahak } from "./roles.ts";
import { SATSANG_CHARANSEVAK_LABEL } from "./labels.ts";

describe("duty kinds", () => {
  it("keeps विचार वाहक as default and सत्संग चरणसेवक as a sibling kind", () => {
    assert.equal(asDutyKind(null), DUTY_KIND_VAHAK);
    assert.equal(asDutyKind(""), DUTY_KIND_VAHAK);
    assert.equal(asDutyKind("vahak"), DUTY_KIND_VAHAK);
    assert.equal(asDutyKind("satsang_charansevak"), DUTY_KIND_SATSANG);
    assert.equal(asDutyKind("other"), null);
    const kinds = readFileSync(new URL("./duty-kind.ts", import.meta.url), "utf8");
    assert.match(kinds, /export const DUTY_KIND_VAHAK = "vahak"/);
    assert.match(kinds, /export const DUTY_KIND_SATSANG = "satsang_charansevak"/);
    const db = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    assert.match(db, /ensurePlaceDutiesDutyKind/);
    const migrate = readFileSync(
      new URL("./place-duties-migrate.ts", import.meta.url),
      "utf8",
    );
    assert.match(migrate, /duty_kind='vahak'/);
    assert.match(migrate, /UNIQUE \(place_id, meeting_date, duty_kind\)/);
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

  it("migrates live VPS rows as vahak and allows a sibling सत्संग चरणसेवक", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "satsang-duty-"));
    const db = createClient({ url: `file:${path.join(dir, "t.db")}` });
    await db.execute(
      "CREATE TABLE places (id INTEGER PRIMARY KEY, name TEXT NOT NULL)",
    );
    await db.execute("INSERT INTO places (id, name) VALUES (1, 'नाशिक')");
    await db.execute(`CREATE TABLE place_duties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id INTEGER NOT NULL REFERENCES places(id),
      meeting_date TEXT NOT NULL,
      charansevak_phone TEXT NOT NULL,
      charansevak_name TEXT,
      assigned_by_phone TEXT,
      updated_at TEXT NOT NULL,
      UNIQUE (place_id, meeting_date)
    )`);
    await db.execute({
      sql: `INSERT INTO place_duties (
        place_id, meeting_date, charansevak_phone, charansevak_name,
        assigned_by_phone, updated_at
      ) VALUES (1, '2026-09-17', '919850120960', 'राम', 'guide', 't')`,
    });
    await ensurePlaceDutiesDutyKind(db);
    await ensurePlaceDutiesDutyKind(db);
    const after = await db.execute(
      "SELECT duty_kind, charansevak_name FROM place_duties",
    );
    assert.equal(after.rows.length, 1);
    assert.equal(after.rows[0].duty_kind, "vahak");
    assert.equal(after.rows[0].charansevak_name, "राम");
    await db.execute({
      sql: `INSERT INTO place_duties (
        place_id, meeting_date, duty_kind, charansevak_phone, charansevak_name,
        assigned_by_phone, updated_at
      ) VALUES (1, '2026-09-17', 'satsang_charansevak', '919225118811', 'कैलास', 'guide', 't')`,
    });
    const both = await db.execute(
      "SELECT duty_kind FROM place_duties ORDER BY duty_kind",
    );
    assert.equal(both.rows.length, 2);
    assert.equal(both.rows[0].duty_kind, "satsang_charansevak");
    assert.equal(both.rows[1].duty_kind, "vahak");
    db.close();
  });
});
