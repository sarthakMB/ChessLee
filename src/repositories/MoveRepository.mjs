/**
 * MoveRepository
 *
 * Simplified repository pattern with two core methods:
 * - insertMove: Insert new move
 * - findMoves: Find all moves for a game
 *
 * No delete method - moves inherit lifecycle from their parent game
 * (soft delete via games.is_deleted, hard delete via CASCADE)
 */

export class MoveRepository {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Insert a new move
   *
   * @param {Object} moveObject - Object with fields to insert
   * @param {string} moveObject.game_id - Game ID (e.g., G1234567890)
   * @param {number} moveObject.move_number - Move number in sequence
   * @param {string} moveObject.player_color - 'white' or 'black'
   * @param {string} moveObject.move_from - Source square (e.g., 'e2')
   * @param {string} moveObject.move_to - Target square (e.g., 'e4')
   * @param {string|null} moveObject.promotion - Promotion piece ('q', 'r', 'b', 'n') or null
   * @param {string} moveObject.fen_after - Board state after move
   * @returns {Promise<{success: true, data: Object} | {success: false, error: string}>}
   */
  async insertMove(moveObject) {
    const fields = Object.keys(moveObject);
    const values = Object.values(moveObject);
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

    try {
      const result = await this.pool.query(
        `INSERT INTO moves (${fields.join(', ')})
         VALUES (${placeholders})
         RETURNING *`,
        values
      );

      return { success: true, data: result.rows[0] };
    } catch (err) {
      // Handle expected constraint violations
      if (err.code === '23505') { // PostgreSQL UNIQUE violation
        if (err.constraint === 'moves_game_id_move_number_key') {
          return { success: false, error: 'DUPLICATE_MOVE' };
        }
        // Unknown constraint
        return { success: false, error: 'CONSTRAINT_VIOLATION', constraint: err.constraint };
      }

      // Handle NOT NULL violations
      if (err.code === '23502') { // PostgreSQL NOT NULL violation
        return { success: false, error: 'MISSING_REQUIRED_FIELD', field: err.column };
      }

      // Unexpected error - bubble up
      throw err;
    }
  }

  /**
   * Find all moves for a game, ordered by move_number
   *
   * @param {string} game_id - Game ID (e.g., G1234567890)
   * @returns {Promise<{success: true, data: Object[]} | {success: false, error: string}>}
   */
  async findMoves(game_id) {
    try {
      const result = await this.pool.query(
        `SELECT * FROM moves
         WHERE game_id = $1
         ORDER BY move_number ASC`,
        [game_id]
      );

      return { success: true, data: result.rows };
    } catch (err) {
      throw err;
    }
  }
}
