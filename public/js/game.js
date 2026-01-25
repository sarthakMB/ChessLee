// var board = Chessboard('myBoard', {
//   position: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
//   draggable: true,
//   pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
// });

// Responsive Resize
window.addEventListener('resize', function () {
  board.resize();
});

// // Initial resize to ensure correct rendering
// setTimeout(board.resize, 200);

// board.move('e2-e4');
// board.move('d2-d4', 'g8-f6')

import { Chess } from "/js/chess.js"

// Determine mode from URL: /game/sandbox vs /game/:id
const pathParts = window.location.pathname.split('/').filter(Boolean);
const isGameRoute = pathParts[0] === 'game';
const isSandboxGame = isGameRoute && pathParts[1] === 'sandbox';
const serverGameId = isGameRoute && !isSandboxGame ? pathParts[1] : null;

var board = null
var game = new Chess()
var whiteSquareGrey = '#a9a9a9'
var blackSquareGrey = '#696969'
var whiteSquareRed = '#c55'
var blackSquareRed = '#a33'
var whiteSquareOrange = '#a62'
var blackSquareOrange = '#951'
let toggleAttackers = false;

game.game_over = game.isGameOver;

function removeGreySquares() {
  $('#myBoard .square-55d63').css('background', '')
}

function greySquare(square) {
  var $square = $('#myBoard .square-' + square)

  var background = whiteSquareGrey
  if ($square.hasClass('black-3c85d')) {
    background = blackSquareGrey
  }

  $square.css('background', background)
}

function redSquare(square, attackers) {
  var $square = $('#myBoard .square-' + square)

  var background = whiteSquareRed
  if ($square.hasClass('black-3c85d')) {
    background = blackSquareRed
  }

  $square.css('background', background)
  // $square.append(`<div class=".notation-322f9 right-2">${attackers.length}</div>`);
}

function orangeSquare(square, attackers) {
  var $square = $('#myBoard .square-' + square)

  var background = whiteSquareOrange
  if ($square.hasClass('black-3c85d')) {
    background = blackSquareOrange
  }

  $square.css('background', background)
}

function onDragStart(source, piece) {
  // do not pick up pieces if the game is over
  if (game.game_over()) return false

  // or if it's not that side's turn
  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
    (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false
  }
}

function onDrop(source, target) {
  removeGreySquares()
  highlight_attacks();

  try {
    var move = game.move({
      from: source,
      to: target,
      promotion: 'q' // NOTE: always promote to a queen for example simplicity
    })

    // add move to #move-history
    add_move_to_list(move);

    // For non-sandbox games, notify backend about the move
    if (!isSandboxGame && serverGameId) {
      sendMoveToServer({
        from: source,
        to: target,
        promotion: 'q'
      });
    }
  } catch {
    // illegal move
    if (move === null) return 'snapback'
  }
}

function add_move_to_list(move) {
  if (move.color === 'w') {
    const move_number = $('#move-history').children('li').length + 1;
    $('#move-history').append(`<li class="grid grid-cols-[1fr_2fr_4fr] items-center px-3 py-1">
      <span class="text-gray-400">${move_number}.</span>
      <span>${move.san}</span>
      <span></span>
    </li>`);
  } else {
    var lastList = $('#move-history').children('li').last();
    var lastSpan = lastList.children('span').last();
    lastSpan.text(move.san);
  }
}

function onMouseoverSquare(square, piece) {
  // get list of possible moves for this square
  var moves = game.moves({
    square: square,
    verbose: true
  })

  // exit if there are no moves available for this square
  if (moves.length === 0) return

  // highlight the square they moused over
  greySquare(square)

  // highlight the possible squares for this piece
  for (var i = 0; i < moves.length; i++) {
    greySquare(moves[i].to)
  }
}

function onMouseoutSquare(square, piece) {
  removeGreySquares();
  highlight_attacks();
}

function onSnapEnd() {
  board.position(game.fen())
}

function swapColor(color) {
  return color === 'w' ? 'b' : 'w';
}

function onDragMove(newLocation, oldLocation, source,
  piece, position, orientation) {
  removeGreySquares();
  try {
    game.move({
      from: source,
      to: newLocation,
      promotion: 'q' // NOTE: always promote to a queen for example simplicity
    })
    highlight_attacks(swapColor(game.turn()), swapColor(game.turn()));
    game.undo();
  } catch {
    return false;
  }
}

var config = {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onMouseoutSquare: onMouseoutSquare,
  onMouseoverSquare: onMouseoverSquare,
  onChange: (oldPos, newPos) => { removeGreySquares(); highlight_attacks() },
  onDragMove: onDragMove,
  onSnapEnd: onSnapEnd,
  onDragEnd: () => { removeGreySquares(); highlight_attacks() },
  pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
};
board = Chessboard('myBoard', config);
highlight_attacks();


function reset_game() {
  game.reset();
  $('#move-history').empty();
  board.position('start');
}

$('#reset-game-btn').on('click', reset_game);

function highlight_attacks(byColor, sideToMove) {
  if (!toggleAttackers) {
    removeGreySquares();
    return;
  }
  if (byColor !== 'w' && byColor !== 'b') {
    byColor = game.turn();
  }
  var files = "abcdefgh";
  var ranks = "12345678";
  for (var file of files) {
    for (var rank of ranks) {
      var square = file + rank;
      var attackers = game.attackers(square, sideToMove);
      if (attackers.length > 0 && game.get(square) && game.get(square).color === byColor) {
        orangeSquare(square, attackers);
      } else if (attackers.length > 0) {
        redSquare(square, attackers);
      }
    }
  }
}

function toggleAttackersBtn() {
  if (toggleAttackers) {
    $('#white-sword').css('background-color', '');
    $('#black-sword').css('background-color', '');
  } else {
    $('#white-sword').css('background-color', 'rgba(150, 150, 150, 0.2)');
    $('#black-sword').css('background-color', 'rgba(150, 150, 150, 0.2)');
  }
  toggleAttackers = !toggleAttackers; highlight_attacks();
}

$('#white-sword').on('click', toggleAttackersBtn);
$('#black-sword').on('click', toggleAttackersBtn);

async function sendMoveToServer(move) {
  try {
    const res = await fetch(`/game/${serverGameId}/move`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ move })
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.success) {
      console.warn('Server did not accept move', { status: res.status, data });
    }
  } catch (err) {
    console.error('Error sending move to server', err);
  }
}
