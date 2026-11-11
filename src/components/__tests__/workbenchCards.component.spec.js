// @vitest-environment happy-dom
import {flushPromises, mount} from '@vue/test-utils'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import TodoCard from '../workbench/TodoCard.vue'
import WorkLogCard from '../workbench/WorkLogCard.vue'
import BillsCard from '../workbench/BillsCard.vue'
import HealthCard from '../workbench/HealthCard.vue'
import {listTodoTasks, updateTodoTaskStatus} from '@/api/todoList'
import {listUnfinishedWorkItems, getWeeklyBrief} from '@/api/workLog'
import {getPersonalBillSummary} from '@/api/personalBills'
import {getHealthSummary} from '@/api/healthRecord'
import {localDate, weekDates} from '@/utils/workbenchData'

vi.mock('vue-router', () => ({useRouter: () => ({push: vi.fn()})}))
vi.mock('@/api/todoList', () => ({listTodoTasks: vi.fn(), updateTodoTaskStatus: vi.fn()}))
vi.mock('@/api/workLog', () => ({listUnfinishedWorkItems: vi.fn(), getWeeklyBrief: vi.fn()}))
vi.mock('@/api/personalBills', () => ({getPersonalBillSummary: vi.fn()}))
vi.mock('@/api/healthRecord', () => ({getHealthSummary: vi.fn()}))
const response = data => ({data: {code: '0', data}})
const wrappers = []
const deferred = () => { let resolve; let reject; const promise = new Promise((yes, no) => {resolve = yes; reject = no}); return {promise, resolve, reject} }
function render(component) { const wrapper = mount(component); wrappers.push(wrapper); return wrapper }
const emptyTodo = {list: [], summary: {today: 0, total: 0, completed: 0, important: 0}, upcoming: []}
const bill = {currentMonthExpense: '200', currentMonthIncome: '900', currentMonthBalance: '700', annualBudgetAmount: '1000', annualBudgetUsed: '250', annualBudgetUsageRate: '.25', categoryDistribution: [{categoryName: '餐饮', amount: 120, ratio: .6}, {categoryName: '交通', amount: 50, ratio: .25}, {categoryName: '日用', amount: 20, ratio: .1}, {categoryName: '其他', amount: 10, ratio: .05}]}
beforeEach(() => {
  vi.resetAllMocks()
  listTodoTasks.mockResolvedValue(response(emptyTodo))
  listUnfinishedWorkItems.mockResolvedValue(response([])); getWeeklyBrief.mockResolvedValue(response([]))
  getPersonalBillSummary.mockResolvedValue(response({currentMonthExpense: 0, currentMonthIncome: 0, recentBills: [], categoryDistribution: []}))
  getHealthSummary.mockResolvedValue(response({recordCount: 0, reportCount: 0, visitCount: 0}))
  updateTodoTaskStatus.mockResolvedValue(response(null))
})
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); vi.useRealTimers() })
const cases = [
  ['待办', TodoCard, listTodoTasks, '今天没有待办', 'TODO_ITEM'],
  ['日志', WorkLogCard, getWeeklyBrief, '今日还没写日志', 'WORK_LOG'],
  ['账单', BillsCard, getPersonalBillSummary, '本月还没有账单', 'PERSONAL_BILL'],
  ['健康', HealthCard, getHealthSummary, '还没有健康记录', 'HEALTH_RECORD']
]
describe.each(cases)('%s卡状态', (_name, component, api, emptyText, typeCode) => {
  it('加载时显示独立骨架，返回空数据后提供真实新增动作', async () => {
    const request = deferred(); api.mockReturnValueOnce(request.promise)
    const wrapper = render(component)
    expect(wrapper.find('[aria-label="正在加载"]').exists()).toBe(true)
    request.resolve(api === listTodoTasks ? response(emptyTodo) : api === getWeeklyBrief ? response([]) : api === getHealthSummary ? response({recordCount: 0}) : response({currentMonthExpense: 0, currentMonthIncome: 0}))
    await flushPromises()
    expect(wrapper.text()).toContain(emptyText)
    expect(wrapper.find('.wb-stats').exists()).toBe(false)
    await wrapper.get('.wb-empty button').trigger('click')
    expect(wrapper.emitted('create')[0]).toEqual([typeCode])
  })
  it('失败不显示假数据，重试恢复', async () => {
    api.mockRejectedValueOnce(new Error('synthetic'))
    const wrapper = render(component); await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('加载失败')
    await wrapper.get('.wb-error button').trigger('click'); await flushPromises()
    expect(api).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.wb-error').exists()).toBe(false)
    expect(wrapper.text()).toContain(emptyText)
  })
  it('卸载后忽略在途响应', async () => {
    const request = deferred(); api.mockReturnValueOnce(request.promise)
    const wrapper = render(component)
    wrapper.unmount()
    const states = wrapper.emitted('state')?.length || 0
    request.resolve(response(api === getWeeklyBrief ? [] : {})); await flushPromises()
    expect(wrapper.emitted('state')?.length || 0).toBe(states)
    wrappers.pop()
  })
})
it('待办展示全部摘要与最多五条 upcoming，勾选失败回滚并保留 Long ID', async () => {
  vi.useFakeTimers({toFake: ['Date']})
  vi.setSystemTime(new Date(2026, 10, 11, 12))
  listTodoTasks.mockResolvedValue(response({list: [{id: '9223372036854775807', title: '核对工作台', status: 'TODO', important: true}], summary: {today: 1, important: 2, completed: 3, total: 6}, upcoming: Array.from({length: 8}, (_, i) => ({id: String(i), title: `即将到期${i}`, dueDate: '2026-11-30'}))}))
  const request = deferred(); updateTodoTaskStatus.mockReturnValue(request.promise)
  const wrapper = render(TodoCard); await flushPromises()
  expect(listTodoTasks).toHaveBeenCalledWith(expect.objectContaining({viewCode: 'TODAY'}))
  expect(wrapper.findAll('.wb-stat b').map(item => item.text())).toEqual(['1', '2', '3', '6'])
  expect(wrapper.text()).not.toContain('即将到期5')
  await wrapper.get('input').setValue(true)
  expect(wrapper.get('input').element.checked).toBe(true)
  expect(wrapper.get('.wb-list li').classes()).toContain('done')
  expect(updateTodoTaskStatus).toHaveBeenCalledWith('9223372036854775807', {status: 'COMPLETED'})
  request.reject(new Error('synthetic')); await flushPromises()
  expect(wrapper.get('input').element.checked).toBe(false)
  expect(wrapper.text()).toContain('已恢复原状态')
})
it('完成待办后刷新服务端摘要，避免本地猜测计数', async () => {
  listTodoTasks.mockResolvedValueOnce(response({list: [{id: '1', title: '待办', status: 'TODO'}], summary: {today: 1}, upcoming: []}))
  const wrapper = render(TodoCard); await flushPromises()
  await wrapper.get('input').setValue(true); await flushPromises()
  expect(listTodoTasks).toHaveBeenCalledTimes(2)
  expect(wrapper.text()).toContain('今天没有待办')
})
it('即将到期仅显示明天的任务，不显示昨天、今天，也不重复今日列表', async () => {
  vi.useFakeTimers({toFake: ['Date']})
  vi.setSystemTime(new Date(2026, 10, 11, 12))
  const items = [
    {id: 'yesterday', title: '昨日到期', dueDate: '2026-11-10'},
    {id: 'today', title: '今日到期', dueDate: '2026-11-11'},
    {id: 'tomorrow', title: '明日到期', dueDate: '2026-11-12'},
    {id: 'my-day', title: '明天但已加入我的一天', dueDate: '2026-11-12', listCode: 'MY_DAY'}
  ]
  listTodoTasks.mockResolvedValue(response({list: [items[1], items[3]], summary: emptyTodo.summary, upcoming: items}))
  const wrapper = render(TodoCard); await flushPromises()
  const lists = wrapper.findAll('.wb-list')
  expect(lists[1].findAll('li')).toHaveLength(1)
  expect(lists[1].text()).toContain('明日到期')
  expect(lists[1].text()).not.toContain('今日到期')
  expect(wrapper.text()).not.toContain('昨日到期')
  expect(lists[0].text()).toContain('今日到期')
})
it('待办乐观完成不修改接口对象，保存失败独立回滚', async () => {
  const task = Object.freeze({id: '1', title: '只读任务', status: 'TODO'})
  listTodoTasks.mockResolvedValue(response({...emptyTodo, list: [task]}))
  const request = deferred(); updateTodoTaskStatus.mockReturnValueOnce(request.promise)
  const wrapper = render(TodoCard); await flushPromises()
  await wrapper.get('input').setValue(true)
  expect(wrapper.get('li').classes()).toContain('done')
  expect(task.status).toBe('TODO')
  request.reject(new Error('synthetic')); await flushPromises()
  expect(wrapper.get('input').element.checked).toBe(false)
  expect(wrapper.get('li').classes()).not.toContain('done')
})
it('今日列表与 upcoming 使用友好日期，MY_DAY 优先显示我的一天', async () => {
  vi.useFakeTimers({toFake: ['Date']})
  vi.setSystemTime(new Date(2026, 10, 11, 0, 5))
  const items = [
    {id: '1', title: '今日任务', listCode: 'WORK', dueDate: '2026-11-11'},
    {id: '2', title: '明日任务', listCode: 'WORK', dueDate: '2026-11-12'},
    {id: '3', title: '周五任务', listCode: 'WORK', dueDate: '2026-11-13'},
    {id: '4', title: '我的任务', listCode: 'MY_DAY', dueDate: '2026-11-11'},
    {id: '5', title: '未设日期任务', listCode: 'WORK', dueDate: null}
  ]
  listTodoTasks.mockResolvedValue(response({list: items.map(item => ({...item, status: 'TODO', important: false})), summary: emptyTodo.summary, upcoming: items}))
  const wrapper = render(TodoCard); await flushPromises()
  const labels = ['今天', '明天', '11月13日 周五', '我的一天', '未设日期']
  expect(wrapper.findAll('.wb-list')[0].findAll('small').map(item => item.text())).toEqual(labels)
  expect(wrapper.findAll('.wb-list')).toHaveLength(1) // 同一 id 已在今日列表，不重复展示。
  expect(wrapper.text()).not.toContain('2026-11-11')
})
it('日志使用真实响应字段，展示今日状态、七天人天、最近摘要和未完成事项', async () => {
  const today = localDate(); const dates = weekDates()
  const workItems = [{id: '21', content: '最近工作详情', personDay: '.3', status: 'UNFINISHED', zentaoNo: 'Z-1', sortNo: 1}]
  getWeeklyBrief.mockResolvedValue(response([{id: '2', logDate: today, personDay: '.3', brief: '最近工作', workItems}, {id: '1', logDate: dates[0], personDay: '.5', brief: '本周记录', workItems: []}]))
  listUnfinishedWorkItems.mockResolvedValue(response([{id: '9223372036854775807', workLogId: '2', logDate: today, projectCode: 'GAK', workItem: '核对未完成事项', status: 'UNFINISHED', zentaoNo: 'Z-1'}]))
  const wrapper = render(WorkLogCard); await flushPromises()
  expect(getWeeklyBrief).toHaveBeenCalledOnce()
  expect(getWeeklyBrief).toHaveBeenCalledWith({refDate: today})
  expect(listUnfinishedWorkItems).toHaveBeenCalledWith({limit: 20})
  expect(wrapper.text()).toContain('今日已写'); expect(wrapper.text()).toContain('合计 0.8 人天')
  expect(wrapper.findAll('.wb-week>div')).toHaveLength(7)
  expect(wrapper.text()).toContain('最近工作'); expect(wrapper.text()).toContain('核对未完成事项')
  expect(wrapper.get('.wb-latest small').text()).toBe('0.3 人天')
  expect(wrapper.get('.wb-list .wb-truncate').attributes('title')).toBe('核对未完成事项')
  expect(wrapper.get('.wb-list small').text()).toBe('未完成')
})
it('日志未完成列表按 status 使用工作日志页文案，未知状态回退为未完成', async () => {
  listUnfinishedWorkItems.mockResolvedValue(response([
    {id: '1', workItem: '完成状态', status: 'COMPLETED'},
    {id: '2', workItem: '未完成状态', status: 'UNFINISHED'},
    {id: '3', workItem: '兼容状态', status: 'UNKNOWN'}
  ]))
  const wrapper = render(WorkLogCard); await flushPromises()
  expect(wrapper.findAll('.wb-list small').map(item => item.text())).toEqual(['已完成', '未完成', '未完成'])
})
it('跨周午夜后刷新按新日期请求、判断今日与统计本周', async () => {
  vi.useFakeTimers({toFake: ['Date']})
  vi.setSystemTime(new Date(2026, 10, 15, 23, 59)) // 周日
  getWeeklyBrief.mockResolvedValueOnce(response([{id: '1', logDate: '2026-11-15', personDay: 1, brief: '周日'}]))
  const wrapper = render(WorkLogCard); await flushPromises()
  expect(wrapper.text()).toContain('今日已写')
  expect(wrapper.text()).toContain('合计 1 人天')
  expect(wrapper.get('.wb-week .today span').text()).toBe('周日')
  vi.setSystemTime(new Date(2026, 10, 16, 0, 1))
  getWeeklyBrief.mockResolvedValueOnce(response([{id: '2', logDate: '2026-11-17', personDay: 0.5, brief: '新周'}]))
  await wrapper.setProps({refreshKey: 1}); await flushPromises()
  expect(getWeeklyBrief).toHaveBeenLastCalledWith({refDate: '2026-11-16'})
  expect(wrapper.text()).toContain('今日未写')
  expect(wrapper.text()).toContain('合计 0.5 人天')
  expect(wrapper.get('.wb-week .today span').text()).toBe('周一')
  expect(wrapper.findAll('.wb-week b').map(day => day.text())).toEqual(['0', '0.5', '0', '0', '0', '0', '0'])
})
it.each([
  [{typeCodes: ['LEAVE'], personDay: 1}, '0'],
  [{location: '出差在途', personDay: 1}, '0'],
  [{personDay: 9, workItems: [{personDay: 0.25}, {personDay: 0.5}]}, '0.75']
])('最近一条人天也采用工作日志页口径：%j', async (log, expected) => {
  getWeeklyBrief.mockResolvedValue(response([{id: '1', logDate: localDate(), brief: '日志', ...log}]))
  const wrapper = render(WorkLogCard); await flushPromises()
  expect(wrapper.get('.wb-latest small').text()).toBe(`${expected} 人天`)
  expect(wrapper.text()).toContain(`合计 ${expected} 人天`)
})
it('账单显示金额、年度比例与分类前三，不显示逐笔', async () => {
  getPersonalBillSummary.mockResolvedValue(response({...bill, recentBills: [{note: '秘密逐笔明细'}]}))
  const wrapper = render(BillsCard); await flushPromises()
  expect(getPersonalBillSummary).toHaveBeenCalledWith({month: localDate().slice(0, 7)})
  expect(wrapper.findAll('.wb-stat b').map(item => item.text())).toEqual(['¥200.00', '¥900.00', '¥700.00'])
  expect(wrapper.text()).toContain('¥250.00 / ¥1,000.00 · 25%')
  expect(wrapper.findAll('.wb-category')).toHaveLength(3)
  expect(wrapper.text()).not.toContain('其他'); expect(wrapper.text()).not.toContain('秘密逐笔明细')
})
it('账单四位小数比例按 0–1 转为百分比与条宽', async () => {
  getPersonalBillSummary.mockResolvedValue(response({...bill, annualBudgetUsageRate: '0.6197', categoryDistribution: [{categoryName: '餐饮', amount: '120.00', ratio: '0.3546'}]}))
  const wrapper = render(BillsCard); await flushPromises()
  expect(wrapper.text()).toContain('61.97%')
  expect(Number(wrapper.get('[role="meter"]').attributes('aria-valuenow'))).toBeCloseTo(61.97)
  expect(parseFloat(wrapper.get('[role="meter"] i').element.style.width)).toBeCloseTo(61.97)
  expect(parseFloat(wrapper.get('.wb-category i').element.style.width)).toBeCloseTo(35.46)
})
it('跨月最近账单不能冒充本月数据', async () => {
  getPersonalBillSummary.mockResolvedValue(response({currentMonthExpense: 0, currentMonthIncome: 0, recentBills: [{billDate: '2020-01-01'}]}))
  const wrapper = render(BillsCard); await flushPromises()
  expect(wrapper.text()).toContain('本月还没有账单')
})
it('健康只渲染日期和计数，即使接口含指标值也不显示', async () => {
  getHealthSummary.mockResolvedValue(response({latestMeasureDate: '2026-11-01', lastVisitDate: '2026-10-21', lastExamDate: '2026-09-15', recordCount: 8, visitCount: 2, reportCount: 3, weightKg: '88.888', systolicPressure: '199.999'}))
  const wrapper = render(HealthCard); await flushPromises()
  expect(wrapper.findAll('.wb-health b').map(item => item.text())).toEqual(['2026-11-01', '2026-10-21', '2026-09-15'])
  expect(wrapper.findAll('.wb-health small').map(item => item.text())).toEqual(['共 8 次', '共 2 次', '共 3 份'])
  expect(wrapper.text()).not.toContain('88.888'); expect(wrapper.text()).not.toContain('199.999')
})
