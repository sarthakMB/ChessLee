#!/usr/bin/env node

/**
 * WebSocket Test: Authorization
 *
 * Tests that unauthorized players are rejected.
 * Run: npm run test:ws:auth
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
  assertEqual,
} from './test-helpers.mjs';

async function main() {
  suite('Authorization Tests (Reject Unauthorized)');
  testDEBUG('=== AUTHORIZATION SUITE START ===');

  let ownerSocket, strangerSocket;

  try {
    // Setup: Owner creates a game
    info('Owner creating game...');
    testDEBUG('Creating game for owner');
    const { gameId, sessionCookie: ownerCookie } = await createComputerGame();
    testDEBUG('Owner game created: gameId=%s', gameId);
    info(`Game: ${gameId}`);

    // Setup: Stranger gets their own session
    info('Stranger getting session...');
    testDEBUG('Creating session for stranger');
    const { sessionCookie: strangerCookie } = await createComputerGame();
    testDEBUG('Stranger session created');

    // Connect both
    testDEBUG('Connecting owner socket');
    ownerSocket = await connectSocket(ownerCookie);
    testDEBUG('Owner connected: socketId=%s', ownerSocket.id);

    testDEBUG('Connecting stranger socket');
    strangerSocket = await connectSocket(strangerCookie);
    testDEBUG('Stranger connected: socketId=%s', strangerSocket.id);
    info(`Sockets: owner=${ownerSocket.id}, stranger=${strangerSocket.id}`);

    // Owner joins their game
    testDEBUG('Owner joining their game');
    await emitAndWait(ownerSocket, 'join_game', { gameId }, ['game_state', 'error']);

    // Test 1: Stranger tries to join_game they're not part of
    testDEBUG('TEST 1: Stranger tries to join_game');
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

    // Test 2: Stranger tries to make a move
    testDEBUG('TEST 2: Stranger tries to move');
    {
      const { event, data } = await emitAndWait(
        strangerSocket,
        'move',
        { gameId, from: 'e2', to: 'e4' },
        ['move_made', 'error']
      );
      try {
        assertEqual(event, 'error', 'event');
        assertEqual(data.code, 'PLAYER_NOT_IN_GAME', 'error code');
        recordPass('Stranger move → error PLAYER_NOT_IN_GAME');
      } catch (err) {
        recordFail('Stranger move → error PLAYER_NOT_IN_GAME', err);
      }
    }
  } catch (err) {
    recordFail(`Fatal error: ${err.message}`, err);
  } finally {
    if (ownerSocket) ownerSocket.disconnect();
    if (strangerSocket) strangerSocket.disconnect();
  }

  process.exit(printSummary());
}

main();
