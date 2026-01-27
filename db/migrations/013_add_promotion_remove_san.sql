-- Migration: Add promotion column and remove move_san from moves table
-- Date: 2026-01-28
--
-- Rationale:
-- - SAN notation is redundant (can be reconstructed from move_from, move_to, promotion)
-- - Promotion is needed to fully specify pawn promotions
-- - Reduces storage duplication

-- Add promotion column (nullable, only set for pawn promotions)
ALTER TABLE moves
ADD COLUMN promotion VARCHAR(1) CHECK (promotion IN ('q', 'r', 'b', 'n'));

-- Remove redundant SAN column
ALTER TABLE moves
DROP COLUMN move_san;
