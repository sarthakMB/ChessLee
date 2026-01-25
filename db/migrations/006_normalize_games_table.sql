-- Normalize games table: Remove redundant/derivable columns
--
-- Philosophy: The moves table is the source of truth for game state.
-- Everything else should be metadata about the game, not the current position.
--
-- Removed columns and why they're derivable:
-- 1. current_fen: Derive from last move's fen_after in moves table
-- 2. current_turn: Derive from chess.js after loading FEN
-- 3. status: Derive from game state
--    - waiting: opponent_id IS NULL
--    - active: opponent_id IS NOT NULL AND chess.isGameOver() = false
--    - completed: chess.isGameOver() = true
-- 4. winner: Derive from chess.js (isCheckmate, isDraw, etc.)
-- 5. completed_at: Can derive from last move's played_at if game is over
--
-- What we keep:
-- - Game metadata (mode, owner, opponent, colors, join_code)


-- First, drop constraints that depend on columns we're removing
ALTER TABLE games DROP CONSTRAINT IF EXISTS check_completed_has_winner;

-- Drop the redundant columns
ALTER TABLE games DROP COLUMN IF EXISTS current_fen;
ALTER TABLE games DROP COLUMN IF EXISTS current_turn;
ALTER TABLE games DROP COLUMN IF EXISTS status;
ALTER TABLE games DROP COLUMN IF EXISTS winner;
ALTER TABLE games DROP COLUMN IF EXISTS completed_at;

-- Drop indexes that referenced removed columns
DROP INDEX IF EXISTS idx_games_status;
DROP INDEX IF EXISTS idx_games_active_player;

-- Add index for finding games waiting for opponent (friend mode)
CREATE INDEX idx_games_waiting ON games(mode, join_code)
  WHERE opponent_id IS NULL;

-- Composite index for user's active games (has opponent, not deleted)
CREATE INDEX idx_games_user_active ON games(owner_id)
  WHERE opponent_id IS NOT NULL AND is_deleted = false;
