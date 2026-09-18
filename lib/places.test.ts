import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createClient } from "@libsql/client";
import { renameAmbashiToShindi } from "./place-rename.ts";
import {
  PLACE_OPTIONS,
  canonicalizePlaceCode,
  isPlaceCode,
  parsePlaceInput,
  placeCodeFromDbName,
  placeLabel,
  placeName,
} from "./places.ts";

describe("PLACE_OPTIONS", () => {
  it("lists शिंदी under code shindi, not अंबाशी / ambashi", () => {
    const codes = PLACE_OPTIONS.map((p) => p.code);
    const labels = PLACE_OPTIONS.map((p) => p.label);
    assert.ok(codes.includes("shindi"));
    assert.ok(!codes.includes("ambashi"));
    assert.ok(labels.includes("शिंदी"));
    assert.ok(!labels.includes("अंबाशी"));
    const shindi = PLACE_OPTIONS.find((p) => p.code === "shindi");
    assert.equal(shindi?.label, "शिंदी");
    assert.equal(shindi?.name, "शिंदी");
  });
});

describe("place codes", () => {
  it("treats shindi as a place code and ambashi as a legacy alias", () => {
    assert.equal(isPlaceCode("shindi"), true);
    assert.equal(isPlaceCode("ambashi"), false);
    assert.equal(canonicalizePlaceCode("shindi"), "shindi");
    assert.equal(canonicalizePlaceCode("ambashi"), "shindi");
    assert.equal(placeLabel("shindi"), "शिंदी");
    assert.equal(placeLabel("ambashi"), "शिंदी");
    assert.equal(placeName("shindi"), "शिंदी");
  });

  it("parses शिंदी / shindi and still accepts अंबाशी / ambashi", () => {
    assert.equal(parsePlaceInput("शिंदी"), "shindi");
    assert.equal(parsePlaceInput("shindi"), "shindi");
    assert.equal(parsePlaceInput("अंबाशी"), "shindi");
    assert.equal(parsePlaceInput("ambashi"), "shindi");
  });

  it("maps DB place names onto member place codes for विचार वाहक roster", () => {
    assert.equal(placeCodeFromDbName("नाशिक"), "nashik");
    assert.equal(placeCodeFromDbName("शिंदी"), "shindi");
    assert.equal(placeCodeFromDbName("श्री क्षेत्र रानअंत्री"), "ranantri");
    assert.equal(placeCodeFromDbName("वरखेड"), "varkhed");
    assert.equal(placeCodeFromDbName("बरटाळा"), "bartala");
  });
});

describe("renameAmbashiToShindi", () => {
  it("renames the place row and member place_code without changing place id", async () => {
    const db = createClient({ url: ":memory:" });
    await db.execute(
      "CREATE TABLE places (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, sort_order INTEGER NOT NULL)",
    );
    await db.execute(
      `CREATE TABLE members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        mobile TEXT NOT NULL UNIQUE,
        place_code TEXT NOT NULL,
        login_code TEXT NOT NULL UNIQUE,
        login_code_collision INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )`,
    );
    await db.execute({
      sql: "INSERT INTO places (name, sort_order) VALUES (?, ?)",
      args: ["अंबाशी", 4],
    });
    await db.execute({
      sql: "INSERT INTO members (name, mobile, place_code, login_code, login_code_collision, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: ["कमल", "9876511122", "ambashi", "1122", 0, "2026-01-01T00:00:00.000Z"],
    });

    const before = await db.execute("SELECT id FROM places WHERE name = 'अंबाशी'");
    const placeId = Number(before.rows[0]?.id);
    await renameAmbashiToShindi(db);

    const places = await db.execute("SELECT id, name FROM places ORDER BY id");
    assert.equal(places.rows.length, 1);
    assert.equal(Number(places.rows[0]?.id), placeId);
    assert.equal(places.rows[0]?.name, "शिंदी");

    const members = await db.execute("SELECT place_code FROM members");
    assert.equal(members.rows[0]?.place_code, "shindi");
  });
});
