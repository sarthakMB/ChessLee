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
   * @returns {Promise<Object>} Created guest with timestamps
   */
  async insertGuest(guestObject) {
    const fields = Object.keys(guestObject);
    const values = Object.values(guestObject);
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

    const result = await this.pool.query(
      `INSERT INTO guests (${fields.join(', ')})
       VALUES (${placeholders})
       RETURNING *`,
      values
    );

    return result.rows[0];
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
