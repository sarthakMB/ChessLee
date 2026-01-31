/**
 * game.js - Application Controller
 *
 * Entry point that orchestrates all modules:
 * - Route detection (sandbox vs multiplayer)
 * - Game state management
 * - Module coordination
 * - Button event handlers
 */

import {
  initBoard,
  makeMove,
  setPosition,
  resetBoard,
  toggleAttackersDisplay,
  setOrientation,
  getTurn,
} from './board.js';

import {
  joinGame,
  sendMove,
  onGameState,
  onMoveMade,
  onGameOver,
  onError,
  onConnectionChange,
} from './socket.js';

import {
  addMoveToHistory,
  clearMoveHistory,
  showToast,
  updateTurnIndicator,
  showConnectionStatus,
  showGameOver,
  setPlayerColor,
} from './ui.js';

// ----- Game State -----

const state = {
  gameId: null,
  myColor: null,
  isMyTurn: false,
  isSandbox: false,
};

// ----- Route Detection -----

function parseRoute() {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const isGameRoute = pathParts[0] === 'game';
  const isSandbox = isGameRoute && pathParts[1] === 'sandbox';
  const gameId = isGameRoute && !isSandbox ? pathParts[1] : null;

  return { isGameRoute, isSandbox, gameId };
}

// ----- Move Handling -----

/**
 * Called when a move is made on the board (local player)
 */
function handleLocalMove(move) {
  // Update move history UI
  addMoveToHistory(move);

  if (!state.isSandbox && state.gameId) {
    // Multiplayer: send move to server
    sendMove(move.from, move.to, move.promotion);
    state.isMyTurn = false;
    updateTurnIndicator(false);
  } else {
    // Sandbox: just update turn indicator for next move
    state.isMyTurn = true;
    updateTurnIndicator(true);
  }
}

/**
 * Called when opponent makes a move (via WebSocket)
 */
function handleOpponentMove(data) {
  // Make the move on the board
  const move = makeMove(data.from, data.to, data.promotion);

  if (move) {
    // Update move history
    addMoveToHistory({ san: move.san, color: move.color });
  }

  // Update turn
  state.isMyTurn = (data.turn === state.myColor);
  updateTurnIndicator(state.isMyTurn);

  // Check game over
  if (data.isGameOver) {
    // game_over event will handle display
  }
}

// ----- Socket Event Handlers -----

function setupSocketHandlers() {
  onConnectionChange((connected) => {
    showConnectionStatus(connected);
    if (!connected) {
      showToast('Connection lost. Reconnecting...', 'error');
    }
  });

  onGameState((data) => {
    console.log('[Game] Received game state:', data);

    // Set player color
    state.myColor = data.you.color;
    setPlayerColor(state.myColor);

    // Orient board to player's perspective
    setOrientation(state.myColor);

    // Set board position
    if (data.fen) {
      setPosition(data.fen);
    }

    // Determine if it's our turn
    state.isMyTurn = (data.turn === state.myColor);
    updateTurnIndicator(state.isMyTurn);

    showToast('Game joined!', 'success');
  });

  onMoveMade((data) => {
    // Only process opponent's moves (our moves are already on the board)
    const moveTurn = getTurn() === 'w' ? 'b' : 'w'; // Previous turn
    if (moveTurn !== state.myColor) {
      handleOpponentMove(data);
    } else {
      // Our own move was confirmed, just update turn indicator
      state.isMyTurn = (data.turn === state.myColor);
      updateTurnIndicator(state.isMyTurn);
    }
  });

  onGameOver((data) => {
    showGameOver(data.result, data.reason);
  });

  onError((data) => {
    showToast(data.message || 'An error occurred', 'error');
  });
}

// ----- Button Handlers -----

function setupButtonHandlers() {
  // Reset game button
  const resetBtn = document.getElementById('reset-game-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetBoard();
      clearMoveHistory();
      state.isMyTurn = true;
      updateTurnIndicator(true);
    });
  }

  // Attacker toggle buttons (sword emojis)
  const whiteSword = document.getElementById('white-sword');
  const blackSword = document.getElementById('black-sword');

  const handleAttackerToggle = () => {
    const isActive = toggleAttackersDisplay();
    const bgStyle = isActive ? 'rgba(150, 150, 150, 0.2)' : '';

    if (whiteSword) whiteSword.style.backgroundColor = bgStyle;
    if (blackSword) blackSword.style.backgroundColor = bgStyle;
  };

  if (whiteSword) whiteSword.addEventListener('click', handleAttackerToggle);
  if (blackSword) blackSword.addEventListener('click', handleAttackerToggle);

  // Resign button (placeholder)
  const resignBtn = document.getElementById('resign-btn');
  if (resignBtn) {
    resignBtn.addEventListener('click', () => {
      showToast('Resign feature coming soon', 'info');
    });
  }

  // Draw offer button (placeholder)
  const drawBtn = document.getElementById('offer-draw-btn');
  if (drawBtn) {
    drawBtn.addEventListener('click', () => {
      showToast('Draw offer feature coming soon', 'info');
    });
  }
}

// ----- Initialization -----

function init() {
  const route = parseRoute();

  state.isSandbox = route.isSandbox;
  state.gameId = route.gameId;

  console.log('[Game] Initializing...', { route, state });

  // Initialize board with move callback
  initBoard(handleLocalMove);

  // Setup button handlers
  setupButtonHandlers();

  if (state.isSandbox) {
    // Sandbox mode: local play only
    console.log('[Game] Sandbox mode');
    state.myColor = 'w';
    state.isMyTurn = true;
    updateTurnIndicator(true);
    showToast('Sandbox mode - play both sides', 'info');
  } else if (state.gameId) {
    // Multiplayer mode: connect to game
    console.log('[Game] Multiplayer mode, joining game:', state.gameId);
    setupSocketHandlers();
    joinGame(state.gameId);
  } else {
    // No game route - probably shouldn't be on this page
    console.warn('[Game] No game ID found');
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
