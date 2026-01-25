-- Users table: registered accounts
--
-- Why UUID for id?
-- - No sequential guessing (security)
-- - Distributed-friendly (can generate IDs in app layer without coordination)
-- - URL-safe identifiers (no easy enumeration of users)
--
-- Why separate password_hash column?
-- - NEVER store plaintext passwords
-- - Hash is stored; original password is never kept
-- - Bcrypt handles salting automatically

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- Add constraints
ALTER TABLE users ADD CONSTRAINT username_min_length CHECK (char_length(username) >= 3);
ALTER TABLE users ADD CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
