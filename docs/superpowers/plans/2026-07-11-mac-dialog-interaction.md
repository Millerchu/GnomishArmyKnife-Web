# 通用弹窗交互与工作日志迁移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完善通用 `MacDialog` 的关闭、收起、最大化和独立滚动能力，并将工作日志新增/编辑弹窗迁移到该组件。

**Architecture:** `MacWindowControls` 只呈现三个可访问按钮并发出语义事件；`MacDialog` 持有窗口视图状态，统一处理遮罩、Esc、关闭锁定、收起恢复和最大化。可测试的状态转换放到独立纯函数模块中，工作日志页面仅负责表单业务状态和保存逻辑。

**Tech Stack:** Vue 3、Vite、Node.js `node:test`、CSS scoped styles、现有 Playwright 浏览器验证工具。

---

## 文件结构

- Create: `src/components/macDialogState.js` — 弹窗收起、最大化、重置和关闭许可的纯状态规则。
- Create: `src/components/__tests__/macDialogState.test.js` — 通用弹窗状态规则的单元测试。
- Modify: `src/components/MacWindowControls.vue` — 将装饰圆点改成真实按钮并发出语义事件。
- Modify: `src/components/MacDialog.vue` — 统一窗口状态、关闭入口、恢复浮条、独立滚动与响应式样式。
- Modify: `src/views/WorkLog.vue` — 使用 `MacDialog` 包装现有工作日志表单，删除重复弹窗外壳样式。
- Modify: `package.json` — 将组件状态测试目录纳入现有 Node 测试命令。

### Task 1: 用测试锁定弹窗状态规则

**Files:**
- Create: `src/components/__tests__/macDialogState.test.js`
- Create: `src/components/macDialogState.js`
- Modify: `package.json`

- [ ] **Step 1: 扩展测试命令并写失败测试**

将 `package.json` 中的测试命令改为同时执行 utils、constants 和 components 测试：

```json
"test": "node --test src/utils/__tests__/*.test.js src/constants/__tests__/*.test.js src/components/__tests__/*.test.js"
```

创建 `src/components/__tests__/macDialogState.test.js`：

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DIALOG_VIEW_ACTION,
  canRequestDialogClose,
  createDialogViewState,
  reduceDialogViewState
} from '../macDialogState.js'

test('dialog view starts in standard visible state', () => {
  assert.deepEqual(createDialogViewState(), {
    minimized: false,
    maximized: false
  })
})

test('minimize and restore preserve a valid single-panel state', () => {
  const minimized = reduceDialogViewState(
    createDialogViewState(),
    DIALOG_VIEW_ACTION.MINIMIZE
  )
  const restored = reduceDialogViewState(minimized, DIALOG_VIEW_ACTION.RESTORE)

  assert.deepEqual(minimized, {minimized: true, maximized: false})
  assert.deepEqual(restored, {minimized: false, maximized: false})
})

test('maximize toggles without changing minimized state', () => {
  const maximized = reduceDialogViewState(
    createDialogViewState(),
    DIALOG_VIEW_ACTION.TOGGLE_MAXIMIZE
  )
  const restoredSize = reduceDialogViewState(maximized, DIALOG_VIEW_ACTION.TOGGLE_MAXIMIZE)

  assert.deepEqual(maximized, {minimized: false, maximized: true})
  assert.deepEqual(restoredSize, {minimized: false, maximized: false})
})

test('close lock blocks minimize and every close request but keeps maximize available', () => {
  const state = createDialogViewState()

  assert.deepEqual(
    reduceDialogViewState(state, DIALOG_VIEW_ACTION.MINIMIZE, true),
    state
  )
  assert.deepEqual(
    reduceDialogViewState(state, DIALOG_VIEW_ACTION.TOGGLE_MAXIMIZE, true),
    {minimized: false, maximized: true}
  )
  assert.equal(canRequestDialogClose({modelValue: true, closeDisabled: true}), false)
  assert.equal(canRequestDialogClose({modelValue: true, closeDisabled: false}), true)
  assert.equal(canRequestDialogClose({modelValue: false, closeDisabled: false}), false)
})

test('reset clears minimized and maximized state before the next open', () => {
  assert.deepEqual(
    reduceDialogViewState(
      {minimized: true, maximized: true},
      DIALOG_VIEW_ACTION.RESET
    ),
    {minimized: false, maximized: false}
  )
})
```

- [ ] **Step 2: 运行测试并确认正确失败**

Run:

```bash
npm test
```

Expected: FAIL，错误为无法找到 `src/components/macDialogState.js`，证明测试确实约束了尚未实现的状态模块。

- [ ] **Step 3: 实现最小状态模块**

创建 `src/components/macDialogState.js`：

```js
export const DIALOG_VIEW_ACTION = Object.freeze({
  MINIMIZE: 'minimize',
  RESTORE: 'restore',
  TOGGLE_MAXIMIZE: 'toggle-maximize',
  RESET: 'reset'
})

export function createDialogViewState() {
  return {
    minimized: false,
    maximized: false
  }
}

export function reduceDialogViewState(state, action, closeDisabled = false) {
  if (action === DIALOG_VIEW_ACTION.RESET) {
    return createDialogViewState()
  }
  if (action === DIALOG_VIEW_ACTION.MINIMIZE) {
    return closeDisabled
      ? {...state}
      : {minimized: true, maximized: false}
  }
  if (action === DIALOG_VIEW_ACTION.RESTORE) {
    return {...state, minimized: false}
  }
  if (action === DIALOG_VIEW_ACTION.TOGGLE_MAXIMIZE) {
    return {minimized: false, maximized: !state.maximized}
  }
  return {...state}
}

export function canRequestDialogClose({modelValue, closeDisabled}) {
  return Boolean(modelValue) && !closeDisabled
}
```

- [ ] **Step 4: 运行测试并确认通过**

Run:

```bash
npm test
```

Expected: 所有现有测试和 5 个新状态测试 PASS，输出中没有 warning 或 error。

- [ ] **Step 5: 提交状态规则**

```bash
git add package.json src/components/macDialogState.js src/components/__tests__/macDialogState.test.js
git commit -m "test: define mac dialog state behavior"
```

### Task 2: 将三色圆点改成可访问的窗口控制按钮

**Files:**
- Modify: `src/components/MacWindowControls.vue`

- [ ] **Step 1: 用已通过的状态契约确定组件事件**

组件事件必须严格映射到 Task 1 的动作：

```js
emits: ['close', 'minimize', 'toggle-maximize']
```

红色和黄色按钮接收 `closeDisabled`；绿色始终可用。按钮使用 `type="button"`，避免放入表单时意外提交。

- [ ] **Step 2: 实现三个真实按钮**

将 `MacWindowControls.vue` 模板和脚本改为：

```vue
<template>
  <div class="mac-window-controls" role="group" aria-label="弹窗窗口控制">
    <button
      type="button"
      class="mac-window-dot close"
      :disabled="closeDisabled"
      aria-label="取消并关闭弹窗"
      title="取消并关闭"
      @click="$emit('close')"
    ><span aria-hidden="true">×</span></button>
    <button
      type="button"
      class="mac-window-dot minimize"
      :disabled="closeDisabled"
      aria-label="收起弹窗"
      title="收起"
      @click="$emit('minimize')"
    ><span aria-hidden="true">−</span></button>
    <button
      type="button"
      class="mac-window-dot zoom"
      :aria-label="maximized ? '还原弹窗' : '最大化弹窗'"
      :title="maximized ? '还原' : '最大化'"
      @click="$emit('toggle-maximize')"
    ><span aria-hidden="true">+</span></button>
  </div>
</template>

<script>
export default {
  name: 'MacWindowControls',
  props: {
    closeDisabled: {
      type: Boolean,
      default: false
    },
    maximized: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'minimize', 'toggle-maximize']
}
</script>
```

样式保留现有三色背景，补充 `border: 0`、`padding: 0`、`cursor: pointer`、键盘 `:focus-visible`、悬停符号显现和 `:disabled` 灰化；符号默认透明，控件组悬停或按钮获得焦点时显示。

- [ ] **Step 3: 执行测试和构建验证**

Run:

```bash
npm test && npm run build
```

Expected: 测试全部 PASS；Vite 构建成功且没有 Vue 模板错误。

- [ ] **Step 4: 提交窗口控制组件**

```bash
git add src/components/MacWindowControls.vue
git commit -m "feat: make mac window controls interactive"
```

### Task 3: 完善 MacDialog 状态、关闭入口与滚动结构

**Files:**
- Modify: `src/components/MacDialog.vue`

- [ ] **Step 1: 接入已测试的状态模块**

在组件中导入：

```js
import {
  DIALOG_VIEW_ACTION,
  canRequestDialogClose,
  createDialogViewState,
  reduceDialogViewState
} from './macDialogState.js'
```

新增 `closeDisabled` 布尔 prop；保留现有 `modelValue`、`title`、`subtitle`、`width`、`closeOnMask` 和 `panelClass` API。事件定义为：

```js
emits: ['update:modelValue', 'cancel', 'close', 'minimize', 'restore', 'maximize-change']
```

- [ ] **Step 2: 实现统一状态与关闭方法**

`data()` 增加 `dialogViewState: createDialogViewState()`，并实现：

```js
resetViewState() {
  this.dialogViewState = reduceDialogViewState(
    this.dialogViewState,
    DIALOG_VIEW_ACTION.RESET
  )
},
requestClose() {
  if (!canRequestDialogClose({
    modelValue: this.modelValue,
    closeDisabled: this.closeDisabled
  })) {
    return
  }
  this.resetViewState()
  this.$emit('update:modelValue', false)
  this.$emit('cancel')
  this.$emit('close')
},
minimize() {
  const nextState = reduceDialogViewState(
    this.dialogViewState,
    DIALOG_VIEW_ACTION.MINIMIZE,
    this.closeDisabled
  )
  if (nextState.minimized === this.dialogViewState.minimized) {
    return
  }
  this.dialogViewState = nextState
  this.$emit('minimize')
},
restore() {
  this.dialogViewState = reduceDialogViewState(
    this.dialogViewState,
    DIALOG_VIEW_ACTION.RESTORE
  )
  this.$emit('restore')
},
toggleMaximize() {
  this.dialogViewState = reduceDialogViewState(
    this.dialogViewState,
    DIALOG_VIEW_ACTION.TOGGLE_MAXIMIZE,
    this.closeDisabled
  )
  this.$emit('maximize-change', this.dialogViewState.maximized)
},
handleMaskClick() {
  if (this.closeOnMask) {
    this.requestClose()
  }
},
handleKeydown(event) {
  if (event.key === 'Escape') {
    this.requestClose()
  }
}
```

监听 `modelValue`：无论关闭还是重新打开都调用 `resetViewState()`。在 `mounted` 注册 `document` 键盘监听，在 `beforeUnmount` 清理。

- [ ] **Step 3: 重构模板为标准、收起两种呈现**

标准面板传入 `MacWindowControls`：

```vue
<MacWindowControls
  :close-disabled="closeDisabled"
  :maximized="dialogViewState.maximized"
  @close="requestClose"
  @minimize="minimize"
  @toggle-maximize="toggleMaximize"
/>
```

面板增加状态 class：

```vue
:class="[panelClass, {maximized: dialogViewState.maximized}]"
```

右上角关闭按钮使用中文无障碍名称并禁用：

```vue
<button
  class="mac-dialog-close"
  type="button"
  :disabled="closeDisabled"
  aria-label="取消并关闭弹窗"
  @click="requestClose"
>×</button>
```

收起时不渲染面板，改为底部恢复浮条：

```vue
<button
  v-else
  type="button"
  class="mac-dialog-minimized"
  aria-label="恢复弹窗"
  @click="restore"
>
  <span class="mac-dialog-minimized-dot" aria-hidden="true"></span>
  <span>{{ title }}</span>
  <strong>点击恢复</strong>
</button>
```

- [ ] **Step 4: 实现方案 A 的视觉和响应式样式**

保持 panel 为列布局与 `overflow: hidden`。内容区使用：

```css
.mac-dialog-body {
  min-height: 0;
  overflow: auto;
  padding: 20px;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: rgba(169, 207, 222, 0.52) rgba(255, 255, 255, 0.04);
}

.mac-dialog-body::-webkit-scrollbar {
  width: 6px;
}

.mac-dialog-body::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.04);
}

.mac-dialog-body::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(169, 207, 222, 0.46);
}

.mac-dialog-body:hover::-webkit-scrollbar-thumb {
  background: rgba(119, 218, 211, 0.68);
}
```

最大化面板使用固定安全边距：

```css
.mac-dialog-panel.maximized {
  width: calc(100vw - 32px);
  max-width: none !important;
  height: calc(100vh - 32px);
  max-height: none;
}
```

恢复浮条固定在视口底部左侧，使用现有玻璃材质。移动端继续隐藏三色按钮、面板贴底，并将最大化尺寸调整为 `calc(100vw - 16px)` / `calc(100vh - 16px)`。

- [ ] **Step 5: 运行回归验证**

Run:

```bash
npm test && npm run build
```

Expected: 所有测试 PASS；Vite 构建成功；无未使用导入和模板解析错误。

- [ ] **Step 6: 提交通用弹窗组件**

```bash
git add src/components/MacDialog.vue
git commit -m "feat: add mac dialog window interactions"
```

### Task 4: 迁移工作日志弹窗

**Files:**
- Modify: `src/views/WorkLog.vue`

- [ ] **Step 1: 导入并注册 MacDialog**

在脚本中新增：

```js
import MacDialog from '@/components/MacDialog.vue'
```

在组件选项中注册：

```js
components: {
  MacDialog
},
```

- [ ] **Step 2: 用通用组件替换原弹窗外壳**

将原来的 `.dialog-mask`、`.dialog` 和标题节点替换为下面的开头；现有日期、人天、日志类型、补助、地点、项目、工作内容、工时和备注节点不发生代码修改，只移动到该 form 内：

```vue
<MacDialog
  v-model="showDialog"
  :title="dialogMode === 'create' ? '新增工作日志' : '修改工作日志'"
  width="920px"
  :close-disabled="submitting"
  panel-class="work-log-dialog"
  @cancel="closeDialog"
>
  <form id="work-log-dialog-form" class="dialog-form" @submit.prevent="submitDialog">
```

将现有备注字段之后的 `.dialog-actions` 整块替换为下面的结尾：

```vue
  </form>

  <template #footer>
    <button type="button" class="ghost-btn" :disabled="submitting" @click="closeDialog">取消</button>
    <button
      type="submit"
      form="work-log-dialog-form"
      class="action-btn"
      :disabled="submitting"
    >
      {{ submitting ? '提交中...' : (dialogMode === 'create' ? '保存' : '更新') }}
    </button>
  </template>
</MacDialog>
```

删除旧外壳对应的两个闭合 `</div>`，确保页面只保留 `MacDialog` 一个弹窗根节点，避免出现两套遮罩或操作栏。

- [ ] **Step 3: 清理工作日志重复弹窗样式**

删除 `WorkLog.vue` 中仅服务旧弹窗外壳的 `.dialog-mask`、`.dialog`、`.dialog h3` 和 sticky `.dialog-actions` 规则。保留 `.dialog-form`、字段、下拉和业务面板样式。

通过 `:deep(.work-log-dialog)` 对工作日志专属宽度或表单间距做最小调整，不覆盖通用滚动条和固定框架规则。

- [ ] **Step 4: 运行测试与构建**

Run:

```bash
npm test && npm run build
```

Expected: 所有测试 PASS；工作日志模板成功编译；构建产物生成到 `dist/`。

- [ ] **Step 5: 启动本地页面做真实交互验证**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

使用浏览器验证：

1. 打开工作日志页面并打开新增弹窗。
2. 确认标题栏和底部操作栏固定，仅中间表单滚动。
3. 确认滚动条为 6px 半透明样式，悬停颜色增强。
4. 红色、遮罩、`Esc` 和底部取消均能关闭，且再次打开表单状态正常。
5. 黄色收起后显示底部恢复浮条，恢复后表单值不丢失。
6. 绿色可最大化并还原，表单值不丢失。
7. 保存请求提交中，红色、黄色、关闭按钮、遮罩和 `Esc` 均不能关闭弹窗。
8. 移动视口下三色按钮隐藏，关闭、取消、滚动和底部布局正常。

Expected: 所有交互符合设计说明，控制台无 error，页面无横向溢出。

- [ ] **Step 6: 提交工作日志迁移**

```bash
git add src/views/WorkLog.vue
git commit -m "feat: migrate work log form to mac dialog"
```

### Task 5: 最终回归与交付检查

**Files:**
- Verify only; no production files should change.

- [ ] **Step 1: 执行完整自动化验证**

Run:

```bash
npm test && npm run build
```

Expected: 命令退出码为 0；所有 Node 测试 PASS；Vite build 成功。

- [ ] **Step 2: 检查变更范围和格式**

Run:

```bash
git status --short
git diff --check HEAD~3..HEAD
git log -4 --oneline
```

Expected: 没有未提交生产代码；`git diff --check` 无输出；日志包含状态规则、窗口控制、通用弹窗和工作日志迁移的独立提交。

- [ ] **Step 3: 对照设计说明逐项复核**

确认 `docs/superpowers/specs/2026-07-11-mac-dialog-interaction-design.md` 中的目标、非目标、状态流、边界与验收项目均已被 Task 1-4 覆盖；发现缺口时回到对应任务修正并重新运行验证，不扩展到其他业务弹窗。
