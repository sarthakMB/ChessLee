/**
 * MoveRepository
 *
 * Simplified repository pattern with three core methods:
 * - insertMove: Insert new move
 * - findMove: Find move(s) by any field
 * - deleteMove: Soft delete move
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
   * @param {string} moveObject.move_san - Move in SAN notation
   * @param {string} moveObject.move_uci - Move in UCI notation
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
   * Find move(s) by a specific field
   *
   * Note: When searching by game_id, returns ALL moves for that game ordered by move_number
   *
   * @param {string} field - Field name to search (e.g., 'id', 'game_id')
   * @param {any} value - Value to match
   * @returns {Promise<Object|Object[]|null>} Move object, array of moves, or null if not found
   */
  async findMove(field, value) {
    // Special case: when finding by game_id, return all moves ordered
    if (field === 'game_id') {
      const result = await this.pool.query(
        `SELECT * FROM moves
         WHERE ${field} = $1
         ORDER BY move_number ASC`,
        [value]
      );
      return result.rows; // Return array of all moves
    }

    // Default case: return single move
    const result = await this.pool.query(
      `SELECT * FROM moves
       WHERE ${field} = $1`,
      [value]
    );

    return result.rows[0] || null;
  }

  /**
   * Soft delete move(s)
   *
   * @param {string} field - Field name to search (e.g., 'id', 'game_id')
   * @param {any} value - Value to match
   * @returns {Promise<number>} Number of rows affected
   */
  async deleteMove(field, value) {
    const result = await this.pool.query(
      `UPDATE moves
       SET is_deleted = true
       WHERE ${field} = $1`,
      [value]
    );

    return result.rowCount;
  }
}
