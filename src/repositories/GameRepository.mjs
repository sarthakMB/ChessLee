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
   * @param {Object} gameObject - Object with fields to insert
   * @param {string} gameObject.mode - Game mode (e.g., 'computer', 'friend')
   * @param {string} gameObject.owner_id - Owner UUID
   * @param {string} gameObject.owner_type - 'user' or 'guest'
   * @param {string} [gameObject.join_code] - Join code for friend games
   * @returns {Promise<Object>} Created game with id and timestamps
   */
  async insertGame(gameObject) {
    const fields = Object.keys(gameObject);
    const values = Object.values(gameObject);
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

    const result = await this.pool.query(
      `INSERT INTO games (${fields.join(', ')})
       VALUES (${placeholders})
       RETURNING *`,
      values
    );

    return result.rows[0];
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
