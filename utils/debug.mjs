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
 *   import { dbPostgresDBG } from '../utils/debug.mjs';
 *   dbPostgresDBG('Connected to pool');
 *
 * Naming convention: <layer><Name>DBG
 *   - DBG suffix makes it obvious these are debug statements
 *   - Use for tracing code flow during development
 *   - Use for inspecting variables/state
 *   - NOT for production logging (use logger.mjs instead)
 */

import debug from 'debug';

// Database layer
export const dbPostgresDBG = debug('app:db:postgres');
export const dbRedisDBG = debug('app:db:redis');

// Middleware
export const middlewareDBG = debug('app:middleware');

// Routes
export const routesGameDBG = debug('app:routes:game');
export const routesAuthDBG = debug('app:routes:auth');

// Services
export const servicesGameDBG = debug('app:services:game');
export const servicesAuthDBG = debug('app:services:auth');

// Repositories (rarely needed, but available)
export const repoUserDBG = debug('app:repo:user');
export const repoGuestDBG = debug('app:repo:guest');
export const repoGameDBG = debug('app:repo:game');
export const repoMoveDBG = debug('app:repo:move');

// WebSocket
export const wsDBG = debug('app:ws');
