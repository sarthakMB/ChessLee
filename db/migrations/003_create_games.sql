-- Games table: chess game state and metadata
--
-- CHECK constraints enforce valid values:
-- - mode: only 'computer' or 'friend'
-- - status: waiting, active, completed, abandoned
-- - owner_type/opponent_type: 'user' or 'guest'
-- - colors: 'white', 'black', or 'random'
--
-- Why store FEN?
-- - FEN (Forsyth-Edwards Notation) is chess position notation
-- - chess.js can reconstruct ENTIRE game state from FEN
-- - No need to store board array, pieces, etc. - FEN has it all
-- - Standard format, human-readable, compact
--
-- JSONB metadata column:
-- - Flexible storage for future needs
-- - Can add time controls, ELO ratings, game analysis without schema changes
-- - Indexed automatically for fast queries
-- - PostgreSQL specific, but worth it

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Game configuration
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('computer', 'friend')),
  status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'abandoned')),

  -- Owner (player who created the game)
  owner_id UUID NOT NULL,
  owner_type VARCHAR(10) NOT NULL CHECK (owner_type IN ('user', 'guest')),
  owner_color VARCHAR(10) NOT NULL CHECK (owner_color IN ('white', 'black', 'random')),

  -- Opponent (second player or computer)
  opponent_id UUID,
  opponent_type VARCHAR(10) CHECK (opponent_type IN ('user', 'guest', 'computer')),
  opponent_color VARCHAR(10) CHECK (opponent_color IN ('white', 'black')),

  -- Friend game join code
  join_code VARCHAR(8) UNIQUE,

  -- Current game state
  current_fen TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  current_turn VARCHAR(5) NOT NULL DEFAULT 'white' CHECK (current_turn IN ('white', 'black')),

  -- Game result
  winner VARCHAR(5) CHECK (winner IN ('white', 'black', 'draw')),

  -- Flexible metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX idx_games_owner_id ON games(owner_id);
CREATE INDEX idx_games_join_code ON games(join_code) WHERE join_code IS NOT NULL;
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_mode ON games(mode);

-- Composite index for finding active games by player
CREATE INDEX idx_games_active_player ON games(owner_id, status) WHERE status IN ('waiting', 'active');

-- JSONB index for metadata queries (if needed later)
CREATE INDEX idx_games_metadata ON games USING GIN (metadata);

-- Constraints
ALTER TABLE games ADD CONSTRAINT check_friend_game_has_join_code
  CHECK (mode != 'friend' OR join_code IS NOT NULL);

ALTER TABLE games ADD CONSTRAINT check_computer_opponent
  CHECK (mode != 'computer' OR opponent_type = 'computer');

ALTER TABLE games ADD CONSTRAINT check_completed_has_winner
  CHECK (status != 'completed' OR winner IS NOT NULL);
