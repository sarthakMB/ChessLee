/**
 * GameRepository
 *
 * Simplified repository pattern with four core methods:
 * - insertGame: Insert new game
 * - findGame: Find game by unique field
 * - updateGame: Update opponent fields when a player joins
 * - deleteGame: Soft delete game
 */

const UNIQUE_FIELDS = ['game_id', 'join_code'];
const UPDATABLE_FIELDS = ['opponent_id', 'opponent_type', 'opponent_color'];

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
   * Find game by a unique field
   *
   * @param {string} field - Unique field name to search ('game_id', 'join_code')
   * @param {any} value - Value to match
   * @returns {Promise<{success: true, data: Object|null} | {success: false, error: string}>}
   */
  async findGame(field, value) {
    if (!UNIQUE_FIELDS.includes(field)) {
      return { success: false, error: 'INVALID_FIELD', field };
    }

    try {
      const result = await this.pool.query(
        `SELECT * FROM games
         WHERE ${field} = $1`,
        [value]
      );

      return { success: true, data: result.rows[0] || null };
    } catch (err) {
      throw err;
    }
  }

  /**
   * Update a game by game_id
   *
   * @param {string} game_id - Game ID to update
   * @param {Object} updateObject - Object with fields to update (only opponent_id, opponent_type, opponent_color allowed)
   * @returns {Promise<{success: true, data: Object} | {success: false, error: string}>}
   */
  async updateGame(game_id, updateObject) {
    const fields = Object.keys(updateObject);

    const invalidFields = fields.filter(f => !UPDATABLE_FIELDS.includes(f));
    if (invalidFields.length > 0) {
      return { success: false, error: 'INVALID_FIELD', fields: invalidFields };
    }

    const setClauses = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const values = [...Object.values(updateObject), game_id];

    try {
      const result = await this.pool.query(
        `UPDATE games
         SET ${setClauses}, updated_at = CURRENT_TIMESTAMP
         WHERE game_id = $${values.length}
         RETURNING *`,
        values
      );

      return { success: true, data: result.rows[0] || null };
    } catch (err) {
      // Handle CHECK constraint violations (e.g. invalid opponent_type/color)
      if (err.code === '23514') {
        return { success: false, error: 'CHECK_VIOLATION', constraint: err.constraint };
      }

      throw err;
    }
  }

  /**
   * Soft delete a game
   *
   * @param {string} field - Unique field name to search ('game_id', 'join_code')
   * @param {any} value - Value to match
   * @returns {Promise<{success: true, data: number} | {success: false, error: string}>}
   */
  async deleteGame(field, value) {
    if (!UNIQUE_FIELDS.includes(field)) {
      return { success: false, error: 'INVALID_FIELD', field };
    }

    try {
      const result = await this.pool.query(
        `UPDATE games
         SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
         WHERE ${field} = $1`,
        [value]
      );

      return { success: true, data: result.rowCount };
    } catch (err) {
      throw err;
    }
  }
}
