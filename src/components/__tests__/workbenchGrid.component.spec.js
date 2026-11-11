// @vitest-environment happy-dom
import {readFileSync} from 'node:fs'
import {flushPromises, mount} from '@vue/test-utils'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {GridItem, GridLayout} from 'grid-layout-plus'
import {saveWorkbenchPreferences} from '@/api/workbenchPreference'
import WorkbenchPanel from '../workbench/WorkbenchPanel.vue'
import WorkbenchGrid from '../workbench/WorkbenchGrid.vue'
import {applyWorkbenchPayload, cardsOverlap, defaultGridCards, GRID_SIZES, WORKBENCH_GRID_KEY} from '@/utils/workbenchGrid'
import {WORKBENCH_CARDS, WORKBENCH_LAYOUT_KEY} from '@/utils/workbenchLayout'
import {writeAuthState} from '@/utils/authStorage'

vi.mock('@/api/workbenchPreference', () => ({
  getWorkbenchPreferences: vi.fn(async () => ({data: {code: '0', data: {version: 0, schemaVersion: 1, payload: null}}})),
  saveWorkbenchPreferences: vi.fn(async ({version, payload}) => ({data: {code: '0', data: {version: version + 1, schemaVersion: 1, payload}}}))
}))
vi.mock('grid-layout-plus', async () => {
  const {defineComponent} = await import('vue')
  return {
    GridLayout: defineComponent({name: 'GridLayout', props: ['layout', 'isDraggable', 'isResizable', 'colNum', 'rowHeight', 'margin', 'maxRows', 'verticalCompact', 'responsive'], template: '<div class="grid-library"><slot/></div>'}),
    GridItem: defineComponent({name: 'GridItem', props: ['i', 'x', 'y', 'w', 'h', 'minW', 'maxW', 'minH', 'maxH', 'dragAllowFrom'], emits: ['moved', 'resized'], template: '<div class="grid-library-item"><slot/></div>'})
  }
})
vi.mock('vue-router', () => ({onBeforeRouteLeave: vi.fn(), useRouter: () => ({push: vi.fn()})}))
const content = {template: '<div class="card-test-content"><button>业务操作</button></div>'}
const wrappers = []
const codes = WORKBENCH_CARDS.map(card => card.featureCode)
const cacheKey = `${WORKBENCH_GRID_KEY}:9223372036854775807`
function panel(props = {}) {
  const wrapper = mount(WorkbenchPanel, {attachTo: document.body, props: {source: 'backend', featureCodes: codes, tools: codes.map(featureCode => ({key: featureCode, name: featureCode, featureCode})), ...props}, global: {stubs: {TodoCard: content, WorkLogCard: content, BillsCard: content, HealthCard: content, FuelCard: content, KnowledgeCard: content, AppIconImage: true, AuthenticatedImage: true}}})
  wrappers.push(wrapper)
  return wrapper
}
const toggleEdit = async wrapper => { await wrapper.get('.wb-heading [aria-pressed]').trigger('click'); await flushPromises() }
const button = (wrapper, text) => wrapper.findAll('button').find(item => item.text() === text)
const positions = wrapper => wrapper.findComponent(WorkbenchGrid).props('cards').map(({id, hidden, size, x, y, w, h}) => ({id, hidden, size, x, y, w, h}))
function expectLegal(cards) {
  for (const card of cards) {
    expect({w: card.w, h: card.h}).toEqual(GRID_SIZES[card.size])
    expect(card.x).toBeGreaterThanOrEqual(0); expect(card.x + card.w).toBeLessThanOrEqual(12)
    expect(card.y).toBeGreaterThanOrEqual(0); expect(card.y + card.h).toBeLessThanOrEqual(48)
    expect(cards.some(other => other.id !== card.id && cardsOverlap(card, other))).toBe(false)
  }
}
beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('token', 'test-token')
  localStorage.setItem('user', JSON.stringify({id: '9223372036854775807'}))
})
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); vi.restoreAllMocks() })

it('阅读和整理共用 12 列坐标，阅读禁拖拽缩放无手柄；整理可 Tab 且内容 inert', async () => {
  const wrapper = panel()
  const saved = positions(wrapper)
  const grid = wrapper.findComponent(GridLayout)
  expect(grid.props()).toMatchObject({colNum: 12, maxRows: 48, isDraggable: false, isResizable: false, verticalCompact: false, responsive: false})
  expect(wrapper.find('.wb-drag-handle').exists()).toBe(false)
  expect(wrapper.get('[data-card=todo]').attributes('tabindex')).toBeUndefined()
  await toggleEdit(wrapper)
  expect(positions(wrapper)).toEqual(saved)
  expect(grid.props()).toMatchObject({isDraggable: true, isResizable: true})
  expect(wrapper.findAll('[data-card][tabindex="0"]')).toHaveLength(6)
  expect(wrapper.findAll('.wb-drag-handle')).toHaveLength(6)
  expect(wrapper.get('.wb-drag-handle').attributes('tabindex')).toBeUndefined()
  expect(wrapper.get('[data-card=todo] .wb-card-content').attributes()).toHaveProperty('inert')
  expect(wrapper.get('[data-card=todo]').attributes('aria-describedby')).toBe('wb-edit-help')
  expect(wrapper.text()).not.toContain('有未保存更改')
  expect(wrapper.findComponent(GridItem).props('dragAllowFrom')).toBe('.wb-drag-handle')
})
it.each(['S', 'M', 'L'])('档位按钮 %s 只改草稿，播报并避让相邻卡', async size => {
  const wrapper = panel(); await toggleEdit(wrapper)
  const title = {S: '小', M: '中', L: '大'}[size]
  await wrapper.get(`[aria-label="将健康设为${title}号"]`).trigger('click'); await flushPromises()
  expect(positions(wrapper).find(card => card.id === 'health')).toMatchObject({size, ...GRID_SIZES[size]})
  expect(wrapper.get(`[aria-label="将健康设为${title}号"]`).attributes('aria-pressed')).toBe('true')
  expect(wrapper.get('[aria-live="polite"]').text()).toContain(`健康已移到第`)
  expect(wrapper.get('[aria-live="polite"]').text()).toContain(`尺寸${title}`)
  expect(localStorage.getItem(cacheKey)).toBeNull(); expectLegal(positions(wrapper))
})
it('库缩放结束将非档位 7×4 吸附 L，库中间态不污染草稿或已保存数据', async () => {
  const wrapper = panel(); await toggleEdit(wrapper)
  const before = positions(wrapper)
  const model = wrapper.findComponent(GridLayout).props('layout')
  Object.assign(model.find(card => card.i === 'health'), {w: 7, h: 4})
  expect(positions(wrapper)).toEqual(before)
  const item = wrapper.findAllComponents(GridItem).find(item => item.props('i') === 'health')
  item.vm.$emit('resized', 'health', 4, 7)
  await flushPromises()
  // 7×4 距 L 更近（1 vs 2）。
  expect(positions(wrapper).find(card => card.id === 'health')).toMatchObject({size: 'L', w: 8, h: 4})
  expect(wrapper.findComponent(GridLayout).props('layout').find(card => card.i === 'health')).toMatchObject({w: 8, h: 4})
  expect(localStorage.getItem(cacheKey)).toBeNull(); expectLegal(positions(wrapper))
})
it('库的临时推位不参与最终布局，结束时清除选区且退出整理恢复阅读投影', async () => {
  const wrapper = panel(); await toggleEdit(wrapper)
  const library = wrapper.findComponent(GridLayout)
  const pushed = library.props('layout').find(card => card.i === 'workLog')
  Object.assign(pushed, {y: 40})
  const clear = vi.spyOn(window.getSelection(), 'removeAllRanges')
  const item = wrapper.findAllComponents(GridItem).find(item => item.props('i') === 'todo')
  item.vm.$emit('resized', 'todo', 3, 6)
  await flushPromises()
  expect(clear).toHaveBeenCalled()
  expect(positions(wrapper).find(card => card.id === 'workLog').y).toBeLessThan(8)
  expectLegal(positions(wrapper))
  const before = positions(wrapper)
  expect(library.props('layout').find(card => card.i === 'bills').w).toBe(4)
  await toggleEdit(wrapper)
  expect(positions(wrapper)).toEqual(before)
  expect(library.props('layout').find(card => card.i === 'bills').w).toBe(6)
  expect(JSON.parse(localStorage.getItem(cacheKey)).cards.find(card => card.id === 'bills').w).toBe(4)
})
it('在手柄按下及指针于网格外结束时清除选区，卸载移除全局监听', async () => {
  const wrapper = panel(); await toggleEdit(wrapper)
  const clear = vi.spyOn(window.getSelection(), 'removeAllRanges')
  await wrapper.get('.wb-drag-handle').trigger('pointerdown')
  expect(clear).toHaveBeenCalledOnce()
  window.dispatchEvent(new Event('pointerup'))
  expect(clear).toHaveBeenCalledTimes(2)
  wrapper.unmount(); wrappers.splice(wrappers.indexOf(wrapper), 1)
  window.dispatchEvent(new Event('pointerup'))
  expect(clear).toHaveBeenCalledTimes(2)
})
it('拖动结束只改草稿，坐标夹紧并处理碰撞，取消后还原', async () => {
  const wrapper = panel(); const before = positions(wrapper); await toggleEdit(wrapper)
  const item = wrapper.findAllComponents(GridItem).find(item => item.props('i') === 'workLog')
  item.vm.$emit('moved', 'workLog', 20, 100)
  await flushPromises()
  expect(positions(wrapper).find(card => card.id === 'workLog')).toMatchObject({size: 'S', x: 8, y: 46})
  expect(wrapper.get('[aria-live="polite"]').text()).toBe('工作日志已移到第 47 行第 9 列，尺寸小')
  expect(wrapper.text()).toContain('有未保存更改'); expectLegal(positions(wrapper))
  await button(wrapper, '取消').trigger('click')
  expect(positions(wrapper)).toEqual(before); expect(localStorage.getItem(cacheKey)).toBeNull()
})
it('桌面方向键移动一格、Shift 切档并播报，边界合法，不拦截内部控件方向键', async () => {
  const wrapper = panel(); await toggleEdit(wrapper)
  const card = wrapper.get('[data-card=todo]')
  card.element.focus()
  await card.trigger('keydown', {key: 'ArrowRight'}); await flushPromises()
  expect(document.activeElement).toBe(card.element)
  expect(positions(wrapper)[0]).toMatchObject({x: 1, y: 0, size: 'L'})
  expect(wrapper.get('[aria-live="polite"]').text()).toBe('今日待办已移到第 1 行第 2 列，尺寸大')
  await card.trigger('keydown', {key: 'ArrowDown'}); await flushPromises()
  expect(positions(wrapper)[0].y).toBe(1)
  await card.trigger('keydown', {key: 'ArrowLeft', shiftKey: true}); await flushPromises()
  expect(document.activeElement).toBe(card.element)
  expect(positions(wrapper)[0]).toMatchObject({size: 'M', w: 6, h: 3})
  const before = positions(wrapper)
  await wrapper.get('[aria-label="删除今日待办组件"]').trigger('keydown', {key: 'ArrowDown'})
  await card.trigger('keydown', {key: 'ArrowLeft', ctrlKey: true})
  expect(positions(wrapper)).toEqual(before); expectLegal(before)
})
it.each(['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'])('Shift+%s 可切换尺寸', async key => {
  const wrapper = panel(); await toggleEdit(wrapper)
  await wrapper.get('[aria-label="将今日待办设为中号"]').trigger('click')
  await wrapper.get('[data-card=todo]').trigger('keydown', {key, shiftKey: true}); await flushPromises()
  expect(positions(wrapper)[0].size).toBe(['ArrowUp', 'ArrowLeft'].includes(key) ? 'S' : 'L')
})
it('移动端不用网格库、没有档位和手柄，支持排序和删除；左右和 Shift 不改尺寸', async () => {
  const wrapper = panel({mobile: true}); await toggleEdit(wrapper)
  expect(wrapper.findComponent(GridLayout).exists()).toBe(false)
  expect(wrapper.findComponent(GridItem).exists()).toBe(false)
  expect(wrapper.find('.wb-drag-handle').exists()).toBe(false)
  expect(wrapper.find('[aria-label="将今日待办设为小号"]').exists()).toBe(false)
  const before = positions(wrapper)
  await wrapper.get('[data-card=todo]').trigger('keydown', {key: 'ArrowRight'})
  await wrapper.get('[data-card=todo]').trigger('keydown', {key: 'ArrowDown', shiftKey: true})
  expect(positions(wrapper)).toEqual(before)
  expect(before.map(card => card.id)).toEqual(['todo', 'bills', 'health', 'workLog', 'fuel', 'knowledge'])
  const focused = wrapper.get('[data-card=bills]').element
  focused.focus()
  await wrapper.get('[data-card=bills]').trigger('keydown', {key: 'ArrowDown'}); await flushPromises()
  expect(positions(wrapper).slice(0, 3).map(card => card.id)).toEqual(['todo', 'health', 'bills'])
  expect(document.activeElement).toBe(focused)
  for (const card of positions(wrapper).filter(card => !['bills', 'health'].includes(card.id))) expect(card).toEqual(before.find(item => item.id === card.id))
  expect(wrapper.get('[aria-live="polite"]').text()).toBe('本月账单已移到第 3 行第 1 列，尺寸小')
  await wrapper.get('[aria-label="上移本月账单"]').trigger('click')
  expect(positions(wrapper)).toEqual(before)
  await wrapper.get('[aria-label="删除健康组件"]').trigger('click')
  expect(positions(wrapper)).toEqual(before.filter(card => card.id !== 'health'))
  expect(wrapper.get('[aria-label="添加健康组件"]').exists()).toBe(true)
  expect(localStorage.getItem(cacheKey)).toBeNull()
})
it('完成写新键且保持旧键，取消丢弃深拷贝草稿，恢复默认只改草稿', async () => {
  const old = JSON.stringify({version: 1, order: ['health', 'todo'], hidden: ['bills']})
  localStorage.setItem(`${WORKBENCH_LAYOUT_KEY}:9223372036854775807`, old)
  const wrapper = panel(); const before = positions(wrapper); await toggleEdit(wrapper)
  await wrapper.get('[aria-label="删除健康组件"]').trigger('click')
  await button(wrapper, '取消').trigger('click')
  expect(positions(wrapper)).toEqual(before)
  await toggleEdit(wrapper)
  await wrapper.get('[aria-label="删除健康组件"]').trigger('click')
  await toggleEdit(wrapper)
  const saved = JSON.parse(localStorage.getItem(cacheKey))
  expect(saved.schemaVersion).toBe(1)
  expect(saved.cards.filter(card => card.hidden).map(card => card.id)).toEqual(['health', 'bills'])
  expect(localStorage.getItem(`${WORKBENCH_LAYOUT_KEY}:9223372036854775807`)).toBe(old)
  expect(wrapper.find('[data-card=health]').exists()).toBe(false)
  await toggleEdit(wrapper); await button(wrapper, '恢复默认').trigger('click')
  expect(JSON.parse(localStorage.getItem(cacheKey))).toEqual(saved)
  expect(positions(wrapper)).toEqual(defaultGridCards())
  await button(wrapper, '取消').trigger('click')
  await toggleEdit(wrapper); await button(wrapper, '恢复默认').trigger('click'); await toggleEdit(wrapper)
  expect(JSON.parse(localStorage.getItem(cacheKey)).cards).toEqual(defaultGridCards())
})
it('有未保存草稿时 beforeunload 提示，未修改、取消、完成和卸载后不提示', async () => {
  const wrapper = panel()
  function unload() { const event = new Event('beforeunload', {cancelable: true}); window.dispatchEvent(event); return event.defaultPrevented }
  expect(unload()).toBe(false)
  await toggleEdit(wrapper); expect(unload()).toBe(false)
  await wrapper.get('[aria-label="删除健康组件"]').trigger('click'); expect(unload()).toBe(true)
  await button(wrapper, '取消').trigger('click'); expect(unload()).toBe(false)
  await toggleEdit(wrapper); await wrapper.get('[aria-label="删除健康组件"]').trigger('click'); await toggleEdit(wrapper)
  expect(unload()).toBe(false)
  await toggleEdit(wrapper); await wrapper.get('[aria-label="添加健康组件"]').trigger('click'); expect(unload()).toBe(true)
  wrapper.unmount(); wrappers.splice(wrappers.indexOf(wrapper), 1); expect(unload()).toBe(false)
})
it('存储失败保留草稿和提示，可重试完成；保存失败不影响旧缓存', async () => {
  const initial = applyWorkbenchPayload(null)
  localStorage.setItem(cacheKey, JSON.stringify(initial))
  const wrapper = panel(); await toggleEdit(wrapper)
  await wrapper.get('[aria-label="删除健康组件"]').trigger('click')
  const original = localStorage.setItem.bind(localStorage)
  const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => { if (key === cacheKey) throw new Error('quota'); original(key, value) })
  await toggleEdit(wrapper)
  expect(wrapper.get('.wb-organize [role="alert"]').text()).toContain('布局保存失败')
  expect(wrapper.text()).toContain('有未保存更改')
  expect(JSON.parse(localStorage.getItem(cacheKey))).toEqual(initial)
  spy.mockRestore(); await toggleEdit(wrapper)
  expect(wrapper.find('.wb-organize').exists()).toBe(false)
  expect(JSON.parse(localStorage.getItem(cacheKey)).cards.find(card => card.id === 'health').hidden).toBe(true)
})
it('坞折叠/顺序即时保存且取消不回滚；完成取坞最新值进入 payload', async () => {
  const wrapper = panel(); await toggleEdit(wrapper)
  await wrapper.get('.wb-dock-head button').trigger('click')
  localStorage.setItem('home_tool_custom_order:9223372036854775807', '["work-log","old-ungranted"]')
  expect(localStorage.getItem('gak_workbench_dock_collapsed_v1:9223372036854775807')).toBe('true')
  expect(wrapper.text()).not.toContain('有未保存更改')
  await button(wrapper, '取消').trigger('click')
  expect(wrapper.get('.wb-dock-head button').attributes('aria-expanded')).toBe('false')
  await toggleEdit(wrapper); await toggleEdit(wrapper)
  expect(JSON.parse(localStorage.getItem(cacheKey)).dock).toEqual({collapsed: true, order: ['work-log', 'old-ungranted']})
})
it('身份变化丢弃旧账号草稿，按新账号读取和提交，不串 Long ID', async () => {
  const wrapper = panel(); await toggleEdit(wrapper)
  await wrapper.get('[aria-label="删除健康组件"]').trigger('click')
  writeAuthState(localStorage, {token: 'b-token', user: {id: '9223372036854775806'}}); await flushPromises()
  expect(wrapper.find('.wb-organize').exists()).toBe(false)
  expect(wrapper.find('[data-card=health]').exists()).toBe(true)
  await toggleEdit(wrapper); await wrapper.get('[aria-label="删除油耗统计组件"]').trigger('click'); await toggleEdit(wrapper)
  expect(localStorage.getItem(cacheKey)).toBeNull()
  expect(JSON.parse(localStorage.getItem(`${WORKBENCH_GRID_KEY}:9223372036854775806`)).cards.find(card => card.id === 'fuel').hidden).toBe(true)
})
it('部分授权从左上紧凑排且支持一格移动；阅读与整理坐标一致', async () => {
  const wrapper = panel({featureCodes: ['APP_HEALTH_RECORD', 'APP_KNOWLEDGE_BASE']})
  expect(positions(wrapper)[0]).toMatchObject({id: 'health', x: 0, y: 0})
  const reading = positions(wrapper); await toggleEdit(wrapper)
  expect(positions(wrapper)).toEqual(reading)
  await wrapper.get('[data-card=health]').trigger('keydown', {key: 'ArrowDown'}); await flushPromises()
  expect(positions(wrapper)[0].y).toBe(1)
  await toggleEdit(wrapper)
  expect(positions(wrapper)[0].y).toBe(1)
  const restored = panel({featureCodes: ['APP_HEALTH_RECORD', 'APP_KNOWLEDGE_BASE']})
  expect(positions(restored)).toEqual(positions(wrapper))
})
it('桌面和平板卡高保持紧凑，移动断点后卸载库，减少动态效果关闭位移动画', async () => {
  const width = window.innerWidth
  window.innerWidth = 1000
  const wrapper = panel(); await flushPromises()
  expect(wrapper.findComponent(GridLayout).props()).toMatchObject({rowHeight: 116, colNum: 12})
  const heights = () => [2, 3, 4].map(rows => rows * wrapper.findComponent(GridLayout).props('rowHeight') + (rows - 1) * 14)
  expect(heights()).toEqual([246, 376, 506])
  window.innerWidth = 1400; window.dispatchEvent(new Event('resize')); await flushPromises()
  expect(wrapper.findComponent(GridLayout).props('rowHeight')).toBe(114)
  expect(heights()).toEqual([242, 370, 498])
  await wrapper.setProps({mobile: true})
  expect(wrapper.findComponent(GridLayout).exists()).toBe(false)
  window.innerWidth = width
  const css = readFileSync('src/components/workbench/workbench.css', 'utf8')
  expect(css).toMatch(/@media \(prefers-reduced-motion:reduce\)[\s\S]*\.workbench \.vgl-layout,.workbench \.vgl-item\s*\{\s*transition: none !important/)
  expect(css).not.toContain('wb-count-')
})
it('默认六卡坐标固定，格内间隔保持等宽、14px 间距和首尾齐边，整理时不变', async () => {
  const wrapper = panel(); await flushPromises()
  expect(positions(wrapper).map(({id, x, y, w, h}) => [id, x, y, w, h])).toEqual([
    ['todo', 0, 0, 8, 4], ['workLog', 0, 4, 4, 2], ['bills', 8, 0, 4, 2],
    ['health', 8, 2, 4, 2], ['fuel', 4, 4, 4, 2], ['knowledge', 8, 4, 4, 2]
  ])
  const bounds = width => wrapper.findAllComponents(GridItem).map(item => {
    const {i: id, x, w, y} = item.props()
    const style = item.element.style
    const left = x * width / 12 + parseFloat(style.getPropertyValue('--wb-grid-inset-left'))
    const right = (x + w) * width / 12 - parseFloat(style.getPropertyValue('--wb-grid-inset-right'))
    return {id, y, left, right, width: right - left}
  })
  function aligned(width) {
    expect(wrapper.findComponent(GridLayout).props('margin')).toEqual([0, 14])
    const cards = bounds(width)
    expect(Math.min(...cards.map(card => card.left))).toBeCloseTo(0)
    expect(Math.max(...cards.map(card => card.right))).toBeCloseTo(width)
    const bottom = cards.filter(card => card.y === 4).sort((a, b) => a.left - b.left)
    expect(bottom).toHaveLength(3)
    for (const card of bottom) expect(card.width).toBeCloseTo(bottom[0].width)
    expect(bottom[1].left - bottom[0].right).toBeCloseTo(14)
    expect(bottom[2].left - bottom[1].right).toBeCloseTo(14)
  }
  aligned(1384); aligned(968)
  await toggleEdit(wrapper)
  aligned(1384); aligned(968)
})

it.each(['legacy', 'cached'])('隐藏 health 的 %s 布局阅读时无空洞，投影不写回坐标', async kind => {
  if (kind === 'legacy') localStorage.setItem(`${WORKBENCH_LAYOUT_KEY}:9223372036854775807`, JSON.stringify({order: ['health', 'todo', 'workLog', 'bills'], hidden: ['health']}))
  else localStorage.setItem(cacheKey, JSON.stringify({...applyWorkbenchPayload(null), cards: defaultGridCards().map(card => ({...card, hidden: card.id === 'health'}))}))
  const wrapper = panel(); await flushPromises()
  const saved = JSON.parse(localStorage.getItem(cacheKey)).cards
  const reading = wrapper.findComponent(GridLayout).props('layout')
  expect(reading.some(card => card.i === 'health')).toBe(false)
  for (let x = 0; x < 12; x++) expect(reading.filter(card => card.y === 0 && x >= card.x && x < card.x + card.w)).toHaveLength(1)
  if (kind === 'cached') {
    expect(reading.find(card => card.i === 'workLog')).toMatchObject({x: 8, y: 2})
    expect(saved.find(card => card.id === 'knowledge').y).toBe(4)
  }
  await toggleEdit(wrapper)
  expect(positions(wrapper)).toEqual(saved.filter(card => !card.hidden))
  expect(wrapper.get('[aria-label="添加健康组件"]').exists()).toBe(true)
})

it.each([false, true])('删除后完成整理保存布局，重新添加保留组件档位与其他组件的位置（mobile=%s）', async mobile => {
  const wrapper = panel({mobile})
  await toggleEdit(wrapper)
  saveWorkbenchPreferences.mockClear()
  const original = positions(wrapper)
  const remaining = original.filter(card => card.id !== 'health')
  await wrapper.get('[aria-label="删除健康组件"]').trigger('click')
  expect(positions(wrapper)).toEqual(remaining)
  expect(wrapper.get('[aria-live="polite"]').text()).toBe('已删除健康组件，可重新添加')
  expect(document.activeElement).toBe(wrapper.get('[data-card=workLog]').element)
  expect(saveWorkbenchPreferences).not.toHaveBeenCalled()
  await toggleEdit(wrapper)
  expect(saveWorkbenchPreferences).toHaveBeenLastCalledWith(expect.objectContaining({
    payload: expect.objectContaining({cards: expect.arrayContaining([expect.objectContaining({id: 'health', hidden: true})])})
  }))
  await toggleEdit(wrapper)
  await wrapper.get('[aria-label="添加健康组件"]').trigger('click')
  expect(positions(wrapper)).toEqual(original)
  expect(document.activeElement).toBe(wrapper.get('[data-card=health]').element)
  await toggleEdit(wrapper)
  expect(JSON.parse(localStorage.getItem(cacheKey)).cards.find(card => card.id === 'health').hidden).toBe(false)
})
it.each([['bills', '上移本月账单'], ['todo', '下移今日待办']])('移动端 %s 跨档换位后切回桌面并完成，其他四卡保存坐标不变', async (id, label) => {
  const cards = defaultGridCards().map(card => ({...card, y: card.y + 10}))
  localStorage.setItem(cacheKey, JSON.stringify({...applyWorkbenchPayload(null), cards}))
  const wrapper = panel({mobile: true}); await toggleEdit(wrapper)
  await wrapper.get(`[aria-label="${label}"]`).trigger('click'); await flushPromises()
  const after = positions(wrapper)
  for (const card of after.filter(card => !['todo', 'bills'].includes(card.id))) expect(card).toEqual(cards.find(item => item.id === card.id))
  expectLegal(after)
  await wrapper.setProps({mobile: false}); expectLegal(positions(wrapper))
  await toggleEdit(wrapper)
  const saved = JSON.parse(localStorage.getItem(cacheKey)).cards
  for (const card of saved.filter(card => !['todo', 'bills'].includes(card.id))) expect(card).toEqual(cards.find(item => item.id === card.id))
})
it('缓存布局中的未授权卡不参与阅读投影，剩余卡补到左上且不写回', async () => {
  const initial = applyWorkbenchPayload(null)
  localStorage.setItem(cacheKey, JSON.stringify(initial))
  const wrapper = panel({featureCodes: ['APP_KNOWLEDGE_BASE']}); await flushPromises()
  expect(wrapper.findComponent(GridLayout).props('layout')).toEqual([expect.objectContaining({i: 'knowledge', x: 0, y: 0})])
  expect(positions(wrapper)).toEqual([initial.cards.find(card => card.id === 'knowledge')])
  expect(JSON.parse(localStorage.getItem(cacheKey)).cards).toEqual(initial.cards)
})
