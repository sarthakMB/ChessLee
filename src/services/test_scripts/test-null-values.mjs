#!/usr/bin/env node
/**
 * Test Script: PostgreSQL NULL Value Handling
 *
 * Demonstrates how pg library returns NULL values from database queries.
 */

import { pool } from '../../../db/index.mjs';

async function testNullValues() {
  console.log('🔍 Testing PostgreSQL NULL value handling\n');
  console.log('═══════════════════════════════════════\n');

  try {
    // Test 1: Query games table where opponent_id might be NULL
    console.log('Test 1: Querying games with NULL opponent_id');
    const gameResult = await pool.query(
      'SELECT game_id, owner_id, opponent_id, join_code FROM games WHERE opponent_id IS NULL LIMIT 1'
    );

    if (gameResult.rows.length > 0) {
      const row = gameResult.rows[0];
      console.log('Row data:', row);
      console.log('opponent_id value:', row.opponent_id);
      console.log('opponent_id === null:', row.opponent_id === null);
      console.log('typeof opponent_id:', typeof row.opponent_id);
    } else {
      console.log('No games found with NULL opponent_id');
    }

    console.log('\n─────────────────────────────────────\n');

    // Test 2: Query with explicit NULL in SELECT
    console.log('Test 2: Selecting explicit NULL value');
    const nullResult = await pool.query(
      "SELECT 'test' as name, NULL as nullable_field, 123 as number"
    );

    const row = nullResult.rows[0];
    console.log('Row data:', row);
    console.log('nullable_field value:', row.nullable_field);
    console.log('nullable_field === null:', row.nullable_field === null);
    console.log('typeof nullable_field:', typeof row.nullable_field);

    console.log('\n─────────────────────────────────────\n');

    // Test 3: Check if NULL appears in JSON.stringify
    console.log('Test 3: JSON serialization of NULL values');
    const jsonString = JSON.stringify(row);
    console.log('JSON.stringify(row):', jsonString);
    console.log('Note: null is preserved in JSON\n');

    console.log('═══════════════════════════════════════\n');
    console.log('Summary:');
    console.log('- PostgreSQL NULL → JavaScript null');
    console.log('- typeof null === "object" (JavaScript quirk)');
    console.log('- Use === null or == null to check for NULL');
    console.log('- NULL is preserved in JSON serialization\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testNullValues();
