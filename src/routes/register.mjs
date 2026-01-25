import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', '..', 'public');

router.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'register.html'));
});

router.post('/', (req, res) => {
  const { username, password } = req.body ?? {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  // TODO: replace with actual persistence logic.
  res.status(201).json({ message: `User ${username} registered` });
});

export default router;
