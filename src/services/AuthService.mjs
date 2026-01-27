/**
 * AuthService
 *
 * Handles authentication operations: registration, login, guest upgrade.
 * Uses Result pattern for expected failures (TS-friendly).
 *
 * Result types (for future TS migration):
 *   RegisterResult = { success: true, user: User } | { success: false, error: 'USERNAME_TAKEN' | 'EMAIL_TAKEN' }
 *   LoginResult = { success: true, user: User } | { success: false, error: 'INVALID_CREDENTIALS' }
 */

import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

/**
 * Strips password_hash from user object.
 * NEVER return password hashes to callers.
 */
function omitPasswordHash(user) {
  if (!user) return null;
  const { password_hash, ...rest } = user;
  return rest;
}

export class AuthService {
  constructor(userRepository, guestRepository) {
    this.userRepo = userRepository;
    this.guestRepo = guestRepository;
  }

  /**
   * Register a new user
   *
   * @param {string} username - Unique username (min 3 chars)
   * @param {string} password - Plain text password (will be hashed)
   * @param {string|null} email - Optional email address (unique if provided)
   * @returns {Promise<{success: true, user: Object} | {success: false, error: string}>}
   */
  async register(username, password, email = null) {
    // Hash password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Determine is_test based on environment
    // Default to test data unless explicitly in production
    const is_test = process.env.NODE_ENV !== 'production';

    // Create user
    const userData = {
      username,
      password_hash,
      is_deleted: false,
      is_test,
    };

    // Only include email if provided
    if (email) {
      userData.email = email;
    }

    const result = await this.userRepo.insertUser(userData);

    // Repository handles constraint violations - just pass through
    if (!result.success) {
      return result; // USERNAME_TAKEN or EMAIL_TAKEN
    }

    return { success: true, user: omitPasswordHash(result.data) };
  }

  /**
   * Login with username and password
   *
   * @param {string} username - Username
   * @param {string} password - Plain text password
   * @returns {Promise<{success: true, user: Object} | {success: false, error: string}>}
   */
  async login(username, password) {
    // Find user by username
    const user = await this.userRepo.findUser('username', username);

    // User not found or deleted - return same error as wrong password (security)
    if (!user || user.is_deleted) {
      return { success: false, error: 'INVALID_CREDENTIALS' };
    }

    // Compare password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return { success: false, error: 'INVALID_CREDENTIALS' };
    }

    return { success: true, user: omitPasswordHash(user) };
  }

  // upgradeGuest(guestId, userId) - TODO: implement later
}
