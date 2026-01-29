#!/usr/bin/env node

/**
 * WebSocket Smoke Test v2
 *
 * Comprehensive verification of Socket.IO events.
 * Requires the server to be running: npm run dev
 *
 * Usage: node scripts/ws-smoke-test.mjs
 *
 * Test Suites:
 *   1. Single-player (computer game) - basic event flow
 *   2. Two-player (friend game) - multiplayer broadcast
 *   3. Authorization - reject unauthorized access
 */

// import 'dotenv/config';
import { io } from 'socket.io-client';
import { testDEBUG } from '../utils/debug.mjs';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const TIMEOUT_MS = 5000;

// ANSI colors for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

const pass = (msg) => console.log(`  ${GREEN}✓${RESET} ${msg}`);
const fail = (msg) => console.log(`  ${RED}✗${RESET} ${msg}`);
const info = (msg) => console.log(`  ${DIM}${msg}${RESET}`);
const suite = (msg) => console.log(`\n${CYAN}${BOLD}▶ ${msg}${RESET}`);
const header = (msg) => console.log(`\n${BOLD}${msg}${RESET}`);

let passed = 0;
let failed = 0;

function recordPass(msg) {
  pass(msg);
  passed++;
}

function recordFail(msg, err) {
  fail(msg);
  if (err) console.log(`    ${RED}${err.message}${RESET}`);
  failed++;
}

// --- HTTP Helpers ---

/**
 * Makes an HTTP request and returns response + cookies
 */
async function httpRequest(path, options = {}) {
  const url = `${SERVER_URL}${path}`;
  const response = await fetch(url, {
    redirect: 'manual',
    ...options,
  });

  const cookies = response.headers.getSetCookie?.() || [];
  return { response, cookies };
}

/**
 * Creates a new session by hitting the home page
 * Returns the session cookie
 */
async function createSession() {
  // Hit /game/sandbox to trigger ensureSubject and get a session
  // Actually, /game/* routes have ensureSubject, so we need to hit a game route
  // Let's create a computer game which will establish the session
  const { response, cookies } = await httpRequest('/game/computer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'color=white',
  });

  const sessionCookie = cookies.find((c) => c.startsWith('chess.sid='));
  const location = response.headers.get('location');
  const gameId = location?.split('/').pop();

  return { sessionCookie, gameId };
}

/**
 * Creates a computer game and returns gameId + session cookie
 */
async function createComputerGame(existingCookie = null) {
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (existingCookie) headers['Cookie'] = existingCookie;

  const { response, cookies } = await httpRequest('/game/computer', {
    method: 'POST',
    headers,
    body: 'color=white',
  });

  const location = response.headers.get('location');
  if (!location) throw new Error(`Expected redirect, got status ${response.status}`);

  const gameId = location.split('/').pop();
  const sessionCookie = existingCookie || cookies.find((c) => c.startsWith('chess.sid='));

  return { gameId, sessionCookie };
}

/**
 * Creates a friend game and returns gameId, joinCode, and session cookie
 */
async function createFriendGame(existingCookie = null) {
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (existingCookie) headers['Cookie'] = existingCookie;

  const { response, cookies } = await httpRequest('/game/friend', {
    method: 'POST',
    headers,
    body: 'color=white',
  });

  // Friend game returns JSON (not redirect) with joinCode
  const data = await response.json();
  const sessionCookie = existingCookie || cookies.find((c) => c.startsWith('chess.sid='));

  return { gameId: data.gameId, joinCode: data.joinCode, sessionCookie };
}

/**
 * Joins a friend game using a join code
 */
async function joinFriendGame(joinCode, existingCookie = null) {
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (existingCookie) headers['Cookie'] = existingCookie;

  const { response, cookies } = await httpRequest('/game/join', {
    method: 'POST',
    headers,
    body: `joinCode=${joinCode}`,
  });

  const location = response.headers.get('location');
  if (!location) throw new Error(`Expected redirect, got status ${response.status}`);

  const gameId = location.split('/').pop();
  const sessionCookie = existingCookie || cookies.find((c) => c.startsWith('chess.sid='));

  return { gameId, sessionCookie };
}

// --- Socket Helpers ---

/**
 * Connects a Socket.IO client with the given session cookie
 */
function connectSocket(sessionCookie) {
  testDEBUG('connectSocket: cookie=%s...', sessionCookie?.slice(0, 30));
  return new Promise((resolve, reject) => {
    const socket = io(SERVER_URL, {
      extraHeaders: { Cookie: sessionCookie },
      transports: ['websocket'],
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
 * Emits an event and waits for one of multiple possible response events
 * Always use this to catch unexpected errors
 */
function emitAndWait(socket, emitEvent, emitData, waitEvents) {
  if (!Array.isArray(waitEvents)) waitEvents = [waitEvents];

  testDEBUG('EMIT %s → %o (waiting for: %s)', emitEvent, emitData, waitEvents.join('|'));

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      testDEBUG('TIMEOUT waiting for %s', waitEvents.join('|'));
      reject(new Error(`Timeout waiting for: ${waitEvents.join(' or ')}`));
    }, TIMEOUT_MS);

    const cleanup = () => {
      clearTimeout(timeout);
      waitEvents.forEach((event) => socket.off(event));
    };

    waitEvents.forEach((event) => {
      socket.once(event, (data) => {
        cleanup();
        testDEBUG('RECV %s → %o', event, data);
        resolve({ event, data });
      });
    });

    socket.emit(emitEvent, emitData);
  });
}

/**
 * Waits for an event without emitting (for broadcast verification)
 */
function waitForEvent(socket, eventName, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(eventName);
      reject(new Error(`Timeout waiting for ${eventName}`));
    }, timeoutMs);

    socket.once(eventName, (data) => {
      clearTimeout(timeout);
      resolve(data);
    });
  });
}

// --- Test Utilities ---

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, field) {
  if (actual !== expected) {
    throw new Error(`Expected ${field} to be '${expected}', got '${actual}'`);
  }
}

// =============================================================================
// TEST SUITE 1: Single-Player (Computer Game)
// =============================================================================

async function testSinglePlayer() {
  suite('Single-Player Tests (Computer Game)');
  testDEBUG('=== SINGLE-PLAYER SUITE START ===');

  let socket;
  let gameId;
  let sessionCookie;

  try {
    // Setup: Create game and connect
    info('Creating computer game...');
    testDEBUG('Creating computer game (no existing cookie)');
    ({ gameId, sessionCookie } = await createComputerGame());
    testDEBUG('Game created: gameId=%s, cookie=%s...', gameId, sessionCookie?.slice(0, 30));
    info(`Game: ${gameId}`);

    testDEBUG('Connecting socket');
    socket = await connectSocket(sessionCookie);
    testDEBUG('Socket connected: socketId=%s', socket.id);
    info(`Socket connected: ${socket.id}`);

    // Test: join_game success
    testDEBUG('TEST: join_game success');
    {
      const { event, data } = await emitAndWait(
        socket,
        'join_game',
        { gameId },
        ['game_state', 'error']
      );
      try {
        assertEqual(event, 'game_state', 'event');
        assert(data.fen, 'game_state should have fen');
        assert(data.turn, 'game_state should have turn');
        assert(data.you?.color, 'game_state should have you.color');
        recordPass(`join_game → game_state (turn: ${data.turn}, color: ${data.you.color})`);
      } catch (err) {
        recordFail('join_game → game_state', err);
      }
    }

    // Test: join_game missing gameId
    testDEBUG('TEST: join_game missing gameId');
    {
      const { event, data } = await emitAndWait(
        socket,
        'join_game',
        {},
        ['game_state', 'error']
      );
      try {
        assertEqual(event, 'error', 'event');
        assertEqual(data.code, 'MISSING_GAME_ID', 'error code');
        recordPass('join_game (no gameId) → error MISSING_GAME_ID');
      } catch (err) {
        recordFail('join_game (no gameId) → error MISSING_GAME_ID', err);
      }
    }

    // Test: join_game invalid gameId
    testDEBUG('TEST: join_game invalid gameId');
    {
      const { event, data } = await emitAndWait(
        socket,
        'join_game',
        { gameId: 'nonexistent-game-id' },
        ['game_state', 'error']
      );
      try {
        assertEqual(event, 'error', 'event');
        assertEqual(data.code, 'GAME_NOT_FOUND', 'error code');
        recordPass('join_game (invalid gameId) → error GAME_NOT_FOUND');
      } catch (err) {
        recordFail('join_game (invalid gameId) → error GAME_NOT_FOUND', err);
      }
    }

    // Test: move success (e2-e4)
    testDEBUG('TEST: move success (e2-e4)');
    {
      const { event, data } = await emitAndWait(
        socket,
        'move',
        { gameId, from: 'e2', to: 'e4' },
        ['move_made', 'error']
      );
      try {
        assertEqual(event, 'move_made', 'event');
        assertEqual(data.from, 'e2', 'from');
        assertEqual(data.to, 'e4', 'to');
        assert(data.fen, 'move_made should have fen');
        recordPass('move e2-e4 → move_made');
      } catch (err) {
        recordFail('move e2-e4 → move_made', err);
      }
    }

    // Test: move NOT_YOUR_TURN (white tries to move again)
    testDEBUG('TEST: move NOT_YOUR_TURN');
    {
      const { event, data } = await emitAndWait(
        socket,
        'move',
        { gameId, from: 'd2', to: 'd4' },
        ['move_made', 'error']
      );
      try {
        assertEqual(event, 'error', 'event');
        assertEqual(data.code, 'NOT_YOUR_TURN', 'error code');
        recordPass('move d2-d4 (wrong turn) → error NOT_YOUR_TURN');
      } catch (err) {
        recordFail('move d2-d4 (wrong turn) → error NOT_YOUR_TURN', err);
      }
    }

    // Test: move missing fields
    testDEBUG('TEST: move missing fields');
    {
      const { event, data } = await emitAndWait(
        socket,
        'move',
        { gameId },
        ['move_made', 'error']
      );
      try {
        assertEqual(event, 'error', 'event');
        assertEqual(data.code, 'MISSING_FIELDS', 'error code');
        recordPass('move (missing from/to) → error MISSING_FIELDS');
      } catch (err) {
        recordFail('move (missing from/to) → error MISSING_FIELDS', err);
      }
    }

    // Need a fresh game to test INVALID_MOVE (current game has e2-e4 played)
    info('Creating fresh game for INVALID_MOVE test...');
    testDEBUG('Disconnecting old socket');
    socket.disconnect();

    testDEBUG('Creating fresh computer game with existing session');
    const fresh = await createComputerGame(sessionCookie);
    testDEBUG('Fresh game created: gameId=%s', fresh.gameId);

    testDEBUG('Connecting new socket');
    socket = await connectSocket(sessionCookie);
    testDEBUG('New socket connected: socketId=%s', socket.id);

    // Join the fresh game first
    testDEBUG('Joining fresh game');
    const freshJoinResult = await emitAndWait(socket, 'join_game', { gameId: fresh.gameId }, ['game_state', 'error']);
    testDEBUG('Fresh game join result: event=%s', freshJoinResult.event);

    // Test: move INVALID_MOVE (e2-e5 is illegal - pawn can't move 3 squares)
    testDEBUG('TEST: move INVALID_MOVE (e2-e5)');
    {
      const { event, data } = await emitAndWait(
        socket,
        'move',
        { gameId: fresh.gameId, from: 'e2', to: 'e5' },
        ['move_made', 'error']
      );
      try {
        assertEqual(event, 'error', 'event');
        assertEqual(data.code, 'INVALID_MOVE', 'error code');
        recordPass('move e2-e5 (illegal) → error INVALID_MOVE');
      } catch (err) {
        recordFail('move e2-e5 (illegal) → error INVALID_MOVE', err);
      }
    }
  } finally {
    if (socket) socket.disconnect();
  }
}

// =============================================================================
// TEST SUITE 2: Two-Player (Friend Game) - Multiplayer Broadcast
// =============================================================================

async function testTwoPlayer() {
  suite('Two-Player Tests (Friend Game Broadcast)');

  let socket1, socket2;
  let session1, session2;

  try {
    // Setup: Create friend game with player 1
    info('Player 1 creating friend game...');
    const { gameId, joinCode, sessionCookie: cookie1 } = await createFriendGame();
    session1 = cookie1;
    info(`Game: ${gameId}, Join code: ${joinCode}`);

    // Setup: Player 2 joins via join code (needs own session)
    info('Player 2 joining game...');
    // First create a session for player 2 by creating a throwaway game
    const { sessionCookie: cookie2 } = await createComputerGame();
    session2 = cookie2;

    // Now join the friend game with player 2's session
    await joinFriendGame(joinCode, session2);
    info('Player 2 joined');

    // Connect both players via WebSocket
    socket1 = await connectSocket(session1);
    socket2 = await connectSocket(session2);
    info(`Sockets connected: P1=${socket1.id}, P2=${socket2.id}`);

    // Both players join the game room
    const join1 = await emitAndWait(socket1, 'join_game', { gameId }, ['game_state', 'error']);
    const join2 = await emitAndWait(socket2, 'join_game', { gameId }, ['game_state', 'error']);

    try {
      assertEqual(join1.event, 'game_state', 'player 1 join event');
      assertEqual(join2.event, 'game_state', 'player 2 join event');
      assertEqual(join1.data.you.color, 'w', 'player 1 color');
      assertEqual(join2.data.you.color, 'b', 'player 2 color');
      recordPass('Both players joined game room (P1=white, P2=black)');
    } catch (err) {
      recordFail('Both players join game room', err);
      return; // Can't continue without both joined
    }

    // Test: Player 1 moves, BOTH players receive move_made (broadcast)
    {
      // Set up listener on socket2 BEFORE socket1 emits
      const p2Promise = waitForEvent(socket2, 'move_made');

      // Player 1 makes a move
      const p1Result = await emitAndWait(
        socket1,
        'move',
        { gameId, from: 'e2', to: 'e4' },
        ['move_made', 'error']
      );

      // Wait for player 2 to receive the broadcast
      const p2Data = await p2Promise;

      try {
        assertEqual(p1Result.event, 'move_made', 'P1 received event');
        assertEqual(p1Result.data.from, 'e2', 'P1 move from');
        assertEqual(p1Result.data.to, 'e4', 'P1 move to');
        assertEqual(p2Data.from, 'e2', 'P2 broadcast from');
        assertEqual(p2Data.to, 'e4', 'P2 broadcast to');
        recordPass('P1 moves e2-e4 → BOTH players receive move_made (broadcast works)');
      } catch (err) {
        recordFail('Broadcast: P1 moves, both receive move_made', err);
      }
    }

    // Test: Player 2 (black) makes a move, both receive
    {
      const p1Promise = waitForEvent(socket1, 'move_made');

      const p2Result = await emitAndWait(
        socket2,
        'move',
        { gameId, from: 'e7', to: 'e5' },
        ['move_made', 'error']
      );

      const p1Data = await p1Promise;

      try {
        assertEqual(p2Result.event, 'move_made', 'P2 received event');
        assertEqual(p1Data.from, 'e7', 'P1 broadcast from');
        assertEqual(p1Data.to, 'e5', 'P1 broadcast to');
        recordPass('P2 moves e7-e5 → BOTH players receive move_made');
      } catch (err) {
        recordFail('Broadcast: P2 moves, both receive move_made', err);
      }
    }

    // Test: Player 2 tries to move on white's turn
    {
      const { event, data } = await emitAndWait(
        socket2,
        'move',
        { gameId, from: 'd7', to: 'd5' },
        ['move_made', 'error']
      );
      try {
        assertEqual(event, 'error', 'event');
        assertEqual(data.code, 'NOT_YOUR_TURN', 'error code');
        recordPass('P2 moves on white turn → error NOT_YOUR_TURN');
      } catch (err) {
        recordFail('P2 moves on white turn → error NOT_YOUR_TURN', err);
      }
    }
  } finally {
    if (socket1) socket1.disconnect();
    if (socket2) socket2.disconnect();
  }
}

// =============================================================================
// TEST SUITE 3: Authorization (Reject Unauthorized Access)
// =============================================================================

async function testAuthorization() {
  suite('Authorization Tests (Reject Unauthorized)');

  let ownerSocket, strangerSocket;

  try {
    // Setup: Player 1 creates a computer game
    info('Owner creating game...');
    const { gameId, sessionCookie: ownerCookie } = await createComputerGame();
    info(`Game: ${gameId}`);

    // Setup: Stranger gets their own session (different guest)
    info('Stranger getting session...');
    const { sessionCookie: strangerCookie } = await createComputerGame();

    // Connect both
    ownerSocket = await connectSocket(ownerCookie);
    strangerSocket = await connectSocket(strangerCookie);
    info(`Sockets: owner=${ownerSocket.id}, stranger=${strangerSocket.id}`);

    // Owner joins their game (to make it active)
    await emitAndWait(ownerSocket, 'join_game', { gameId }, ['game_state', 'error']);

    // Test: Stranger tries to join_game they're not part of
    {
      const { event, data } = await emitAndWait(
        strangerSocket,
        'join_game',
        { gameId },
        ['game_state', 'error']
      );
      try {
        assertEqual(event, 'error', 'event');
        assertEqual(data.code, 'NOT_IN_GAME', 'error code');
        recordPass('Stranger join_game → error NOT_IN_GAME');
      } catch (err) {
        recordFail('Stranger join_game → error NOT_IN_GAME', err);
      }
    }

    // Test: Stranger tries to make a move in a game they're not part of
    {
      const { event, data } = await emitAndWait(
        strangerSocket,
        'move',
        { gameId, from: 'e2', to: 'e4' },
        ['move_made', 'error']
      );
      try {
        assertEqual(event, 'error', 'event');
        // GameService returns PLAYER_NOT_IN_GAME for move authorization
        assertEqual(data.code, 'PLAYER_NOT_IN_GAME', 'error code');
        recordPass('Stranger move → error PLAYER_NOT_IN_GAME');
      } catch (err) {
        recordFail('Stranger move → error PLAYER_NOT_IN_GAME', err);
      }
    }
  } finally {
    if (ownerSocket) ownerSocket.disconnect();
    if (strangerSocket) strangerSocket.disconnect();
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  header('WebSocket Smoke Test v2');
  console.log(`Server: ${SERVER_URL}`);

  try {
    await testSinglePlayer();
    await testTwoPlayer();
    await testAuthorization();
  } catch (err) {
    console.error(`\n${RED}Fatal error:${RESET}`, err);
    failed++;
  }

  // Summary
  header('Summary');
  console.log(`Passed: ${GREEN}${passed}${RESET}`);
  console.log(`Failed: ${failed > 0 ? RED : GREEN}${failed}${RESET}`);

  process.exit(failed > 0 ? 1 : 0);
}

main();
