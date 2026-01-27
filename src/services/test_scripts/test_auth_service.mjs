/**
 * AuthService Test Script
 *
 * Run: node src/services/test_scripts/test_auth_service.mjs
 * Requires: Docker containers running (postgres, redis)
 */

import { pool } from '../../../db/index.mjs';
import { UserRepository } from '../../repositories/UserRepository.mjs';
import { GuestRepository } from '../../repositories/GuestRepository.mjs';
import { AuthService } from '../AuthService.mjs';

// Test user data
const TEST_USERNAME = `testuser_${Date.now()}`;
const TEST_PASSWORD = 'securePassword123';
const TEST_EMAIL = `test_${Date.now()}@example.com`;

let createdUserId = null;

async function runTests() {
  console.log('='.repeat(50));
  console.log('AuthService Test Script');
  console.log('='.repeat(50));
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log('');

  // Setup
  const userRepo = new UserRepository(pool);
  const guestRepo = new GuestRepository(pool);
  const authService = new AuthService(userRepo, guestRepo);

  try {
    // Test 1: Register new user (without email)
    console.log('Test 1: Register new user (without email)');
    console.log('-'.repeat(40));
    const registerResult = await authService.register(TEST_USERNAME, TEST_PASSWORD);
    console.log('Result:', JSON.stringify(registerResult, null, 2));

    if (registerResult.success) {
      createdUserId = registerResult.user.id;
      console.log('✓ Registration successful');
      console.log(`  - User ID: ${createdUserId}`);
      console.log(`  - is_test: ${registerResult.user.is_test}`);
      console.log(`  - is_deleted: ${registerResult.user.is_deleted}`);
      console.log(`  - password_hash present: ${'password_hash' in registerResult.user}`);
    } else {
      console.log('✗ Registration failed:', registerResult.error);
    }
    console.log('');

    // Test 2: Register with duplicate username
    console.log('Test 2: Register with duplicate username');
    console.log('-'.repeat(40));
    const duplicateResult = await authService.register(TEST_USERNAME, 'anotherPassword');
    console.log('Result:', JSON.stringify(duplicateResult, null, 2));

    if (!duplicateResult.success && duplicateResult.error === 'USERNAME_TAKEN') {
      console.log('✓ Correctly rejected duplicate username');
    } else {
      console.log('✗ Should have rejected duplicate username');
    }
    console.log('');

    // Test 3: Register with email
    console.log('Test 3: Register new user (with email)');
    console.log('-'.repeat(40));
    const withEmailUsername = `${TEST_USERNAME}_email`;
    const registerWithEmail = await authService.register(withEmailUsername, TEST_PASSWORD, TEST_EMAIL);
    console.log('Result:', JSON.stringify(registerWithEmail, null, 2));

    if (registerWithEmail.success) {
      console.log('✓ Registration with email successful');
      console.log(`  - Email: ${registerWithEmail.user.email}`);
      // Clean up this user too
      await pool.query('DELETE FROM users WHERE id = $1', [registerWithEmail.user.id]);
      console.log('  - Cleaned up test user with email');
    } else {
      console.log('✗ Registration with email failed:', registerWithEmail.error);
    }
    console.log('');

    // Test 4: Login with correct credentials
    console.log('Test 4: Login with correct credentials');
    console.log('-'.repeat(40));
    const loginResult = await authService.login(TEST_USERNAME, TEST_PASSWORD);
    console.log('Result:', JSON.stringify(loginResult, null, 2));

    if (loginResult.success) {
      console.log('✓ Login successful');
      console.log(`  - User ID matches: ${loginResult.user.id === createdUserId}`);
      console.log(`  - password_hash present: ${'password_hash' in loginResult.user}`);
    } else {
      console.log('✗ Login failed:', loginResult.error);
    }
    console.log('');

    // Test 5: Login with wrong password
    console.log('Test 5: Login with wrong password');
    console.log('-'.repeat(40));
    const wrongPassResult = await authService.login(TEST_USERNAME, 'wrongPassword');
    console.log('Result:', JSON.stringify(wrongPassResult, null, 2));

    if (!wrongPassResult.success && wrongPassResult.error === 'INVALID_CREDENTIALS') {
      console.log('✓ Correctly rejected wrong password');
    } else {
      console.log('✗ Should have rejected wrong password');
    }
    console.log('');

    // Test 6: Login with non-existent user
    console.log('Test 6: Login with non-existent user');
    console.log('-'.repeat(40));
    const noUserResult = await authService.login('nonexistent_user_xyz', TEST_PASSWORD);
    console.log('Result:', JSON.stringify(noUserResult, null, 2));

    if (!noUserResult.success && noUserResult.error === 'INVALID_CREDENTIALS') {
      console.log('✓ Correctly rejected non-existent user');
    } else {
      console.log('✗ Should have rejected non-existent user');
    }
    console.log('');

    // Test 7: Login with deleted user
    console.log('Test 7: Login with deleted user');
    console.log('-'.repeat(40));
    // Soft delete the user
    await userRepo.deleteUser('id', createdUserId);
    const deletedUserResult = await authService.login(TEST_USERNAME, TEST_PASSWORD);
    console.log('Result:', JSON.stringify(deletedUserResult, null, 2));

    if (!deletedUserResult.success && deletedUserResult.error === 'INVALID_CREDENTIALS') {
      console.log('✓ Correctly rejected deleted user');
    } else {
      console.log('✗ Should have rejected deleted user');
    }
    console.log('');

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    // Cleanup
    console.log('='.repeat(50));
    console.log('Cleanup');
    console.log('='.repeat(50));

    if (createdUserId) {
      // Hard delete for cleanup (since it's test data)
      await pool.query('DELETE FROM users WHERE id = $1', [createdUserId]);
      console.log(`Deleted test user: ${createdUserId}`);
    }

    await pool.end();
    console.log('Database connection closed');
    console.log('');
    console.log('All tests completed!');
  }
}

runTests();
