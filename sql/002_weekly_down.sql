-- Reverses 002_weekly.sql. Does not delete members or satsang records.
DROP INDEX IF EXISTS idx_weekly_answers_member;
DROP TABLE IF EXISTS weekly_answers;
DROP TABLE IF EXISTS weekly_questions;
