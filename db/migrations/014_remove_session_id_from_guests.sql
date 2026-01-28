-- Remove session_id from guests table
--
-- Why remove it?
-- - session_id is never used for lookups (guest_id is stored in session)
-- - Users table doesn't have session_id either - same pattern
-- - Adds coupling to session implementation without benefit
-- - guest_id is the only identifier needed

-- Drop the index first
DROP INDEX IF EXISTS idx_guests_session_id;

-- Drop the unique constraint
ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_session_id_key;

-- Drop the column
ALTER TABLE guests DROP COLUMN session_id;
