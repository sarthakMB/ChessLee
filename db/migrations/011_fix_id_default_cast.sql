-- Migration: Fix ID default value casting
--
-- floor(random() * N)::text can produce scientific notation for large doubles.
-- Fix: cast through BIGINT first to get a plain integer string.
-- Also increase VARCHAR to 21 to safely hold prefix + up to 19 digits.

-- Fix column sizes
ALTER TABLE users ALTER COLUMN user_id TYPE VARCHAR(21);
ALTER TABLE guests ALTER COLUMN guest_id TYPE VARCHAR(21);
ALTER TABLE games ALTER COLUMN game_id TYPE VARCHAR(21);
ALTER TABLE games ALTER COLUMN owner_id TYPE VARCHAR(21);
ALTER TABLE games ALTER COLUMN opponent_id TYPE VARCHAR(21);
ALTER TABLE guests ALTER COLUMN upgraded_to TYPE VARCHAR(21);
ALTER TABLE moves ALTER COLUMN game_id TYPE VARCHAR(21);

-- Fix default values: cast through BIGINT to avoid scientific notation
ALTER TABLE users ALTER COLUMN user_id SET DEFAULT 'U' || floor(random() * 9223372036854775807)::bigint::text;
ALTER TABLE guests ALTER COLUMN guest_id SET DEFAULT 'T' || floor(random() * 9223372036854775807)::bigint::text;
ALTER TABLE games ALTER COLUMN game_id SET DEFAULT 'G' || floor(random() * 9223372036854775807)::bigint::text;
