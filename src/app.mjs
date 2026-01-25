import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import session from 'express-session';
import homeRouter from './routes/home.mjs';
import loginRouter from './routes/login.mjs';
import registerRouter from './routes/register.mjs';
import gameRouter from './routes/game.mjs';

import requestLogger from '../utils/request_logger.mjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url); 
const __dirname = path.dirname(__filename); 

const app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
const port = process.env.PORT ?? 3000;
const sessionSecret = process.env.SESSION_SECRET ?? 'dev-secret';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(
  session({
    name: 'chess.sid',
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    }
  })
);
app.use(requestLogger);

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

app.listen(port, () => {
  console.log(`Chess app listening on port ${port}`);
});
