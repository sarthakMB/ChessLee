/**
 * HTTP Request Logger (pino-http)
 *
 * Logs all HTTP requests with method, URL, status code, response time.
 * Static assets logged at 'trace' level (hidden by default).
 *
 * Output controlled by PINO env var (see logger.mjs):
 *   PINO=verbose  — Full details with request IDs
 *   PINO=compact  — Minimal single-line output (default in dev)
 */

import pinoHttp from 'pino-http';
import logger, { pinoMode } from './logger.mjs';

// File extensions to treat as static assets
const STATIC_EXTENSIONS = /\.(js|css|html|ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|map)$/i;

function isStaticAsset(url) {
  return STATIC_EXTENSIONS.test(url);
}

const requestLogger = pinoHttp({
  logger,

  // Custom log level based on status code and request type
  customLogLevel: (req, res, err) => {
    // Errors always at error level
    if (err || res.statusCode >= 500) return 'error';
    // Client errors at warn level
    if (res.statusCode >= 400) return 'warn';
    // Static assets at trace level (hidden unless LOG_LEVEL=trace)
    if (isStaticAsset(req.url)) return 'trace';
    // Normal requests at info level
    return 'info';
  },

  // Custom message format — include responseTime in message
  customSuccessMessage: (req, res, responseTime) => {
    return `${req.method} ${req.url} ${res.statusCode} ${Math.round(responseTime)}ms`;
  },

  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} ${res.statusCode} — ${err.message}`;
  },

  // Custom attributes to include in each log
  customProps: (req, res) => {
    const props = {};

    // Add subject from session if available
    if (req.session?.subject) {
      props.subjectId = req.session.subject.id;
      props.subjectType = req.session.subject.type;
    }

    // Add error info on failures (from res.locals if set by route)
    if (res.statusCode >= 400 && res.locals?.errorCode) {
      props.errorCode = res.locals.errorCode;
    }

    return props;
  },

  // Minimal serializers — info is already in the message
  serializers: {
    req: () => undefined,
    res: () => undefined,
    // Keep error info for debugging
    err: (err) => ({
      message: err.message,
      code: err.code,
    }),
  },

  // Only generate request ID in verbose mode
  genReqId: pinoMode === 'verbose'
    ? (req) => req.headers['x-request-id'] || crypto.randomUUID()
    : () => undefined,

  // Don't log request start, only completion
  quietReqLogger: true,
});

export default requestLogger;
