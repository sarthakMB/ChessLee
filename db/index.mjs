/**
 * Database Module - Unified Exports
 *
 * Single entry point for all database connections.
 *
 * Usage:
 *   import { pool, query, redisClient } from '../db/index.mjs';
 *
 * This centralizes:
 * - PostgreSQL connection pool
 * - Redis client
 * - Helper functions for both
 *
 * Why a single export file?
 * - Consistent imports across the codebase
 * - Easy to swap implementations (e.g., mock for testing)
 * - Clear separation of concerns (repositories import from here, not directly from pg/redis)
 */

// PostgreSQL exports
export { default as pool, query, getClient, getPoolStats } from './pool.mjs';

// Redis exports
export {
  default as redisClient,
  connectRedis,
  setWithTTL,
  get,
  del,
  exists,
  ttl,
  ping,
} from './redis.mjs';

/**
 * Initialize all database connections.
 *
 * Call this before starting the Express server:
 *   await initDatabases();
 *   app.listen(PORT);
 *
 * This ensures:
 * - Redis is connected before session middleware needs it
 * - PostgreSQL pool is ready before repositories try to query
 * - Any connection errors are caught early (fail fast)
 */
export async function initDatabases() {
  console.log('Initializing database connections...');

  try {
    // Connect to Redis
    const { connectRedis } = await import('./redis.mjs');
    await connectRedis();

    // Test PostgreSQL connection
    const { query } = await import('./pool.mjs');
    const result = await query('SELECT NOW() as current_time');
    console.log(`PostgreSQL: Connected successfully (${result.rows[0].current_time})`);

    console.log('All database connections ready');
  } catch (err) {
    console.error('Database initialization failed:', err);
    throw err; // Fail fast - don't start the app if DB is down
  }
}
