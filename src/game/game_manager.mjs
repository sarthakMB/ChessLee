import { Chess } from 'chess.js';

export default class GameManager {
  constructor({
    id,
    mode,
    ownerId = null,
    difficulty = null,
    joinCode = null,
    opponent = null,
    metadata = {}
  }) {
    this.id = id;
    this.mode = mode;
    this.ownerId = ownerId;
    this.difficulty = difficulty;
    this.joinCode = joinCode;
     this.opponent = opponent;
    this.metadata = metadata;
    this.createdAt = Date.now();
    this.chess = new Chess();
  }

  getSnapshot() {
    return {
      id: this.id,
      mode: this.mode,
      ownerId: this.ownerId,
      difficulty: this.difficulty,
      joinCode: this.joinCode,
      opponent: this.opponent,
      createdAt: this.createdAt,
      fen: this.chess.fen(),
      turn: this.chess.turn(),
      isGameOver: this.chess.isGameOver(),
      metadata: this.metadata
    };
  }

  turn() {
    return this.chess.turn();
  }

  //makeMove
  makeMove(move) {
    try{
    if (this.chess.move(move)) {
      console.log('move made', move);
      return true;
    }
  } catch (error) {
    console.error('error making move', error);
    console.log('move not made', move);
    return false;
    }
  }

  //TODO: Implement this
  currentState() {
    return "Implement this"
  }

  isGameOver() {
    return this.chess.isGameOver();
  }

  async makeComputerMove() {
    //random move
    setTimeout(() => {
      const moves = this.chess.moves();
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      this.chess.move(randomMove);  
    }, 5000);
  }

}
