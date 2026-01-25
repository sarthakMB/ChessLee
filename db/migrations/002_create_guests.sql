-- Guests table: anonymous/temporary players
--
-- Why track guests?
-- - Game ownership (who created the game?)
-- - Smooth UX (play without registration)
-- - Upgrade flow (convert guest to user when they register)
-- - Analytics (track guest vs registered user behavior)
--
-- upgraded_to FK:
-- - Links guest to user when they register
-- - Preserves game history across upgrade
-- - NULL means guest hasn't registered yet

CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  upgraded_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_guests_session_id ON guests(session_id);
CREATE INDEX idx_guests_upgraded_to ON guests(upgraded_to);
