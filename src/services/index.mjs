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
import { GameRepository } from '../repositories/GameRepository.mjs';
import { MoveRepository } from '../repositories/MoveRepository.mjs';
import { AuthService } from './AuthService.mjs';
import { GameService } from './GameService.mjs';

// Initialize repositories
const userRepository = new UserRepository(pool);
const guestRepository = new GuestRepository(pool);
const gameRepository = new GameRepository(pool);
const moveRepository = new MoveRepository(pool);

// Initialize services
export const authService = new AuthService(userRepository, guestRepository);
export const gameService = new GameService(gameRepository, moveRepository);
