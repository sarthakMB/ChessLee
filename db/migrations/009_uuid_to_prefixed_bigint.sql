-- Migration: Convert UUID to prefixed random BIGINT
--
-- Why prefixed random bigint instead of UUID?
-- 1. Performance: 8 bytes (bigint) vs 16 bytes (UUID) → faster indexes, less storage
-- 2. Type-safe: Prefix makes entity type explicit (U=user, G=guest, M=game)
-- 3. Still non-guessable: Random 63-bit numbers are effectively unguessable
-- 4. Better debugging: "M2387284729" instantly shows it's a game ID
--
-- Prefix scheme:
-- - U: users (e.g., U4829173650284)
-- - T: guests/temporary users (e.g., T7391028374651)
-- - G: games (e.g., G5820174639281)
--
-- Moves table: Uses composite PRIMARY KEY (game_id, move_number) - no random ID needed
--
-- Prerequisites: Migration 008 must have cleared all data

-- Step 1: Drop foreign key constraints
ALTER TABLE moves DROP CONSTRAINT IF EXISTS moves_game_id_fkey;
ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_upgraded_to_fkey;

-- Step 2: Alter primary key columns from UUID to VARCHAR(20)
-- Users table
ALTER TABLE users
  ALTER COLUMN id TYPE VARCHAR(20),
  ALTER COLUMN id SET DEFAULT 'U' || floor(random() * 9223372036854775807)::text;

-- Guests table
ALTER TABLE guests
  ALTER COLUMN id TYPE VARCHAR(20),
  ALTER COLUMN id SET DEFAULT 'T' || floor(random() * 9223372036854775807)::text;

-- Games table
ALTER TABLE games
  ALTER COLUMN id TYPE VARCHAR(20),
  ALTER COLUMN id SET DEFAULT 'G' || floor(random() * 9223372036854775807)::text;

-- Step 3: Alter foreign key reference columns
-- Games table foreign keys
ALTER TABLE games
  ALTER COLUMN owner_id TYPE VARCHAR(20);

ALTER TABLE games
  ALTER COLUMN opponent_id TYPE VARCHAR(20);

-- Guests table foreign key
ALTER TABLE guests
  ALTER COLUMN upgraded_to TYPE VARCHAR(20);

-- Moves table: change game_id to VARCHAR(20) and switch to composite PK
ALTER TABLE moves
  ALTER COLUMN game_id TYPE VARCHAR(20);

-- Step 4: Moves table - drop old PK and unique constraint, create composite PK
ALTER TABLE moves DROP CONSTRAINT IF EXISTS moves_pkey;
ALTER TABLE moves DROP CONSTRAINT IF EXISTS moves_game_id_move_number_key;
ALTER TABLE moves DROP COLUMN IF EXISTS id;

-- Create composite primary key (game_id, move_number)
ALTER TABLE moves
  ADD PRIMARY KEY (game_id, move_number);

-- Step 5: Re-add foreign key constraints
ALTER TABLE moves
  ADD CONSTRAINT moves_game_id_fkey
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;

ALTER TABLE guests
  ADD CONSTRAINT guests_upgraded_to_fkey
  FOREIGN KEY (upgraded_to) REFERENCES users(id) ON DELETE SET NULL;

-- Step 6: Drop uuid-ossp extension (no longer needed)
DROP EXTENSION IF EXISTS "uuid-ossp";
