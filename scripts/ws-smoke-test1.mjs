#!/usr/bin/env node

/**
 * WebSocket Smoke Test
 *
 * Manual verification that Socket.IO events work end-to-end.
 * Requires the server to be running: npm run dev
 *
 * Usage: node scripts/ws-smoke-test.mjs
 *
 * What it tests:
 *   1. Create a game via HTTP (establishes session)
 *   2. Connect WebSocket with session cookie
 *   3. join_game → game_state
 *   4. move (valid) → move_made
 *   5. move (invalid) → error
 */

import { io } from 'socket.io-client';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const TIMEOUT_MS = 5000;

// ANSI colors for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

const pass = (msg) => console.log(`${GREEN}✓${RESET} ${msg}`);
const fail = (msg) => console.log(`${RED}✗${RESET} ${msg}`);
const info = (msg) => console.log(`${YELLOW}→${RESET} ${msg}`);
const header = (msg) => console.log(`\n${BOLD}${msg}${RESET}`);

/**
 * Makes an HTTP request and returns response + cookies
 */
async function httpRequest(path, options = {}) {
  const url = `${SERVER_URL}${path}`;
  const response = await fetch(url, {
    redirect: 'manual', // Don't follow redirects automatically
    ...options,
  });

  const cookies = response.headers.getSetCookie?.() || [];
  return { response, cookies };
}

/**
 * Creates a game via HTTP and returns gameId + session cookie
 */
async function createGame(existingCookie = null) {
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (existingCookie) {
    headers['Cookie'] = existingCookie;
  }

  const { response, cookies } = await httpRequest('/game/computer', {
    method: 'POST',
    headers,
    body: 'color=white',
  });

  // Should redirect to /game/:id
  const location = response.headers.get('location');
  if (!location) {
    throw new Error(`Expected redirect, got status ${response.status}`);
  }

  const gameId = location.split('/').pop();
  const sessionCookie = cookies.find((c) => c.startsWith('chess.sid='));

  return { gameId, sessionCookie, allCookies: cookies };
}

/**
 * Connects a Socket.IO client with the given session cookie
 */
function connectSocket(sessionCookie) {
  return new Promise((resolve, reject) => {
    const socket = io(SERVER_URL, {
      extraHeaders: {
        Cookie: sessionCookie,
      },
      transports: ['websocket'], // Skip polling, go straight to WebSocket
    });

    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Connection timeout'));
    }, TIMEOUT_MS);

    socket.on('connect', () => {
      clearTimeout(timeout);
      resolve(socket);
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`Connection failed: ${err.message}`));
    });
  });
}

/**
 * Emits an event and waits for a response event
 */
function emitAndWait(socket, emitEvent, emitData, waitEvent) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${waitEvent}`));
    }, TIMEOUT_MS);

    socket.once(waitEvent, (data) => {
      clearTimeout(timeout);
      resolve(data);
    });

    socket.emit(emitEvent, emitData);
  });
}

/**
 * Emits an event and waits for one of multiple possible response events
 */
function emitAndWaitAny(socket, emitEvent, emitData, waitEvents) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for one of: ${waitEvents.join(', ')}`));
    }, TIMEOUT_MS);

    const cleanup = () => {
      clearTimeout(timeout);
      waitEvents.forEach((event) => socket.off(event));
    };

    waitEvents.forEach((event) => {
      socket.once(event, (data) => {
        cleanup();
        resolve({ event, data });
      });
    });

    socket.emit(emitEvent, emitData);
  });
}

// --- Test Cases ---

async function testJoinGame(socket, gameId) {
  info(`Testing join_game for game ${gameId}`);

  const state = await emitAndWait(socket, 'join_game', { gameId }, 'game_state');

  if (!state.fen || !state.turn || !state.you?.color) {
    throw new Error(`Invalid game_state: ${JSON.stringify(state)}`);
  }

  pass(`join_game → game_state (fen: ${state.fen.slice(0, 20)}..., turn: ${state.turn}, color: ${state.you.color})`);
  return state;
}

async function testJoinGameMissingId(socket) {
  info('Testing join_game without gameId');

  const { event, data } = await emitAndWaitAny(socket, 'join_game', {}, ['game_state', 'error']);

  if (event !== 'error' || data.code !== 'MISSING_GAME_ID') {
    throw new Error(`Expected error MISSING_GAME_ID, got ${event}: ${JSON.stringify(data)}`);
  }

  pass(`join_game (no gameId) → error MISSING_GAME_ID`);
}

async function testJoinGameNotFound(socket) {
  info('Testing join_game with invalid gameId');

  const { event, data } = await emitAndWaitAny(socket, 'join_game', { gameId: 'nonexistent-id' }, ['game_state', 'error']);

  if (event !== 'error') {
    throw new Error(`Expected error, got ${event}: ${JSON.stringify(data)}`);
  }

  pass(`join_game (invalid gameId) → error ${data.code}`);
}

async function testValidMove(socket, gameId) {
  info('Testing valid move (e2-e4)');

  const { event, data } = await emitAndWaitAny(
    socket,
    'move',
    { gameId, from: 'e2', to: 'e4' },
    ['move_made', 'error']
  );

  if (event !== 'move_made') {
    throw new Error(`Expected move_made, got ${event}: ${JSON.stringify(data)}`);
  }

  if (data.from !== 'e2' || data.to !== 'e4') {
    throw new Error(`Move data mismatch: ${JSON.stringify(data)}`);
  }

  pass(`move e2-e4 → move_made (fen: ${data.fen.slice(0, 20)}...)`);
  return data;
}

async function testInvalidMove(socket, gameId) {
  info('Testing invalid move (e4-e6, pawn can\'t jump that far)');

  const { event, data } = await emitAndWaitAny(
    socket,
    'move',
    { gameId, from: 'e4', to: 'e6' },
    ['move_made', 'error']
  );

  if (event !== 'error') {
    throw new Error(`Expected error, got ${event}: ${JSON.stringify(data)}`);
  }

  pass(`move e4-e6 (invalid) → error ${data.code}`);
}

async function testMoveWrongTurn(socket, gameId) {
  info('Testing move when not your turn (white tries to move again)');

  // After e2-e4, it's black's turn. White (us) trying to move should fail.
  const { event, data } = await emitAndWaitAny(
    socket,
    'move',
    { gameId, from: 'd2', to: 'd4' },
    ['move_made', 'error']
  );

  if (event !== 'error' || data.code !== 'NOT_YOUR_TURN') {
    throw new Error(`Expected error NOT_YOUR_TURN, got ${event}: ${JSON.stringify(data)}`);
  }

  pass(`move d2-d4 (wrong turn) → error NOT_YOUR_TURN`);
}

async function testMoveMissingFields(socket) {
  info('Testing move without required fields');

  const { event, data } = await emitAndWaitAny(socket, 'move', { gameId: 'test' }, ['move_made', 'error']);

  if (event !== 'error' || data.code !== 'MISSING_FIELDS') {
    throw new Error(`Expected error MISSING_FIELDS, got ${event}: ${JSON.stringify(data)}`);
  }

  pass(`move (missing from/to) → error MISSING_FIELDS`);
}

// --- Main ---

async function main() {
  console.log(`${BOLD}WebSocket Smoke Test${RESET}`);
  console.log(`Server: ${SERVER_URL}\n`);

  let socket;
  let passed = 0;
  let failed = 0;

  try {
    // Step 1: Create a game via HTTP
    header('Step 1: Create game via HTTP');
    info('POST /game/computer');
    const { gameId, sessionCookie } = await createGame();
    pass(`Game created: ${gameId}`);
    pass(`Session cookie obtained: ${sessionCookie?.slice(0, 40)}...`);

    // Step 2: Connect WebSocket
    header('Step 2: Connect WebSocket');
    info('Connecting with session cookie...');
    socket = await connectSocket(sessionCookie);
    pass(`Connected (socket.id: ${socket.id})`);

    // Step 3: Test join_game
    header('Step 3: Test join_game');
    await testJoinGame(socket, gameId);
    passed++;

    await testJoinGameMissingId(socket);
    passed++;

    await testJoinGameNotFound(socket);
    passed++;

    // Step 4: Test move
    header('Step 4: Test move');
    await testValidMove(socket, gameId);
    passed++;

    await testInvalidMove(socket, gameId);
    passed++;

    await testMoveWrongTurn(socket, gameId);
    passed++;

    await testMoveMissingFields(socket);
    passed++;
  } catch (err) {
    fail(`${err.message}`);
    failed++;
    console.error(err);
  } finally {
    if (socket) {
      socket.disconnect();
      info('Socket disconnected');
    }
  }

  // Summary
  header('Summary');
  console.log(`Passed: ${GREEN}${passed}${RESET}`);
  console.log(`Failed: ${failed > 0 ? RED : GREEN}${failed}${RESET}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
