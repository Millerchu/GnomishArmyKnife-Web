// @vitest-environment happy-dom
import {flushPromises, mount} from '@vue/test-utils'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import SystemLog from '../SystemLog.vue'
import SystemLogDetail from '@/components/SystemLogDetail.vue'
import {getSystemLog, listSystemLogs} from '@/api/systemLog'

vi.mock('@/api/systemLog', () => ({getSystemLog: vi.fn(), listSystemLogs: vi.fn()}))
const wrappers = []
const id = '9223372036854775806'
const otherId = '9223372036854775805'
const item = {id, occurredAt: '2026-11-07T21:30:00', source: 'HTTP', exceptionType: 'demo.SyntheticException', summary: '<script>synthetic()</script>', httpMethod: 'GET', requestPath: '/demo/{id}', traceId: 'synthetic-trace'}
const response = data => ({data: {code: '0', data}})
const error = status => ({response: {status, data: {code: String(status)}}})
const deferred = () => { let resolve, reject; const promise = new Promise((res, rej) => { resolve = res; reject = rej }); return {promise, resolve, reject} }
const button = (wrapper, text) => wrapper.findAll('button').find(node => node.text() === text)
const drawer = () => document.querySelector('.system-log-detail-drawer')
const drawerButton = text => [...drawer().querySelectorAll('button')].find(node => node.textContent.trim() === text)
function create(component = SystemLog, props = {}) {
  const wrapper = mount(component, {props, attachTo: document.body, global: {stubs: {RouterLink: {template: '<a href="/home"><slot/></a>'}, Transition: true}}})
  wrappers.push(wrapper)
  return wrapper
}

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  localStorage.setItem('user', JSON.stringify({roleCode: 'ADMIN'}))
  listSystemLogs.mockResolvedValue(response({list: [item], total: 41}))
  getSystemLog.mockResolvedValue(response({...item, stackTrace: 'demo.SyntheticException\n at demo.Service.run(Service.java:1)', stackTruncated: false}))
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  await flushPromises()
  document.body.innerHTML = ''
  document.body.style.overflow = ''
  document.documentElement.style.overflow = ''
  vi.unstubAllGlobals()
})

describe('系统日志列表与查询', () => {
  it('首次加载有占位，成功后纯文本显示日志及空请求字段，保留服务端顺序', async () => {
    const pending = deferred()
    listSystemLogs.mockReturnValueOnce(pending.promise)
    const wrapper = create()
    expect(wrapper.text()).toContain('正在加载系统日志')
    expect(wrapper.text()).not.toContain('暂无系统日志')
    pending.resolve(response({list: [item, {...item, id: otherId, source: 'SCHEDULER', httpMethod: null, requestPath: null}], total: 2}))
    await flushPromises()
    expect(wrapper.text()).toContain('<script>synthetic()</script>')
    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.text()).toContain('HTTP 请求')
    expect(wrapper.text()).toContain('定时任务')
    expect(wrapper.findAll('tbody tr')[1].findAll('td')[4].text()).toBe('—')
    expect(wrapper.findAll('tbody tr')[1].findAll('td')[5].text()).toBe('—')
    expect(wrapper.findAll('tbody tr')[0].text()).toContain('HTTP 请求')
    expect(listSystemLogs).toHaveBeenCalledWith({pageNo: 1, pageSize: 20})
  })

  it('编辑不提交，查询和重置回第一页，刷新/翻页沿用已提交参数，非法时间不提交', async () => {
    const wrapper = create(); await flushPromises()
    await button(wrapper, '下一页').trigger('click'); await flushPromises()
    await wrapper.find('[name="exceptionType"]').setValue('demo.OtherException')
    expect(listSystemLogs).toHaveBeenLastCalledWith({pageNo: 2, pageSize: 20})
    await button(wrapper, '手动刷新').trigger('click'); await flushPromises()
    expect(listSystemLogs).toHaveBeenLastCalledWith({pageNo: 2, pageSize: 20})
    await wrapper.find('[name="occurredFrom"]').setValue('2026-11-08T10:00:00')
    await wrapper.find('[name="occurredTo"]').setValue('2026-11-07T10:00:00')
    const calls = listSystemLogs.mock.calls.length
    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).toContain('开始时间不能晚于结束时间')
    expect(listSystemLogs).toHaveBeenCalledTimes(calls)
    await wrapper.find('[name="occurredTo"]').setValue('2026-11-09T10:00:01')
    await wrapper.find('[name="traceId"]').setValue(' synthetic-trace ')
    await wrapper.find('form').trigger('submit'); await flushPromises()
    expect(listSystemLogs).toHaveBeenLastCalledWith({pageNo: 1, pageSize: 20, occurredFrom: '2026-11-08T10:00:00', occurredTo: '2026-11-09T10:00:01', exceptionType: 'demo.OtherException', traceId: 'synthetic-trace'})
    await button(wrapper, '下一页').trigger('click'); await flushPromises()
    await button(wrapper, '重置').trigger('click'); await flushPromises()
    expect(listSystemLogs).toHaveBeenLastCalledWith({pageNo: 1, pageSize: 20})
    expect(wrapper.find('[name="exceptionType"]').element.value).toBe('')
  })

  it('查询过程中禁重复提交，区分无记录和筛选空态', async () => {
    listSystemLogs.mockResolvedValue(response({list: [], total: 0}))
    const wrapper = create(); await flushPromises()
    expect(wrapper.text()).toContain('暂无系统日志')
    const pending = deferred()
    listSystemLogs.mockReturnValueOnce(pending.promise)
    await wrapper.find('[name="keyword"]').setValue('synthetic')
    await wrapper.find('form').trigger('submit')
    await wrapper.find('form').trigger('submit')
    expect(listSystemLogs).toHaveBeenCalledTimes(2)
    expect(wrapper.find('fieldset').element.disabled).toBe(true)
    pending.resolve(response({list: [], total: 0})); await flushPromises()
    expect(wrapper.text()).toContain('没有符合条件的日志')
    await button(wrapper, '重置筛选').trigger('click'); await flushPromises()
    expect(wrapper.text()).toContain('暂无系统日志')
  })

  it.each([new Error('synthetic network failure'), error(500), error(503), {response: {status: 500, data: {code: 'SYSTEM_LOG_QUERY_INVALID'}}}])('刷新失败保留网络提示且不保留旧日志，可在页面重试：%j', async failure => {
    const wrapper = create(); await flushPromises()
    listSystemLogs.mockRejectedValueOnce(failure)
    await button(wrapper, '手动刷新').trigger('click'); await flushPromises()
    expect(wrapper.text()).toContain('日志加载失败，请重试')
    expect(wrapper.text()).toContain('请检查网络连接后重试。')
    expect(wrapper.text()).not.toContain('查询条件不合法')
    expect(wrapper.text()).not.toContain(item.summary)
    await button(wrapper, '重试').trigger('click'); await flushPromises()
    expect(wrapper.text()).toContain(item.summary)
  })

  it.each([
    ['HTTP 400', {status: 400, code: '400'}, false],
    ['HTTP 400 查询非法码', {status: 400, code: 'SYSTEM_LOG_QUERY_INVALID'}, false],
    ['HTTP 200 业务 400', {status: 200, code: 400}, true],
    ['HTTP 200 查询非法码', {status: 200, code: 'SYSTEM_LOG_QUERY_INVALID'}, true],
    ['无 HTTP 状态的查询非法码', {code: 'SYSTEM_LOG_QUERY_INVALID'}, false]
  ])('%s 提示调整筛选条件，修改后可恢复查询', async (_label, {status, code}, resolved) => {
    const wrapper = create(); await flushPromises()
    const result = {status, data: {code}}
    if (resolved) listSystemLogs.mockResolvedValueOnce(result)
    else listSystemLogs.mockRejectedValueOnce({response: result})
    await wrapper.find('[name="keyword"]').setValue('synthetic')
    await wrapper.find('form').trigger('submit'); await flushPromises()
    expect(wrapper.text()).toContain('查询条件不合法，请调整筛选条件后重试')
    expect(wrapper.text()).not.toContain('请检查网络连接后重试')
    expect(wrapper.text()).not.toContain(item.summary)
    expect(wrapper.find('fieldset').element.disabled).toBe(false)
    await wrapper.find('[name="keyword"]').setValue('adjusted')
    await wrapper.find('form').trigger('submit'); await flushPromises()
    expect(listSystemLogs).toHaveBeenLastCalledWith({pageNo: 1, pageSize: 20, keyword: 'adjusted'})
    expect(wrapper.text()).toContain(item.summary)
    expect(wrapper.text()).not.toContain('查询条件不合法')
  })

  it('分钟精度结束时间包含整分钟，带秒开始时间可在同一分钟内查询', async () => {
    const wrapper = create(); await flushPromises()
    await wrapper.find('[name="occurredFrom"]').setValue('2026-11-07T21:30:45')
    await wrapper.find('[name="occurredTo"]').setValue('2026-11-07T21:30')
    await wrapper.find('form').trigger('submit'); await flushPromises()
    expect(wrapper.text()).not.toContain('开始时间不能晚于结束时间')
    expect(listSystemLogs).toHaveBeenLastCalledWith({pageNo: 1, pageSize: 20, occurredFrom: '2026-11-07T21:30:45', occurredTo: '2026-11-07T21:30:59'})
  })

  it('普通用户直达显示无权限，不请求日志', async () => {
    localStorage.setItem('user', JSON.stringify({roleCode: 'USER'}))
    const wrapper = create(); await flushPromises()
    expect(wrapper.text()).toContain('无权限查看系统日志')
    expect(listSystemLogs).not.toHaveBeenCalled()
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it.each([
    ['HTTP 403', false],
    ['HTTP 200 业务 403', true]
  ])('管理员也以服务端授权结果为准，列表/详情 %s 清空敏感内容', async (_label, businessError) => {
    const wrapper = create(); await flushPromises()
    if (businessError) getSystemLog.mockResolvedValueOnce({status: 200, data: {code: '403'}})
    else getSystemLog.mockRejectedValueOnce(error(403))
    await button(wrapper, '详情').trigger('click'); await flushPromises()
    expect(wrapper.text()).toContain('无权限查看系统日志')
    expect(wrapper.text()).not.toContain(item.summary)
    expect(drawer()).toBeNull()
    if (businessError) listSystemLogs.mockResolvedValueOnce({status: 200, data: {code: '403'}})
    else listSystemLogs.mockRejectedValueOnce(error(403))
    const second = create(); await flushPromises()
    expect(second.text()).toContain('无权限查看系统日志')
  })

  it('按字符串 id 独立请求详情，Escape 关闭后回到原详情按钮并恢复背景滚动', async () => {
    document.body.style.overflow = 'auto'
    const wrapper = create(); await flushPromises()
    const trigger = button(wrapper, '详情')
    trigger.element.focus()
    await trigger.trigger('click'); await flushPromises()
    expect(getSystemLog).toHaveBeenCalledWith(id)
    expect(drawer().contains(document.activeElement)).toBe(true)
    expect(document.body.style.overflow).toBe('hidden')
    expect(wrapper.find('main').attributes('inert')).toBeDefined()
    expect(drawer().textContent).toContain('<script>synthetic()</script>')
    expect(drawer().querySelector('script')).toBeNull()
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}))
    await flushPromises()
    expect(drawer()).toBeNull()
    expect(document.activeElement).toBe(trigger.element)
    expect(document.body.style.overflow).toBe('auto')
  })
})

describe('日志详情的独立状态', () => {
  it('连续切换只展示最后一次，旧内容立即清空，迟到失败不覆盖新内容', async () => {
    const first = deferred(), second = deferred()
    getSystemLog.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const wrapper = create(SystemLogDetail, {id})
    await wrapper.setProps({id: otherId})
    second.resolve(response({...item, id: otherId, summary: '最后选择', stackTrace: ''})); await flushPromises()
    first.reject(error(404)); await flushPromises()
    expect(drawer().textContent).toContain('最后选择')
    expect(drawer().textContent).not.toContain('该日志已不存在')
    const third = deferred()
    getSystemLog.mockReturnValueOnce(third.promise)
    await wrapper.setProps({id})
    expect(drawer().textContent).not.toContain('最后选择')
    expect(drawer().textContent).toContain('正在加载日志详情')
    third.resolve(response({...item, summary: '当前记录'})); await flushPromises()
    expect(drawer().textContent).toContain('当前记录')
  })

  it('迟到成功不覆盖新记录，关闭后到达结果不会重新打开抽屉', async () => {
    const first = deferred(), second = deferred()
    getSystemLog.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const wrapper = create(SystemLogDetail, {id})
    await wrapper.setProps({id: otherId})
    second.resolve(response({...item, summary: '最后记录'})); await flushPromises()
    first.resolve(response({...item, summary: '迟到旧记录'})); await flushPromises()
    expect(drawer().textContent).toContain('最后记录')
    expect(drawer().textContent).not.toContain('迟到旧记录')
    const pending = deferred()
    getSystemLog.mockReturnValueOnce(pending.promise)
    await wrapper.setProps({id})
    wrapper.unmount(); wrappers.splice(wrappers.indexOf(wrapper), 1)
    pending.resolve(response(item)); await flushPromises()
    expect(drawer()).toBeNull()
  })

  it.each([
    ['HTTP 404', false],
    ['HTTP 200 业务 404', true]
  ])('详情 %s 可关闭刷新，普通失败可在抽屉内重试且保留列表', async (_label, businessError) => {
    if (businessError) getSystemLog.mockResolvedValueOnce({status: 200, data: {code: '404'}})
    else getSystemLog.mockRejectedValueOnce(error(404))
    const wrapper = create(); await flushPromises()
    await button(wrapper, '详情').trigger('click'); await flushPromises()
    expect(drawer().textContent).toContain('该日志已不存在')
    drawerButton('关闭并刷新列表').click(); await flushPromises()
    expect(drawer()).toBeNull()
    expect(listSystemLogs).toHaveBeenCalledTimes(2)
    getSystemLog.mockRejectedValueOnce(error(500))
    await button(wrapper, '详情').trigger('click'); await flushPromises()
    expect(drawer().textContent).toContain('日志详情加载失败，请重试')
    expect(wrapper.text()).toContain(item.summary)
    drawerButton('重试').click(); await flushPromises()
    expect(drawer().textContent).toContain(item.exceptionType)
    expect(getSystemLog).toHaveBeenCalledTimes(3)
  })

  it('空堆栈禁用复制，无截断标记不宣称完整，展开收起且正确报告复制失败与成功', async () => {
    getSystemLog.mockResolvedValueOnce(response({...item, stackTrace: ''}))
    const wrapper = create(SystemLogDetail, {id}); await flushPromises()
    expect(drawer().textContent).toContain('无可展示的堆栈')
    expect(drawerButton('复制堆栈').disabled).toBe(true)
    expect(drawer().textContent).not.toContain('堆栈已截断')
    const stackTrace = '<script>synthetic()</script>\n at demo.Task.run(Task.java:1)'
    getSystemLog.mockResolvedValueOnce(response({...item, stackTrace, stackTruncated: true}))
    await wrapper.setProps({id: otherId}); await flushPromises()
    expect(drawer().textContent).toContain('堆栈已截断，仅展示已保存内容')
    expect(drawer().querySelector('pre').textContent).toBe(stackTrace)
    expect(drawer().querySelector('script')).toBeNull()
    drawerButton('展开').click(); await flushPromises()
    expect(drawer().querySelector('pre').classList.contains('expanded')).toBe(true)
    drawerButton('收起').click(); await flushPromises()
    const writeText = vi.fn().mockRejectedValueOnce(new Error('denied')).mockResolvedValueOnce(undefined)
    vi.stubGlobal('navigator', {clipboard: {writeText}})
    drawerButton('复制堆栈').click(); await flushPromises()
    expect(drawer().textContent).toContain('复制失败，请选中文本手动复制')
    expect(drawer().textContent).not.toContain('已复制')
    drawerButton('复制堆栈').click(); await flushPromises()
    expect(drawer().textContent).toContain('已复制')
    expect(writeText).toHaveBeenLastCalledWith(stackTrace)
  })

  it('剪贴板不可用也显示失败，Tab 和 Shift+Tab 在抽屉内循环', async () => {
    create(SystemLogDetail, {id}); await flushPromises()
    vi.stubGlobal('navigator', {})
    drawerButton('复制堆栈').click(); await flushPromises()
    expect(drawer().textContent).toContain('复制失败，请选中文本手动复制')
    const first = drawer().querySelector('.close'), last = drawerButton('关闭')
    last.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', cancelable: true}))
    expect(document.activeElement).toBe(first)
    first.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', shiftKey: true, cancelable: true}))
    expect(document.activeElement).toBe(last)
  })
})
