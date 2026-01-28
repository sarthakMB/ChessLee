/**
 * Application Logger (Pino)
 *
 * Structured JSON logging for production. Use this for:
 * - HTTP request/response logs (via pino-http)
 * - Errors that should appear in production logs
 * - Business events worth tracking
 *
 * NOT for: Development debugging (use debug.mjs instead)
 *
 * Log levels (in order of severity):
 *   trace < debug < info < warn < error < fatal
 *
 * Environment variable PINO controls output format:
 *   PINO=verbose  — pino-pretty with full details, request IDs
 *   PINO=compact  — pino-pretty minimal (default in dev)
 *   (unset in prod) — JSON output for log aggregators
 */

import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';
const pinoMode = process.env.PINO || (isDev ? 'compact' : undefined);

export { pinoMode };

// Base configuration
const config = {
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
};

// Configure pino-pretty for verbose/compact modes
if (pinoMode === 'verbose') {
  config.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  };
} else if (pinoMode === 'compact') {
  config.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname,reqId,responseTime',
      singleLine: true,
    },
  };
}
// Production (no PINO set): JSON output, no pino-pretty

const logger = pino(config);

export default logger;
