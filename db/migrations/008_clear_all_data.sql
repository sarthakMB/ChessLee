-- Migration: Clear all data before UUID to prefixed bigint conversion
--
-- This migration truncates all tables to prepare for the schema change
-- in migration 009. ALTER COLUMN TYPE on primary keys with foreign key
-- references is simpler with no existing data.

-- Truncate in reverse dependency order (children first, parents last)
TRUNCATE TABLE moves CASCADE;
TRUNCATE TABLE games CASCADE;
TRUNCATE TABLE guests CASCADE;
TRUNCATE TABLE users CASCADE;
