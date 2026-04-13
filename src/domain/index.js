import { Sudoku } from './sudoku.js';
import { Game } from './game.js';

export function createSudoku(grid) {
  return new Sudoku(grid);
}

export function createGame({ sudoku }) {
  return new Game({ sudoku });
}

export function createSudokuFromJSON(json) {
  return Sudoku.fromJSON(json);
}

export function createGameFromJSON(json) {
  return Game.fromJSON(json);
}