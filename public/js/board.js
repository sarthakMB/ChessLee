/**
 * board.js - Chess Board UI Module
 *
 * Handles all Chessboard.js interactions:
 * - Board initialization and configuration
 * - Piece drag/drop callbacks
 * - Square highlighting (legal moves, attacks)
 * - Move validation via chess.js
 */

import { Chess } from '/js/chess.js';

// Chess.js instance for move validation
const game = new Chess();

// Chessboard.js instance
let board = null;

// Callback for when a valid move is made
let onMoveCallback = null;

// Highlight colors
const colors = {
  whiteSquareGrey: '#a9a9a9',
  blackSquareGrey: '#696969',
  whiteSquareRed: '#c55',
  blackSquareRed: '#a33',
  whiteSquareOrange: '#a62',
  blackSquareOrange: '#951',
};

// Toggle state for attack visualization
let showAttackers = false;

// ----- Square Highlighting -----

function removeHighlights() {
  $('#myBoard .square-55d63').css('background', '');
}

function highlightSquare(square, color) {
  const $square = $('#myBoard .square-' + square);
  const isBlack = $square.hasClass('black-3c85d');

  let background;
  switch (color) {
    case 'grey':
      background = isBlack ? colors.blackSquareGrey : colors.whiteSquareGrey;
      break;
    case 'red':
      background = isBlack ? colors.blackSquareRed : colors.whiteSquareRed;
      break;
    case 'orange':
      background = isBlack ? colors.blackSquareOrange : colors.whiteSquareOrange;
      break;
    default:
      background = '';
  }

  $square.css('background', background);
}

function highlightLegalMoves(square) {
  const moves = game.moves({ square, verbose: true });
  if (moves.length === 0) return;

  highlightSquare(square, 'grey');
  moves.forEach(move => highlightSquare(move.to, 'grey'));
}

// ----- Attack Visualization -----

function swapColor(color) {
  return color === 'w' ? 'b' : 'w';
}

export function highlightAttacks(byColor, sideToMove) {
  if (!showAttackers) {
    removeHighlights();
    return;
  }

  if (byColor !== 'w' && byColor !== 'b') {
    byColor = game.turn();
  }

  const files = 'abcdefgh';
  const ranks = '12345678';

  for (const file of files) {
    for (const rank of ranks) {
      const square = file + rank;
      const attackers = game.attackers(square, sideToMove);
      const piece = game.get(square);

      if (attackers.length > 0 && piece && piece.color === byColor) {
        highlightSquare(square, 'orange');
      } else if (attackers.length > 0) {
        highlightSquare(square, 'red');
      }
    }
  }
}

export function toggleAttackersDisplay() {
  showAttackers = !showAttackers;
  highlightAttacks();
  return showAttackers;
}

// ----- Chessboard.js Callbacks -----

function onDragStart(source, piece) {
  // Don't pick up pieces if game is over
  if (game.isGameOver()) return false;

  // Only pick up pieces for the side to move
  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false;
  }
}

function onDrop(source, target) {
  removeHighlights();
  highlightAttacks();

  try {
    const move = game.move({
      from: source,
      to: target,
      promotion: 'q' // Always promote to queen for simplicity
    });

    // Notify game.js of the successful move
    if (onMoveCallback) {
      onMoveCallback({
        from: source,
        to: target,
        san: move.san,
        color: move.color,
        promotion: 'q'
      });
    }
  } catch {
    // Illegal move - snapback
    return 'snapback';
  }
}

function onMouseoverSquare(square) {
  highlightLegalMoves(square);
}

function onMouseoutSquare() {
  removeHighlights();
  highlightAttacks();
}

function onDragMove(newLocation, oldLocation, source) {
  removeHighlights();
  try {
    game.move({
      from: source,
      to: newLocation,
      promotion: 'q'
    });
    highlightAttacks(swapColor(game.turn()), swapColor(game.turn()));
    game.undo();
  } catch {
    return false;
  }
}

function onSnapEnd() {
  board.position(game.fen());
}

function onChange() {
  removeHighlights();
  highlightAttacks();
}

// ----- Public API -----

/**
 * Initialize the chess board
 * @param {Function} moveCallback - Called when a valid move is made
 */
export function initBoard(moveCallback) {
  onMoveCallback = moveCallback;

  const config = {
    draggable: true,
    position: 'start',
    onDragStart,
    onDrop,
    onMouseoutSquare,
    onMouseoverSquare,
    onChange,
    onDragMove,
    onSnapEnd,
    onDragEnd: onChange,
    pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
  };

  board = Chessboard('myBoard', config);
  highlightAttacks();

  // Handle window resize
  window.addEventListener('resize', () => board.resize());

  return board;
}

/**
 * Execute a move on the board (for opponent moves)
 */
export function makeMove(from, to, promotion = 'q') {
  try {
    const move = game.move({ from, to, promotion });
    board.position(game.fen());
    return move;
  } catch {
    console.error('Invalid move:', { from, to, promotion });
    return null;
  }
}

/**
 * Set board position from FEN
 */
export function setPosition(fen) {
  game.load(fen);
  board.position(fen);
}

/**
 * Reset board to starting position
 */
export function resetBoard() {
  game.reset();
  board.position('start');
}

/**
 * Get current FEN
 */
export function getFen() {
  return game.fen();
}

/**
 * Get whose turn it is ('w' or 'b')
 */
export function getTurn() {
  return game.turn();
}

/**
 * Check if game is over
 */
export function isGameOver() {
  return game.isGameOver();
}

/**
 * Set board orientation
 */
export function setOrientation(color) {
  board.orientation(color === 'w' ? 'white' : 'black');
}

/**
 * Get board orientation
 */
export function getOrientation() {
  return board.orientation();
}
