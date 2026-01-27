-- Drop is_deleted and is_test from moves table
-- Moves inherit lifecycle from their parent game (CASCADE on delete, soft delete via games.is_deleted)

DROP INDEX IF EXISTS idx_moves_is_deleted;
DROP INDEX IF EXISTS idx_moves_is_test;

ALTER TABLE moves DROP COLUMN is_deleted;
ALTER TABLE moves DROP COLUMN is_test;
