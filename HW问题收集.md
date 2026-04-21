# HW 问题收集

列举在HW 1、HW1.1过程里，你所遇到的2~3个通过自己学习已经解决的问题，和2~3个尚未解决的问题与挑战

---

## 已解决

1. 为什么直接修改二维数组Svelte不会自动刷新？怎么解决这个问题？

   1. **上下文**：一开始以为直接改`grid`数组UI就会更新，但实际发现很多时候不刷新、错位或者Undo失效，完全搞不懂Svelte的更新触发机制。
   2. **解决手段**：通过询问AI、阅读文档，搞懂了Svelte只跟踪**变量/Store的引用变化**，数组内部元素的突变不会触发重新赋值，因此不会更新。最终采用了`revision store`方案，每次领域对象状态变化后递增一个版本号，所有UI状态都从这个版本号派生。

2. 怎么让纯JS领域对象的内部状态变化，被Svelte的响应式系统正确感知到？

   1. **上下文**：我们的`Game/Sudoku`是纯JS类，没有用Svelte自带的`writable` store，不知道怎么让UI自动感知到`guess/undo/redo`后的状态变化，以为要把整个领域对象重写成Svelte store。
   2. **解决手段**：借助Coding Agent实现了`createGameStore`适配器层，内部持有纯JS领域对象，同时维护一个`revision` writable store；每次领域对象执行完状态变更操作后，调用`notify()`更新`revision`，从而触发所有依赖它的派生状态更新。

3. 怎么正确使用`derived store`？为什么说"不再生成板级view model"？

   1. **上下文**：一开始看不懂Coding Agent说的"允许保留少量标量derived store，但不再生成板级view model"，不知道怎么把领域对象的状态映射成UI需要的数据。
   2. **解决手段**：通过查找资料，询问AI，搞懂了`derived store`是基于其他store派生的只读状态。我们把UI需要的`grid`、`fixedGrid`、`invalidCells`、`canUndo`、`won`等都做成了`derived(revision, ...)`，不用生成一个巨大的板级view model，既简洁又可靠。

---

## 未解决

1. **开局流程与领域对象的完整对接**

   1. **上下文**：
      反馈报告中指出的，当前 `Welcome.svelte` 中用户选择难度或输入 `sencode` 后调用的仍是旧的 `startNew/startCustom`，而 `App.svelte` 在弹窗关闭后又无条件用硬编码 `testGrid` 调用 `initGame`。如何将用户选择的真实数据（难度、自定义题面）正确传入新的 `Game/Sudoku`，并替换掉旧的开局链路，是当前面临的主要集成挑战。
   2. **尝试解决手段**：
      借助AI分析了 `App.svelte` 与 `Welcome.svelte` 的事件流，尝试在 `Welcome` 中暴露新的回调接口，但由于旧流程涉及弹窗状态管理、难度映射、sencode 解码等多个环节，完整替换需要同时修改多个组件的交互逻辑，风险较高，暂未完成最终对接。

2. **菜单、分享等外围流程向单一事实来源的迁移**

   1. **上下文**：
      反馈报告中指出的，目前下拉菜单（`Dropdown.svelte`）的新游戏/输入代码仍调用旧 `@sudoku/game`，分享弹窗（`Share.svelte`）仍从旧 `@sudoku/stores/grid` 取盘面；但核心棋盘渲染与输入已改为消费 `gameStore`。这种“双轨制”会导致菜单动作、分享结果与当前界面盘面脱节，需要将所有外围流程统一迁移到新的 `gameStore`。
   2. **尝试解决手段**：
      梳理了旧 `@sudoku/stores` 与新 `gameStore` 的接口差异，尝试在 `Dropdown.svelte` 中替换部分调用，但由于旧流程涉及模态框、状态持久化等多个依赖，完整迁移需要同时调整多个组件的数据源，工作量较大，暂未完成全部迁移。

3. **Store Adapter 的 `reset` 设计与封装性平衡**

   1. **上下文**：
      反馈报告中指出的，当前 `gameStore.js` 中，`fixedGrid` 在创建时就从初始 `sudoku` 闭包捕获，后续 `reset()` 只是用 `Object.assign` 把新的 `Game` 实例字段拷到旧对象上。这导致新题面的固定格不会同步更新，而且 adapter 需要依赖 `Game` 的私有字段布局，OOP 封装性较弱。如何设计一个既不破坏封装、又能正确切换题面的 adapter，是当前的设计难点。
   2. **尝试解决手段**：
      尝试过重新设计 `createGameStore` 的工厂模式，让 `reset` 能完整替换内部的 `Game` 实例，但由于 `fixedGrid` 等 derived store 的初始闭包依赖，简单替换实例会导致响应式断裂；同时也考虑过在 `Game` 中暴露更规范的重置接口，但需要修改领域对象的公开契约，影响面较大，暂未找到最优解。