import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import dotenv from 'dotenv';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import homeRouter from './routes/home.mjs';
import loginRouter from './routes/login.mjs';
import registerRouter from './routes/register.mjs';
import gameRouter from './routes/game.mjs';
import { setupWebSocket } from './ws/index.mjs';

import requestLogger from '../utils/request_logger.mjs';
import logger from '../utils/logger.mjs';
import { middlewareDBG } from '../utils/debug.mjs';
import { redisClient, initDatabases } from '../db/index.mjs';
import { guestRepository } from './repositories/index.mjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
const port = process.env.PORT ?? 3000;
const sessionSecret = process.env.SESSION_SECRET ?? 'dev-secret';

app.use(requestLogger);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Configure session store (Redis in production, MemoryStore for tests)
const sessionStore = process.env.REDIS_URL
  ? new RedisStore({ 
      client: redisClient,
      prefix: 'sess:',           // Keys stored as sess:abc123
      ttl: 86400 * 30               // 24 hours * 30 in seconds
    })
  : undefined; // Falls back to MemoryStore when undefined

if (!sessionStore) {
  logger.warn('Using MemoryStore for sessions (not for production!)');
}

// Session middleware - extracted to variable so it can be shared with Socket.IO
const sessionMiddleware = session({
  name: 'chess.sid',
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
});

app.use(sessionMiddleware);


const ensureSubject = async (req, res, next) => {
  if (!req.session) {
    logger.error('Session store unavailable');
    return res.status(500).json({ error: 'Session store unavailable' });
  }

  const subject = req.session.subject;
  if (subject && subject.id) {
    middlewareDBG('Subject exists: %s (%s)', subject.id, subject.type);
    if(!subject.type) logger.warn('Subject type missing for subject %s', subject.id);
    return next();
  }

  // Insert guest into DB — DB generates T-prefixed ID
  middlewareDBG('Creating new guest for session %s', req.sessionID);
  const result = await guestRepository.insertGuest({
    is_deleted: false,
    is_test: false
  });

  if (!result.success) {
    logger.error({ error: result.error, sessionId: req.sessionID }, 'Failed to create guest');
    return res.status(500).json({ error: 'Failed to create guest' });
  }

  middlewareDBG('Guest created: %s', result.data.guest_id);
  req.session.subject = { id: result.data.guest_id, type: 'guest' };
  return next();
};

app.use('/', homeRouter);
app.use('/login', loginRouter);
app.use('/register', registerRouter);
app.use('/game', ensureSubject, gameRouter);

// Wrap Express in HTTP server so Socket.IO can share it
// (app.listen() secretly creates an HTTP server; we make it explicit)
const server = createServer(app);

// Attach Socket.IO to the HTTP server
// Session middleware is shared so socket connections have access to session data
setupWebSocket(server, sessionMiddleware);

// Initialize databases before starting server
async function startServer() {
  try {
    // Only initialize if REDIS_URL is set
    if (process.env.REDIS_URL) {
      await initDatabases();
    }

    server.listen(port, () => {
      logger.info({ port }, 'Chess app listening');
    });
  } catch (err) {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();
