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
import pretty from 'pino-pretty';

const isDev = process.env.NODE_ENV !== 'production';
const pinoMode = process.env.PINO || (isDev ? 'compact' : undefined);

export { pinoMode };

let logger;

if (isDev) {
  // SYNC: pino-pretty as a stream (not worker thread)
  // Logs stay in order with debug() output
  const prettyStream = pretty({
    colorize: true,
    translateTime: 'HH:MM:ss',
    ignore: pinoMode === 'compact' ? 'pid,hostname,reqId,responseTime' : 'pid,hostname',
    singleLine: pinoMode === 'compact',
  });
  logger = pino({ level: process.env.LOG_LEVEL || 'debug' }, prettyStream);
} else {
  // PROD: JSON output for log aggregators (sync by default, high performance)
  logger = pino({ level: process.env.LOG_LEVEL || 'info' });
}

export default logger;
