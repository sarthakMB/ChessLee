import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { gameStore } from '../game/store.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const publicPath = path.join(__dirname, '../..', 'public');
const gameFile = path.join(publicPath, 'game.html');
const sendGameFile = (_req, res) => res.sendFile(gameFile);
const renderError = (res, { status = 404, message = 'Something went wrong.' } = {}) =>
  res.status(status).render('error', { message });

function sessionGameAuthCheck(req, res, next) {
  if (!req.session) {
    return res.status(500).json({ error: 'Session store unavailable' });
  }
  console.log('session', req.session);
  const { id } = req.params;
  if (req.session.game !== id) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  const manager = gameStore.getGame(id);
  if (!manager) {
    return res.status(404).json({ error: 'Game not in store' });
  }

  //check if player has currect turn
  if (manager.turn() !== req.session.game.player.color) { //TODO: fix this
    return res.status(403).json({ error: 'Not your turn' });
  }

  req.manager = manager;
  next();
}

const handleRedirect = (req, res, location) => {
  if (req.get('HX-Request')) {
    res.set('HX-Redirect', location);
    return res.status(204).end();
  }
  return res.redirect(303, location);
};

router.get('/sandbox', sendGameFile);

router.post('/computer', (req, res) => {
  if (!req.session) {
    return res.status(500).json({ error: 'Session store unavailable' });
  }
  const subjectId = req.session.subject?.id;
  if (!subjectId) {
    return res.status(500).json({ error: 'Session subject unavailable' });
  }
  //Color of player sent in json
  const ownerColor = req.body.color;

  const gameId = randomUUID();
  const manager = gameStore.createGame({
    id: gameId,
    mode: 'computer',
    difficulty: 1200,
    ownerId: subjectId,
    ownerColor: ownerColor,
    opponentId: 'computer',
    metadata: { engine: true },
    createdAt: Date.now()
  });

  req.session.game = manager.id;

  return handleRedirect(req, res, `/game/${gameId}`);
});

router.post('/friend', (req, res) => {
  if (!req.session) {
    return res.status(500).json({ error: 'Session store unavailable' });
  }
  const subjectId = req.session.subject?.id;
  if (!subjectId) {
    return res.status(500).json({ error: 'Session subject unavailable' });
  }
  //Color of player sent in json
  const ownerColor = req.body.color;

  const gameId = randomUUID();
  const joinCode = randomUUID().split('-')[0].toUpperCase();
  const manager = gameStore.createGame({
    id: gameId,
    mode: 'friend',
    ownerId: subjectId,
    ownerColor: ownerColor,
    joinCode,
    createdAt: Date.now()
  });

  req.session.game = manager.id;

  if (req.get('HX-Request')) {
    return res.send(
      `<div class="rounded-md border border-zinc-700 bg-zinc-900/60 px-4 py-3 text-sm text-gray-200">
        Share this code with your friend:
        <span class="font-mono tracking-wide text-lime-300">${joinCode}</span>
      </div>`
    );
  }

  return res.json({ joinCode, gameId, inviteUrl: `/game/${gameId}` });
});

router.get('/:id', (req, res) => {
  const { id } = req.params;
  const manager = gameStore.getGame(id);

  if (req.session?.game && req.session.game === id && manager) {
    return sendGameFile(req, res);
  }

  return renderError(res);
});

router.post('/:id/move', sessionGameAuthCheck, (req, res) => {
  const manager = req.manager;
  const { move } = req.body;
  if (manager.makeMove?.(move)) {
    if(manager.isGameOver()) {
      gameStore.deleteGame(manager.id);
      delete req.session.game;
      return res.json({ success: true });
    }

    if(manager.mode === 'computer'){
      manager.makeComputerMove(); //TODO: implement makeComputerMove
    }
    return res.json({ success: true });
  }
  return res.json({
    success: false,
    currentState: manager.currentState?.()
  });
});

//poll for turn
router.get('/:id/turn', sessionGameAuthCheck, (req, res) => {
  const manager = req.manager;
  return res.json({ turn: manager.turn() });
});

export default router;
