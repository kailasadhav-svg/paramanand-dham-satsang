-- Turso / libSQL (SQLite). Idempotent. Does not touch meetings or questions.
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL UNIQUE,
  place_code TEXT NOT NULL,
  login_code TEXT NOT NULL UNIQUE,
  login_code_collision INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_members_place ON members(place_code);
CREATE INDEX IF NOT EXISTS idx_members_collision ON members(login_code_collision);
