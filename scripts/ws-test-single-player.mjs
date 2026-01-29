#!/usr/bin/env node

/**
 * WebSocket Test: Single-Player (Computer Game)
 *
 * Tests basic event flow with a computer game.
 * Run: npm run test:ws:single
 */

import {
  testDEBUG,
  suite,
  info,
  recordPass,
  recordFail,
  printSummary,
  createComputerGame,
  connectSocket,
  emitAndWait,
  assert,
  assertEqual,
  startTestServer,
  stopTestServer,
} from './test-helpers.mjs';

async function main() {
  // Start server in-process for synchronized debug output
  await startTestServer();

  suite('Single-Player Tests (Computer Game)');
  testDEBUG('=== SINGLE-PLAYER SUITE START ===');

  let socket;

  try {
    // Setup: Create game and connect
    info('Creating computer game...');
    testDEBUG('Creating computer game');
    const { gameId, sessionCookie } = await createComputerGame();
    testDEBUG('Game created: gameId=%s', gameId);
    info(`Game: ${gameId}`);

    testDEBUG('Connecting socket');
    socket = await connectSocket(sessionCookie);
    testDEBUG('Socket connected: socketId=%s', socket.id);
    info(`Socket connected: ${socket.id}`);

    // Test 1: join_game success
    testDEBUG('TEST 1: join_game success');
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

    // Test 2: join_game missing gameId
    testDEBUG('TEST 2: join_game missing gameId');
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

    // Test 3: join_game invalid gameId
    testDEBUG('TEST 3: join_game invalid gameId');
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

    // Test 4: move success (e2-e4)
    testDEBUG('TEST 4: move success (e2-e4)');
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

    // Test 5: move NOT_YOUR_TURN (white tries to move again)
    testDEBUG('TEST 5: move NOT_YOUR_TURN');
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

    // Test 6: move missing fields
    testDEBUG('TEST 6: move missing fields');
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

    // Test 7: INVALID_MOVE - needs fresh game
    info('Creating fresh game for INVALID_MOVE test...');
    testDEBUG('Disconnecting old socket');
    socket.disconnect();

    testDEBUG('Creating fresh computer game');
    const fresh = await createComputerGame(sessionCookie);
    testDEBUG('Fresh game created: gameId=%s', fresh.gameId);

    testDEBUG('Connecting new socket');
    socket = await connectSocket(sessionCookie);
    testDEBUG('New socket connected: socketId=%s', socket.id);

    testDEBUG('Joining fresh game');
    const freshJoinResult = await emitAndWait(socket, 'join_game', { gameId: fresh.gameId }, ['game_state', 'error']);
    testDEBUG('Fresh game join result: event=%s', freshJoinResult.event);

    testDEBUG('TEST 7: move INVALID_MOVE (e2-e5)');
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
  } catch (err) {
    recordFail(`Fatal error: ${err.message}`, err);
  } finally {
    if (socket) socket.disconnect();
    stopTestServer();
  }

  process.exit(printSummary());
}

main();
