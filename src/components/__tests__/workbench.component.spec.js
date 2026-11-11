// @vitest-environment happy-dom
import {defineComponent} from 'vue'
import {flushPromises, mount} from '@vue/test-utils'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import WorkbenchPanel from '../workbench/WorkbenchPanel.vue'
import AppDock from '../workbench/AppDock.vue'
import WorkbenchCommandHost from '../workbench/WorkbenchCommandHost.vue'
import TodoCard from '../workbench/TodoCard.vue'
import QuickCreateDialog from '../QuickCreateDialog.vue'
import {useWorkbenchAccess} from '@/composables/useWorkbenchAccess'
import {getCurrentUserAccessibleApps} from '@/api/permission'
import {listTodoTasks} from '@/api/todoList'
import {getWeeklyBrief, listUnfinishedWorkItems} from '@/api/workLog'
import {getHealthSummary} from '@/api/healthRecord'
import {getPersonalBillSummary} from '@/api/personalBills'
import {localDate} from '@/utils/workbenchData'
import {WORKBENCH_LAYOUT_KEY} from '@/utils/workbenchLayout'
import {WORKBENCH_GRID_KEY} from '@/utils/workbenchGrid'
import {writeAuthState} from '@/utils/authStorage'
vi.mock('@/api/workbenchPreference', () => ({
  getWorkbenchPreferences: vi.fn(async () => ({data: {code: '0', data: {version: 0, schemaVersion: 1, payload: null}}})),
  saveWorkbenchPreferences: vi.fn(async ({version, payload}) => ({data: {code: '0', data: {version: version + 1, schemaVersion: 1, payload}}}))
}))
vi.mock('vue-router', () => ({onBeforeRouteLeave: vi.fn(), useRouter: () => ({push: vi.fn()}), useRoute: () => ({path: '/home'})}))
vi.mock('@/api/permission', () => ({getCurrentUserAccessibleApps: vi.fn()}))
vi.mock('@/api/todoList', () => ({listTodoTasks: vi.fn(), updateTodoTaskStatus: vi.fn(), createTodoTask: vi.fn()}))
vi.mock('@/api/workLog', () => ({listUnfinishedWorkItems: vi.fn(), getWeeklyBrief: vi.fn(), createWorkLog: vi.fn(), listWorkLogs: vi.fn()}))
vi.mock('@/api/healthRecord', () => ({getHealthSummary: vi.fn(), createHealthRecord: vi.fn(), createHealthReport: vi.fn(), createHealthVisit: vi.fn()}))
vi.mock('@/api/personalBills', () => ({getPersonalBillSummary: vi.fn(), createPersonalBill: vi.fn(), createAnnualBudget: vi.fn()}))
const response = data => ({data: {code: '0', data}})
const codes = ['APP_TODO_LIST', 'APP_WORK_LOG', 'APP_PERSONAL_BILLS', 'APP_HEALTH_RECORD']
const wrappers = []
function render(component = WorkbenchPanel, props = {}, stubs = {}) { const wrapper = mount(component, {props, global: {stubs: {AppIconImage: true, AuthenticatedImage: true, ...stubs}}}); wrappers.push(wrapper); return wrapper }
const Harness = defineComponent({components: {WorkbenchPanel}, setup: () => useWorkbenchAccess(), template: '<WorkbenchPanel :loading="loading" :feature-codes="featureCodes" :source="source" :tools="tools" :types="quickCreateTypes" display-name="测试用户" @retry-permissions="reload" @order="setOrder" />'})
function panel(props = {}) { return render(WorkbenchPanel, {loading: false, source: 'backend', featureCodes: codes, tools: codes.map((featureCode, i) => ({key: String(i), name: featureCode, featureCode, route: `/app-${i}`, iconType: 'TEXT'})), ...props}) }
beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear()
  localStorage.setItem('token', 'test-token'); localStorage.setItem('user', JSON.stringify({id: '1'}))
  getCurrentUserAccessibleApps.mockResolvedValue(response({userId: '1', grantedFeatureCodes: codes, apps: [], permissionSource: 'BACKEND'}))
  listTodoTasks.mockResolvedValue(response({list: [], summary: {today: 0}, upcoming: []}))
  getWeeklyBrief.mockResolvedValue(response([])); listUnfinishedWorkItems.mockResolvedValue(response([]))
  getHealthSummary.mockResolvedValue(response({recordCount: 0, visitCount: 0, reportCount: 0}))
  getPersonalBillSummary.mockResolvedValue(response({currentMonthExpense: 0, currentMonthIncome: 0}))
})
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()) })
it('权限未返回不抢跑；部分授权不渲染和请求未授权卡片', async () => {
  let resolve; getCurrentUserAccessibleApps.mockReturnValueOnce(new Promise(yes => {resolve = yes}))
  const wrapper = render(Harness)
  expect(listTodoTasks).not.toHaveBeenCalled(); expect(getWeeklyBrief).not.toHaveBeenCalled(); expect(wrapper.find('.wb-dock').exists()).toBe(false)
  resolve(response({grantedFeatureCodes: ['APP_TODO_LIST', 'APP_CALCULATOR']})); await flushPromises()
  expect(wrapper.findAll('[data-card]').map(item => item.attributes('data-card'))).toEqual(['todo'])
  expect(listTodoTasks).toHaveBeenCalledOnce(); expect(getWeeklyBrief).not.toHaveBeenCalled(); expect(getHealthSummary).not.toHaveBeenCalled(); expect(getPersonalBillSummary).not.toHaveBeenCalled()
  expect(wrapper.get('.wb-dock-head').text()).toContain('已授权 2 个应用')
})
it('权限不可用不读本地草稿、不请求业务、不显示坞，可重试恢复', async () => {
  localStorage.setItem('system_app_catalog_draft', JSON.stringify([{featureCode: 'APP_TODO_LIST'}]))
  getCurrentUserAccessibleApps.mockRejectedValueOnce(new Error('synthetic'))
  const wrapper = render(Harness); await flushPromises()
  expect(wrapper.text()).toContain('权限不可用'); expect(wrapper.find('.wb-dock').exists()).toBe(false)
  expect(listTodoTasks).not.toHaveBeenCalled()
  await wrapper.get('.wb-page-state button').trigger('click'); await flushPromises()
  expect(wrapper.findAll('[data-card]')).toHaveLength(4)
})
it('HTTP 成功但业务错误也按权限不可用处理', async () => {
  getCurrentUserAccessibleApps.mockResolvedValue({data: {code: '500', data: {userId: '1', grantedFeatureCodes: codes, apps: [], permissionSource: 'BACKEND'}}})
  const wrapper = render(Harness); await flushPromises()
  expect(wrapper.text()).toContain('权限不可用'); expect(listTodoTasks).not.toHaveBeenCalled()
})
it('无授权给说明，管理员兜底显示来源警告且计数不包含系统菜单', async () => {
  getCurrentUserAccessibleApps.mockResolvedValueOnce(response({grantedFeatureCodes: []}))
  const empty = render(Harness); await flushPromises()
  expect(empty.text()).toContain('当前账号暂无可见应用'); expect(empty.find('.wb-dock').exists()).toBe(false)
  getCurrentUserAccessibleApps.mockResolvedValueOnce(response({grantedFeatureCodes: ['APP_CALCULATOR', 'APP_SYSTEM_LOG'], permissionSource: 'ADMIN_FALLBACK'}))
  const fallback = render(Harness); await flushPromises()
  expect(fallback.text()).toContain('建议尽快在权限管理中补齐授权')
  expect(fallback.get('.wb-dock-head').text()).toContain('已授权 1 个应用'); expect(fallback.get('.wb-dock-head').text()).toContain('管理员兜底')
  expect(fallback.findAll('.tool-item')).toHaveLength(1)
})
it('权限变化重新计算，过期目录响应不能覆盖新授权', async () => {
  let stale; getCurrentUserAccessibleApps.mockReturnValueOnce(new Promise(yes => {stale = yes}))
  const wrapper = render(Harness)
  getCurrentUserAccessibleApps.mockResolvedValueOnce(response({grantedFeatureCodes: ['APP_HEALTH_RECORD']}))
  window.dispatchEvent(new Event('gak:permissions-changed')); await flushPromises()
  stale(response({userId: '1', grantedFeatureCodes: codes, apps: [], permissionSource: 'BACKEND'})); await flushPromises()
  expect(wrapper.findAll('[data-card]').map(item => item.attributes('data-card'))).toEqual(['health'])
  expect(listTodoTasks).not.toHaveBeenCalled()
})
it('单卡失败不影响其他卡，今日摘要在任一依赖失败时隐藏', async () => {
  getPersonalBillSummary.mockRejectedValueOnce(new Error('synthetic'))
  const wrapper = panel(); await flushPromises()
  expect(wrapper.get('[data-card=bills]').text()).toContain('加载失败')
  expect(wrapper.get('[data-card=health]').text()).toContain('还没有健康记录')
  expect(wrapper.get('.wb-summary').text()).toContain('今日没有待办，工作日志未写')
  getWeeklyBrief.mockRejectedValueOnce(new Error('synthetic'))
  await wrapper.setProps({refreshKey: 1}); await flushPromises()
  expect(wrapper.find('.wb-summary').exists()).toBe(false)
})
it('今日摘要只取已加载的真实数据，快速新增成功后的 refreshKey 触发重读', async () => {
  const wrapper = panel(); await flushPromises()
  listTodoTasks.mockResolvedValue(response({list: [], summary: {today: 3}, upcoming: []}))
  getWeeklyBrief.mockResolvedValue(response([{logDate: localDate()}]))
  await wrapper.setProps({refreshKey: 1}); await flushPromises()
  expect(wrapper.get('.wb-summary').text()).toContain('今日还有 3 条待办，工作日志已写')
  expect(listTodoTasks).toHaveBeenCalledTimes(2)
})
it('移动整理态删除只改草稿，完成后保存顺序和删除结果', async () => {
  const wrapper = panel({mobile: true}); await flushPromises()
  await wrapper.get('[aria-pressed]').trigger('click')
  expect(wrapper.get('.wb-card-content').attributes()).toHaveProperty('inert')
  await wrapper.get('[aria-label="下移今日待办"]').trigger('click')
  await wrapper.get('[aria-label="删除健康组件"]').trigger('click')
  expect(localStorage.getItem(`${WORKBENCH_GRID_KEY}:1`)).toBeNull()
  expect(wrapper.text()).toContain('有未保存更改')
  await wrapper.get('[aria-pressed]').trigger('click'); await flushPromises()
  const saved = JSON.parse(localStorage.getItem(`${WORKBENCH_GRID_KEY}:1`))
  expect(saved.cards.map(card => card.id)).toEqual(['todo', 'workLog', 'bills', 'health', 'fuel', 'knowledge'])
  expect(saved.cards.find(card => card.id === 'workLog')).toMatchObject({x: 0, y: 0})
  expect(saved.cards.filter(card => card.hidden).map(card => card.id)).toEqual(['health'])
  expect(wrapper.find('[data-card=health]').exists()).toBe(false)
  const restored = panel(); await flushPromises()
  expect(restored.findAll('[data-card]').map(item => item.attributes('data-card'))).toEqual(['todo', 'workLog', 'bills'])
  await restored.get('[aria-pressed]').trigger('click')
  await restored.findAll('button').find(button => button.text() === '恢复默认').trigger('click')
  expect(JSON.parse(localStorage.getItem(`${WORKBENCH_GRID_KEY}:1`))).toEqual(saved)
  await restored.get('[aria-pressed]').trigger('click'); await flushPromises()
  expect(JSON.parse(localStorage.getItem(`${WORKBENCH_GRID_KEY}:1`)).cards.some(card => card.hidden)).toBe(false)
  expect(restored.findAll('[data-card]')[0].attributes('data-card')).toBe('todo')
})
it('旧布局中移除了全部已授权组件时仍可重新添加，未授权组件不可添加', async () => {
  localStorage.setItem(WORKBENCH_LAYOUT_KEY, JSON.stringify({hidden: ['todo', 'workLog', 'bills', 'health']}))
  const wrapper = panel({featureCodes: ['APP_TODO_LIST']}); await flushPromises()
  expect(wrapper.text()).toContain('工作台还没有组件'); expect(listTodoTasks).not.toHaveBeenCalled()
  await wrapper.get('[aria-pressed]').trigger('click')
  expect(wrapper.findAll('[data-card]')).toHaveLength(0)
  expect(wrapper.findAll('.wb-add-components button').map(button => button.attributes('aria-label'))).toEqual(['添加今日待办组件'])
  expect(listTodoTasks).not.toHaveBeenCalled()
  await wrapper.get('[aria-label="添加今日待办组件"]').trigger('click')
  expect(wrapper.findAll('[data-card]')).toHaveLength(1)
  expect(wrapper.find('.wb-add-components').exists()).toBe(false)
})
it('移动账单和健康默认折叠，标题可展开，待办保持展开', async () => {
  const wrapper = panel({mobile: true, dateText: '2026年11月11日 星期三'}); await flushPromises()
  expect(wrapper.get('.wb-mobile-date').text()).toContain('星期三')
  expect(wrapper.get('[data-card=todo] .wb-card-content').isVisible()).toBe(true)
  expect(wrapper.get('[data-card=bills] .wb-card-content').element.style.display).toBe('none')
  expect(wrapper.get('[data-card=health] .wb-card-content').element.style.display).toBe('none')
  await wrapper.get('[aria-label="展开本月账单"]').trigger('click')
  expect(wrapper.get('[data-card=bills] .wb-card-content').isVisible()).toBe(true)
})
it('沿用 home_tool_custom_order，拖拽保存原键并保留当前不可见的历史键', async () => {
  localStorage.setItem('home_tool_custom_order', JSON.stringify(['health-record', 'todo-list', 'old-ungranted']))
  getCurrentUserAccessibleApps.mockResolvedValue(response({grantedFeatureCodes: ['APP_TODO_LIST', 'APP_HEALTH_RECORD']}))
  const wrapper = render(Harness); await flushPromises()
  expect(wrapper.findAll('.tool-name').map(item => item.text())).toEqual(['健康', '待办列表'])
  const buttons = wrapper.findAll('.tool-item')
  await buttons[0].trigger('dragstart'); await buttons[1].trigger('drop')
  expect(JSON.parse(localStorage.getItem('home_tool_custom_order:1'))).toEqual(['todo-list', 'health-record', 'old-ungranted'])
  expect(JSON.parse(localStorage.getItem('home_tool_custom_order'))).toEqual(['health-record', 'todo-list', 'old-ungranted'])
})
it('坞折叠持久化，移动禁拖拽', async () => {
  const props = {tools: [{key: 'a', name: '应用', iconType: 'TEXT'}], source: 'backend', isMobileViewport: true}
  const wrapper = render(AppDock, props)
  expect(wrapper.get('.tool-item').attributes('draggable')).toBe('false')
  await wrapper.get('.wb-dock-head button').trigger('click')
  expect(wrapper.find('.tool-item').exists()).toBe(false)
  const restored = render(AppDock, props)
  expect(restored.get('.wb-dock-head button').attributes('aria-expanded')).toBe('false')
  await restored.get('.wb-dock-head button').trigger('click')
  expect(restored.find('.tool-item').exists()).toBe(true)
  await restored.get('.tool-item').trigger('dragstart'); await restored.get('.tool-item').trigger('drop')
  expect(restored.emitted('order')).toBeUndefined()
})
it('同账号权限和资料事件保留真实快速新增草稿及卡片实例，后台失败保留旧授权', async () => {
  const Provider = defineComponent({
    components: {WorkbenchCommandHost, Harness},
    setup() { return useWorkbenchAccess(true) },
    template: '<WorkbenchCommandHost/><Harness/>'
  })
  const wrapper = render(Provider, {}, {MacDialog: {props: ['modelValue'], template: '<div v-if="modelValue"><slot/></div>'}})
  await flushPromises()
  const card = wrapper.findComponent(TodoCard).vm.$.uid
  const dialog = wrapper.findComponent(QuickCreateDialog).vm.$.uid
  window.dispatchEvent(new CustomEvent('gak:open-quick-create', {detail: {typeCode: 'TODO_ITEM'}}))
  await flushPromises()
  await wrapper.get('.field-title input').setValue('权限更新期间的草稿')
  for (const event of ['gak:permissions-changed', 'gak:auth-changed']) {
    let finish
    getCurrentUserAccessibleApps.mockReturnValueOnce(new Promise(resolve => {finish = resolve}))
    if (event === 'gak:auth-changed') writeAuthState(localStorage, {token: 'test-token', user: {id: '1', displayName: '更新资料'}})
    else window.dispatchEvent(new Event(event))
    await flushPromises()
    expect(wrapper.vm.loading).toBe(false)
    expect(wrapper.findComponent(QuickCreateDialog).vm.$.uid).toBe(dialog)
    expect(wrapper.get('.field-title input').element.value).toBe('权限更新期间的草稿')
    expect(wrapper.findComponent(TodoCard).vm.$.uid).toBe(card)
    finish(response({userId: '1', grantedFeatureCodes: codes, apps: [], permissionSource: 'BACKEND'}))
    await flushPromises()
    expect(wrapper.get('.field-title input').element.value).toBe('权限更新期间的草稿')
    expect(wrapper.findComponent(TodoCard).vm.$.uid).toBe(card)
  }
  getCurrentUserAccessibleApps.mockRejectedValueOnce(new Error('synthetic'))
  window.dispatchEvent(new Event('gak:permissions-changed')); await flushPromises()
  expect(wrapper.vm.featureCodes).toEqual(codes)
  expect(wrapper.vm.source).toBe('backend')
  expect(wrapper.get('.field-title input').element.value).toBe('权限更新期间的草稿')
  expect(wrapper.findComponent(TodoCard).vm.$.uid).toBe(card)
  expect(listTodoTasks).toHaveBeenCalledOnce()
  expect(getWeeklyBrief).toHaveBeenCalledOnce()
})
it.each(['userId', 'token'])('仅身份 %s 变化才重新进入 loading 并清空旧授权', async field => {
  const wrapper = render(Harness); await flushPromises()
  let finish
  getCurrentUserAccessibleApps.mockReturnValueOnce(new Promise(resolve => {finish = resolve}))
  writeAuthState(localStorage, {token: field === 'token' ? 'new-token' : 'test-token', user: {id: field === 'userId' ? '2' : '1'}})
  await flushPromises()
  expect(wrapper.vm.loading).toBe(true)
  expect(wrapper.vm.featureCodes).toEqual([])
  expect(wrapper.vm.source).toBe('unavailable')
  expect(wrapper.findComponent(TodoCard).exists()).toBe(false)
  finish(response({userId: field === 'userId' ? '2' : '1', grantedFeatureCodes: ['APP_HEALTH_RECORD'], apps: [], permissionSource: 'BACKEND'}))
  await flushPromises()
  expect(wrapper.vm.loading).toBe(false)
  expect(wrapper.findAll('[data-card]').map(card => card.attributes('data-card'))).toEqual(['health'])
})
it('排序读取过滤重复和空串，setOrder 合并历史键后仍去重', async () => {
  localStorage.setItem('home_tool_custom_order', JSON.stringify(['health-record', '', '  ', 'health-record', 'old', null]))
  getCurrentUserAccessibleApps.mockResolvedValue(response({userId: '1', grantedFeatureCodes: ['APP_HEALTH_RECORD', 'APP_TODO_LIST'], apps: [], permissionSource: 'BACKEND'}))
  const wrapper = render(Harness); await flushPromises()
  expect(wrapper.findAll('.tool-name').map(item => item.text())).toEqual(['健康', '待办列表'])
  wrapper.vm.setOrder(['todo-list', '', 'todo-list', ' ', 'health-record', null])
  expect(JSON.parse(localStorage.getItem('home_tool_custom_order:1'))).toEqual(['todo-list', 'health-record', 'old'])
})
it('三个偏好迁移到用户键，切换账号后重读各自布局、坞折叠和图标顺序', async () => {
  const dockKey = 'gak_workbench_dock_collapsed_v1'
  const orderKey = 'home_tool_custom_order'
  const legacy = {
    [WORKBENCH_LAYOUT_KEY]: JSON.stringify({hidden: ['health']}),
    [dockKey]: 'true',
    [orderKey]: JSON.stringify(['health-record', 'todo-list'])
  }
  Object.entries(legacy).forEach(([key, value]) => localStorage.setItem(key, value))
  getCurrentUserAccessibleApps.mockResolvedValue(response({userId: '1', grantedFeatureCodes: ['APP_TODO_LIST', 'APP_HEALTH_RECORD'], apps: [], permissionSource: 'BACKEND'}))
  const wrapper = render(Harness); await flushPromises()
  Object.entries(legacy).forEach(([key, value]) => {
    expect(localStorage.getItem(`${key}:1`)).toBe(value)
    expect(localStorage.getItem(key)).toBe(value)
  })
  expect(wrapper.find('[data-card=health]').exists()).toBe(false)
  expect(wrapper.get('.wb-dock-head button').attributes('aria-expanded')).toBe('false')
  localStorage.setItem(`${WORKBENCH_LAYOUT_KEY}:2`, JSON.stringify({hidden: ['todo']}))
  localStorage.setItem(`${dockKey}:2`, 'false')
  localStorage.setItem(`${orderKey}:2`, JSON.stringify(['todo-list', 'health-record']))
  writeAuthState(localStorage, {token: 'test-token', user: {id: '2'}}); await flushPromises()
  expect(wrapper.find('[data-card=todo]').exists()).toBe(false)
  expect(wrapper.find('[data-card=health]').exists()).toBe(true)
  expect(wrapper.get('.wb-dock-head button').attributes('aria-expanded')).toBe('true')
  expect(wrapper.findAll('.tool-name').map(item => item.text())).toEqual(['待办列表', '健康'])
  writeAuthState(localStorage, {token: 'test-token', user: {id: '1'}}); await flushPromises()
  expect(wrapper.find('[data-card=todo]').exists()).toBe(true)
  expect(wrapper.find('[data-card=health]').exists()).toBe(false)
  expect(wrapper.get('.wb-dock-head button').attributes('aria-expanded')).toBe('false')
  await wrapper.get('.wb-dock-head button').trigger('click')
  expect(wrapper.findAll('.tool-name').map(item => item.text())).toEqual(['健康', '待办列表'])
  Object.entries(legacy).forEach(([key, value]) => expect(localStorage.getItem(key)).toBe(value))
})
it('仅 token 变化也重读当前账号的三个偏好，无 id 写回旧键', async () => {
  getCurrentUserAccessibleApps.mockResolvedValue(response({userId: '1', grantedFeatureCodes: ['APP_TODO_LIST', 'APP_HEALTH_RECORD'], apps: [], permissionSource: 'BACKEND'}))
  const wrapper = render(Harness); await flushPromises()
  localStorage.setItem(`${WORKBENCH_LAYOUT_KEY}:1`, JSON.stringify({hidden: ['todo']}))
  localStorage.setItem('gak_workbench_dock_collapsed_v1:1', 'true')
  localStorage.setItem('home_tool_custom_order:1', JSON.stringify(['health-record', 'todo-list']))
  writeAuthState(localStorage, {token: 'refreshed-token', user: {id: '1'}}); await flushPromises()
  expect(wrapper.find('[data-card=todo]').exists()).toBe(false)
  expect(wrapper.get('.wb-dock-head button').attributes('aria-expanded')).toBe('false')
  await wrapper.get('.wb-dock-head button').trigger('click')
  expect(wrapper.findAll('.tool-name').map(item => item.text())).toEqual(['健康', '待办列表'])
  writeAuthState(localStorage, {token: 'legacy-user', user: {username: 'no-id'}}); await flushPromises()
  wrapper.vm.setOrder(['todo-list'])
  await wrapper.get('[aria-pressed]').trigger('click')
  await wrapper.get('[aria-label="删除健康组件"]').trigger('click')
  await wrapper.get('.wb-dock-head button').trigger('click')
  expect(JSON.parse(localStorage.getItem('home_tool_custom_order'))).toEqual(['todo-list'])
  await wrapper.get('[aria-pressed]').trigger('click'); await flushPromises()
  expect(JSON.parse(localStorage.getItem(WORKBENCH_GRID_KEY)).cards.filter(card => card.hidden).map(card => card.id)).toEqual(['health'])
  expect(localStorage.getItem('gak_workbench_dock_collapsed_v1')).toBe('true')
})
