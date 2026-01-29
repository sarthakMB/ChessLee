/**
 * GameService
 *
 * Manages game lifecycle using GameRepository + MoveRepository for persistence
 * and chess.js directly for move validation. DB is the authoritative source of truth.
 * chess.js is used inline as a stateless validator — no GameManager dependency.
 *
 * Replaces: gameStore (in-memory Map). Routes call gameService instead.
 */

import { Chess } from 'chess.js';
import { servicesGameDEBUG } from '../../utils/debug.mjs';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const VALID_MODES = ['computer', 'friend'];

export class GameService {
  constructor(gameRepository, moveRepository) {
    this.gameRepo = gameRepository;
    this.moveRepo = moveRepository;
  }

  /**
   * Create a new game and persist to DB.
   *
   * @param {string} mode - 'computer' or 'friend'
   * @param {string} ownerId - Owner's player ID
   * @param {string} ownerType - 'user' or 'guest'
   * @param {string} ownerColor - 'white' or 'black'
   * @param {Object} [options] - Additional options
   * @param {string} [options.difficulty] - Difficulty for computer mode
   * @returns {Promise<{success: true, data: Object} | {success: false, error: string}>}
   */
  async createGame(mode, ownerId, ownerType, ownerColor, options = {}) {
    servicesGameDEBUG('createGame: mode=%s owner=%s color=%s', mode, ownerId, ownerColor);

    if (!VALID_MODES.includes(mode)) {
      servicesGameDEBUG('createGame: invalid mode %s', mode);
      return { success: false, error: 'INVALID_MODE' };
    }

    const gameObject = {
      mode,
      owner_id: ownerId,
      owner_type: ownerType,
      owner_color: ownerColor,
      is_deleted: false,
      is_test: process.env.NODE_ENV !== 'production',
    };

    if (mode === 'computer') {
      gameObject.opponent_id = 'computer';
      gameObject.opponent_type = 'computer';
      gameObject.opponent_color = this._oppositeColor(ownerColor);
      if (options.difficulty) {
        gameObject.metadata = JSON.stringify({ difficulty: options.difficulty });
      }
    }

    if (mode === 'friend') {
      gameObject.join_code = this._generateJoinCode();
    }

    const result = await this.gameRepo.insertGame(gameObject);

    // Retry once on join code collision
    if (!result.success && result.error === 'JOIN_CODE_TAKEN') {
      servicesGameDEBUG('createGame: join code collision, retrying');
      gameObject.join_code = this._generateJoinCode();
      return this.gameRepo.insertGame(gameObject);
    }

    if (result.success) {
      servicesGameDEBUG('createGame: created game_id=%s', result.data.game_id);
    }
    return result;
  }

  /**
   * Load game + derive current state from moves.
   *
   * @param {string} gameId
   * @returns {Promise<{success: true, data: {game, moves, fen, moveCount}} | {success: false, error: string}>}
   */
  async getGame(gameId) {
    servicesGameDEBUG('getGame: %s', gameId);
    const gameResult = await this.gameRepo.findGame('game_id', gameId);
    if (!gameResult.success) return gameResult;

    const game = gameResult.data;
    if (!game || game.is_deleted) {
      servicesGameDEBUG('getGame: not found or deleted');
      return { success: false, error: 'GAME_NOT_FOUND' };
    }

    const movesResult = await this.moveRepo.findMoves(gameId);
    if (!movesResult.success) return movesResult;

    const moves = movesResult.data;
    const fen = moves.length > 0 ? moves[moves.length - 1].fen_after : STARTING_FEN;

    servicesGameDEBUG('getGame: loaded with %d moves, fen=%s', moves.length, fen.split(' ')[0]);
    return {
      success: true,
      data: { game, moves, fen, moveCount: moves.length },
    };
  }

  /**
   * Find game by join code.
   *
   * @param {string} joinCode
   * @returns {Promise<{success: true, data: Object} | {success: false, error: string}>}
   */
  async getGameByJoinCode(joinCode) {
    const result = await this.gameRepo.findGame('join_code', joinCode);
    if (!result.success) return result;

    if (!result.data || result.data.is_deleted) {
      return { success: false, error: 'GAME_NOT_FOUND' };
    }

    return { success: true, data: result.data };
  }

  /**
   * Add opponent to an existing friend game.
   *
   * @param {string} joinCode
   * @param {string} playerId
   * @param {string} playerType - 'user' or 'guest'
   * @returns {Promise<{success: true, data: Object} | {success: false, error: string}>}
   */
  async joinGame(joinCode, playerId, playerType) {
    servicesGameDEBUG('joinGame: code=%s player=%s', joinCode, playerId);
    const gameResult = await this.getGameByJoinCode(joinCode);
    if (!gameResult.success) return gameResult;

    const game = gameResult.data;

    if (game.opponent_id) {
      servicesGameDEBUG('joinGame: game already full');
      return { success: false, error: 'GAME_ALREADY_FULL' };
    }

    if (game.owner_id === playerId) {
      servicesGameDEBUG('joinGame: cannot join own game');
      return { success: false, error: 'CANNOT_JOIN_OWN_GAME' };
    }

    servicesGameDEBUG('joinGame: adding opponent to game_id=%s', game.game_id);
    return this.gameRepo.updateGame(game.game_id, {
      opponent_id: playerId,
      opponent_type: playerType,
      opponent_color: this._oppositeColor(game.owner_color),
    });
  }

  /**
   * Validate and persist a move.
   *
   * @param {string} gameId
   * @param {string} playerId
   * @param {Object} moveInput - { from, to, promotion? }
   * @returns {Promise<{success: true, data: {move, isGameOver, fen}} | {success: false, error: string}>}
   */
  async makeMove(gameId, playerId, moveInput) {
    servicesGameDEBUG('makeMove: game=%s player=%s move=%o', gameId, playerId, moveInput);
    const gameResult = await this.getGame(gameId);
    if (!gameResult.success) return gameResult;

    const { game, fen, moveCount } = gameResult.data;

    const playerColor = this._resolvePlayerColor(playerId, game);
    if (!playerColor) {
      servicesGameDEBUG('makeMove: player not in game');
      return { success: false, error: 'PLAYER_NOT_IN_GAME' };
    }

    const chess = new Chess(fen);

    if (chess.turn() !== playerColor) {
      servicesGameDEBUG('makeMove: not player turn (turn=%s, player=%s)', chess.turn(), playerColor);
      return { success: false, error: 'NOT_YOUR_TURN' };
    }

    const moveResult = chess.move(moveInput);
    if (!moveResult) {
      servicesGameDEBUG('makeMove: invalid move');
      return { success: false, error: 'INVALID_MOVE' };
    }

    const moveRecord = {
      game_id: gameId,
      move_number: moveCount + 1,
      player_color: playerColor === 'w' ? 'white' : 'black',
      move_from: moveResult.from,
      move_to: moveResult.to,
      promotion: moveResult.promotion || null,
      fen_after: chess.fen(),
    };

    const insertResult = await this.moveRepo.insertMove(moveRecord);
    if (!insertResult.success) return insertResult;

    const isGameOver = chess.isGameOver();
    servicesGameDEBUG('makeMove: success move_number=%d gameOver=%s', moveRecord.move_number, isGameOver);

    return {
      success: true,
      data: {
        move: insertResult.data,
        isGameOver,
        fen: chess.fen(),
      },
    };
  }

  /**
   * Soft delete a game.
   *
   * @param {string} gameId
   * @returns {Promise<{success: true, data: number} | {success: false, error: string}>}
   */
  async deleteGame(gameId) {
    return this.gameRepo.deleteGame('game_id', gameId);
  }

  // --- Private Helpers ---

  _generateJoinCode() {
    return Math.random().toString(36).slice(2, 10).toUpperCase();
  }

  _oppositeColor(color) {
    return color === 'white' ? 'black' : 'white';
  }

  _resolvePlayerColor(playerId, game) {
    if (playerId === game.owner_id) {
      return game.owner_color === 'white' ? 'w' : 'b';
    }
    if (playerId === game.opponent_id) {
      return game.opponent_color === 'white' ? 'w' : 'b';
    }
    return null;
  }
}
