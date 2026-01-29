/**
 * Debug Namespaces
 *
 * Development-time debugging using the 'debug' library.
 * Toggle output with DEBUG env var.
 *
 * Usage:
 *   DEBUG=app:* npm run dev           # All namespaces
 *   DEBUG=app:db:* npm run dev        # Database only
 *   DEBUG=app:services:* npm run dev  # Services only
 *   DEBUG=app:routes:*,app:db:* npm run dev  # Multiple
 *
 * Import what you need:
 *   import { dbPostgresDEBUG } from '../utils/debug.mjs';
 *   dbPostgresDEBUG('Connected to pool');
 *
 * Naming convention: <layer><Name>DEBUG
 *   - DEBUG suffix makes it obvious these are debug statements
 *   - Use for tracing code flow during development
 *   - Use for inspecting variables/state
 *   - NOT for production logging (use logger.mjs instead)
 */

import debug from 'debug';

// Database layer
export const dbPostgresDEBUG = debug('app:db:postgres');
export const dbRedisDEBUG = debug('app:db:redis');

// Middleware
export const middlewareDEBUG = debug('app:middleware');

// Routes
export const routesGameDEBUG = debug('app:routes:game');
export const routesAuthDEBUG = debug('app:routes:auth');

// Services
export const servicesGameDEBUG = debug('app:services:game');
export const servicesAuthDEBUG = debug('app:services:auth');

// Repositories (rarely needed, but available)
export const repoUserDEBUG = debug('app:repo:user');
export const repoGuestDEBUG = debug('app:repo:guest');
export const repoGameDEBUG = debug('app:repo:game');
export const repoMoveDEBUG = debug('app:repo:move');

// WebSocket
export const wsDEBUG = debug('app:ws');

// Testing
export const testDEBUG = debug('app:test');
