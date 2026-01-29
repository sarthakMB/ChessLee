/**
 * Shared test helpers for WebSocket smoke tests
 */

import 'dotenv/config';  // Must be first - debug reads DEBUG env at import time
import { io } from 'socket.io-client';
import { testDEBUG } from '../utils/debug.mjs';

export { testDEBUG };

// Server reference (set by startTestServer)
let serverInstance = null;

export const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

/**
 * Start the server in-process. All debug output will be in same stdout.
 */
export async function startTestServer() {
  testDEBUG('Starting server in-process...');
  const { server, serverReady } = await import('../src/app.mjs');
  await serverReady;
  serverInstance = server;
  testDEBUG('Server started on %s', SERVER_URL);
  return server;
}

/**
 * Stop the server.
 */
export function stopTestServer() {
  if (serverInstance) {
    testDEBUG('Stopping server...');
    serverInstance.close();
    serverInstance = null;
  }
}
export const TIMEOUT_MS = 5000;

// ANSI colors
export const GREEN = '\x1b[32m';
export const RED = '\x1b[31m';
export const CYAN = '\x1b[36m';
export const RESET = '\x1b[0m';
export const BOLD = '\x1b[1m';
export const DIM = '\x1b[2m';

// Counters
let passed = 0;
let failed = 0;

export const getResults = () => ({ passed, failed });
export const resetResults = () => { passed = 0; failed = 0; };

export const pass = (msg) => console.log(`  ${GREEN}✓${RESET} ${msg}`);
export const fail = (msg) => console.log(`  ${RED}✗${RESET} ${msg}`);
export const info = (msg) => console.log(`  ${DIM}${msg}${RESET}`);
export const suite = (msg) => console.log(`\n${CYAN}${BOLD}▶ ${msg}${RESET}`);
export const header = (msg) => console.log(`\n${BOLD}${msg}${RESET}`);

export function recordPass(msg) {
  pass(msg);
  passed++;
}

export function recordFail(msg, err) {
  fail(msg);
  if (err) console.log(`    ${RED}${err.message}${RESET}`);
  failed++;
}

// --- HTTP Helpers ---

export async function httpRequest(path, options = {}) {
  const url = `${SERVER_URL}${path}`;
  const response = await fetch(url, {
    redirect: 'manual',
    ...options,
  });

  const cookies = response.headers.getSetCookie?.() || [];
  return { response, cookies };
}

export async function createComputerGame(existingCookie = null) {
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

export async function createFriendGame(existingCookie = null) {
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (existingCookie) headers['Cookie'] = existingCookie;

  const { response, cookies } = await httpRequest('/game/friend', {
    method: 'POST',
    headers,
    body: 'color=white',
  });

  const data = await response.json();
  const sessionCookie = existingCookie || cookies.find((c) => c.startsWith('chess.sid='));

  return { gameId: data.gameId, joinCode: data.joinCode, sessionCookie };
}

export async function joinFriendGame(joinCode, existingCookie = null) {
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

export function connectSocket(sessionCookie) {
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

export function emitAndWait(socket, emitEvent, emitData, waitEvents) {
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

export function waitForEvent(socket, eventName, timeoutMs = TIMEOUT_MS) {
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

// --- Assertions ---

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function assertEqual(actual, expected, field) {
  if (actual !== expected) {
    throw new Error(`Expected ${field} to be '${expected}', got '${actual}'`);
  }
}

// --- Summary ---

export function printSummary() {
  header('Summary');
  console.log(`Passed: ${GREEN}${passed}${RESET}`);
  console.log(`Failed: ${failed > 0 ? RED : GREEN}${failed}${RESET}`);
  return failed > 0 ? 1 : 0;
}
