/**
 * ui.js - DOM Manipulation Module
 *
 * Handles all UI updates:
 * - Move history list
 * - Toast notifications
 * - Turn indicator
 * - Connection status
 * - Game over display
 */

// ----- Move History -----

/**
 * Add a move to the history list
 * @param {Object} move - { san, color }
 */
export function addMoveToHistory(move) {
  const $history = $('#move-history');

  if (move.color === 'w') {
    const moveNumber = $history.children('li').length + 1;
    $history.append(`
      <li class="grid grid-cols-[1fr_2fr_4fr] items-center px-3 py-1">
        <span class="text-gray-400">${moveNumber}.</span>
        <span>${move.san}</span>
        <span></span>
      </li>
    `);
  } else {
    const $lastRow = $history.children('li').last();
    const $lastSpan = $lastRow.children('span').last();
    $lastSpan.text(move.san);
  }

  // Auto-scroll to bottom
  const historyEl = $history.parent()[0];
  if (historyEl) {
    historyEl.scrollTop = historyEl.scrollHeight;
  }
}

/**
 * Clear move history
 */
export function clearMoveHistory() {
  $('#move-history').empty();
}

// ----- Toast Notifications -----

let toastContainer = null;

function ensureToastContainer() {
  if (toastContainer) return;

  toastContainer = document.createElement('div');
  toastContainer.id = 'toast-container';
  toastContainer.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2';
  document.body.appendChild(toastContainer);
}

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - 'success', 'error', 'info'
 * @param {number} duration - How long to show (ms)
 */
export function showToast(message, type = 'info', duration = 3000) {
  ensureToastContainer();

  const toast = document.createElement('div');

  const bgColors = {
    success: 'bg-lime-600',
    error: 'bg-red-600',
    info: 'bg-neutral-600',
  };

  toast.className = `
    ${bgColors[type] || bgColors.info}
    text-white px-4 py-3 rounded-lg shadow-lg
    transform transition-all duration-300
    translate-x-full opacity-0
    max-w-sm
  `.trim().replace(/\s+/g, ' ');

  toast.textContent = message;
  toastContainer.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('translate-x-full', 'opacity-0');
  });

  // Animate out and remove
  setTimeout(() => {
    toast.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ----- Turn Indicator -----

/**
 * Update the turn indicator
 * @param {boolean} isMyTurn - True if it's the local player's turn
 */
export function updateTurnIndicator(isMyTurn) {
  const $myInfo = $('.bg-lime-700\\/30').parent().parent();
  const $opponentInfo = $('div:contains("Opponent")').closest('.bg-neutral-800\\/50');

  if (isMyTurn) {
    // Highlight my info box
    $myInfo.addClass('ring-2 ring-lime-500');
    $opponentInfo.removeClass('ring-2 ring-lime-500');
  } else {
    // Highlight opponent info box
    $opponentInfo.addClass('ring-2 ring-lime-500');
    $myInfo.removeClass('ring-2 ring-lime-500');
  }
}

// ----- Connection Status -----

let connectionIndicator = null;

/**
 * Show connection status
 * @param {boolean} connected - True if connected
 */
export function showConnectionStatus(connected) {
  if (!connectionIndicator) {
    connectionIndicator = document.createElement('div');
    connectionIndicator.id = 'connection-status';
    connectionIndicator.className = 'fixed bottom-4 right-4 px-3 py-1 rounded-full text-sm font-medium transition-all duration-300';
    document.body.appendChild(connectionIndicator);
  }

  if (connected) {
    connectionIndicator.className = connectionIndicator.className.replace(/bg-\w+-\d+/g, '');
    connectionIndicator.classList.add('bg-lime-600', 'text-white');
    connectionIndicator.textContent = 'Connected';

    // Hide after 2 seconds when connected
    setTimeout(() => {
      connectionIndicator.classList.add('opacity-0');
    }, 2000);
  } else {
    connectionIndicator.className = connectionIndicator.className.replace(/bg-\w+-\d+/g, '');
    connectionIndicator.classList.remove('opacity-0');
    connectionIndicator.classList.add('bg-red-600', 'text-white');
    connectionIndicator.textContent = 'Disconnected';
  }
}

// ----- Game Over Display -----

/**
 * Show game over message
 * @param {string} result - 'white', 'black', 'draw'
 * @param {string} reason - 'checkmate', 'stalemate', etc.
 */
export function showGameOver(result, reason) {
  let title = '';
  let subtitle = '';

  switch (result) {
    case 'white':
      title = 'White Wins!';
      break;
    case 'black':
      title = 'Black Wins!';
      break;
    case 'draw':
      title = 'Draw!';
      break;
    default:
      title = 'Game Over';
  }

  switch (reason) {
    case 'checkmate':
      subtitle = 'by Checkmate';
      break;
    case 'stalemate':
      subtitle = 'by Stalemate';
      break;
    case 'insufficient_material':
      subtitle = 'Insufficient Material';
      break;
    case 'threefold_repetition':
      subtitle = 'Threefold Repetition';
      break;
    case 'fifty_move_rule':
      subtitle = 'Fifty Move Rule';
      break;
    default:
      subtitle = reason || '';
  }

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'game-over-overlay';
  overlay.className = `
    fixed inset-0 bg-black/70 flex items-center justify-center z-50
    opacity-0 transition-opacity duration-300
  `.trim().replace(/\s+/g, ' ');

  overlay.innerHTML = `
    <div class="bg-neutral-800 rounded-xl p-8 text-center transform scale-90 transition-transform duration-300">
      <h2 class="text-3xl font-bold text-white mb-2">${title}</h2>
      <p class="text-gray-400 mb-6">${subtitle}</p>
      <button
        id="game-over-dismiss"
        class="px-6 py-2 bg-lime-600 hover:bg-lime-500 text-white font-bold rounded-lg transition"
      >
        OK
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  // Animate in
  requestAnimationFrame(() => {
    overlay.classList.remove('opacity-0');
    overlay.querySelector('div').classList.remove('scale-90');
  });

  // Dismiss handler
  document.getElementById('game-over-dismiss').addEventListener('click', () => {
    overlay.classList.add('opacity-0');
    setTimeout(() => overlay.remove(), 300);
  });
}

// ----- Player Info Updates -----

/**
 * Update player display name
 * @param {string} position - 'you' or 'opponent'
 * @param {string} name - Display name
 */
export function setPlayerName(position, name) {
  if (position === 'you') {
    $('span:contains("You")').first().text(name);
  } else {
    $('span:contains("Opponent")').first().text(name);
  }
}

/**
 * Set player color indicator
 * @param {string} color - 'w' or 'b'
 */
export function setPlayerColor(color) {
  const $myAvatar = $('.bg-lime-700\\/30');
  $myAvatar.text(color === 'w' ? 'W' : 'B');
}
