import { Sudoku } from "./sudoku.js";

export class Game {
  constructor({ sudoku }) {
    // 当前数独盘面
    this._currentSudoku = sudoku.clone();
    // 历史：只存 JSON 快照
    this._history = [this._currentSudoku.toJSON()];
    // 当前指向历史的哪一步
    this._historyIndex = 0;
  }

  // 获取当前盘面（副本）
  getSudoku() {
    return this._currentSudoku.clone();
  }

  // 能否撤销(晚于初始态)
  canUndo() {
    return this._historyIndex > 0;
  }

  // 能否重做(先于最新态)
  canRedo() {
    return this._historyIndex < this._history.length - 1;
  }

  // 填数字（改进：只在真正变化时记录历史）
  guess(move) {
    const result = this._currentSudoku.guess(move);

    // 只有成功 + 真正改变盘面，才记录历史
    if (result.success && result.changed) {
      // 截断后面的 redo 记录（slice左闭右开）
      this._history = this._history.slice(0, this._historyIndex + 1);
      // 加入新状态
      this._history.push(this._currentSudoku.toJSON());
      // 前进指针
      this._historyIndex++;
    }

    return result;
  }

  // 撤销
  undo() {
    if (!this.canUndo()) return;
    this._historyIndex--;
    this._restoreFromHistory();
  }

  // 重做
  redo() {
    if (!this.canRedo()) return;
    this._historyIndex++;
    this._restoreFromHistory();
  }

  // 从历史恢复当前盘面
  _restoreFromHistory() {
    const json = this._history[this._historyIndex];
    this._currentSudoku = Sudoku.fromJSON(json);
  }

  // 改进：序列化单一事实来源
  toJSON() {
    return {
      history: this._history,
      index: this._historyIndex
    };
  }

  static fromJSON(json) {
    // 初始化盘面
    const firstSudoku = Sudoku.fromJSON(json.history[0]);
    const game = new Game({ sudoku: firstSudoku });
    // 导入历史与历史指针
    game._history = json.history;
    game._historyIndex = json.index;
    // 由历史指针恢复盘面
    game._restoreFromHistory();
    return game;
  }

  // 选择性外表化
  toString() {
    return `
=== Game State ===
Step: ${this._historyIndex + 1} / ${this._history.length}
Can Undo: ${this.canUndo()}
Can Redo: ${this.canRedo()}

Current Board:
${this._currentSudoku.toString()}
    `;
  }
}