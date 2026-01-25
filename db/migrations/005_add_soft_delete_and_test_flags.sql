-- Migration: Add soft delete and test data flags to core tables
-- Add to users table
ALTER TABLE users
  ADD COLUMN is_deleted BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN is_test BOOLEAN DEFAULT true NOT NULL;

ALTER TABLE users
  ALTER COLUMN is_deleted DROP DEFAULT,
  ALTER COLUMN is_test DROP DEFAULT;

-- Add to guests table
ALTER TABLE guests
  ADD COLUMN is_deleted BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN is_test BOOLEAN DEFAULT true NOT NULL;

ALTER TABLE guests
  ALTER COLUMN is_deleted DROP DEFAULT,
  ALTER COLUMN is_test DROP DEFAULT;

-- Add to games table
ALTER TABLE games
  ADD COLUMN is_deleted BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN is_test BOOLEAN DEFAULT true NOT NULL;

ALTER TABLE games
  ALTER COLUMN is_deleted DROP DEFAULT,
  ALTER COLUMN is_test DROP DEFAULT;

-- Add to moves table
ALTER TABLE moves
  ADD COLUMN is_deleted BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN is_test BOOLEAN DEFAULT true NOT NULL;

ALTER TABLE moves
  ALTER COLUMN is_deleted DROP DEFAULT,
  ALTER COLUMN is_test DROP DEFAULT;

-- Create indexes for soft delete queries (common filter: WHERE is_deleted = false)
CREATE INDEX idx_users_is_deleted ON users(is_deleted);
CREATE INDEX idx_guests_is_deleted ON guests(is_deleted);
CREATE INDEX idx_games_is_deleted ON games(is_deleted);
CREATE INDEX idx_moves_is_deleted ON moves(is_deleted);

-- Optional: Create composite indexes for test data cleanup
CREATE INDEX idx_users_is_test ON users(is_test) WHERE is_test = true;
CREATE INDEX idx_guests_is_test ON guests(is_test) WHERE is_test = true;
CREATE INDEX idx_games_is_test ON games(is_test) WHERE is_test = true;
CREATE INDEX idx_moves_is_test ON moves(is_test) WHERE is_test = true;
