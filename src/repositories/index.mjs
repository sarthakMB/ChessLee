/**
 * Repository Layer
 *
 * Centralizes all database access logic. Each repository handles CRUD operations
 * for a specific entity (users, games, guests, moves).
 *
 * Benefits:
 * - Single source of truth for SQL queries
 * - Testable (can mock repositories in unit tests)
 * - Maintainable (schema changes touch one file)
 * - Secure (parameterized queries enforced here)
 */

import { pool } from '../../db/index.mjs';

// Import repositories
import { UserRepository } from './UserRepository.mjs';
import { GuestRepository } from './GuestRepository.mjs';
import { GameRepository } from './GameRepository.mjs';
import { MoveRepository } from './MoveRepository.mjs';

// Instantiate repositories with the pool
// Pattern: Create singleton instances that share the same connection pool
// This ensures efficient connection reuse across the application
export const userRepository = new UserRepository(pool);
export const guestRepository = new GuestRepository(pool);
export const gameRepository = new GameRepository(pool);
export const moveRepository = new MoveRepository(pool);
