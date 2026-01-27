-- Migration: Rename generic 'id' columns to entity-specific names
--
-- Changes:
-- - users.id → users.user_id
-- - guests.id → guests.guest_id
-- - games.id → games.game_id
--
-- PostgreSQL tracks FK references by column OID, not name.
-- Renaming a referenced column automatically updates FK constraints.

ALTER TABLE users RENAME COLUMN id TO user_id;
ALTER TABLE guests RENAME COLUMN id TO guest_id;
ALTER TABLE games RENAME COLUMN id TO game_id;
