/**
 * socket.js - WebSocket Communication Module
 *
 * Handles all Socket.IO events:
 * - Connection management
 * - Game room joining
 * - Move sending/receiving
 * - Game state synchronization
 */

// Socket.IO instance (io() is global from socket.io.js)
const socket = io();

// Current game ID
let currentGameId = null;

// Event callbacks
const callbacks = {
  onGameState: null,
  onMoveMade: null,
  onGameOver: null,
  onError: null,
  onConnectionChange: null,
};

// ----- Connection Events -----

socket.on('connect', () => {
  console.log('[Socket] Connected:', socket.id);

  if (callbacks.onConnectionChange) {
    callbacks.onConnectionChange(true);
  }

  // Rejoin game room if we were in one
  if (currentGameId) {
    joinGame(currentGameId);
  }
});

socket.on('disconnect', (reason) => {
  console.log('[Socket] Disconnected:', reason);

  if (callbacks.onConnectionChange) {
    callbacks.onConnectionChange(false);
  }
});

// ----- Game Events -----

socket.on('game_state', (data) => {
  console.log('[Socket] Game state received:', data);

  if (callbacks.onGameState) {
    callbacks.onGameState(data);
  }
});

socket.on('move_made', (data) => {
  console.log('[Socket] Move made:', data);

  if (callbacks.onMoveMade) {
    callbacks.onMoveMade(data);
  }
});

socket.on('game_over', (data) => {
  console.log('[Socket] Game over:', data);

  if (callbacks.onGameOver) {
    callbacks.onGameOver(data);
  }
});

socket.on('error', (data) => {
  console.error('[Socket] Error:', data);

  if (callbacks.onError) {
    callbacks.onError(data);
  }
});

// ----- Public API -----

/**
 * Join a game room
 */
export function joinGame(gameId) {
  currentGameId = gameId;
  socket.emit('join_game', { gameId });
  console.log('[Socket] Joining game:', gameId);
}

/**
 * Send a move to the server
 */
export function sendMove(from, to, promotion = null) {
  if (!currentGameId) {
    console.error('[Socket] Cannot send move: not in a game');
    return;
  }

  const moveData = {
    gameId: currentGameId,
    from,
    to,
  };

  if (promotion) {
    moveData.promotion = promotion;
  }

  socket.emit('move', moveData);
  console.log('[Socket] Move sent:', moveData);
}

/**
 * Check if connected
 */
export function isConnected() {
  return socket.connected;
}

/**
 * Get socket ID
 */
export function getSocketId() {
  return socket.id;
}

// ----- Callback Registration -----

/**
 * Register callback for game state events
 * @param {Function} callback - Called with { fen, turn, moveCount, you: { color } }
 */
export function onGameState(callback) {
  callbacks.onGameState = callback;
}

/**
 * Register callback for move events
 * @param {Function} callback - Called with { from, to, promotion, fen, turn, isGameOver }
 */
export function onMoveMade(callback) {
  callbacks.onMoveMade = callback;
}

/**
 * Register callback for game over events
 * @param {Function} callback - Called with { result, reason }
 */
export function onGameOver(callback) {
  callbacks.onGameOver = callback;
}

/**
 * Register callback for error events
 * @param {Function} callback - Called with { code, message }
 */
export function onError(callback) {
  callbacks.onError = callback;
}

/**
 * Register callback for connection changes
 * @param {Function} callback - Called with boolean (true = connected)
 */
export function onConnectionChange(callback) {
  callbacks.onConnectionChange = callback;
}
