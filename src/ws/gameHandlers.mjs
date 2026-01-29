/**
 * Game Event Handlers for Socket.IO
 *
 * Handles real-time game events: joining games, making moves, game over.
 * All game logic flows through GameService — sockets are just the delivery mechanism.
 *
 * Events:
 *   join_game  → client joins a game room, receives current state
 *   move       → client makes a move, broadcast to room
 *   move_error → server rejects invalid move (sent to sender only)
 *   move_made  → confirmed move broadcast to all players in room
 *   game_over  → game ended, broadcast result to room
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
  socket.on('join_game', async ({ gameId }) => {
    wsDEBUG('join_game: socket=%s player=%s game=%s', socket.id, playerId, gameId);

    if (!gameId) {
      socket.emit('error', { message: 'gameId required' });
      return;
    }

    const result = await gameService.getGame(gameId);

    if (!result.success) {
      wsDEBUG('join_game: game not found %s', gameId);
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    const { game, fen, moveCount } = result.data;

    // Authorization: player must be owner or opponent
    const playerColor = resolvePlayerColor(playerId, game);
    if (!playerColor) {
      wsDEBUG('join_game: player %s not in game %s', playerId, gameId);
      socket.emit('error', { message: 'You are not a player in this game' });
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
  });

  /**
   * move - Client makes a move
   *
   * Client sends: { gameId, from, to, promotion? }
   * Server broadcasts to room: move_made event with { from, to, promotion, fen, turn, isGameOver }
   * On error: move_error event to sender only
   */
  socket.on('move', async ({ gameId, from, to, promotion }) => {
    wsDEBUG('move: socket=%s player=%s game=%s move=%s-%s', socket.id, playerId, gameId, from, to);

    if (!gameId || !from || !to) {
      socket.emit('move_error', { error: 'Missing required fields: gameId, from, to' });
      return;
    }

    const result = await gameService.makeMove(gameId, playerId, { from, to, promotion });

    if (!result.success) {
      wsDEBUG('move: rejected error=%s', result.error);
      socket.emit('move_error', { error: result.error });
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
      const gameOverResult = determineGameResult(fen);
      wsDEBUG('move: game over, result=%o', gameOverResult);

      io.to(gameId).emit('game_over', gameOverResult);

      logger.info({ gameId, ...gameOverResult }, 'Game over');
    }
  });
}

/**
 * Resolves the player's color in a game.
 *
 * @param {string} playerId
 * @param {Object} game
 * @returns {'w' | 'b' | null} - 'w' for white, 'b' for black, null if not in game
 */
function resolvePlayerColor(playerId, game) {
  if (playerId === game.owner_id) {
    return game.owner_color === 'white' ? 'w' : 'b';
  }
  if (playerId === game.opponent_id) {
    return game.opponent_color === 'white' ? 'w' : 'b';
  }
  return null;
}

/**
 * Determines the game result from the final FEN.
 *
 * @param {string} fen
 * @returns {{ result: string, reason: string }}
 */
function determineGameResult(fen) {
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
