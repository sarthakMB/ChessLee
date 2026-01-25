/**
 * Database Configuration
 *
 * Centralized configuration for PostgreSQL and Redis connections.
 * Reads from environment variables and provides sensible defaults.
 */

export const databaseConfig = {
  // PostgreSQL Configuration
  postgres: {
    connectionString: process.env.DATABASE_URL || 'postgresql://chess_user:chess_password@localhost:5432/chess_dev',
    max: parseInt(process.env.PG_POOL_MAX || '20', 10), // Max connections in pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return error if connection takes longer than 2s
  },

  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    // Additional Redis options can be added here
    socket: {
      reconnectStrategy: (retries) => {
        // Exponential backoff: 50ms, 100ms, 200ms, etc., max 3000ms
        if (retries > 10) {
          console.error('Redis: Max reconnection attempts reached');
          return new Error('Max reconnection attempts reached');
        }
        return Math.min(retries * 50, 3000);
      }
    }
  },

  // Session Configuration
  session: {
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    ttl: 24 * 60 * 60, // 24 hours in seconds
    prefix: 'sess:', // Redis key prefix
  },

  // Environment
  isDevelopment: process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production',
};

// Validation: Warn if using default values in production
if (databaseConfig.isProduction) {
  if (databaseConfig.session.secret === 'dev-secret-change-in-production') {
    console.warn('WARNING: Using default SESSION_SECRET in production!');
  }
  if (databaseConfig.postgres.connectionString.includes('localhost')) {
    console.warn('WARNING: Using localhost database in production!');
  }
}
