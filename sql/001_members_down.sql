-- Reverses 001_members.sql. Drops only member tables added by this migration.
DROP INDEX IF EXISTS idx_members_collision;
DROP INDEX IF EXISTS idx_members_place;
DROP TABLE IF EXISTS members;
