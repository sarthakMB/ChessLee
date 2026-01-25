/**
 * PostgreSQL Connection Pool
 *
 * Creates and exports a connection pool for PostgreSQL.
 *
 * Why use a pool?
 * - Connection reuse: Creating connections is expensive (TCP handshake, auth, etc.)
 * - Limits: Prevents overwhelming the database with too many connections
 * - Performance: Queries start immediately if a connection is available
 *
 * The pool manages connections automatically:
 * - When you query, it checks out a connection
 * - After the query, it returns the connection to the pool
 * - Idle connections are closed after 30s
 * - The pool maintains 0-20 connections based on demand
 */

import pg from 'pg';
import { databaseConfig } from '../config/database.mjs';

const { Pool } = pg;

// Create the connection pool
const pool = new Pool(databaseConfig.postgres);

// Log connection events (helpful for debugging)
pool.on('connect', () => {
  if (databaseConfig.isDevelopment) {
    console.log('PostgreSQL: New client connected to pool');
  }
});

pool.on('error', (err, client) => {
  console.error('PostgreSQL: Unexpected error on idle client', err);
});

pool.on('remove', () => {
  if (databaseConfig.isDevelopment) {
    console.log('PostgreSQL: Client removed from pool');
  }
});

// Graceful shutdown: close all connections when app exits
const shutdown = async () => {
  console.log('PostgreSQL: Closing connection pool...');
  try {
    await pool.end();
    console.log('PostgreSQL: Pool closed successfully');
  } catch (err) {
    console.error('PostgreSQL: Error closing pool', err);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

/**
 * Execute a query using the pool.
 *
 * Example:
 *   const result = await query('SELECT NOW()');
 *   const users = await query('SELECT * FROM users WHERE id = $1', [userId]);
 *
 * The pool automatically:
 * 1. Checks out an available connection
 * 2. Runs the query
 * 3. Returns the connection to the pool
 * 4. Throws error if connection fails
 */
export const query = (text, params) => pool.query(text, params);

/**
 * Get a client from the pool for transactions.
 *
 * IMPORTANT: You MUST call client.release() when done!
 *
 * Example:
 *   const client = await getClient();
 *   try {
 *     await client.query('BEGIN');
 *     await client.query('INSERT INTO users...');
 *     await client.query('INSERT INTO games...');
 *     await client.query('COMMIT');
 *   } catch (err) {
 *     await client.query('ROLLBACK');
 *     throw err;
 *   } finally {
 *     client.release(); // CRITICAL: Always release!
 *   }
 */
export const getClient = () => pool.connect();

/**
 * Get pool statistics (for monitoring/debugging).
 *
 * Returns:
 *   - totalCount: Total clients in the pool
 *   - idleCount: Clients available for queries
 *   - waitingCount: Queries waiting for a connection
 */
export const getPoolStats = () => ({
  totalCount: pool.totalCount,
  idleCount: pool.idleCount,
  waitingCount: pool.waitingCount,
});

export default pool;
