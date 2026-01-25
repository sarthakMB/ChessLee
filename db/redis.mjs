/**
 * Redis Client Singleton
 *
 * Creates and exports a single Redis client for the application.
 *
 * Why Redis for sessions?
 * - Speed: In-memory storage means fast reads/writes (microseconds vs milliseconds for disk)
 * - TTL: Built-in expiration - sessions automatically delete after 24h
 * - No DB load: Session checks don't hit PostgreSQL, keeping it free for real data
 * - Persistence: Unlike MemoryStore, sessions survive server restarts
 *
 * Redis is perfect for ephemeral data:
 * - Sessions (24h TTL)
 * - Active game cache (1h TTL)
 * - Join code lookups (1h TTL)
 *
 * Permanent data (users, games, moves) goes in PostgreSQL.
 */

import { createClient } from 'redis';
import { databaseConfig } from '../config/database.mjs';

// Create Redis client
const redisClient = createClient(databaseConfig.redis);

// Connection event handlers
redisClient.on('connect', () => {
  if (databaseConfig.isDevelopment) {
    console.log('Redis: Connecting...');
  }
});

redisClient.on('ready', () => {
  console.log('Redis: Connected and ready');
});

redisClient.on('error', (err) => {
  console.error('Redis: Error:', err.message);
});

redisClient.on('reconnecting', () => {
  console.log('Redis: Reconnecting...');
});

redisClient.on('end', () => {
  console.log('Redis: Connection closed');
});

// Connect to Redis
// Note: We await this in db/index.mjs to ensure connection before app starts
let connectionPromise = null;

export const connectRedis = async () => {
  if (!connectionPromise) {
    connectionPromise = redisClient.connect();
  }
  return connectionPromise;
};

// Graceful shutdown: close connection when app exits
const shutdown = async () => {
  console.log('Redis: Closing connection...');
  try {
    await redisClient.quit();
    console.log('Redis: Connection closed successfully');
  } catch (err) {
    console.error('Redis: Error closing connection:', err.message);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

/**
 * Helper functions for common Redis operations
 */

/**
 * Set a value with optional TTL (time-to-live in seconds)
 */
export const setWithTTL = async (key, value, ttl) => {
  if (ttl) {
    return redisClient.setEx(key, ttl, value);
  }
  return redisClient.set(key, value);
};

/**
 * Get a value by key
 */
export const get = (key) => redisClient.get(key);

/**
 * Delete a key
 */
export const del = (key) => redisClient.del(key);

/**
 * Check if key exists
 */
export const exists = (key) => redisClient.exists(key);

/**
 * Get remaining TTL for a key (in seconds)
 */
export const ttl = (key) => redisClient.ttl(key);

/**
 * Ping Redis (returns 'PONG' if connected)
 */
export const ping = () => redisClient.ping();

export default redisClient;
