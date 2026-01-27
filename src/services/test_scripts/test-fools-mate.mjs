#!/usr/bin/env node
/**
 * Test Script: Fool's Mate Demo
 *
 * Demonstrates the shortest possible checkmate in chess (2 moves).
 * Uses GameService to create a game and play out the moves.
 *
 * Fool's Mate sequence:
 * 1. f3 e5
 * 2. g4 Qh4#
 */

import { gameService } from '../index.mjs';

async function playFoolsMate() {
  console.log('🎯 Starting Fool\'s Mate Test\n');
  console.log('═══════════════════════════════════════\n');

  // Step 1: Create a new game
  console.log('📝 Creating a new game...');
  const createResult = await gameService.createGame(
    'friend',
    'player-white',
    'guest',
    'white'
  );

  if (!createResult.success) {
    console.error('❌ Failed to create game:', createResult.error);
    process.exit(1);
  }

  const gameId = createResult.data.game_id;
  console.log(`✅ Game created: ${gameId}\n`);

  // Step 2: Join the game as Black
  console.log('👥 Player 2 joining as Black...');
  const joinResult = await gameService.joinGame(
    createResult.data.join_code,
    'player-black',
    'guest'
  );

  if (!joinResult.success) {
    console.error('❌ Failed to join game:', joinResult.error);
    process.exit(1);
  }
  console.log('✅ Black player joined\n');

  console.log('♟️  Starting Fool\'s Mate sequence...\n');
  console.log('═══════════════════════════════════════\n');

  // Move 1: White plays f3
  console.log('Move 1 (White): f2-f3');
  let moveResult = await gameService.makeMove(
    gameId,
    'player-white',
    { from: 'f2', to: 'f3' }
  );

  if (!moveResult.success) {
    console.error('❌ Move failed:', moveResult.error);
    process.exit(1);
  }
  console.log(`   Move: ${moveResult.data.move.move_from}-${moveResult.data.move.move_to}${moveResult.data.move.promotion ? '=' + moveResult.data.move.promotion.toUpperCase() : ''}`);
  console.log(`   FEN: ${moveResult.data.fen}\n`);

  // Move 1: Black plays e5
  console.log('Move 1 (Black): e7-e5');
  moveResult = await gameService.makeMove(
    gameId,
    'player-black',
    { from: 'e7', to: 'e5' }
  );

  if (!moveResult.success) {
    console.error('❌ Move failed:', moveResult.error);
    process.exit(1);
  }
  console.log(`   Move: ${moveResult.data.move.move_from}-${moveResult.data.move.move_to}${moveResult.data.move.promotion ? '=' + moveResult.data.move.promotion.toUpperCase() : ''}`);
  console.log(`   FEN: ${moveResult.data.fen}\n`);

  // Move 2: White plays g4
  console.log('Move 2 (White): g2-g4');
  moveResult = await gameService.makeMove(
    gameId,
    'player-white',
    { from: 'g2', to: 'g4' }
  );

  if (!moveResult.success) {
    console.error('❌ Move failed:', moveResult.error);
    process.exit(1);
  }
  console.log(`   Move: ${moveResult.data.move.move_from}-${moveResult.data.move.move_to}${moveResult.data.move.promotion ? '=' + moveResult.data.move.promotion.toUpperCase() : ''}`);
  console.log(`   FEN: ${moveResult.data.fen}\n`);

  // Move 2: Black plays Qh4# (CHECKMATE!)
  console.log('Move 2 (Black): d8-h4 💀');
  moveResult = await gameService.makeMove(
    gameId,
    'player-black',
    { from: 'd8', to: 'h4' }
  );

  if (!moveResult.success) {
    console.error('❌ Move failed:', moveResult.error);
    process.exit(1);
  }
  console.log(`   Move: ${moveResult.data.move.move_from}-${moveResult.data.move.move_to}${moveResult.data.move.promotion ? '=' + moveResult.data.move.promotion.toUpperCase() : ''}`);
  console.log(`   FEN: ${moveResult.data.fen}`);
  console.log(`   Game Over: ${moveResult.data.isGameOver ? '✅ CHECKMATE!' : '❌ Not over?'}\n`);

  console.log('═══════════════════════════════════════\n');

  // Fetch final game state
  console.log('📊 Final Game State:');
  const finalState = await gameService.getGame(gameId);
  if (finalState.success) {
    console.log(`   Total moves: ${finalState.data.moveCount}`);
    console.log(`   Final FEN: ${finalState.data.fen}`);
    console.log('\n   Move history:');
    finalState.data.moves.forEach((move) => {
      const promotion = move.promotion ? '=' + move.promotion.toUpperCase() : '';
      console.log(`     ${move.move_number}. ${move.player_color}: ${move.move_from}-${move.move_to}${promotion}`);
    });
  }

  console.log('\n🎉 Fool\'s Mate completed successfully!\n');

  // Cleanup
  console.log('🧹 Cleaning up...');
  await gameService.deleteGame(gameId);
  console.log('✅ Game deleted\n');

  process.exit(0);
}

// Run the test
playFoolsMate().catch((err) => {
  console.error('\n💥 Unexpected error:', err);
  process.exit(1);
});
