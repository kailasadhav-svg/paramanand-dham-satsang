-- Weekly question (one per Thursday week) + one ANS per member.
CREATE TABLE IF NOT EXISTS weekly_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start TEXT NOT NULL UNIQUE,
  question TEXT NOT NULL,
  source TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS weekly_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  weekly_question_id INTEGER NOT NULL REFERENCES weekly_questions(id),
  member_id INTEGER NOT NULL REFERENCES members(id),
  answer TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (weekly_question_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_weekly_answers_member ON weekly_answers(member_id);
