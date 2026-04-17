# con-oo-Alkali-Chestnut - Review

## Review 结论

领域对象本身相比常见的二维数组脚本式写法已经有明显进步，但当前接入只覆盖了“棋盘渲染 + 输入 + undo/redo”的局部链路，真实开局、菜单操作、分享等关键流程仍保留旧状态树，导致 `Game/Sudoku` 还没有成为整个 Svelte 游戏流程的单一核心。

## 总体评价

| 维度 | 评价 |
| --- | --- |
| OOP | fair |
| JS Convention | fair |
| Sudoku Business | fair |
| OOD | fair |

## 缺点

### 1. 开局流程没有真正由领域对象驱动

- 严重程度：core
- 位置：src/App.svelte:31-42,53-73; src/components/Modal/Types/Welcome.svelte:16-24
- 原因：`Welcome` 中用户选择难度或输入 `sencode` 后调用的仍是旧的 `startNew/startCustom`，而 `App` 在弹窗关闭后又无条件用硬编码 `testGrid` 调用 `initGame`。结果是“开始一局游戏”并没有把用户选择的数据传入新的 `Game/Sudoku`，这直接违背了作业要求里最关键的真实接入目标。

### 2. 界面同时维护新旧两套盘面事实来源

- 严重程度：core
- 位置：src/components/Header/Dropdown.svelte:11-55; src/components/Modal/Types/Share.svelte:3-16
- 原因：下拉菜单里的新游戏/输入代码仍调用旧 `@sudoku/game`，分享弹窗仍从旧 `@sudoku/stores/grid` 取盘面；但棋盘渲染和输入已经改为消费 `gameStore`。这会让菜单动作、分享结果与当前界面盘面脱节，说明领域对象尚未成为 UI 的单一事实来源。

### 3. Store adapter 的 reset 设计既破坏封装又无法正确切换题面

- 严重程度：major
- 位置：src/stores/gameStore.js:5-8,37-40
- 原因：`fixedGrid` 在创建时就从初始 `sudoku` 闭包捕获，后续 `reset()` 只是用 `Object.assign` 把新的 `Game` 实例字段拷到旧对象上。这样一来，新题面的固定格不会同步更新，而且 adapter 需要依赖 `Game` 的私有字段布局，OOP 和 OOD 都比较脆弱。

### 4. 反序列化缺少防御性校验，领域不变量可以被外部数据破坏

- 严重程度：major
- 位置：src/domain/game.js:73-82; src/domain/sudoku.js:194-197
- 原因：`Sudoku.fromJSON()` 直接信任 `json.grid`，`Game.fromJSON()` 直接复用 `json.history` 引用而不做拷贝或校验。这样畸形 JSON 或调用方后续对原始对象的修改，都可能绕过构造期约束，削弱领域对象的封装性和可靠性。

### 5. 胜利订阅没有释放，重复初始化会累积副作用

- 严重程度：minor
- 位置：src/App.svelte:35-41
- 原因：`initGame()` 每调用一次都会新增一次 `won.subscribe(...)`，但没有保存和清理 unsubscribe。当前代码虽然因为开局链路不完整而很少触发多次初始化，但一旦把新开局真正接回这里，就可能出现重复暂停、重复弹窗等 Svelte 订阅管理问题。

## 优点

### 1. 构造期做了输入校验和防御性拷贝

- 位置：src/domain/sudoku.js:3-35
- 原因：`Sudoku` 在构造时校验 9x9 结构与 0-9 整数范围，并深拷贝输入，避免外部数组别名直接破坏内部状态，这比只包一层数组更像真正的领域对象。

### 2. 数独规则和胜负判断被收回到领域层

- 位置：src/domain/sudoku.js:72-148
- 原因：`getInvalidCells()` 和 `isWon()` 把冲突检测、胜利判定留在 `Sudoku` 内部，而不是散落到组件里，职责边界相对清晰，也更符合业务建模。

### 3. 历史记录只追踪真正发生的状态变化

- 位置：src/domain/game.js:28-63
- 原因：`Game.guess()` 只有在 `success && changed` 时才记录快照，且在 undo 后新输入会截断 redo 分支，这个历史模型比“每次都记一份”更干净，也更符合 undo/redo 业务。

### 4. 主输入链路已经开始通过 adapter 消费领域对象

- 位置：src/stores/gameStore.js:10-31; src/components/Controls/Keyboard.svelte:29-35; src/components/Board/index.svelte:42-54
- 原因：键盘输入不再直接改旧二维数组，而是经 `onGuess -> gameStore.guess -> Game/Sudoku`；棋盘渲染也来自 `grid/fixedGrid/invalidCells` 这些 adapter 暴露的 store，说明作者已经理解了“领域对象 + Svelte store 适配层”的基本方向。

## 补充说明

- 本次结论仅基于静态阅读，按要求没有运行测试，也没有实际点击界面验证；涉及欢迎弹窗、菜单、分享等流程的判断来自事件链和数据源分析。
- 评审范围聚焦于 `src/domain/*`、`src/stores/gameStore.js`、`src/App.svelte` 以及直接与其接线的 `Board`、`Controls`、`Header`、`Modal` 组件，没有扩展到无关目录。
- 像 `won.subscribe` 重复订阅、`reset()` 切题面失真这类结论，属于基于代码路径推导出的静态风险判断，而非运行时复现结果。
