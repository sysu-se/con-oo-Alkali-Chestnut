# 改进领域对象并接入 Svelte

> 本文档基于 HW1 review 与本次作业要求，说明：  
> 1) 领域对象有哪些改进  
> 2) 如何接入 Svelte  
> 3) 响应式机制如何生效  
> 4) 跑通 UI 与领域逻辑的原因

---

## 1、HW1 Review 的关键问题

Review 中指出了 4 个核心问题：

1. **Sudoku 没有承载数独规则**  
   只是二维数组包装器，没有 value 范围检查、固定格、冲突校验。

2. **Game 无条件记录历史**  
   即便输入无效或没有变化也会记录，导致 Undo/Redo 被污染。

3. **Game 序列化存在冗余状态**  
   `current` 与 `history[index]` 可能不一致，导致无单一事实来源。

4. **Sudoku 缺乏不变量保护以及对非法输入的检验**  
   初始题面的固定格没有受到保护，传入非法 grid 时不会拒绝。

---

## 2、领域对象改进

### Sudoku 的改进

- **构造期不变量保护**  
  新版在构造函数内调用 `_validateGrid`，强制校验 9x9 尺寸与 0~9 整数范围，避免非法数据进入系统。  
  旧版直接深拷贝输入，不做任何合法性判断。

- **固定格建模**  
  新版同时维护 `_fixed` 与 `_grid`：  
  `_fixed` 保存初始题面，`_grid` 保存当前局面，从而可以精确判断哪些格子不可编辑。  
  旧版只有一个 `grid`，无法区分题面与用户输入。

- **规则感知与冲突检测**  
  新增 `isValidMove`、`getInvalidCells()`：  
  Sudoku 现在能检查行/列/宫冲突，能输出冲突位置集合。  
  旧版只直接 guess，没有任何规则判断。

- **更安全的 guess 行为**  
  新版 `guess`：
  - 检查越界  
  - 检查 value 合法范围  
  - 禁止修改固定格  
  - 区分 “成功但不改变” 与 “真正改变”  
  旧版只检查范围然后直接写入。

- **胜利状态可推导**  
  新增 `isWon()`：检查盘面是否填满且无冲突，供 UI 判断胜利。  
  旧版缺少胜利判断能力。

- **序列化能力增强**  
  新版 `toJSON()` 同时序列化 `fixed` 与 `grid`，保证恢复时题面与当前局面一致；  
  旧版只保存 `grid`，无法保证题面完整性。

---

### Game 的改进

- **历史只记录“有效变化”**  
  新版 `guess()` 依赖 `Sudoku.guess()` 的返回值 `{ success, changed }`，  
  只有在 **操作成功且盘面真正变化** 时才追加历史。  
  旧版每次输入都会记录快照（即使输入无效或值没变），导致 Undo/Redo 被污染。

- **历史快照由 JSON 组成，避免引用污染**  
  新版 `_history` 只保存 `Sudoku.toJSON()` 的结果（纯数据），  
  避免旧版保存 Sudoku 对象时可能出现的引用共享问题。

- **序列化单一事实来源更清晰**  
  新版 `toJSON()` 只序列化 `{ history, index }`，  
  当前局面完全由 `history[index]` 决定，避免 `current` 与历史快照不一致。  
  旧版同时序列化 `current + history + index`，存在冗余与一致性风险。

- **恢复逻辑更稳健**  
  新版 `fromJSON()` 先创建初始 Game，再直接导入历史与指针，最后通过 `_restoreFromHistory()` 恢复当前盘面。  
  旧版需要手动拼接 `currentBoard` 与 `history`，容易引入不一致。

---

## 3、Svelte 接入方式（核心任务）

### 3.1 接入方案：Store Adapter

新增 `createGameStore(initialGrid)`：  
在 `src/stores/gameStore.js` 中实现 `createGameStore(initialGrid)`，负责把领域对象映射为 Svelte 可消费的响应式状态，并提供 UI 调用入口。

#### 适配层职责
- **持有领域对象**：内部创建 `Sudoku` 与 `Game` 实例  
- **对外暴露响应式状态**：让 UI 通过 `$store` 获取最新局面  
- **对外暴露命令接口**：UI 只能通过 `guess / undo / redo / reset` 操作游戏

#### 对外暴露的状态与命令
```js
export function createGameStore(initialGrid) {
  // 状态（stores）
  const fixedGrid = readable(...);
  const grid = derived(...);
  const invalidCells = derived(...);
  const canUndo = derived(...);
  const canRedo = derived(...);
  const won = derived(...);

  // 命令（methods）
  function guess(move) { ... }
  function undo() { ... }
  function redo() { ... }
  function reset(newGrid) { ... }

  return {
    subscribe: revision.subscribe,
    ···
  };
}
```

#### 响应式刷新机制
- 适配层内部维护 `revision` store  
- 每次 `guess/undo/redo/reset` 后调用 `notify()`  
- `grid / invalidCells / canUndo / canRedo / won` 都依赖 `revision`  
→ 因此 UI 会自动刷新，而不会直接依赖对象内部突变

#### UI 消费方式

1. 通过 `$grid / $fixedGrid / $invalidCells` 渲染界面  
2. 调用 `guess / undo / redo` 进入领域对象  

**UI 不直接修改二维数组**，也不会访问 `Sudoku` 内部字段。  
领域对象内部状态（如 Sudoku._grid / Sudoku._fixed / Game._history / Game._historyIndex）不对 UI 直接暴露，UI 只能通过 adapter 获取派生状态。

---

### 3.2 接入路径（真实 UI 流程）

#### ① 开始一局游戏（创建 Game / Sudoku）
- **发生位置**：`App.svelte`
- **流程**：
  - `createGameStore(initialGrid)` 内部创建 `Sudoku` 与 `Game`
  - UI 只持有 `gameStore`，不直接持有 Sudoku 实例  
```js
gameStore = createGameStore(initialGrid)
```

#### ② UI 渲染当前局面（grid 来自领域对象）
- **发生位置**：`Board.svelte`
- **数据来源**：`$grid`、`$fixedGrid`、`$invalidCells`
- **说明**：这些值由 `gameStore` 通过 `derived(...)` 从 `Game/Sudoku` 提取
```svelte
<Cell value={$grid[y][x]} userNumber={$fixedGrid[y][x]===0} ... />
```

#### ③ 用户输入进入领域对象（不直接改数组）
- **发生位置**：`Keyboard.svelte`
- **流程**：
  - UI 只调用 `onGuess(...)`
  - `onGuess` 在 App 中转发为 `gameStore.guess(...)`
  - 实际写盘发生在 `Sudoku.guess(...)`
```js
onGuess?.($cursor.y, $cursor.x, num)
```
```js
gameStore.guess({ row, col, value })
```

#### ④ Undo / Redo 走领域逻辑
- **发生位置**：`ActionBar.svelte`
- **流程**：按钮触发 `gameStore.undo/redo` → 由 `Game` 控制历史恢复
```js
gameStore.undo()
gameStore.redo()
```

#### ⑤ 界面自动更新（响应式生效点）
- **关键机制**：`createGameStore` 内部维护 `revision` store  
- **触发方式**：每次 `guess/undo/redo/reset` 调用 `notify()`  
- **效果**：`grid / invalidCells / canUndo / won` 等 derived store 重新计算 → UI 自动刷新  
```js
function notify() { revision.update(n => n + 1); }
```

## 4、响应式机制说明（为什么 UI 会更新）

### 依赖的 Svelte 机制

Svelte 追踪：
- store 变化（`$store`）
- 变量重新赋值
- reactive statements (`$:`)
 
`$: `只会在直接依赖的变量发生赋值变化时触发；如果只是对象内部字段变化、或依赖是间接的（函数内部读到的值），`$: `可能不会更新。

---

### 方案

在 `createGameStore` 中：

```js
const revision = writable(0)

function notify() {
  revision.update(n => n + 1)
}
```

每次 `guess/undo/redo` 都触发 `notify()`，让 `revision` 变化：

- `grid`, `invalidCells`, `canUndo`, `canRedo`, `won` 都是 `derived(revision, ...)`
- 所以 UI 更新由 store 触发，而不是依赖对象内部突变

---

### 直接 mutate 会怎样？
如果 UI 直接修改二维数组：

- Svelte 不知道内部字段改变
- reactive statement 不触发
- UI 不刷新 / 错位 / Undo 失效

之所以直接改二维数组有时不刷新，是因为 Svelte 只跟踪变量/Store 的引用变化，数组内部元素变化不一定触发重新赋值，因此不会触发更新。

---

## 5、View 层消费内容总结

| 问题 | 回答 |
|------|------|
| View 层消费谁？ | `createGameStore()` 适配层 |
| UI 拿到什么数据？ | `grid, fixedGrid, invalidCells, canUndo, canRedo, won` |
| 用户输入如何进入领域对象？ | `Keyboard -> onGuess -> gameStore.guess` |
| Undo / Redo 如何进入 Game？ | `ActionBar -> gameStore.undo/redo` |
| UI 为什么会更新？ | `revision store` 触发 derived 重新计算 |

响应式边界位于 createGameStore：领域对象内部不响应，adapter 负责触发更新并向 UI 暴露 store。  
UI 可见：grid / fixedGrid / invalidCells / canUndo / canRedo / won；  
UI 不可见：_grid / _fixed / _history / _historyIndex 等内部状态。  

---

## 6、与 HW1 相比的实质改进

| 作业 | HW1 | HW1.1 |
|------|-----|-------|
| Sudoku 规则 | 无 | 有固定格 / 校验 / 冲突检测 |
| 历史记录 | 无条件记录 | 仅变化记录 |
| 快照 | 引用风险 | JSON 快照 |
| UI 接入 | 独立模块 | 真实接入 Svelte |
| 响应式 | 依赖直接 mutate | 通过 store 适配 |

HW1 只有领域对象本身，没有响应式适配层，UI 仍然直接操作二维数组，因此领域对象没有真正驱动界面。

---

## 7、Trade-off （设计取舍）

- **优点**：  
  领域对象保持纯粹，UI 只与 adapter 交互；测试与 UI 解耦清晰。

- **代价**：  
  增加一个 adapter 层与 `revision` store，略微增加复杂度，但换来可靠响应式更新。

---

## 8、总结

完成了两项关键目标：

1. **改进领域对象建模，补齐数独规则与历史语义**
2. **让 UI 真正消费领域对象，且通过 Svelte store 实现响应式刷新**

使 Sudoku/Game 从 “独立可测但未接入” 转变为 “真正驱动 UI ” 。

若迁移到 Svelte 5，最稳定的是 领域对象层（Sudoku/Game），最可能改动的是 adapter 与组件层（依赖 Svelte 响应式机制）。