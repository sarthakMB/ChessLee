#!/usr/bin/env node

/**
 * WebSocket Test: Two-Player (Friend Game Broadcast)
 *
 * Tests multiplayer broadcast - both players receive moves.
 * Run: npm run test:ws:multi
 */

import {
  testDEBUG,
  suite,
  info,
  recordPass,
  recordFail,
  printSummary,
  createComputerGame,
  createFriendGame,
  joinFriendGame,
  connectSocket,
  emitAndWait,
  waitForEvent,
  assertEqual,
} from './test-helpers.mjs';

async function main() {
  suite('Two-Player Tests (Friend Game Broadcast)');
  testDEBUG('=== TWO-PLAYER SUITE START ===');

  let socket1, socket2;

  try {
    // Setup: Player 1 creates friend game
    info('Player 1 creating friend game...');
    testDEBUG('Creating friend game');
    const { gameId, joinCode, sessionCookie: session1 } = await createFriendGame();
    testDEBUG('Friend game created: gameId=%s, joinCode=%s', gameId, joinCode);
    info(`Game: ${gameId}, Join code: ${joinCode}`);

    // Setup: Player 2 gets a session and joins
    info('Player 2 joining game...');
    testDEBUG('Creating session for player 2');
    const { sessionCookie: session2 } = await createComputerGame();
    testDEBUG('Player 2 session created');

    testDEBUG('Player 2 joining friend game');
    await joinFriendGame(joinCode, session2);
    testDEBUG('Player 2 joined');
    info('Player 2 joined');

    // Connect both players
    testDEBUG('Connecting player 1 socket');
    socket1 = await connectSocket(session1);
    testDEBUG('Player 1 connected: socketId=%s', socket1.id);

    testDEBUG('Connecting player 2 socket');
    socket2 = await connectSocket(session2);
    testDEBUG('Player 2 connected: socketId=%s', socket2.id);
    info(`Sockets connected: P1=${socket1.id}, P2=${socket2.id}`);

    // Both join the game room
    testDEBUG('TEST 1: Both players join game room');
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
      throw new Error('Cannot continue without both players joined');
    }

    // Test 2: Player 1 moves, BOTH receive broadcast
    testDEBUG('TEST 2: P1 moves, both receive broadcast');
    {
      const p2Promise = waitForEvent(socket2, 'move_made');

      const p1Result = await emitAndWait(
        socket1,
        'move',
        { gameId, from: 'e2', to: 'e4' },
        ['move_made', 'error']
      );

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

    // Test 3: Player 2 moves, both receive
    testDEBUG('TEST 3: P2 moves, both receive broadcast');
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

    // Test 4: Player 2 tries to move on white's turn
    testDEBUG('TEST 4: P2 moves on wrong turn');
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
  } catch (err) {
    recordFail(`Fatal error: ${err.message}`, err);
  } finally {
    if (socket1) socket1.disconnect();
    if (socket2) socket2.disconnect();
  }

  process.exit(printSummary());
}

main();
