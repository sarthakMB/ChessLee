/**
 * Services Module - Unified Exports
 *
 * Pre-configured service instances ready to use in routes.
 *
 * Usage:
 *   import { authService } from '../services/index.mjs';
 *
 * Why pre-configured instances?
 * - Routes don't need to know about repositories or database
 * - Easy to swap implementations for testing
 * - Single source of truth for service configuration
 */

import { pool } from '../../db/index.mjs';
import { UserRepository } from '../repositories/UserRepository.mjs';
import { GuestRepository } from '../repositories/GuestRepository.mjs';
import { AuthService } from './AuthService.mjs';

// Initialize repositories
const userRepository = new UserRepository(pool);
const guestRepository = new GuestRepository(pool);

// Initialize services
export const authService = new AuthService(userRepository, guestRepository);
