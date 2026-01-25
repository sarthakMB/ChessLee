/**
 * Repository Test Script
 *
 * Tests all four repositories: User, Guest, Game, Move
 * Run: node src/repositories/test_scripts/test_all_repositories.mjs
 */

import { pool } from '../../../db/index.mjs';
import {
  userRepository,
  guestRepository,
  gameRepository,
  moveRepository
} from '../index.mjs';

// Helper to print test results
function logTest(testName, passed, details = '') {
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status} - ${testName}`);
  if (details) console.log(`  ${details}`);
}

async function testUserRepository() {
  console.log('\n=== Testing UserRepository ===\n');

  try {
    // Test 1: Insert user
    const newUser = await userRepository.insertUser({
      username: 'testuser_' + Date.now(),
      email: `test_${Date.now()}@example.com`,
      password_hash: '$2b$12$hashedpassword123',
      is_deleted: false,
      is_test: true
    });
    logTest('insertUser', newUser && newUser.id, `Created user: ${newUser.username}`);

    // Test 2: Find user by id
    const foundById = await userRepository.findUser('id', newUser.id);
    logTest('findUser by id', foundById && foundById.id === newUser.id, `Found: ${foundById.username}`);

    // Test 3: Find user by username
    const foundByUsername = await userRepository.findUser('username', newUser.username);
    logTest('findUser by username', foundByUsername && foundByUsername.username === newUser.username);

    // Test 4: Find user by email
    const foundByEmail = await userRepository.findUser('email', newUser.email);
    logTest('findUser by email', foundByEmail && foundByEmail.email === newUser.email);

    // Test 5: Delete user (soft delete)
    const deleteCount = await userRepository.deleteUser('id', newUser.id);
    logTest('deleteUser', deleteCount === 1, `Soft deleted ${deleteCount} user(s)`);

    // Test 6: Verify soft delete (user should still be in DB but is_deleted = true)
    const deletedUser = await userRepository.findUser('id', newUser.id);
    logTest('Verify soft delete', deletedUser && deletedUser.is_deleted === true, 'User marked as deleted');

    return newUser;
  } catch (error) {
    console.error('UserRepository test failed:', error.message);
    throw error;
  }
}

async function testGuestRepository() {
  console.log('\n=== Testing GuestRepository ===\n');

  try {
    // Generate UUID for guest (normally done client-side)
    const guestId = crypto.randomUUID();

    // Test 1: Insert guest
    const newGuest = await guestRepository.insertGuest({
      id: guestId,
      session_id: 'test_session_' + Date.now(),
      is_deleted: false,
      is_test: true
    });
    logTest('insertGuest', newGuest && newGuest.id === guestId, `Created guest: ${newGuest.id}`);

    // Test 2: Find guest by id
    const foundGuest = await guestRepository.findGuest('id', guestId);
    logTest('findGuest by id', foundGuest && foundGuest.id === guestId);

    // Test 3: Delete guest (soft delete)
    const deleteCount = await guestRepository.deleteGuest('id', guestId);
    logTest('deleteGuest', deleteCount === 1, `Soft deleted ${deleteCount} guest(s)`);

    // Test 4: Verify soft delete
    const deletedGuest = await guestRepository.findGuest('id', guestId);
    logTest('Verify soft delete', deletedGuest && deletedGuest.is_deleted === true, 'Guest marked as deleted');

    return newGuest;
  } catch (error) {
    console.error('GuestRepository test failed:', error.message);
    throw error;
  }
}

async function testGameRepository() {
  console.log('\n=== Testing GameRepository ===\n');

  try {
    // Create a guest to own the game
    const guestId = crypto.randomUUID();
    await guestRepository.insertGuest({
      id: guestId,
      session_id: 'test_session_game_' + Date.now(),
      is_deleted: false,
      is_test: true
    });

    // Test 1: Insert computer game
    const computerGame = await gameRepository.insertGame({
      mode: 'computer',
      owner_id: guestId,
      owner_type: 'guest',
      owner_color: 'white',
      opponent_type: 'computer',
      opponent_color: 'black',
      is_deleted: false,
      is_test: true
    });
    logTest('insertGame (computer)', computerGame && computerGame.id, `Created game: ${computerGame.id}`);

    // Test 2: Insert friend game with join code
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const friendGame = await gameRepository.insertGame({
      mode: 'friend',
      owner_id: guestId,
      owner_type: 'guest',
      owner_color: 'white',
      join_code: joinCode,
      is_deleted: false,
      is_test: true
    });
    logTest('insertGame (friend)', friendGame && friendGame.join_code === joinCode, `Join code: ${joinCode}`);

    // Test 3: Find game by id
    const foundById = await gameRepository.findGame('id', computerGame.id);
    logTest('findGame by id', foundById && foundById.id === computerGame.id);

    // Test 4: Find game by join_code
    const foundByCode = await gameRepository.findGame('join_code', joinCode);
    logTest('findGame by join_code', foundByCode && foundByCode.join_code === joinCode);

    // Test 5: Find game by owner_id
    const foundByOwner = await gameRepository.findGame('owner_id', guestId);
    logTest('findGame by owner_id', foundByOwner && foundByOwner.owner_id === guestId, 'Note: Returns first match only');

    // Test 6: Delete game (soft delete)
    const deleteCount = await gameRepository.deleteGame('id', computerGame.id);
    logTest('deleteGame', deleteCount === 1, `Soft deleted ${deleteCount} game(s)`);

    // Test 7: Verify soft delete
    const deletedGame = await gameRepository.findGame('id', computerGame.id);
    logTest('Verify soft delete', deletedGame && deletedGame.is_deleted === true, 'Game marked as deleted');

    return friendGame;
  } catch (error) {
    console.error('GameRepository test failed:', error.message);
    throw error;
  }
}

async function testMoveRepository(gameId) {
  console.log('\n=== Testing MoveRepository ===\n');

  try {
    // Test 1: Insert first move
    const move1 = await moveRepository.insertMove({
      game_id: gameId,
      move_number: 1,
      player_color: 'white',
      move_san: 'e4',
      move_from: 'e2',
      move_to: 'e4',
      fen_after: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      is_deleted: false,
      is_test: true
    });
    logTest('insertMove (move 1)', move1 && move1.move_number === 1, `Move: ${move1.move_san}`);

    // Test 2: Insert second move
    const move2 = await moveRepository.insertMove({
      game_id: gameId,
      move_number: 2,
      player_color: 'black',
      move_san: 'e5',
      move_from: 'e7',
      move_to: 'e5',
      fen_after: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
      is_deleted: false,
      is_test: true
    });
    logTest('insertMove (move 2)', move2 && move2.move_number === 2, `Move: ${move2.move_san}`);

    // Test 3: Insert third move
    const move3 = await moveRepository.insertMove({
      game_id: gameId,
      move_number: 3,
      player_color: 'white',
      move_san: 'Nf3',
      move_from: 'g1',
      move_to: 'f3',
      fen_after: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
      is_deleted: false,
      is_test: true
    });
    logTest('insertMove (move 3)', move3 && move3.move_number === 3, `Move: ${move3.move_san}`);

    // Test 4: Find move by id
    const foundById = await moveRepository.findMove('id', move1.id);
    logTest('findMove by id', foundById && foundById.id === move1.id, `Found: ${foundById.move_san}`);

    // Test 5: Find all moves by game_id (should return array)
    const allMoves = await moveRepository.findMove('game_id', gameId);
    logTest('findMove by game_id', Array.isArray(allMoves) && allMoves.length === 3,
      `Found ${allMoves.length} moves: ${allMoves.map(m => m.move_san).join(', ')}`);

    // Test 6: Verify moves are ordered by move_number
    const isOrdered = allMoves.every((move, i) => move.move_number === i + 1);
    logTest('Moves ordered correctly', isOrdered, 'Ordered by move_number ASC');

    // Test 7: Delete move (soft delete)
    const deleteCount = await moveRepository.deleteMove('id', move1.id);
    logTest('deleteMove', deleteCount === 1, `Soft deleted ${deleteCount} move(s)`);

    // Test 8: Verify soft delete
    const deletedMove = await moveRepository.findMove('id', move1.id);
    logTest('Verify soft delete', deletedMove && deletedMove.is_deleted === true, 'Move marked as deleted');

  } catch (error) {
    console.error('MoveRepository test failed:', error.message);
    throw error;
  }
}

async function runAllTests() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   Repository Integration Test Suite   ║');
  console.log('╚════════════════════════════════════════╝');

  try {
    // Test repositories
    await testUserRepository();
    await testGuestRepository();
    const game = await testGameRepository();
    await testMoveRepository(game.id);

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║         All Tests Completed ✓          ║');
    console.log('╚════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n╔════════════════════════════════════════╗');
    console.error('║         Test Suite Failed ✗            ║');
    console.error('╚════════════════════════════════════════╝\n');
    console.error('Error:', error);
  } finally {
    // Close database connection
    await pool.end();
    console.log('Database connection closed.\n');
  }
}

// Run tests
runAllTests();
