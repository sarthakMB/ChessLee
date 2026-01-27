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
    if (!VALID_MODES.includes(mode)) {
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
      gameObject.join_code = this._generateJoinCode();
      return this.gameRepo.insertGame(gameObject);
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
    const gameResult = await this.gameRepo.findGame('game_id', gameId);
    if (!gameResult.success) return gameResult;

    const game = gameResult.data;
    if (!game || game.is_deleted) {
      return { success: false, error: 'GAME_NOT_FOUND' };
    }

    const movesResult = await this.moveRepo.findMoves(gameId);
    if (!movesResult.success) return movesResult;

    const moves = movesResult.data;
    const fen = moves.length > 0 ? moves[moves.length - 1].fen_after : STARTING_FEN;

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
    const gameResult = await this.getGameByJoinCode(joinCode);
    if (!gameResult.success) return gameResult;

    const game = gameResult.data;

    if (game.opponent_id) {
      return { success: false, error: 'GAME_ALREADY_FULL' };
    }

    if (game.owner_id === playerId) {
      return { success: false, error: 'CANNOT_JOIN_OWN_GAME' };
    }

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
    const gameResult = await this.getGame(gameId);
    if (!gameResult.success) return gameResult;

    const { game, fen, moveCount } = gameResult.data;

    const playerColor = this._resolvePlayerColor(playerId, game);
    if (!playerColor) {
      return { success: false, error: 'PLAYER_NOT_IN_GAME' };
    }

    const chess = new Chess(fen);

    if (chess.turn() !== playerColor) {
      return { success: false, error: 'NOT_YOUR_TURN' };
    }

    const moveResult = chess.move(moveInput);
    if (!moveResult) {
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

    return {
      success: true,
      data: {
        move: insertResult.data,
        isGameOver: chess.isGameOver(),
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
