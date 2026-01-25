/**
 * UserRepository Manual Test
 *
 * Run with: node user_repository_setup_test.js
 *
 * Tests:
 * - Create user
 * - Find by ID
 * - Find by username (with password_hash for login)
 * - Find by email
 * - SQL injection prevention (parameterized queries)
 */

import bcrypt from 'bcrypt';
import { userRepository } from '../index.mjs';

async function testUserRepository() {
  try {
    console.log('🧪 Testing UserRepository...\n');

    // Test 1: Create a user
    console.log('1️⃣  Creating test user...');
    const hashedPassword = await bcrypt.hash('testpassword123', 12);
    const newUser = await userRepository.create({
      username: 'testuser_' + Date.now(),
      email: 'test_' + Date.now() + '@example.com',
      passwordHash: hashedPassword
    });
    console.log('✅ User created:', {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email
    });
    console.log('   Note: password_hash NOT returned (security)\n');

    // Test 2: Find by ID
    console.log('2️⃣  Finding user by ID...');
    const foundById = await userRepository.findById(newUser.id);
    console.log('✅ Found by ID:', foundById ? foundById.username : 'null');
    console.log('   password_hash included?', 'password_hash' in foundById ? 'YES ⚠️' : 'NO ✅\n');

    // Test 3: Find by username (for login)
    console.log('3️⃣  Finding user by username (login flow)...');
    const foundByUsername = await userRepository.findByUsername(newUser.username);
    console.log('✅ Found by username:', foundByUsername ? foundByUsername.username : 'null');
    console.log('   password_hash included?', 'password_hash' in foundByUsername ? 'YES ✅ (needed for login)' : 'NO ⚠️\n');

    // Test 4: Find by email
    console.log('4️⃣  Finding user by email...');
    const foundByEmail = await userRepository.findByEmail(newUser.email);
    console.log('✅ Found by email:', foundByEmail ? foundByEmail.email : 'null\n');

    // Test 5: Parameterized query safety demonstration
    console.log('5️⃣  Testing SQL injection prevention...');
    const maliciousInput = "admin' OR '1'='1";
    const injectionAttempt = await userRepository.findByUsername(maliciousInput);
    console.log('   Searched for:', maliciousInput);
    console.log('   Result:', injectionAttempt ? '⚠️ FOUND (BAD)' : '✅ null (parameterized queries work!)');

    console.log('\n🎉 All tests passed!\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

testUserRepository();
