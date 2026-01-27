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
    const result = await userRepository.insertUser({
      username: 'testuser_' + Date.now(),
      email: `test_${Date.now()}@example.com`,
      password_hash: '$2b$12$hashedpassword123',
      is_deleted: false,
      is_test: true
    });
    const newUser = result.data;
    logTest('insertUser', result.success && newUser.user_id, `Created user: ${newUser.user_id}`);

    // Test 2: Find user by user_id
    const foundById = await userRepository.findUser('user_id', newUser.user_id);
    logTest('findUser by user_id', foundById && foundById.user_id === newUser.user_id, `Found: ${foundById.username}`);

    // Test 3: Find user by username
    const foundByUsername = await userRepository.findUser('username', newUser.username);
    logTest('findUser by username', foundByUsername && foundByUsername.username === newUser.username);

    // Test 4: Find user by email
    const foundByEmail = await userRepository.findUser('email', newUser.email);
    logTest('findUser by email', foundByEmail && foundByEmail.email === newUser.email);

    // Test 5: Delete user (soft delete)
    const deleteCount = await userRepository.deleteUser('user_id', newUser.user_id);
    logTest('deleteUser', deleteCount === 1, `Soft deleted ${deleteCount} user(s)`);

    // Test 6: Verify soft delete (user should still be in DB but is_deleted = true)
    const deletedUser = await userRepository.findUser('user_id', newUser.user_id);
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
    // Test 1: Insert guest (DB generates T-prefixed ID)
    const result = await guestRepository.insertGuest({
      session_id: 'test_session_' + Date.now(),
      is_deleted: false,
      is_test: true
    });
    const newGuest = result.data;
    logTest('insertGuest', result.success && newGuest.guest_id, `Created guest: ${newGuest.guest_id}`);

    // Test 2: Verify guest_id has T prefix
    logTest('guest_id has T prefix', newGuest.guest_id.startsWith('T'), `ID: ${newGuest.guest_id}`);

    // Test 3: Find guest by guest_id
    const foundGuest = await guestRepository.findGuest('guest_id', newGuest.guest_id);
    logTest('findGuest by guest_id', foundGuest && foundGuest.guest_id === newGuest.guest_id);

    // Test 4: Delete guest (soft delete)
    const deleteCount = await guestRepository.deleteGuest('guest_id', newGuest.guest_id);
    logTest('deleteGuest', deleteCount === 1, `Soft deleted ${deleteCount} guest(s)`);

    // Test 5: Verify soft delete
    const deletedGuest = await guestRepository.findGuest('guest_id', newGuest.guest_id);
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
    // Create a guest to own the game (DB generates T-prefixed ID)
    const guestResult = await guestRepository.insertGuest({
      session_id: 'test_session_game_' + Date.now(),
      is_deleted: false,
      is_test: true
    });
    const guest = guestResult.data;

    // Test 1: Insert computer game (DB generates G-prefixed ID)
    const computerGameResult = await gameRepository.insertGame({
      mode: 'computer',
      owner_id: guest.guest_id,
      owner_type: 'guest',
      owner_color: 'white',
      opponent_type: 'computer',
      opponent_color: 'black',
      is_deleted: false,
      is_test: true
    });
    const computerGame = computerGameResult.data;
    logTest('insertGame (computer)', computerGameResult.success && computerGame.game_id, `Created game: ${computerGame.game_id}`);

    // Test 2: Verify game_id has G prefix
    logTest('game_id has G prefix', computerGame.game_id.startsWith('G'), `ID: ${computerGame.game_id}`);

    // Test 3: Insert friend game with join code
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const friendGameResult = await gameRepository.insertGame({
      mode: 'friend',
      owner_id: guest.guest_id,
      owner_type: 'guest',
      owner_color: 'white',
      join_code: joinCode,
      is_deleted: false,
      is_test: true
    });
    const friendGame = friendGameResult.data;
    logTest('insertGame (friend)', friendGameResult.success && friendGame.join_code === joinCode, `Join code: ${joinCode}`);

    // Test 4: Find game by game_id
    const foundById = await gameRepository.findGame('game_id', computerGame.game_id);
    logTest('findGame by game_id', foundById && foundById.game_id === computerGame.game_id);

    // Test 5: Find game by join_code
    const foundByCode = await gameRepository.findGame('join_code', joinCode);
    logTest('findGame by join_code', foundByCode && foundByCode.join_code === joinCode);

    // Test 6: Find game by owner_id
    const foundByOwner = await gameRepository.findGame('owner_id', guest.guest_id);
    logTest('findGame by owner_id', foundByOwner && foundByOwner.owner_id === guest.guest_id, 'Note: Returns first match only');

    // Test 7: Delete game (soft delete)
    const deleteCount = await gameRepository.deleteGame('game_id', computerGame.game_id);
    logTest('deleteGame', deleteCount === 1, `Soft deleted ${deleteCount} game(s)`);

    // Test 8: Verify soft delete
    const deletedGame = await gameRepository.findGame('game_id', computerGame.game_id);
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
    const move1Result = await moveRepository.insertMove({
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
    const move1 = move1Result.data;
    logTest('insertMove (move 1)', move1Result.success && move1.move_number === 1, `Move: ${move1.move_san}`);

    // Test 2: Insert second move
    const move2Result = await moveRepository.insertMove({
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
    const move2 = move2Result.data;
    logTest('insertMove (move 2)', move2Result.success && move2.move_number === 2, `Move: ${move2.move_san}`);

    // Test 3: Insert third move
    const move3Result = await moveRepository.insertMove({
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
    const move3 = move3Result.data;
    logTest('insertMove (move 3)', move3Result.success && move3.move_number === 3, `Move: ${move3.move_san}`);

    // Test 4: Find all moves by game_id (should return array)
    const allMoves = await moveRepository.findMove('game_id', gameId);
    logTest('findMove by game_id', Array.isArray(allMoves) && allMoves.length === 3,
      `Found ${allMoves.length} moves: ${allMoves.map(m => m.move_san).join(', ')}`);

    // Test 5: Verify moves are ordered by move_number
    const isOrdered = allMoves.every((move, i) => move.move_number === i + 1);
    logTest('Moves ordered correctly', isOrdered, 'Ordered by move_number ASC');

    // Test 6: Delete move by game_id (soft delete all moves for game)
    const deleteCount = await moveRepository.deleteMove('game_id', gameId);
    logTest('deleteMove by game_id', deleteCount === 3, `Soft deleted ${deleteCount} move(s)`);

    // Test 7: Verify soft delete
    const deletedMoves = await moveRepository.findMove('game_id', gameId);
    const allDeleted = deletedMoves.every(m => m.is_deleted === true);
    logTest('Verify soft delete', allDeleted, 'All moves marked as deleted');

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
    await testMoveRepository(game.game_id);

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
