import type { Client } from "@libsql/client";

/**
 * Live VPS tables were UNIQUE(place_id, meeting_date) with no duty_kind —
 * those rows are विचार वाहक, never renamed to सत्संग चरणसेवक.
 * Rebuild adds duty_kind='vahak' and UNIQUE(place_id, meeting_date, duty_kind).
 */
export async function ensurePlaceDutiesDutyKind(db: Client) {
  const info = await db.execute("PRAGMA table_info(place_duties)");
  if (!info.rows.length) return;
  const hasKind = info.rows.some((c) => c.name === "duty_kind");
  const schema = await db.execute(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'place_duties'",
  );
  const createSql = String(schema.rows[0]?.sql || "");
  const hasTripleUnique =
    /UNIQUE\s*\(\s*place_id\s*,\s*meeting_date\s*,\s*duty_kind\s*\)/i.test(
      createSql,
    );
  if (hasKind && hasTripleUnique) return;

  await db.execute(`CREATE TABLE place_duties__kind (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id INTEGER NOT NULL REFERENCES places(id),
      meeting_date TEXT NOT NULL,
      duty_kind TEXT NOT NULL DEFAULT 'vahak' CHECK (duty_kind IN ('vahak', 'satsang_charansevak')),
      charansevak_phone TEXT NOT NULL,
      charansevak_name TEXT,
      assigned_by_phone TEXT,
      updated_at TEXT NOT NULL,
      UNIQUE (place_id, meeting_date, duty_kind)
    )`);
  if (hasKind) {
    await db.execute(`INSERT INTO place_duties__kind (
        id, place_id, meeting_date, duty_kind, charansevak_phone,
        charansevak_name, assigned_by_phone, updated_at
      ) SELECT id, place_id, meeting_date,
        CASE WHEN duty_kind IN ('vahak', 'satsang_charansevak') THEN duty_kind ELSE 'vahak' END,
        charansevak_phone, charansevak_name, assigned_by_phone, updated_at
      FROM place_duties`);
  } else {
    await db.execute(`INSERT INTO place_duties__kind (
        id, place_id, meeting_date, duty_kind, charansevak_phone,
        charansevak_name, assigned_by_phone, updated_at
      ) SELECT id, place_id, meeting_date, 'vahak',
        charansevak_phone, charansevak_name, assigned_by_phone, updated_at
      FROM place_duties`);
  }
  await db.execute("DROP TABLE place_duties");
  await db.execute("ALTER TABLE place_duties__kind RENAME TO place_duties");
  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_place_duties_date ON place_duties(meeting_date)",
  );
  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_place_duties_phone ON place_duties(charansevak_phone)",
  );
  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_place_duties_kind ON place_duties(duty_kind)",
  );
}
