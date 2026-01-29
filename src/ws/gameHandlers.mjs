/**
 * Game Event Handlers for Socket.IO
 *
 * Handles real-time game events: joining games, making moves, game over.
 * All game logic flows through GameService — sockets are just the delivery mechanism.
 *
 * Events:
 *   join_game  → client joins a game room, receives current state
 *   move       → client makes a move, broadcast to room
 *   error      → server rejects request (sent to sender only)
 *   move_made  → confirmed move broadcast to all players in room
 *   game_over  → game ended, broadcast result to room
 *
 * Error format (consistent across all error events):
 *   { code: 'ERROR_CODE', message: 'Human readable message' }
 */

import { Chess } from 'chess.js';
import { wsDEBUG } from '../../utils/debug.mjs';
import logger from '../../utils/logger.mjs';

/**
 * Registers game-related event handlers on a socket.
 *
 * @param {import('socket.io').Server} io - The Socket.IO server instance
 * @param {import('socket.io').Socket} socket - The connected socket
 * @param {import('../services/GameService.mjs').GameService} gameService - Game service instance
 */
export function registerGameHandlers(io, socket, gameService) {
  const session = socket.request.session;
  const subject = session?.subject;

  // Guard: require authenticated session
  if (!subject?.id) {
    wsDEBUG('registerGameHandlers: no subject, skipping registration for socket %s', socket.id);
    return;
  }

  const playerId = subject.id;

  /**
   * join_game - Client joins a game room
   *
   * Client sends: { gameId }
   * Server responds: game_state event with { fen, turn, moveCount, you: { color } }
   */
  socket.on('join_game', async (payload = {}) => {
    const { gameId } = payload;

    try {
      wsDEBUG('join_game: socket=%s player=%s game=%s', socket.id, playerId, gameId);

      if (!gameId) {
        logger.warn({ socketId: socket.id, playerId, code: 'MISSING_GAME_ID' }, 'join_game rejected: missing gameId');
        socket.emit('error', { code: 'MISSING_GAME_ID', message: 'gameId is required' });
        return;
      }

      const result = await gameService.getGame(gameId);

      if (!result.success) {
        wsDEBUG('join_game: game not found %s', gameId);
        logger.warn({ socketId: socket.id, playerId, gameId, code: result.error }, 'join_game rejected: game not found');
        socket.emit('error', { code: result.error, message: 'Game not found' });
        return;
      }

      const { game, fen, moveCount } = result.data;

      // Authorization: player must be owner or opponent
      const playerColor = _resolvePlayerColor(playerId, game);
      if (!playerColor) {
        wsDEBUG('join_game: player %s not in game %s', playerId, gameId);
        logger.warn({ socketId: socket.id, playerId, gameId, code: 'NOT_IN_GAME' }, 'join_game rejected: not a player');
        socket.emit('error', { code: 'NOT_IN_GAME', message: 'You are not a player in this game' });
        return;
      }

      // Store gameId on socket for disconnect handling (future use)
      socket.data.gameId = gameId;
      socket.data.playerId = playerId;

      // Join the Socket.IO room for this game
      socket.join(gameId);
      wsDEBUG('join_game: socket %s joined room %s', socket.id, gameId);

      // Extract whose turn it is from FEN (w or b after first space)
      const turn = fen.split(' ')[1]; // 'w' or 'b'

      // Send current game state back to the joining client
      socket.emit('game_state', {
        fen,
        turn,
        moveCount,
        you: { color: playerColor },
      });

      logger.info({ socketId: socket.id, gameId, playerId, color: playerColor }, 'Player joined game room');
    } catch (err) {
      logger.error({ err, socketId: socket.id, playerId, gameId }, 'join_game handler error');
      socket.emit('error', { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
    }
  });

  /**
   * move - Client makes a move
   *
   * Client sends: { gameId, from, to, promotion? }
   * Server broadcasts to room: move_made event with { from, to, promotion, fen, turn, isGameOver }
   * On error: error event to sender only
   */
  socket.on('move', async (payload = {}) => {
    const { gameId, from, to, promotion } = payload;

    try {
      wsDEBUG('move: socket=%s player=%s game=%s move=%s-%s', socket.id, playerId, gameId, from, to);

      if (!gameId || !from || !to) {
        logger.warn({ socketId: socket.id, playerId, gameId, from, to, code: 'MISSING_FIELDS' }, 'move rejected: missing fields');
        socket.emit('error', { code: 'MISSING_FIELDS', message: 'Missing required fields: gameId, from, to' });
        return;
      }

      const result = await gameService.makeMove(gameId, playerId, { from, to, promotion });

      if (!result.success) {
        wsDEBUG('move: rejected error=%s', result.error);
        logger.warn({ socketId: socket.id, playerId, gameId, from, to, code: result.error }, 'move rejected');
        socket.emit('error', { code: result.error, message: _errorCodeToMessage(result.error) });
        return;
      }

      const { move, isGameOver, fen } = result.data;
      const turn = fen.split(' ')[1];

      wsDEBUG('move: accepted, broadcasting to room %s', gameId);

      // Broadcast confirmed move to ALL players in the room (including sender)
      io.to(gameId).emit('move_made', {
        from: move.move_from,
        to: move.move_to,
        promotion: move.promotion,
        fen,
        turn,
        isGameOver,
      });

      logger.info({ gameId, playerId, from, to, promotion, isGameOver }, 'Move made');

      // If game is over, emit game_over with result details
      if (isGameOver) {
        const gameOverResult = _determineGameResult(fen);
        wsDEBUG('move: game over, result=%o', gameOverResult);

        io.to(gameId).emit('game_over', gameOverResult);

        logger.info({ gameId, ...gameOverResult }, 'Game over');
      }
    } catch (err) {
      logger.error({ err, socketId: socket.id, playerId, gameId, from, to }, 'move handler error');
      socket.emit('error', { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
    }
  });
}

// --- Private Helpers ---

/**
 * Resolves the player's color in a game.
 *
 * @param {string} playerId
 * @param {Object} game
 * @returns {'w' | 'b' | null} - 'w' for white, 'b' for black, null if not in game
 */
function _resolvePlayerColor(playerId, game) {
  if (playerId === game.owner_id) {
    return game.owner_color === 'white' ? 'w' : 'b';
  }
  if (playerId === game.opponent_id) {
    return game.opponent_color === 'white' ? 'w' : 'b';
  }
  return null;
}

/**
 * Converts error codes to human-readable messages.
 *
 * @param {string} code
 * @returns {string}
 */
function _errorCodeToMessage(code) {
  const messages = {
    GAME_NOT_FOUND: 'Game not found',
    PLAYER_NOT_IN_GAME: 'You are not a player in this game',
    NOT_YOUR_TURN: 'It is not your turn',
    INVALID_MOVE: 'Invalid move',
  };
  return messages[code] || 'An error occurred';
}

/**
 * Determines the game result from the final FEN.
 *
 * @param {string} fen
 * @returns {{ result: string, reason: string }}
 */
function _determineGameResult(fen) {
  const chess = new Chess(fen);

  if (chess.isCheckmate()) {
    // The side to move is in checkmate, so the other side won
    const winner = chess.turn() === 'w' ? 'black' : 'white';
    return { result: winner, reason: 'checkmate' };
  }

  if (chess.isStalemate()) {
    return { result: 'draw', reason: 'stalemate' };
  }

  if (chess.isInsufficientMaterial()) {
    return { result: 'draw', reason: 'insufficient_material' };
  }

  if (chess.isThreefoldRepetition()) {
    return { result: 'draw', reason: 'threefold_repetition' };
  }

  if (chess.isDraw()) {
    return { result: 'draw', reason: 'fifty_move_rule' };
  }

  // Fallback (shouldn't happen if isGameOver was true)
  return { result: 'unknown', reason: 'unknown' };
}
