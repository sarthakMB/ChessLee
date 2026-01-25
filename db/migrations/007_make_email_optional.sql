-- Make email optional in users table
--
-- Why drop NOT NULL from email?
-- - Simplifies registration: just username + password
-- - Email verification adds complexity without teaching value
-- - Can still collect email optionally for password reset later
-- - Keeps UNIQUE constraint (if provided, must be unique)
--
-- What this changes:
-- - email can now be NULL
-- - UNIQUE constraint still enforced (no duplicate emails if provided)
-- - Email format CHECK constraint still applies (if provided, must be valid)

ALTER TABLE users
  ALTER COLUMN email DROP NOT NULL;
