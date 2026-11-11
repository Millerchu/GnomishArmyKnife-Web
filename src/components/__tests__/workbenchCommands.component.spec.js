// @vitest-environment happy-dom
import {defineComponent, reactive} from 'vue'
import {flushPromises, mount} from '@vue/test-utils'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import WorkbenchCommandHost from '../workbench/WorkbenchCommandHost.vue'
import {useWorkbenchAccess} from '@/composables/useWorkbenchAccess'
import {getCurrentUserAccessibleApps} from '@/api/permission'
import QuickCreateDialog from '../QuickCreateDialog.vue'
import {QUICK_CREATE_TYPES} from '@/constants/quickCreateRegistry'
import {listDataDictionaryOptionsByUsage} from '@/api/dataDictionary'
import {isEditableTarget} from '@/utils/workbenchCommands'
const route = reactive({path: '/work-log'})
const push = vi.fn()
vi.mock('vue-router', () => ({useRouter: () => ({push}), useRoute: () => route}))
vi.mock('@/api/permission', () => ({getCurrentUserAccessibleApps: vi.fn()}))
vi.mock('@/api/dataDictionary', () => ({listDataDictionaryOptionsByUsage: vi.fn()}))
const wrappers = []
const allCodes = ['APP_CALCULATOR', 'APP_TODO_LIST', 'APP_WORK_LOG', 'APP_PERSONAL_BILLS', 'APP_HEALTH_RECORD', 'APP_SYSTEM_LOG', 'APP_FUEL_STATS', 'APP_WOW_CHARACTER', 'APP_PASSWORD_MEMO']
const response = data => ({data: {code: '0', data}})
function render(component = WorkbenchCommandHost, props = {}, stubs = {}) {
  const wrapper = mount(component, {props, attachTo: document.body, global: {stubs: {AppIconImage: true, AuthenticatedImage: true, QuickCreateDialog: {props: ['modelValue', 'initialTypeCode', 'types'], template: '<div v-if="modelValue" class="quick-dialog-stub">{{ initialTypeCode }}</div>'}, ...stubs}}})
  wrappers.push(wrapper); return wrapper
}
function key(key, extra = {}, target = document) {
  const event = new KeyboardEvent('keydown', {key, bubbles: true, cancelable: true, ...extra})
  target.dispatchEvent(event)
  return event
}
function addTarget(markup, selector) {
  const container = document.createElement('div')
  container.innerHTML = markup
  document.body.append(container)
  return selector ? container.querySelector(selector) : container.firstElementChild
}
async function open() { const wrapper = render(); await flushPromises(); key('k', {ctrlKey: true}); await flushPromises(); return wrapper }
const input = () => document.querySelector('[role=combobox]')
const options = () => [...document.querySelectorAll('[role=option]')]
beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear(); route.path = '/work-log'
  localStorage.setItem('token', 'test-token'); localStorage.setItem('user', JSON.stringify({id: '1'}))
  vi.stubGlobal('matchMedia', vi.fn(() => ({matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn()})))
  getCurrentUserAccessibleApps.mockResolvedValue(response({userId: '1', grantedFeatureCodes: allCodes, apps: [], permissionSource: 'BACKEND'}))
  listDataDictionaryOptionsByUsage.mockResolvedValue(response([]))
})
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); document.body.innerHTML = ''; vi.unstubAllGlobals() })
it('全局 Ctrl/⌘ K 打开；默认六应用四新增，不显示系统菜单或未授权应用', async () => {
  await open()
  expect(input()).not.toBeNull(); expect(document.activeElement).toBe(input())
  expect(options()).toHaveLength(10)
  expect(options().some(item => item.textContent.includes('系统日志'))).toBe(false)
  expect(options().some(item => item.textContent.includes('芽记'))).toBe(false)
  key('k', {metaKey: true}); await flushPromises(); expect(document.activeElement).toBe(input())
})
it('编辑区的普通按键不被全局拦截', async () => {
  render(); await flushPromises()
  const editable = document.createElement('div'); editable.contentEditable = 'true'; editable.tabIndex = 0; document.body.append(editable); editable.focus()
  const ordinary = new KeyboardEvent('keydown', {key: 'x', bubbles: true, cancelable: true}); editable.dispatchEvent(ordinary)
  expect(ordinary.defaultPrevented).toBe(false)
  expect(input()).toBeNull()
})
const editableCases = [
  ['text input', '<input type="text">'],
  ['password input', '<input type="password">'],
  ['search input', '<input type="search">'],
  ['默认 input', '<input>'],
  ['textarea', '<textarea></textarea>'],
  ['contenteditable', '<div contenteditable="true" tabindex="0">可编辑文本</div>'],
  ['contenteditable 子节点', '<div contenteditable="true"><span tabindex="0">可编辑文本</span></div>', 'span'],
  ['select', '<select><option>选项</option></select>']
]
it.each(editableCases.flatMap(([name, markup, selector]) => ['ctrlKey', 'metaKey'].map(modifier => [name, modifier, markup, selector])))('%s 中 %s+K 不打开、不取消默认行为或阻断传播', async (_name, modifier, markup, selector) => {
  render(); await flushPromises()
  const target = addTarget(markup, selector)
  target.focus()
  expect(document.activeElement).toBe(target)
  const event = new KeyboardEvent('keydown', {key: 'k', [modifier]: true, bubbles: true, cancelable: true})
  const stop = vi.spyOn(event, 'stopPropagation')
  const stopImmediate = vi.spyOn(event, 'stopImmediatePropagation')
  const pageKey = vi.fn()
  target.addEventListener('keydown', pageKey)
  target.dispatchEvent(event); await flushPromises()
  expect(input()).toBeNull()
  expect(event.defaultPrevented).toBe(false)
  expect(stop).not.toHaveBeenCalled()
  expect(stopImmediate).not.toHaveBeenCalled()
  expect(pageKey).toHaveBeenCalledOnce()
  expect(document.activeElement).toBe(target)
})
it.each(['ctrlKey', 'metaKey'])('body 中 %s+K 打开并取消默认行为', async modifier => {
  render(); await flushPromises()
  expect(document.activeElement).toBe(document.body)
  const event = key('k', {[modifier]: true}, document.body)
  await flushPromises()
  expect(input()).not.toBeNull()
  expect(event.defaultPrevented).toBe(true)
})
it.each(['<input type="checkbox">', '<button>按钮</button>'].flatMap(markup => ['ctrlKey', 'metaKey'].map(modifier => [markup, modifier])))('%s 中 %s+K 可打开', async (markup, modifier) => {
  render(); await flushPromises()
  const target = addTarget(markup); target.focus()
  expect(document.activeElement).toBe(target)
  const event = key('k', {[modifier]: true}, target)
  await flushPromises()
  expect(input()).not.toBeNull()
  expect(event.defaultPrevented).toBe(true)
})
it.each(['ctrlKey', 'metaKey'])('面板输入框内 %s+K 保持打开并选中现有文本', async modifier => {
  await open()
  const search = input()
  search.value = '个人账单'; search.dispatchEvent(new Event('input', {bubbles: true})); await flushPromises()
  search.setSelectionRange(2, 2)
  const event = key('k', {[modifier]: true}, search)
  await flushPromises()
  expect(input()).toBe(search)
  expect(document.activeElement).toBe(search)
  expect(search.value).toBe('个人账单')
  expect(event.defaultPrevented).toBe(true)
  expect(search.selectionStart).toBe(0)
  expect(search.selectionEnd).toBe(search.value.length)
})
it.each(['ctrlKey', 'metaKey'])('组合输入中 %s+K 不打开也不取消默认行为', async modifier => {
  render(); await flushPromises()
  const event = key('k', {[modifier]: true, isComposing: true}, document.body)
  await flushPromises()
  expect(input()).toBeNull()
  expect(event.defaultPrevented).toBe(false)
})
it.each(['ctrlKey', 'metaKey'])('Alt 与 %s+K 组合不响应', async modifier => {
  render(); await flushPromises()
  const event = key('k', {[modifier]: true, altKey: true}, document.body)
  await flushPromises()
  expect(input()).toBeNull()
  expect(event.defaultPrevented).toBe(false)
})
it.each(['ctrlKey', 'metaKey'])('%s+K 检查 activeElement，即使事件派发在 document 上', async modifier => {
  render(); await flushPromises()
  const target = addTarget('<input type="text">'); target.focus()
  const event = key('k', {[modifier]: true})
  await flushPromises()
  expect(input()).toBeNull()
  expect(event.defaultPrevented).toBe(false)
})
it.each(['ctrlKey', 'metaKey'])('%s+K 检查 event.target，即使焦点在 body', async modifier => {
  render(); await flushPromises()
  const target = addTarget('<input type="password">')
  expect(document.activeElement).toBe(document.body)
  const event = key('k', {[modifier]: true}, target)
  await flushPromises()
  expect(input()).toBeNull()
  expect(event.defaultPrevented).toBe(false)
})
it.each(['ctrlKey', 'metaKey'])('%s+K 检查 composedPath 内 Shadow DOM 的可编辑元素', async modifier => {
  render(); await flushPromises()
  const host = addTarget('<div></div>')
  const shadow = host.attachShadow({mode: 'open'})
  const target = document.createElement('input'); target.type = 'search'; shadow.append(target); target.focus()
  expect(document.activeElement).toBe(host)
  const event = key('k', {[modifier]: true, composed: true}, target)
  await flushPromises()
  expect(input()).toBeNull()
  expect(event.defaultPrevented).toBe(false)
})
it('isEditableTarget 识别全部文本输入类型、textarea 和 select', () => {
  for (const type of ['', 'text', 'search', 'password', 'email', 'number', 'tel', 'url', 'date', 'datetime-local', 'month', 'week', 'time', 'unknown']) {
    const element = document.createElement('input')
    if (type) element.setAttribute('type', type)
    expect(isEditableTarget(element), type || '默认 text').toBe(true)
  }
  for (const tag of ['textarea', 'select']) expect(isEditableTarget(document.createElement(tag)), tag).toBe(true)
})
it('isEditableTarget 排除非文本 input、普通元素和空目标', () => {
  for (const type of ['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'hidden', 'image']) {
    const element = document.createElement('input'); element.type = type
    expect(isEditableTarget(element), type).toBe(false)
  }
  for (const element of [null, undefined, window, document, document.body, document.createElement('button'), document.createElement('a')]) {
    expect(isEditableTarget(element)).toBe(false)
  }
})
it('isEditableTarget 按 isContentEditable 识别继承、文本节点及显式不可编辑区', () => {
  const editable = addTarget('<div contenteditable="true"><span>文字</span><span contenteditable="false">只读</span></div>')
  expect(isEditableTarget(editable)).toBe(true)
  expect(isEditableTarget(editable.firstElementChild)).toBe(true)
  expect(isEditableTarget(editable.firstElementChild.firstChild)).toBe(true)
  expect(isEditableTarget(editable.lastElementChild)).toBe(false)
  editable.contentEditable = 'plaintext-only'
  expect(isEditableTarget(editable)).toBe(true)
})
it('筛选全量且高亮，方向键选择并回车跳转，Esc 关闭恢复触发焦点', async () => {
  const trigger = document.createElement('button'); document.body.append(trigger); trigger.focus()
  await open()
  input().value = '个人账单'; input().dispatchEvent(new Event('input', {bubbles: true})); await flushPromises()
  expect(options()).toHaveLength(3)
  expect(document.querySelectorAll('mark').length).toBeGreaterThan(0)
  input().dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true})); await flushPromises()
  expect(options()[1].getAttribute('aria-selected')).toBe('true')
  input().dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowUp', bubbles: true})); await flushPromises()
  input().dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true})); await flushPromises()
  expect(push).toHaveBeenCalledWith('/personal-bills'); expect(input()).toBeNull()
  key('k', {ctrlKey: true}); await flushPromises(); key('Escape'); await flushPromises()
  expect(input()).toBeNull()
})
it('无匹配显示空态，Enter 不执行', async () => {
  await open(); input().value = '天气'; input().dispatchEvent(new Event('input', {bubbles: true})); await flushPromises()
  expect(document.body.textContent).toContain('没有匹配的应用或操作')
  input().dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true})); await flushPromises()
  expect(push).not.toHaveBeenCalled()
})
it('从非首页直接打开预选快速新增，不需要跳转', async () => {
  const wrapper = await open(); input().value = '快速新增 工作日志'; input().dispatchEvent(new Event('input', {bubbles: true})); await flushPromises()
  input().dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true})); await flushPromises()
  expect(wrapper.get('.quick-dialog-stub').text()).toBe('WORK_LOG'); expect(push).not.toHaveBeenCalled()
})
it.each(['/login', '/register'])('公开页 %s 不响应快捷键', async path => {
  route.path = path; render(); await flushPromises()
  for (const modifier of ['ctrlKey', 'metaKey']) {
    const event = key('k', {[modifier]: true}); await flushPromises()
    expect(input()).toBeNull(); expect(event.defaultPrevented).toBe(false)
  }
})
it('未登录不响应；同账号后台刷新失败保留授权结果', async () => {
  localStorage.clear(); render(); await flushPromises()
  for (const modifier of ['ctrlKey', 'metaKey']) {
    const event = key('k', {[modifier]: true}); await flushPromises()
    expect(input()).toBeNull(); expect(event.defaultPrevented).toBe(false)
  }
  localStorage.setItem('token', 'new'); localStorage.setItem('user', '{}'); window.dispatchEvent(new Event('gak:auth-changed')); await flushPromises()
  key('k', {ctrlKey: true}); await flushPromises(); expect(options().length).toBeGreaterThan(0)
  getCurrentUserAccessibleApps.mockRejectedValue(new Error('synthetic')); window.dispatchEvent(new Event('gak:permissions-changed')); await flushPromises()
  expect(options().length).toBeGreaterThan(0); expect(document.body.textContent).not.toContain('权限不可用')
})
it('同一 App 下首页与全局命令共享一次权限目录请求', async () => {
  const Consumer = defineComponent({setup: () => useWorkbenchAccess(), template: '<div>{{ tools.length }}</div>'})
  const Provider = defineComponent({components: {WorkbenchCommandHost, Consumer}, setup() {useWorkbenchAccess(true)}, template: '<WorkbenchCommandHost/><Consumer/>'})
  render(Provider); await flushPromises()
  expect(getCurrentUserAccessibleApps).toHaveBeenCalledOnce()
})
it('移动搜索按钮事件打开同一面板，取消关闭', async () => {
  render(); await flushPromises(); window.dispatchEvent(new Event('gak:open-command')); await flushPromises()
  expect(input()).not.toBeNull()
  document.querySelector('.wb-command-input button').click(); await flushPromises(); expect(input()).toBeNull()
})
it('快速新增的真实对话框初始化预选类型，未授权预选不会选中', async () => {
  const type = QUICK_CREATE_TYPES.find(item => item.typeCode === 'PERSONAL_BILL')
  const wrapper = render(QuickCreateDialog, {modelValue: true, initialTypeCode: 'PERSONAL_BILL', types: [type]}, {QuickCreateDialog: false, MacDialog: {template: '<div><slot/></div>'}})
  await flushPromises(); expect(wrapper.get('.type-picker select').element.value).toBe('PERSONAL_BILL')
  expect(wrapper.find('#quick-create-form').exists()).toBe(true)
  expect(listDataDictionaryOptionsByUsage).toHaveBeenCalled()
  const denied = render(QuickCreateDialog, {modelValue: true, initialTypeCode: 'WORK_LOG', types: [type]}, {QuickCreateDialog: false, MacDialog: {template: '<div><slot/></div>'}})
  await flushPromises(); expect(denied.get('.type-picker select').element.value).toBe('')
})
