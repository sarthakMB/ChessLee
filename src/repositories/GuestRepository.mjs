/**
 * GuestRepository
 *
 * Simplified repository pattern with three core methods:
 * - insertGuest: Insert new guest
 * - findGuest: Find guest by any field
 * - deleteGuest: Soft delete guest
 */

export class GuestRepository {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Insert a new guest
   *
   * @param {Object} guestObject - Object with fields to insert
   * @param {string} guestObject.id - Guest UUID (generated client-side)
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
   * Find guest by a specific field
   *
   * @param {string} field - Field name to search (e.g., 'id', 'upgraded_to')
   * @param {any} value - Value to match
   * @returns {Promise<Object|null>} Guest object or null if not found
   */
  async findGuest(field, value) {
    const result = await this.pool.query(
      `SELECT * FROM guests
       WHERE ${field} = $1`,
      [value]
    );

    return result.rows[0] || null;
  }

  /**
   * Soft delete a guest
   *
   * @param {string} field - Field name to search (e.g., 'id')
   * @param {any} value - Value to match
   * @returns {Promise<number>} Number of rows affected
   */
  async deleteGuest(field, value) {
    const result = await this.pool.query(
      `UPDATE guests
       SET is_deleted = true
       WHERE ${field} = $1`,
      [value]
    );

    return result.rowCount;
  }
}
