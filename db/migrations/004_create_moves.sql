-- Moves table: complete move history for all games
--
-- Why log every move?
-- - Audit trail (who played what and when)
-- - Replay capability (recreate entire game from start)
-- - Analytics (opening analysis, endgame patterns, common mistakes)
-- - PGN export (Portable Game Notation for sharing games)
-- - Legal move validation (detect cheating or bugs)
--
-- Composite unique constraint (game_id, move_number):
-- - Ensures no duplicate move numbers within a game
-- - Move 1 is only recorded once per game, etc.
-- - Natural ordering for replay
--
-- ON DELETE CASCADE:
-- - When a game is deleted, all its moves are deleted automatically
-- - Prevents orphaned move records
-- - Simplifies cleanup logic

CREATE TABLE moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Game reference
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,

  -- Move details
  move_number INTEGER NOT NULL,
  player_color VARCHAR(5) NOT NULL CHECK (player_color IN ('white', 'black')),

  -- Move notation
  move_san VARCHAR(10) NOT NULL,  -- Standard Algebraic Notation (e.g., "Nf3", "exd5", "O-O")
  move_from VARCHAR(2) NOT NULL,  -- Source square (e.g., "e2")
  move_to VARCHAR(2) NOT NULL,    -- Destination square (e.g., "e4")

  -- Resulting position
  fen_after TEXT NOT NULL,

  -- Metadata
  time_taken_ms INTEGER,  -- Time spent on this move (for time controls)

  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Composite unique constraint
  UNIQUE (game_id, move_number)
);

-- Indexes for common queries
CREATE INDEX idx_moves_game_id ON moves(game_id);
CREATE INDEX idx_moves_game_move_number ON moves(game_id, move_number);

-- Index for analytics queries
CREATE INDEX idx_moves_player_color ON moves(player_color);
CREATE INDEX idx_moves_created_at ON moves(created_at);
