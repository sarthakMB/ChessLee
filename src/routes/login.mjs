import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authService } from '../services/index.mjs';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', '..', 'public');

router.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'login.html'));
});

router.post('/', async (req, res) => {
  const { username, password } = req.body ?? {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const result = await authService.login(username, password);

  if (!result.success) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Upgrade session from guest to authenticated user
  req.session.subject = {
    id: result.user.id,
    type: 'user',
  };

  res.json({ user: result.user });
});

export default router;
