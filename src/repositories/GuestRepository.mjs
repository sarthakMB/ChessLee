/**
 * GuestRepository
 *
 * Simplified repository pattern with three core methods:
 * - insertGuest: Insert new guest
 * - findGuest: Find guest by any field
 * - deleteGuest: Soft delete guest
 */

const UNIQUE_FIELDS = ['guest_id', 'session_id'];

export class GuestRepository {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Insert a new guest
   *
   * @param {Object} guestObject - Object with fields to insert
   * @param {string} guestObject.session_id - Session ID linking guest to their session
   * @returns {Promise<{success: true, data: Object} | {success: false, error: string}>}
   */
  async insertGuest(guestObject) {
    const fields = Object.keys(guestObject);
    const values = Object.values(guestObject);
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

    try {
      const result = await this.pool.query(
        `INSERT INTO guests (${fields.join(', ')})
         VALUES (${placeholders})
         RETURNING *`,
        values
      );

      return { success: true, data: result.rows[0] };
    } catch (err) {
      // Handle expected constraint violations
      if (err.code === '23505') { // PostgreSQL UNIQUE violation
        if (err.constraint === 'guests_session_id_key') {
          return { success: false, error: 'SESSION_ID_TAKEN' };
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
   * Find guest by a unique field
   *
   * @param {string} field - Unique field name to search ('guest_id', 'session_id')
   * @param {any} value - Value to match
   * @returns {Promise<{success: true, data: Object|null} | {success: false, error: string}>}
   */
  async findGuest(field, value) {
    if (!UNIQUE_FIELDS.includes(field)) {
      return { success: false, error: 'INVALID_FIELD', field };
    }

    try {
      const result = await this.pool.query(
        `SELECT * FROM guests
         WHERE ${field} = $1`,
        [value]
      );

      return { success: true, data: result.rows[0] || null };
    } catch (err) {
      throw err;
    }
  }

  /**
   * Soft delete a guest
   *
   * @param {string} field - Unique field name to search ('guest_id', 'session_id')
   * @param {any} value - Value to match
   * @returns {Promise<{success: true, data: number} | {success: false, error: string}>}
   */
  async deleteGuest(field, value) {
    if (!UNIQUE_FIELDS.includes(field)) {
      return { success: false, error: 'INVALID_FIELD', field };
    }

    try {
      const result = await this.pool.query(
        `UPDATE guests
         SET is_deleted = true
         WHERE ${field} = $1`,
        [value]
      );

      return { success: true, data: result.rowCount };
    } catch (err) {
      throw err;
    }
  }
}
