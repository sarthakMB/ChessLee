/**
 * UserRepository
 *
 * Simplified repository pattern with three core methods:
 * - insertUser: Insert new user
 * - findUser: Find user by any field
 * - deleteUser: Soft delete user
 */

const UNIQUE_FIELDS = ['user_id', 'username', 'email'];

export class UserRepository {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Insert a new user
   *
   * @param {Object} userObject - Object with fields to insert
   * @param {string} userObject.username - Username
   * @param {string} userObject.email - Email address
   * @param {string} userObject.password_hash - Bcrypt hashed password
   * @returns {Promise<{success: true, data: Object} | {success: false, error: string}>}
   */
  async insertUser(userObject) {
    const fields = Object.keys(userObject);
    const values = Object.values(userObject);
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

    try {
      const result = await this.pool.query(
        `INSERT INTO users (${fields.join(', ')})
         VALUES (${placeholders})
         RETURNING *`,
        values
      );

      return { success: true, data: result.rows[0] };
    } catch (err) {
      // Handle expected constraint violations
      if (err.code === '23505') { // PostgreSQL UNIQUE violation
        if (err.constraint === 'users_username_key') {
          return { success: false, error: 'USERNAME_TAKEN' };
        }
        if (err.constraint === 'users_email_key') {
          return { success: false, error: 'EMAIL_TAKEN' };
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
   * Find user by a unique field
   *
   * @param {string} field - Unique field name to search ('user_id', 'username', 'email')
   * @param {any} value - Value to match
   * @returns {Promise<{success: true, data: Object|null} | {success: false, error: string}>}
   */
  async findUser(field, value) {
    if (!UNIQUE_FIELDS.includes(field)) {
      return { success: false, error: 'INVALID_FIELD', field };
    }

    try {
      const result = await this.pool.query(
        `SELECT * FROM users
         WHERE ${field} = $1`,
        [value]
      );

      return { success: true, data: result.rows[0] || null };
    } catch (err) {
      throw err;
    }
  }

  /**
   * Soft delete a user
   *
   * @param {string} field - Unique field name to search ('user_id', 'username', 'email')
   * @param {any} value - Value to match
   * @returns {Promise<{success: true, data: number} | {success: false, error: string}>}
   */
  async deleteUser(field, value) {
    if (!UNIQUE_FIELDS.includes(field)) {
      return { success: false, error: 'INVALID_FIELD', field };
    }

    try {
      const result = await this.pool.query(
        `UPDATE users
         SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
         WHERE ${field} = $1 AND is_deleted = false`,
        [value]
      );

      return { success: true, data: result.rowCount };
    } catch (err) {
      throw err;
    }
  }
}
