-- Turso / libSQL (SQLite). Idempotent. Does not touch meetings or questions.
-- Product rules (encoded here, not in extra .md):
--   mobile unique; login_code unique; default login_code = last 4 of mobile;
--   on last-4 collision keep the first member's code and assign a random 6-digit
--   to the new row with login_code_collision = 1 (admin-visible).
-- Member rows live only in this table — never dump them into markdown.
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
