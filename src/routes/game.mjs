import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gameService } from '../services/index.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const publicPath = path.join(__dirname, '../..', 'public');
const gameFile = path.join(publicPath, 'game.html');
const sendGameFile = (_req, res) => res.sendFile(gameFile);
const renderError = (res, { status = 404, message = 'Something went wrong.' } = {}) =>
  res.status(status).render('error', { message });

const handleRedirect = (req, res, location) => {
  console.log('Redirect function entered');//delete after testing
  if (req.get('HX-Request')) {
    console.log('if statement entered');//delete after testing
    res.set('HX-Redirect', location);
    return res.status(204).end();
  }

  console.log('if statement not entered');//delete after testing
  return res.redirect(303, location);
};

router.get('/sandbox', sendGameFile);

router.post('/computer', async (req, res) => {
  const subjectId = req.session.subject?.id;
  const subjectType = req.session.subject?.type ?? 'guest';
  const ownerColor = req.body.color;

  const result = await gameService.createGame('computer', subjectId, subjectType, ownerColor, {
    difficulty: 1200,
  });
  console.log("Create computer game result:", result); //delete after testing

  if (!result.success) {
    return renderError(res, { status: 500, message: 'Failed to create game.' });
  }

  const gameId = result.data.game_id;
  return handleRedirect(req, res, `/game/${gameId}`);
});

router.post('/friend', async (req, res) => {
  const subjectId = req.session.subject?.id;
  const subjectType = req.session.subject?.type ?? 'guest';
  const ownerColor = req.body.color;

  const result = await gameService.createGame('friend', subjectId, subjectType, ownerColor);

  if (!result.success) {
    return renderError(res, { status: 500, message: 'Failed to create game.' });
  }

  const game = result.data;

  if (req.get('HX-Request')) {
    return res.send(
      `<div class="rounded-md border border-zinc-700 bg-zinc-900/60 px-4 py-3 text-sm text-gray-200">
        Share this code with your friend:
        <span class="font-mono tracking-wide text-lime-300">${game.join_code}</span>
      </div>`
    );
  }

  return res.json({ joinCode: game.join_code, gameId: game.game_id, inviteUrl: `/game/${game.game_id}` });
});

router.post('/join', async (req, res) => {
  const subjectId = req.session.subject?.id;
  const subjectType = req.session.subject?.type ?? 'guest';
  const joinCode = req.body.joinCode;

  if (!joinCode) {
    return renderError(res, { status: 400, message: 'Join code is required.' });
  }

  const result = await gameService.joinGame(joinCode, subjectId, subjectType);

  if (!result.success) {
    const messages = {
      GAME_NOT_FOUND: 'Game not found. Check your join code.',
      GAME_ALREADY_FULL: 'This game already has two players.',
      CANNOT_JOIN_OWN_GAME: 'You cannot join your own game.',
    };
    return renderError(res, { status: 400, message: messages[result.error] ?? 'Failed to join game.' });
  }

  const gameId = result.data.game_id;
  return handleRedirect(req, res, `/game/${gameId}`);
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const playerId = req.session.subject?.id;

  const result = await gameService.getGame(id);
  if (!result.success) {
    return renderError(res);
  }

  const { game } = result.data;
  const isOwner = game.owner_id === playerId;
  const isOpponent = game.opponent_id === playerId;

  if (!isOwner && !isOpponent) {
    return renderError(res, { status: 403, message: 'You are not a player in this game.' });
  }

  return sendGameFile(req, res);
});

export default router;
