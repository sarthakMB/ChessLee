/**
 * GameRepository
 *
 * Simplified repository pattern with three core methods:
 * - insertGame: Insert new game
 * - findGame: Find game by any field
 * - deleteGame: Soft delete game
 */

export class GameRepository {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Insert a new game
   *
   * Non-nullable columns (from DB schema): id, mode, owner_id, owner_type, owner_color, is_deleted, is_test
   * Nullable columns (from DB schema): opponent_id, opponent_type, opponent_color, join_code, metadata, created_at, updated_at
   *
   * @param {Object} gameObject - Object with fields to insert
   * @param {string} gameObject.mode - Game mode (e.g., 'computer', 'friend') - REQUIRED
   * @param {string} gameObject.owner_id - Owner ID (e.g., U1234567890) - REQUIRED
   * @param {string} gameObject.owner_type - 'user' or 'guest' - REQUIRED
   * @param {string} gameObject.owner_color - Player color ('white' or 'black') - REQUIRED
   * @param {boolean} gameObject.is_deleted - Soft delete flag - REQUIRED
   * @param {boolean} gameObject.is_test - Test data flag - REQUIRED
   * @param {string} [gameObject.opponent_id] - Opponent ID (e.g., U1234567890, T1234567890) - OPTIONAL
   * @param {string} [gameObject.opponent_type] - 'user' or 'guest' - OPTIONAL
   * @param {string} [gameObject.opponent_color] - Opponent color ('white' or 'black') - OPTIONAL
   * @param {string} [gameObject.join_code] - Join code for friend games - OPTIONAL
   * @param {Object} [gameObject.metadata] - Additional game metadata - OPTIONAL
   * @returns {Promise<{success: true, data: Object} | {success: false, error: string}>}
   */
  async insertGame(gameObject) {
    const fields = Object.keys(gameObject);
    const values = Object.values(gameObject);
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

    try {
      const result = await this.pool.query(
        `INSERT INTO games (${fields.join(', ')})
         VALUES (${placeholders})
         RETURNING *`,
        values
      );

      return { success: true, data: result.rows[0] };
    } catch (err) {
      // Handle expected constraint violations
      if (err.code === '23505') { // PostgreSQL UNIQUE violation
        if (err.constraint === 'games_join_code_key') {
          return { success: false, error: 'JOIN_CODE_TAKEN' };
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
   * Find game by a specific field
   *
   * @param {string} field - Field name to search (e.g., 'id', 'join_code', 'owner_id')
   * @param {any} value - Value to match
   * @returns {Promise<Object|null>} Game object or null if not found
   */
  async findGame(field, value) {
    const result = await this.pool.query(
      `SELECT * FROM games
       WHERE ${field} = $1`,
      [value]
    );

    return result.rows[0] || null;
  }

  /**
   * Soft delete a game
   *
   * @param {string} field - Field name to search (e.g., 'id')
   * @param {any} value - Value to match
   * @returns {Promise<number>} Number of rows affected
   */
  async deleteGame(field, value) {
    const result = await this.pool.query(
      `UPDATE games
       SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
       WHERE ${field} = $1`,
      [value]
    );

    return result.rowCount;
  }
}
