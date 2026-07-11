# 全应用弹窗统一迁移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将剩余 9 个页面的 18 个旧弹窗全部迁移到共享 `MacDialog`，保留现有业务行为，并统一关闭、拖拽、收起、最大化和内容滚动体验。

**Architecture:** 每个页面只替换弹窗外壳，业务表单继续由原页面持有。结构契约测试逐批锁定弹窗数量、表单关联、关闭锁定和主操作；每批再选择一个代表页面做真实挂载测试，验证提交、详情或嵌套行为。

**Tech Stack:** Vue 3、Vite、Vitest、Vue Test Utils、happy-dom、现有 `MacDialog`。

---

## 文件结构

### 测试支持

- Create: `src/views/__tests__/dialogMigrationContract.js` — 读取页面源码并统一验证共享弹窗契约。
- Create: `src/views/__tests__/businessDialogMigrationCrud.component.spec.js` — 第一批 3 个页面、5 个弹窗的结构契约。
- Create: `src/views/__tests__/todoListDialog.component.spec.js` — 第一批真实提交与锁定测试。
- Create: `src/views/__tests__/businessDialogMigrationDetail.component.spec.js` — 第二批 4 个页面、8 个弹窗的结构契约。
- Create: `src/views/__tests__/passwordMemoDialog.component.spec.js` — 第二批详情、验证与敏感状态测试。
- Create: `src/views/__tests__/businessDialogMigrationComplex.component.spec.js` — 第三批 2 个页面、5 个弹窗的结构契约。
- Create: `src/views/__tests__/wowCharacterDialog.component.spec.js` — 第三批嵌套弹窗测试。
- Modify: `package.json` — 组件测试脚本改为测试目录 glob，自动纳入新增 spec。

### 第一批页面

- Modify: `src/views/TodoList.vue`
- Modify: `src/views/SoftwareRepo.vue`
- Modify: `src/views/PersonalBills.vue`

### 第二批页面

- Modify: `src/views/FuelStats.vue`
- Modify: `src/views/KnowledgeBase.vue`
- Modify: `src/views/PasswordMemo.vue`
- Modify: `src/views/Home.vue`

### 第三批页面

- Modify: `src/views/HealthRecord.vue`
- Modify: `src/views/WowCharacterStats.vue`

## 统一迁移约束

每个表单弹窗只修改四处：旧遮罩和面板开头、form 的稳定 id、原 `.dialog-actions`、旧面板闭合节点。中间字段 DOM、绑定、校验和条件不修改。各弹窗的精确 `v-model`、标题、宽度、锁定状态、panel class、form id 和 footer 文案在对应任务的映射表中列出。

只读详情使用默认插槽；没有业务动作时不提供 footer。有编辑、审核、验证、复制或退出等业务动作时，只保留映射表列出的主操作。

### Task 1: 第一批普通 CRUD 弹窗

**Files:**
- Create: `src/views/__tests__/dialogMigrationContract.js`
- Create: `src/views/__tests__/businessDialogMigrationCrud.component.spec.js`
- Create: `src/views/__tests__/todoListDialog.component.spec.js`
- Modify: `src/views/TodoList.vue`
- Modify: `src/views/SoftwareRepo.vue`
- Modify: `src/views/PersonalBills.vue`
- Modify: `package.json`

- [ ] **Step 1: 创建共享结构断言和第一批失败测试**

创建 `src/views/__tests__/dialogMigrationContract.js`：

```js
import {expect} from 'vitest'

export async function expectDialogMigration(contract) {
  const {default: source} = await contract.loadSource()

  expect(source.match(/<MacDialog\b/g)).toHaveLength(contract.dialogCount)
  expect(source).toContain("import MacDialog from '@/components/MacDialog.vue'")
  expect(source).not.toContain('class="dialog-mask"')
  expect(source).not.toMatch(/<button\b[^>]*>\s*(取消|关闭)\s*<\/button>/)
  expect(source.match(/:close-disabled=/g) || []).toHaveLength(contract.closeDisabledCount)

  for (const formId of contract.formIds) {
    expect(source).toContain(`id="${formId}"`)
    expect(source).toContain(`form="${formId}"`)
  }

  for (const retainedAction of contract.retainedActions || []) {
    expect(source).toContain(retainedAction)
  }
}
```

创建 `src/views/__tests__/businessDialogMigrationCrud.component.spec.js`：

```js
// @vitest-environment happy-dom

import {describe, it} from 'vitest'
import {expectDialogMigration} from './dialogMigrationContract.js'

const contracts = [
  {
    name: '待办列表',
    loadSource: () => import('../TodoList.vue?raw'),
    dialogCount: 1,
    closeDisabledCount: 1,
    formIds: ['todo-task-dialog-form'],
    retainedActions: ['新增子任务']
  },
  {
    name: '软件仓库',
    loadSource: () => import('../SoftwareRepo.vue?raw'),
    dialogCount: 2,
    closeDisabledCount: 2,
    formIds: ['software-dialog-form', 'software-version-dialog-form'],
    retainedActions: ['选择文件', '清除']
  },
  {
    name: '个人账单',
    loadSource: () => import('../PersonalBills.vue?raw'),
    dialogCount: 2,
    closeDisabledCount: 2,
    formIds: ['personal-bill-dialog-form', 'personal-budget-dialog-form']
  }
]

describe('第一批业务弹窗迁移', () => {
  it.each(contracts)('$name 使用共享 MacDialog', async (contract) => {
    await expectDialogMigration(contract)
  })
})
```

将 `package.json` 的组件测试脚本改为：

```json
"test:component": "vitest run src/components/__tests__/*.component.spec.js src/views/__tests__/*.component.spec.js --exclude .worktrees/**"
```

- [ ] **Step 2: 运行 RED**

Run:

```bash
npm run test:component -- src/views/__tests__/businessDialogMigrationCrud.component.spec.js
```

Expected: 3 个页面因 `<MacDialog>` 数量为 0、仍存在 `.dialog-mask` 而 FAIL。

- [ ] **Step 3: 按映射迁移第一批页面**

| 页面 | v-model | title | width | close-disabled | panel-class | form id | footer 主操作 |
|---|---|---|---|---|---|---|---|
| TodoList | `showDialog` | 新增/编辑待办任务 | `780px` | `submitting` | `todo-editor-dialog` | `todo-task-dialog-form` | 保存任务/更新任务 |
| SoftwareRepo 软件 | `showSoftwareDialog` | 新增/编辑软件 | `720px` | `submitting` | `software-editor-dialog` | `software-dialog-form` | 保存软件/更新软件 |
| SoftwareRepo 版本 | `showVersionDialog` | 新增/编辑版本 | `820px` | `submitting` | `software-version-dialog` | `software-version-dialog-form` | 保存版本/更新版本 |
| PersonalBills 账单 | `showBillDialog` | 新增/编辑账单 | `760px` | `submitting` | `personal-bill-dialog` | `personal-bill-dialog-form` | 保存账单/更新账单 |
| PersonalBills 预算 | `showBudgetDialog` | 新增/编辑年度预算 | `680px` | `budgetSubmitting` | `personal-budget-dialog` | `personal-budget-dialog-form` | 保存预算/更新预算 |

每页脚本导入 `MacDialog`，并在现有组件选项中增加注册。以 TodoList 为例，实际修改是：

```js
import MacDialog from '@/components/MacDialog.vue'

 export default {
   name: 'TodoList',
+  components: {MacDialog},
   setup() {
```

删除旧 `.dialog-mask`、外壳 `.dialog`、`.dialog-title`、`.dialog-actions` 和对应移动端外壳规则；字段、步骤、上传、金额与预算业务样式保留。

- [ ] **Step 4: 写 TodoList 真实挂载测试**

创建 `src/views/__tests__/todoListDialog.component.spec.js`，mock 全部待办 API 和路由：

```js
// @vitest-environment happy-dom

import {flushPromises, mount} from '@vue/test-utils'
import {nextTick} from 'vue'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const api = vi.hoisted(() => ({
  clearCompletedTodoTasks: vi.fn(),
  createTodoTask: vi.fn(),
  deleteTodoTask: vi.fn(),
  listTodoTasks: vi.fn(),
  updateTodoTask: vi.fn(),
  updateTodoTaskImportant: vi.fn(),
  updateTodoTaskStatus: vi.fn()
}))

vi.mock('vue-router', () => ({useRouter: () => ({push: vi.fn()})}))
vi.mock('@/api/todoList', () => api)

import TodoList from '../TodoList.vue'

describe('待办弹窗真实交互', () => {
  beforeEach(() => {
    api.listTodoTasks.mockResolvedValue({data: {data: {list: [], total: 0}}})
    api.createTodoTask.mockResolvedValue({data: {data: {id: 1}}})
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.resetAllMocks()
  })

  it('footer 保存按钮提交新增任务并在 pending 时锁定关闭', async () => {
    let resolveCreate
    api.createTodoTask.mockImplementation(() => new Promise((resolve) => {
      resolveCreate = resolve
    }))
    const wrapper = mount(TodoList, {attachTo: document.body})
    await flushPromises()
    wrapper.vm.openCreateDialog()
    await nextTick()

    const panel = document.querySelector('.mac-dialog-panel.todo-editor-dialog')
    const form = panel.querySelector('#todo-task-dialog-form')
    const titleInput = form.querySelector('input[required]')
    const submitButton = panel.querySelector('button[form="todo-task-dialog-form"]')
    titleInput.value = '统一弹窗迁移'
    titleInput.dispatchEvent(new Event('input', {bubbles: true}))
    submitButton.click()
    await nextTick()

    expect(api.createTodoTask).toHaveBeenCalledTimes(1)
    expect(panel.querySelector('.mac-window-dot.close').disabled).toBe(true)
    expect(panel.querySelector('.mac-window-dot.minimize').disabled).toBe(true)

    resolveCreate({data: {data: {id: 1}}})
    await flushPromises()
    expect(document.querySelector('.todo-editor-dialog')).toBeNull()
    wrapper.unmount()
  })
})
```

- [ ] **Step 5: 运行第一批 GREEN 与构建**

Run:

```bash
npm test && npm run build
```

Expected: 全部测试 PASS，Vite build 成功，无旧第一批弹窗外壳。

- [ ] **Step 6: 提交第一批**

```bash
git add package.json src/views/TodoList.vue src/views/SoftwareRepo.vue src/views/PersonalBills.vue src/views/__tests__/dialogMigrationContract.js src/views/__tests__/businessDialogMigrationCrud.component.spec.js src/views/__tests__/todoListDialog.component.spec.js
git commit -m "feat: migrate CRUD dialogs to MacDialog"
```

### Task 2: 第二批详情、安全与首页弹窗

**Files:**
- Create: `src/views/__tests__/businessDialogMigrationDetail.component.spec.js`
- Create: `src/views/__tests__/passwordMemoDialog.component.spec.js`
- Modify: `src/views/FuelStats.vue`
- Modify: `src/views/KnowledgeBase.vue`
- Modify: `src/views/PasswordMemo.vue`
- Modify: `src/views/Home.vue`

- [ ] **Step 1: 写第二批失败契约测试**

创建 `src/views/__tests__/businessDialogMigrationDetail.component.spec.js`：

```js
// @vitest-environment happy-dom

import {describe, it} from 'vitest'
import {expectDialogMigration} from './dialogMigrationContract.js'

const contracts = [
  {
    name: '加油统计',
    loadSource: () => import('../FuelStats.vue?raw'),
    dialogCount: 2,
    closeDisabledCount: 1,
    formIds: ['fuel-record-dialog-form'],
    retainedActions: ['编辑记录']
  },
  {
    name: '知识库',
    loadSource: () => import('../KnowledgeBase.vue?raw'),
    dialogCount: 2,
    closeDisabledCount: 2,
    formIds: ['knowledge-entry-dialog-form'],
    retainedActions: ['通过发布', '驳回投稿', '编辑当前条目']
  },
  {
    name: '密码备忘录',
    loadSource: () => import('../PasswordMemo.vue?raw'),
    dialogCount: 2,
    closeDisabledCount: 2,
    formIds: ['password-memo-edit-dialog-form', 'password-memo-verify-form'],
    retainedActions: ['复制密码', '验证并显示密码']
  },
  {
    name: '首页',
    loadSource: () => import('../Home.vue?raw'),
    dialogCount: 2,
    closeDisabledCount: 1,
    formIds: ['home-profile-dialog-form', 'home-password-dialog-form'],
    retainedActions: ['保存信息', '修改密码', '确认退出']
  }
]

describe('第二批业务弹窗迁移', () => {
  it.each(contracts)('$name 使用共享 MacDialog', async (contract) => {
    await expectDialogMigration(contract)
  })
})
```

- [ ] **Step 2: 运行 RED**

Run:

```bash
npx vitest run src/views/__tests__/businessDialogMigrationDetail.component.spec.js --exclude .worktrees/**
```

Expected: 4 个页面全部因旧弹窗结构 FAIL。

- [ ] **Step 3: 按映射迁移第二批页面**

| 页面/弹窗 | width | close-disabled | panel-class | form id | footer 主操作 |
|---|---|---|---|---|---|
| FuelStats 详情 | `760px` | 无 | `fuel-detail-dialog` | 无 | 编辑记录 |
| FuelStats 编辑 | `760px` | `submitting` | `fuel-editor-dialog` | `fuel-record-dialog-form` | 保存记录/更新记录 |
| KnowledgeBase 编辑 | `860px` | `submitting` | `knowledge-editor-dialog` | `knowledge-entry-dialog-form` | 保存并发布/提交投稿/保存修改 |
| KnowledgeBase 详情 | `920px` | `detailLoading || reviewSubmitting` | `knowledge-detail-dialog` | 无 | 通过发布、驳回投稿、编辑当前条目 |
| PasswordMemo 编辑 | `760px` | `submitting` | `password-memo-editor-dialog` | `password-memo-edit-dialog-form` | 保存/更新 |
| PasswordMemo 详情 | `820px` | `verifyingPassword` | `password-memo-detail-dialog` | `password-memo-verify-form` | 验证并显示密码；复制密码留在内容区 |
| Home 个人中心 | `720px` | `dialogLoading` | `home-user-dialog` | `home-profile-dialog-form`、`home-password-dialog-form` | 按当前 tab 显示保存信息/修改密码 |
| Home 退出确认 | `460px` | 无 | `home-logout-dialog` | 无 | 确认退出 |

Home 的 `requestLogout()` 改为：

```js
const requestLogout = () => {
  clearSurfaceNotice()
  logoutPending.value = true
}
```

移除 `logoutDialogRef` 以及 `handleDocumentClick`、`handleEscapeKey` 中仅服务旧退出确认弹窗的分支；系统菜单和通知的点击/键盘逻辑继续保留。

KnowledgeBase 详情 footer 内按原条件渲染审核和编辑按钮；删除纯关闭按钮。FuelStats 详情只保留编辑记录。PasswordMemo 详情把验证 form 赋予稳定 id，验证 submit 移到 footer。

- [ ] **Step 4: 写 PasswordMemo 真实详情测试**

`src/views/__tests__/passwordMemoDialog.component.spec.js` 先定义完整 mock 与 deferred 辅助：

```js
// @vitest-environment happy-dom

import {flushPromises, mount} from '@vue/test-utils'
import {nextTick} from 'vue'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const api = vi.hoisted(() => ({
  createPasswordMemo: vi.fn(),
  deletePasswordMemo: vi.fn(),
  getPasswordMemoDetail: vi.fn(),
  listPasswordMemos: vi.fn(),
  updatePasswordMemo: vi.fn(),
  verifyPasswordMemoAccess: vi.fn()
}))

vi.mock('vue-router', () => ({useRouter: () => ({push: vi.fn()})}))
vi.mock('@/api/passwordMemo', () => api)

import PasswordMemo from '../PasswordMemo.vue'

function createDeferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return {promise, resolve, reject}
}

async function mountPasswordMemo() {
  const wrapper = mount(PasswordMemo, {attachTo: document.body})
  await flushPromises()
  return wrapper
}

let verifyDeferred

beforeEach(() => {
  api.listPasswordMemos.mockResolvedValue({data: {data: {list: [], total: 0}}})
  api.getPasswordMemoDetail.mockResolvedValue({
    data: {data: {id: 7, siteName: 'GitHub', siteUrl: 'https://github.com', maskedPassword: '******'}}
  })
  verifyDeferred = createDeferred()
  api.verifyPasswordMemoAccess.mockImplementation(() => verifyDeferred.promise)
  vi.stubGlobal('alert', vi.fn())
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})
```

然后覆盖详情验证失败状态：

```js
it('详情验证 pending 时锁定关闭，失败后清空错误但保留输入', async () => {
  const wrapper = await mountPasswordMemo()
  await wrapper.vm.openDetailDialog({id: 7, siteName: 'GitHub'})
  await flushPromises()

  const panel = document.querySelector('.password-memo-detail-dialog')
  const verifyInput = panel.querySelector('#password-memo-verify-form input[type="password"]')
  const verifyButton = panel.querySelector('button[form="password-memo-verify-form"]')
  verifyInput.value = 'current-password'
  verifyInput.dispatchEvent(new Event('input', {bubbles: true}))

  verifyButton.click()
  await nextTick()
  expect(panel.querySelector('.mac-window-dot.close').disabled).toBe(true)
  expect(panel.querySelector('.mac-window-dot.minimize').disabled).toBe(true)

  verifyDeferred.reject(new Error('校验失败'))
  await flushPromises()
  expect(document.querySelector('.password-memo-detail-dialog')).not.toBeNull()
  expect(verifyInput.value).toBe('current-password')
  wrapper.unmount()
})
```

- [ ] **Step 5: 运行第二批 GREEN 与构建**

Run:

```bash
npm test && npm run build
```

Expected: 所有测试 PASS；第二批页面不存在旧 `.dialog-mask`、私有关闭按钮或纯取消 footer。

- [ ] **Step 6: 提交第二批**

```bash
git add src/views/FuelStats.vue src/views/KnowledgeBase.vue src/views/PasswordMemo.vue src/views/Home.vue src/views/__tests__/businessDialogMigrationDetail.component.spec.js src/views/__tests__/passwordMemoDialog.component.spec.js
git commit -m "feat: migrate detail and security dialogs to MacDialog"
```

### Task 3: 第三批复杂长表单与嵌套弹窗

**Files:**
- Create: `src/views/__tests__/businessDialogMigrationComplex.component.spec.js`
- Create: `src/views/__tests__/wowCharacterDialog.component.spec.js`
- Modify: `src/views/HealthRecord.vue`
- Modify: `src/views/WowCharacterStats.vue`

- [ ] **Step 1: 写第三批失败契约测试**

创建 `src/views/__tests__/businessDialogMigrationComplex.component.spec.js`：

```js
// @vitest-environment happy-dom

import {describe, it} from 'vitest'
import {expectDialogMigration} from './dialogMigrationContract.js'

const contracts = [
  {
    name: '健康记录',
    loadSource: () => import('../HealthRecord.vue?raw'),
    dialogCount: 3,
    closeDisabledCount: 3,
    formIds: [
      'health-record-dialog-form',
      'health-visit-dialog-form',
      'health-report-dialog-form'
    ],
    retainedActions: ['选择文件', '清除']
  },
  {
    name: '魔兽角色',
    loadSource: () => import('../WowCharacterStats.vue?raw'),
    dialogCount: 2,
    closeDisabledCount: 1,
    formIds: ['wow-character-dialog-form'],
    retainedActions: ['复制键位', '复制']
  }
]

describe('第三批业务弹窗迁移', () => {
  it.each(contracts)('$name 使用共享 MacDialog', async (contract) => {
    await expectDialogMigration(contract)
  })
})
```

- [ ] **Step 2: 运行 RED**

Run:

```bash
npx vitest run src/views/__tests__/businessDialogMigrationComplex.component.spec.js --exclude .worktrees/**
```

Expected: 两个页面因旧弹窗外壳 FAIL。

- [ ] **Step 3: 按映射迁移 HealthRecord**

| 弹窗 | width | close-disabled | panel-class | form id | footer |
|---|---|---|---|---|---|
| 健康指标 | `980px` | `submitting` | `health-record-dialog` | `health-record-dialog-form` | 保存记录 |
| 医院就诊 | `920px` | `submitting` | `health-visit-dialog` | `health-visit-dialog-form` | 保存就诊 |
| 报告单 | `780px` | `submitting` | `health-report-dialog` | `health-report-dialog-form` | 保存报告 |

三个表单继续共用现有 `submitting`，上传、清除和附件输入留在内容区。删除旧 `.large-dialog` 外壳尺寸，宽度由 `MacDialog` props 管理。

- [ ] **Step 4: 按映射迁移 WowCharacterStats**

角色表单使用：

```vue
<MacDialog
  v-model="showDialog"
  :title="dialogMode === 'create' ? '新增角色信息' : '编辑角色信息'"
  width="1120px"
  :close-disabled="submitting"
  panel-class="wow-character-dialog"
  @cancel="closeDialog"
>
```

表单 id 为 `wow-character-dialog-form`，footer 只保留保存角色/更新角色。

专精键位使用：

```vue
<MacDialog
  v-model="showKeybindingDialog"
  :title="activeKeybinding?.specNameLabel || '专精键位'"
  subtitle="键位字符串默认隐藏，只在这里查看、粘贴和复制。"
  width="760px"
  panel-class="wow-keybinding-dialog"
  @cancel="closeKeybindingDialog"
>
```

footer 只保留“复制”。关闭键位弹窗不得调用角色主弹窗的 `closeDialog`；角色主弹窗关闭时继续主动清理键位弹窗。

- [ ] **Step 5: 写嵌套弹窗真实测试**

`src/views/__tests__/wowCharacterDialog.component.spec.js` 使用完整 mock 和挂载辅助：

```js
// @vitest-environment happy-dom

import {flushPromises, mount} from '@vue/test-utils'
import {nextTick} from 'vue'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const api = vi.hoisted(() => ({
  createWowCharacter: vi.fn(),
  deleteWowCharacter: vi.fn(),
  getWowCharacterOverview: vi.fn(),
  listWowCharacters: vi.fn(),
  updateWowCharacter: vi.fn(),
  listDataDictionaryOptionsByUsage: vi.fn()
}))

vi.mock('vue-router', () => ({useRouter: () => ({push: vi.fn()})}))
vi.mock('@/api/wowCharacter', () => ({
  createWowCharacter: api.createWowCharacter,
  deleteWowCharacter: api.deleteWowCharacter,
  getWowCharacterOverview: api.getWowCharacterOverview,
  listWowCharacters: api.listWowCharacters,
  updateWowCharacter: api.updateWowCharacter
}))
vi.mock('@/api/dataDictionary', () => ({
  listDataDictionaryOptionsByUsage: api.listDataDictionaryOptionsByUsage
}))

import WowCharacterStats from '../WowCharacterStats.vue'

async function mountWowCharacterStats() {
  const wrapper = mount(WowCharacterStats, {attachTo: document.body})
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  api.listWowCharacters.mockResolvedValue({data: {data: {list: [], total: 0}}})
  api.getWowCharacterOverview.mockResolvedValue({data: {data: {}}})
  api.listDataDictionaryOptionsByUsage.mockResolvedValue({data: {data: []}})
  vi.stubGlobal('alert', vi.fn())
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})
```

然后验证嵌套关闭与底层状态：

```js
it('专精键位作为顶层弹窗关闭后保留角色表单', async () => {
  const wrapper = await mountWowCharacterStats()
  wrapper.vm.openCreateDialog()
  await nextTick()

  const rolePanel = document.querySelector('.wow-character-dialog')
  const characterInput = rolePanel.querySelector('input[placeholder="例如：风渐渐"]')
  characterInput.value = '风渐渐'
  characterInput.dispatchEvent(new Event('input', {bubbles: true}))

  wrapper.vm.openKeybindingDialog({
    specName: 'frost_mage',
    specNameLabel: '冰霜',
    bindingContent: 'binding-content'
  })
  await nextTick()
  expect(document.querySelector('.wow-keybinding-dialog')).not.toBeNull()

  document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}))
  await nextTick()
  expect(document.querySelector('.wow-keybinding-dialog')).toBeNull()
  expect(document.querySelector('.wow-character-dialog')).not.toBeNull()
  expect(characterInput.value).toBe('风渐渐')
  wrapper.unmount()
})
```

- [ ] **Step 6: 运行第三批 GREEN 与构建**

Run:

```bash
npm test && npm run build
```

Expected: 所有测试 PASS；长表单只在 `.mac-dialog-body` 内滚动；嵌套测试通过。

- [ ] **Step 7: 提交第三批**

```bash
git add src/views/HealthRecord.vue src/views/WowCharacterStats.vue src/views/__tests__/businessDialogMigrationComplex.component.spec.js src/views/__tests__/wowCharacterDialog.component.spec.js
git commit -m "feat: migrate complex dialogs to MacDialog"
```

### Task 4: 全量审计与浏览器验收

**Files:**
- Verify all modified files; production changes only if verification exposes a regression.

- [ ] **Step 1: 审计旧弹窗结构是否清零**

Run:

```bash
rg -n 'class="dialog-mask|class="confirm-mask|class="dialog-close"' src/views --glob '*.vue'
```

Expected: 无输出。`StarInteractive.vue` 的 `overlay-panel` 仍保留。

- [ ] **Step 2: 核对共享弹窗数量**

Run:

```bash
rg -n '<MacDialog' src/views --glob '*.vue'
```

Expected: 新增范围内 18 个，加上已迁移的工作日志和系统管理弹窗；每个数量与结构测试一致。

- [ ] **Step 3: 运行完整自动化验证**

Run:

```bash
npm test && npm run build && git diff --check
```

Expected: Node 与 Vitest 全部 PASS，生产构建成功，格式检查无输出。

- [ ] **Step 4: 真实浏览器验证第一批**

启动：

```bash
npm run dev -- --host 127.0.0.1
```

检查待办、软件仓库和个人账单：新增/编辑打开、主提交、收起恢复、最大化、拖拽、Esc、无底部取消。

- [ ] **Step 5: 真实浏览器验证第二批**

检查加油详情、知识详情与审核、密码验证、个人中心两个 tab、退出登录确认。确认详情无冗余关闭 footer，验证失败保留输入，退出确认仅保留主操作。

- [ ] **Step 6: 真实浏览器验证第三批与响应式**

检查健康三类长表单、角色长表单和专精键位嵌套；在 1280×720、800×700、390×844 下确认内容区滚动、固定 footer、无横向溢出、移动端控制正确，控制台无 error。

- [ ] **Step 7: 回归已迁移页面**

检查工作日志、用户管理、应用管理和数据字典仍能打开、关闭和提交，确保共享组件没有退化。

- [ ] **Step 8: 最终提交（仅在验收产生修复时）**

若验收产生了范围内修复，先用 `git status --short` 确认文件，再执行：

```bash
git add -u src/views package.json
git add src/views/__tests__
git commit -m "fix: complete all application dialog migration"
```

若没有额外修复，不创建空提交；未跟踪且不属于本任务的文件不得加入提交。
