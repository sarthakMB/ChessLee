import GameManager from './game_manager.mjs';

class GameStore {
  constructor() {
    this.games = new Map();
  }

  createGame(config) {
    const manager = new GameManager(config);
    this.games.set(manager.id, manager);
    return manager;
  }

  getGame(id) {
    return this.games.get(id);
  }

  deleteGame(id) {
    return this.games.delete(id);
  }

  clearAllGames() {
    this.games.clear();
  }
}

export const gameStore = new GameStore();
export default GameStore;
