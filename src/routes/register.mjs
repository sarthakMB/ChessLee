import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authService } from '../services/index.mjs';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', '..', 'public');

router.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'register.html'));
});

router.post('/', async (req, res) => {
  const { username, password, email } = req.body ?? {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const result = await authService.register(username, password, email || null);

  if (!result.success) {
    // Map error codes to HTTP responses
    const errorMap = {
      USERNAME_TAKEN: { status: 409, message: 'Username already taken' },
      EMAIL_TAKEN: { status: 409, message: 'Email already in use' },
    };

    const errorInfo = errorMap[result.error] || { status: 400, message: result.error };
    return res.status(errorInfo.status).json({ error: errorInfo.message });
  }

  // Set session to authenticated user
  req.session.subject = {
    id: result.user.id,
    type: 'user',
  };

  res.status(201).json({ user: result.user });
});

export default router;
