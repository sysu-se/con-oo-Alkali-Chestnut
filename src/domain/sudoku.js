export class Sudoku {
  // 构造与初始化
  constructor(originGrid) {
    // 保护不变量，严格校验输入
    this._validateGrid(originGrid);
    // 深拷贝并保存初始题面
    this._fixed = this._deepCopyGrid(originGrid);
    // 当前盘面
    this._grid = this._deepCopyGrid(originGrid);
  }

  // 深拷贝
  _deepCopyGrid(grid) {
    return grid.map(row => [...row]);
  }

  // 校验数组大小 9x9 且元素为 0-9
  _validateGrid(grid) {
    // 检验行数 9
    if (!Array.isArray(grid) || grid.length !== 9) {
      throw new Error('Grid must be 9 rows');
    }
    for (let r = 0; r < 9; r++) {
      // 每行检验元素个数 9
      if (!Array.isArray(grid[r]) || grid[r].length !== 9) {
        throw new Error(`Row ${r} must have 9 columns`);
      }
      // 元素为 0-9
      for (let c = 0; c < 9; c++) {
        const val = grid[r][c];
        if (typeof val !== 'number' || !Number.isInteger(val) || val < 0 || val > 9) {
          throw new Error(`Invalid value at (${r}, ${c}): ${val}`);
        }
      }
    }
  }

  // 是否是初始的固定格子
  isFixed(row, col) {
    return this._fixed[row][col] !== 0;
  }

  // 检查在 (row, col) 放置 value 是否违反数独规则
  isValidMove(row, col, value) {
    // 0 代表擦除，总是允许
    if (value === 0) return true;
    
    // 检查同行
    for (let c = 0; c < 9; c++) {
      if (c !== col && this._grid[row][c] === value) return false;
    }
    // 检查同列
    for (let r = 0; r < 9; r++) {
      if (r !== row && this._grid[r][col] === value) return false;
    }
    // 检查 3x3 宫
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if ((r !== row || c !== col) && this._grid[r][c] === value) return false;
      }
    }
    return true;
  }

  // 返回当前盘面的副本
  getGrid() {
    return this._deepCopyGrid(this._grid);
  }

  // 返回所有违反规则的单元格位置
  getInvalidCells() {
    const invalid = new Set();

    // 检查行重复
    for (let r = 0; r < 9; r++) {
      const valueToColumns = new Map();
      for (let c = 0; c < 9; c++) {
        const val = this._grid[r][c];
        if (val === 0) continue;

        if (valueToColumns.has(val)) {
          // 把当前格子和之前出现过的格子都标记为无效
          invalid.add(`${r},${c}`);
          invalid.add(`${r},${valueToColumns.get(val)}`);
        } else {
          valueToColumns.set(val, c);
        }
      }
    }

    // 检查列重复
    for (let c = 0; c < 9; c++) {
      const valueToRows = new Map();
      for (let r = 0; r < 9; r++) {
        const val = this._grid[r][c];
        if (val === 0) continue;

        if (valueToRows.has(val)) {
          invalid.add(`${r},${c}`);
          invalid.add(`${valueToRows.get(val)},${c}`);
        } else {
          valueToRows.set(val, r);
        }
      }
    }

    // 检查 3x3 宫重复
    for (let boxRow = 0; boxRow < 3; boxRow++) {
      for (let boxCol = 0; boxCol < 3; boxCol++) {
        const valueToPositions = new Map();
        for (let r = boxRow * 3; r < boxRow * 3 + 3; r++) {
          for (let c = boxCol * 3; c < boxCol * 3 + 3; c++) {
            const val = this._grid[r][c];
            if (val === 0) continue;

            if (valueToPositions.has(val)) {
              invalid.add(`${r},${c}`);
              invalid.add(valueToPositions.get(val));
            } else {
              valueToPositions.set(val, `${r},${c}`);
            }
          }
        }
      }
    }

    // set转换为数组格式，每个字符串拆分为单个字符数组，再转为数字，返回字典
    return Array.from(invalid).map(
        str => {
                const [r, c] = str.split(',').map(Number);
                return { row: r, col: c };
        }
    );
  }

  // 检查游戏是否胜利（填满且无冲突）
  isWon() {
    // 检查是否填满
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this._grid[r][c] === 0) return false;
      }
    }
    // 再检查是否有冲突
    return this.getInvalidCells().length === 0;
  }

  // 填入
  guess(move) {
    const { row, col, value } = move;

    // 基础范围校验
    if (row < 0 || row >= 9 || col < 0 || col >= 9) {
      return { success: false, changed: false, reason: 'Out of bounds' };
    }

    // 校验值范围
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 9) {
      return { success: false, changed: false, reason: 'Invalid value' };
    }

    // 禁止修改初始固定格
    if (this.isFixed(row, col)) {
      return { success: false, changed: false, reason: 'Cell is fixed' };
    }

    // 检查是否是值没变的操作
    if (this._grid[row][col] === value) {
      return { success: true, changed: false };
    }

    // 执行修改（即使违反规则也允许）
    this._grid[row][col] = value;
    return { success: true, changed: true };
  }

  clone() {
    const copy = new Sudoku(this._fixed);
    copy._grid = this._deepCopyGrid(this._grid);
    return copy;
  }

  // 序列化
  toJSON() {
    return {
      fixed: this._deepCopyGrid(this._fixed),
      grid: this._deepCopyGrid(this._grid)
    };
  }
  
  // 反序列化
  static fromJSON(json) {
    const sudoku = new Sudoku(json.fixed);
    sudoku._grid = sudoku._deepCopyGrid(json.grid);
    return sudoku;
  }

  // 外表化
  toString() {
    let out = '╔═══════╤═══════╤═══════╗\n';
    for (let row = 0; row < 9; row++) {
      if (row !== 0 && row % 3 === 0){
        out += '╟───────┼───────┼───────╢\n';
      }
      for (let col = 0; col < 9; col++) {
        if (col === 0) {
          out += '║ ';
        }
        else if (col % 3 === 0) {
          out += '| ';
        }
        out += (this._grid[row][col] === 0 ? '·' : this._grid[row][col]) + ' ';
        if (col === 8) {
          out += '║';
        }
      }
      out += '\n';
    }
    out += '╚═══════╧═══════╧═══════╝';
    return out;
  }
}