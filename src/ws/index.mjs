import { Server } from 'socket.io';
import logger from '../../utils/logger.mjs';
import { wsDBG } from '../../utils/debug.mjs';
import { gameService } from '../services/index.mjs';
import { registerGameHandlers } from './gameHandlers.mjs';

/**
 * Sets up the Socket.IO server with session sharing.
 *
 * Session sharing: Socket.IO connections need access to the same session data
 * as Express routes. By wrapping the Express session middleware, every socket
 * connection has `socket.request.session` populated with the user's session.
 * This is how we know WHO connected — the subject (user/guest) is in the session.
 *
 * @param {import('node:http').Server} server - The HTTP server to attach Socket.IO to
 * @param {Function} sessionMiddleware - Express session middleware instance
 * @returns {Server} The Socket.IO server instance
 */
export function setupWebSocket(server, sessionMiddleware) {
  const io = new Server(server);

  // Share Express session with Socket.IO
  // This wraps the Express middleware to work with Socket.IO's handshake
  io.engine.use((req, res, next) => {
    sessionMiddleware(req, res, next);
  });

  io.on('connection', (socket) => {
    const session = socket.request.session;
    const subject = session?.subject;

    if (subject) {
      wsDBG('Socket connected: %s (subject: %s, type: %s)', socket.id, subject.id, subject.type);
      logger.info({ socketId: socket.id, subjectId: subject.id, subjectType: subject.type }, 'Socket connected');
    } else {
      wsDBG('Socket connected: %s (no subject in session)', socket.id);
      logger.warn({ socketId: socket.id }, 'Socket connected without subject');
    }

    // Register game event handlers (join_game, move, etc.)
    registerGameHandlers(io, socket, gameService);

    socket.on('disconnect', (reason) => {
      wsDBG('Socket disconnected: %s (reason: %s)', socket.id, reason);
      logger.info({ socketId: socket.id, reason }, 'Socket disconnected');
    });
  });

  return io;
}
