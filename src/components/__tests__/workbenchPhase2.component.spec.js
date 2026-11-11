// @vitest-environment happy-dom
import {flushPromises, mount} from '@vue/test-utils'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import FuelCard from '../workbench/FuelCard.vue'
import KnowledgeCard from '../workbench/KnowledgeCard.vue'
import WorkbenchPanel from '../workbench/WorkbenchPanel.vue'
import {getFuelSummary, getLatestFuelPrices} from '@/api/fuelStats'
import {listKnowledgeEntries, getKnowledgeHighlights} from '@/api/knowledgeBase'
import {getWorkbenchPreferences, saveWorkbenchPreferences} from '@/api/workbenchPreference'
import {WORKBENCH_LAYOUT_KEY} from '@/utils/workbenchLayout'
import {WORKBENCH_GRID_KEY} from '@/utils/workbenchGrid'

const {push} = vi.hoisted(() => ({push: vi.fn()}))
vi.mock('vue-router', () => ({onBeforeRouteLeave: vi.fn(), useRouter: () => ({push})}))
vi.mock('@/api/fuelStats', () => ({getFuelSummary: vi.fn(), getLatestFuelPrices: vi.fn()}))
vi.mock('@/api/knowledgeBase', () => ({listKnowledgeEntries: vi.fn(), getKnowledgeHighlights: vi.fn()}))
vi.mock('@/api/workbenchPreference', () => ({getWorkbenchPreferences: vi.fn(), saveWorkbenchPreferences: vi.fn()}))
vi.mock('@/api/todoList', () => ({listTodoTasks: vi.fn(async () => ({data: {code: '0', data: {list: [], summary: {}, upcoming: []}}})), updateTodoTaskStatus: vi.fn()}))
vi.mock('@/api/workLog', () => ({getWeeklyBrief: vi.fn(async () => ({data: {code: '0', data: []}})), listUnfinishedWorkItems: vi.fn(async () => ({data: {code: '0', data: []}}))}))
vi.mock('@/api/healthRecord', () => ({getHealthSummary: vi.fn(async () => ({data: {code: '0', data: {recordCount: 0}}}))}))
vi.mock('@/api/personalBills', () => ({getPersonalBillSummary: vi.fn(async () => ({data: {code: '0', data: {currentMonthExpense: 0, currentMonthIncome: 0}}}))}))

const response = data => ({data: {code: '0', data}})
const emptyFuel = {currentMonthAmount: '0.00', totalAmount: '0.00', totalFuelVolume: '0.00', averageConsumption: null, recentRecords: [], vehicleStats: []}
const fuel = {...emptyFuel, averageConsumption: '7.25', recentRecords: [{fuelDate: '2026-10-31', vehicleName: '家庭用车', discountedAmount: '260.50', fuelConsumption: '7.12'}]}
const knowledge = {list: [{title: '发布经验', category: '开发', summary: '已发布的摘要', updatedAt: '2026-11-10T12:30:00'}], total: 1}
const newCodes = ['APP_FUEL_STATS', 'APP_KNOWLEDGE_BASE']
const allCodes = ['APP_TODO_LIST', 'APP_WORK_LOG', 'APP_PERSONAL_BILLS', 'APP_HEALTH_RECORD', ...newCodes]
const wrappers = []
const deferred = () => { let resolve; const promise = new Promise(yes => {resolve = yes}); return {promise, resolve} }
function render(component, props = {}) {
  const wrapper = mount(component, {props, global: {stubs: {AppIconImage: true, AuthenticatedImage: true}}})
  wrappers.push(wrapper)
  return wrapper
}
function panel(props = {}) {
  return render(WorkbenchPanel, {source: 'backend', featureCodes: newCodes, tools: newCodes.map(featureCode => ({key: featureCode, name: featureCode, featureCode, iconType: 'TEXT'})), ...props})
}
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  localStorage.setItem('token', 'test-token')
  localStorage.setItem('user', JSON.stringify({id: '1'}))
  getWorkbenchPreferences.mockReset().mockResolvedValue(response({version: 0, schemaVersion: 1, payload: null}))
  saveWorkbenchPreferences.mockReset().mockImplementation(async ({version, payload}) => response({version: version + 1, schemaVersion: 1, payload}))
  getFuelSummary.mockReset().mockResolvedValue(response(emptyFuel))
  listKnowledgeEntries.mockReset().mockResolvedValue(response({list: [], total: 0}))
})
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()) })

describe.each([
  ['油耗', FuelCard, getFuelSummary, emptyFuel, '还没有加油记录', 'FUEL_RECORD', '＋ 新增加油记录'],
  ['经验库', KnowledgeCard, listKnowledgeEntries, {list: [], total: 0}, '暂无已发布经验', 'KNOWLEDGE_ENTRY', '＋ 新增经验']
])('%s卡', (_name, component, api, emptyData, emptyTitle, typeCode, label) => {
  it('独立加载骨架、空态及真实快速新增类型', async () => {
    const request = deferred(); api.mockReturnValueOnce(request.promise)
    const wrapper = render(component)
    expect(wrapper.find('[aria-label="正在加载"]').exists()).toBe(true)
    request.resolve(response(emptyData)); await flushPromises()
    expect(wrapper.text()).toContain(emptyTitle)
    expect(wrapper.find('.wb-stats').exists()).toBe(false)
    expect(wrapper.get('.wb-empty button').text()).toBe(label)
    await wrapper.get('.wb-empty button').trigger('click')
    expect(wrapper.emitted('create')[0]).toEqual([typeCode])
    if (typeCode === 'KNOWLEDGE_ENTRY') expect(wrapper.text()).toContain('可能需要审核')
  })
  it('请求失败重试恢复，且支持业务失败信封', async () => {
    api.mockRejectedValueOnce(new Error('失败'))
    const wrapper = render(component); await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('加载失败')
    expect(wrapper.find('.wb-stats').exists()).toBe(false)
    await wrapper.get('.wb-error button').trigger('click'); await flushPromises()
    expect(api).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain(emptyTitle)
    api.mockResolvedValueOnce({data: {code: '500', message: '业务失败', data: emptyData}})
    await wrapper.setProps({refreshKey: 1}); await flushPromises()
    expect(wrapper.find('.wb-error').exists()).toBe(true)
  })
  it('快速新增刷新后过期响应不能覆盖新数据，卸载忽略在途响应', async () => {
    const stale = deferred(); api.mockReturnValueOnce(stale.promise)
    const onState = vi.fn()
    const wrapper = render(component, {onState})
    await wrapper.setProps({refreshKey: 1}); await flushPromises()
    expect(wrapper.text()).toContain(emptyTitle)
    stale.resolve({data: {code: '500'}}); await flushPromises()
    expect(wrapper.find('.wb-error').exists()).toBe(false)
    const pending = deferred(); api.mockReturnValueOnce(pending.promise)
    await wrapper.setProps({refreshKey: 2})
    const count = onState.mock.calls.length
    wrapper.unmount(); wrappers.pop()
    pending.resolve(response(emptyData)); await flushPromises()
    expect(onState).toHaveBeenCalledTimes(count)
  })
})

it('油耗本月零仍展示历史、平均油耗、最近四条及前三辆车，不渲染备注和附件', async () => {
  getFuelSummary.mockResolvedValue(response({...fuel,
    recentRecords: Array.from({length: 6}, (_, i) => ({...fuel.recentRecords[0], vehicleName: `记录车辆${i}`, fuelConsumption: i === 0 ? null : i === 1 ? '0' : '7.12', note: '隐藏备注', attachments: [{name: '隐藏附件'}]})),
    vehicleStats: Array.from({length: 4}, (_, i) => ({vehicleName: `汇总车辆${i}`, averageConsumption: '8.25', recordCount: '2'}))
  }))
  const wrapper = render(FuelCard); await flushPromises()
  expect(getFuelSummary).toHaveBeenCalledWith()
  expect(getLatestFuelPrices).not.toHaveBeenCalled()
  expect(wrapper.findAll('.wb-stat b').map(item => item.text())).toEqual(['¥0.00', '7.25 L/100km'])
  expect(wrapper.findAll('.wb-fuel-list li')).toHaveLength(4)
  expect(wrapper.text()).toContain('2026-10-31')
  expect(wrapper.text()).toContain('¥260.50')
  expect(wrapper.findAll('.wb-record-amount small').map(item => item.text())).toEqual(['0 L/100km', '7.12 L/100km', '7.12 L/100km'])
  expect(wrapper.get('.wb-vehicle-summary').text()).toContain('汇总车辆2 8.25 L/100km')
  for (const hidden of ['记录车辆4', '汇总车辆3', '隐藏备注', '隐藏附件']) {
    expect(wrapper.html()).not.toContain(hidden)
    expect(JSON.stringify(wrapper.emitted('state'))).not.toContain(hidden)
  }
  await wrapper.findAll('.wb-card-footer button')[1].trigger('click')
  expect(push).toHaveBeenCalledWith('/fuel-stats')
  expect(wrapper.text()).toContain('打开油耗统计 →')
})

it('经验库使用已发布分页，仅展示四个白名单字段、最多五条和截断摘要，单条与页脚进入应用', async () => {
  listKnowledgeEntries.mockResolvedValue(response({list: Array.from({length: 6}, (_, i) => ({...knowledge.list[0], title: `经验${i}`, summary: `${'摘'.repeat(100)}摘要尾部`, content: '<img src=x onerror="alert(1)">正文秘密', ownerUserId: '9223372036854775807', reviewRemark: '评审秘密', reviewedBy: '审核人秘密', attachments: [{name: '附件秘密'}]})), total: 60}))
  const wrapper = render(KnowledgeCard); await flushPromises()
  expect(listKnowledgeEntries).toHaveBeenCalledWith({view: 'published', pageNo: 1, pageSize: 5})
  expect(getKnowledgeHighlights).not.toHaveBeenCalled()
  expect(wrapper.findAll('.wb-knowledge-entry')).toHaveLength(5)
  expect(wrapper.findAll('time').map(item => item.text())).toEqual(Array(5).fill('2026-11-10'))
  expect(wrapper.get('.wb-entry-summary').text()).toBe(`${'摘'.repeat(90)}…`)
  expect(wrapper.text()).toContain('开发')
  for (const hidden of ['经验5', '正文秘密', '评审秘密', '审核人秘密', '附件秘密', '9223372036854775807', '摘要尾部']) {
    expect(wrapper.html()).not.toContain(hidden)
    expect(JSON.stringify(wrapper.emitted('state'))).not.toContain(hidden)
  }
  expect(wrapper.find('img').exists()).toBe(false)
  await wrapper.get('.wb-knowledge-entry').trigger('click')
  await wrapper.findAll('.wb-card-footer button')[1].trigger('click')
  expect(push.mock.calls).toEqual([['/knowledge-base'], ['/knowledge-base']])
  expect(wrapper.text()).toContain('打开经验库 →')
})

it.each([
  [['APP_FUEL_STATS'], ['fuel'], 1, 0],
  [['APP_KNOWLEDGE_BASE'], ['knowledge'], 0, 1],
  [['APP_CALCULATOR'], [], 0, 0]
])('授权 %j 时只挂载授权卡片且不请求其他卡', async (featureCodes, expected, fuelCalls, knowledgeCalls) => {
  const wrapper = panel({loading: true, featureCodes})
  expect(getFuelSummary).not.toHaveBeenCalled()
  expect(listKnowledgeEntries).not.toHaveBeenCalled()
  await wrapper.setProps({loading: false}); await flushPromises()
  expect(wrapper.findAll('[data-card]').map(card => card.attributes('data-card'))).toEqual(expected)
  expect(getFuelSummary).toHaveBeenCalledTimes(fuelCalls)
  expect(listKnowledgeEntries).toHaveBeenCalledTimes(knowledgeCalls)
  await wrapper.get('[aria-pressed]').trigger('click')
  expect(wrapper.findAll('[data-card]').map(card => card.attributes('data-card'))).toEqual(expected)
  await wrapper.setProps({featureCodes: []}); await flushPromises()
  expect(wrapper.findAll('[data-card]')).toHaveLength(0)
  expect(getWorkbenchPreferences).toHaveBeenCalled()
  expect(saveWorkbenchPreferences).not.toHaveBeenCalled()
})

it('移动端迁移六卡后新卡参与草稿排序和显隐，完成后持久化', async () => {
  localStorage.setItem(WORKBENCH_LAYOUT_KEY, JSON.stringify({version: 1, order: ['todo', 'workLog', 'bills', 'health'], hidden: []}))
  const wrapper = panel({featureCodes: allCodes, mobile: true}); await flushPromises()
  expect(wrapper.findAll('[data-card]').map(card => card.attributes('data-card'))).toEqual(['todo', 'bills', 'health', 'workLog', 'fuel', 'knowledge'])
  expect(wrapper.get('.wb-cards').classes()).toContain('wb-mobile-cards')
  const syncedCache = localStorage.getItem(`${WORKBENCH_GRID_KEY}:1`)
  expect(JSON.parse(syncedCache).cards).toHaveLength(6)
  expect(saveWorkbenchPreferences).toHaveBeenCalledOnce()
  await wrapper.get('[aria-pressed]').trigger('click')
  await wrapper.get('[aria-label="上移经验库"]').trigger('click')
  await wrapper.get('[aria-label="删除油耗统计组件"]').trigger('click')
  expect(wrapper.get('[data-card=knowledge] .wb-card-content').attributes()).toHaveProperty('inert')
  expect(localStorage.getItem(`${WORKBENCH_GRID_KEY}:1`)).toBe(syncedCache)
  await wrapper.get('[aria-pressed]').trigger('click'); await flushPromises()
  const saved = JSON.parse(localStorage.getItem(`${WORKBENCH_GRID_KEY}:1`))
  expect(saved.cards.slice(-2).map(card => card.id)).toEqual(['fuel', 'knowledge'])
  expect(saved.cards.find(card => card.id === 'knowledge')).toMatchObject({x: 4, y: 4})
  expect(saved.cards.filter(card => card.hidden).map(card => card.id)).toEqual(['fuel'])
  expect(wrapper.find('[data-card=fuel]').exists()).toBe(false)
  expect(saveWorkbenchPreferences.mock.calls.map(([body]) => body.version)).toEqual([0, 1])
  getWorkbenchPreferences.mockResolvedValue(response({version: 2, schemaVersion: 1, payload: saved}))
  const restored = panel({featureCodes: allCodes}); await flushPromises()
  expect(restored.findAll('[data-card]').map(card => card.attributes('data-card'))).toEqual(saved.cards.filter(card => !card.hidden).map(card => card.id))
  await restored.get('[aria-pressed]').trigger('click')
  await restored.findAll('button').find(button => button.text() === '恢复默认').trigger('click')
  expect(restored.findAll('[data-card]').map(card => card.attributes('data-card')).slice(-2)).toEqual(['fuel', 'knowledge'])
  expect(getWorkbenchPreferences).toHaveBeenCalled()
  expect(saveWorkbenchPreferences).toHaveBeenCalledTimes(2)
})

it.each([false, true])('桌面/移动（mobile=%s）新卡快速新增转发既有类型并随 refreshKey 重读', async mobile => {
  const wrapper = panel({mobile}); await flushPromises()
  for (const [key, label, type] of [['fuel', '油耗统计', 'FUEL_RECORD'], ['knowledge', '经验库', 'KNOWLEDGE_ENTRY']]) {
    if (mobile) {
      expect(wrapper.get(`[data-card=${key}] .wb-card-content`).element.style.display).toBe('none')
      expect(wrapper.get(`[data-card=${key}] .wb-fold-summary`).text()).toContain('展开可新增')
      await wrapper.get(`[aria-label="展开${label}"]`).trigger('click')
    }
    await wrapper.get(`[data-card=${key}] .wb-empty button`).trigger('click')
    expect(wrapper.emitted('create').at(-1)).toEqual([type])
  }
  getFuelSummary.mockResolvedValue(response(fuel)); listKnowledgeEntries.mockResolvedValue(response(knowledge))
  await wrapper.setProps({refreshKey: 1}); await flushPromises()
  expect(getFuelSummary).toHaveBeenCalledTimes(2)
  expect(listKnowledgeEntries).toHaveBeenCalledTimes(2)
  expect(wrapper.get('[data-card=fuel]').text()).toContain('¥0.00')
  expect(wrapper.get('[data-card=knowledge]').text()).toContain('发布经验')
})

it('移动新卡一行摘要覆盖加载、失败重试及成功，整理态展开两卡', async () => {
  const pending = deferred(); getFuelSummary.mockReturnValueOnce(pending.promise)
  listKnowledgeEntries.mockRejectedValueOnce(new Error('失败'))
  const wrapper = panel({mobile: true})
  expect(wrapper.get('[data-card=fuel] .wb-fold-summary').text()).toBe('正在加载…')
  pending.resolve(response(fuel)); await flushPromises()
  expect(wrapper.get('[data-card=fuel] .wb-fold-summary').text()).toContain('本月实付 ¥0.00 · 平均油耗 7.25 L/100km')
  expect(wrapper.get('[data-card=knowledge] .wb-fold-summary').text()).toContain('加载失败')
  await wrapper.get('[aria-label="展开经验库"]').trigger('click')
  listKnowledgeEntries.mockResolvedValue(response(knowledge))
  await wrapper.get('[data-card=knowledge] .wb-error button').trigger('click'); await flushPromises()
  await wrapper.get('[aria-label="收起经验库"]').trigger('click')
  expect(wrapper.get('[data-card=knowledge] .wb-fold-summary').text()).toBe('最近已发布 1 条 · 发布经验')
  await wrapper.get('[aria-pressed]').trigger('click')
  for (const key of ['fuel', 'knowledge']) expect(wrapper.get(`[data-card=${key}] .wb-card-content`).element.style.display).not.toBe('none')
  expect(wrapper.find('.wb-fold-summary').exists()).toBe(false)
})
