import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import homeRouter from './routes/home.mjs';
import loginRouter from './routes/login.mjs';
import registerRouter from './routes/register.mjs';
import gameRouter from './routes/game.mjs';

import requestLogger from '../utils/request_logger.mjs';
import { redisClient, initDatabases } from '../db/index.mjs';

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
      ttl: 86400                 // 24 hours in seconds
    })
  : undefined; // Falls back to MemoryStore when undefined

if (!sessionStore) {
  console.warn('WARNING: Using MemoryStore for sessions (not for production!)');
}

app.use(
  session({
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
  })
);


const ensureSubject = (req, res, next) => { // if no subject in session, create guest subject
  if (!req.session) {
    return res.status(500).json({ error: 'Session store unavailable' });
  }

  const subject = req.session.subject;
  if (
    subject &&
    typeof subject === 'object' &&
    typeof subject.id === 'string' &&
    typeof subject.type === 'string'
  ) {
    return next();
  }

  req.session.subject = { id: randomUUID(), type: 'guest' }; // initialize guest subject in session
  return next();
};

app.use('/', homeRouter);
app.use('/login', loginRouter);
app.use('/register', registerRouter);
app.use('/game', ensureSubject, gameRouter);

// Initialize databases before starting server
async function startServer() {
  try {
    // Only initialize if REDIS_URL is set
    if (process.env.REDIS_URL) {
      await initDatabases();
    }

    app.listen(port, () => {
      console.log(`Chess app listening on port1 ${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
