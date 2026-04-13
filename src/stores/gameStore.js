import { writable, derived, readable } from 'svelte/store';
import { createGame, createSudoku } from '../domain/index.js';

export function createGameStore(initialGrid) {
  const sudoku = createSudoku(initialGrid);
  const game = createGame({ sudoku });

  const fixedGrid = readable(sudoku.toJSON().fixed);

  // 必须是 store 对象
  const revision = writable(0);

  // 用于触发 Svelte 自动刷新
  function notify() {
    revision.update(n => n + 1);
  }

  // derived 传 store 对象 revision
  const grid = derived(revision, () => game.getSudoku().getGrid());
  const invalidCells = derived(revision, () => {
    const list = game.getSudoku().getInvalidCells();
    return new Set(list.map(c => `${c.col},${c.row}`));
  });
  const canUndo = derived(revision, () => game.canUndo());
  const canRedo = derived(revision, () => game.canRedo());
  const won = derived(revision, () => game.getSudoku().isWon());

  function guess(move) {
    const res = game.guess(move);
    if (res.changed) notify();
    return res;
  }

  function undo() { game.undo(); notify(); }
  function redo() { game.redo(); notify(); }

  function reset(newGrid) {
    const newSudoku = createSudoku(newGrid);
    Object.assign(game, createGame({ sudoku: newSudoku }));
    notify();
  }

  return {
    subscribe: revision.subscribe,
    fixedGrid,
    grid,
    invalidCells,
    canUndo,
    canRedo,
    won,
    guess,
    undo,
    redo,
    reset
  };
}