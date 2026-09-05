// @vitest-environment happy-dom
import {beforeEach, afterEach, describe, it, expect, vi} from 'vitest'
import {flushPromises} from '@vue/test-utils'
vi.mock('../../api/messages', () => ({getMessageSummary: vi.fn(), consumeMessageStream: vi.fn(() => new Promise(() => {})), markAllMessagesRead: vi.fn()}))
import {getMessageSummary, consumeMessageStream} from '../../api/messages'
import {messageState, startMessageSession, stopMessageSession, refreshMessages} from '../../features/messages/state'
const summary = (count = 1, recent = [{id: 1, messageId: 1, title: '第一条', source: 'PERMISSION', readAt: null}]) => ({unreadCount: count, recent, categoryCounts: {BUSINESS: count}, permissionRevision: '0'})
describe('消息会话恢复与隔离', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); getMessageSummary.mockResolvedValue(summary()) })
  afterEach(() => { stopMessageSession(); vi.useRealTimers() })
  it('登录汇总只出现一次，周期补查不重复弹窗', async () => {
    startMessageSession('alice'); await flushPromises()
    expect(messageState.notice.kind).toBe('login')
    await vi.advanceTimersByTimeAsync(8000)
    expect(messageState.notice).toBe(null)
    await refreshMessages()
    expect(messageState.notice).toBe(null)
    startMessageSession('alice')
    expect(consumeMessageStream).toHaveBeenCalledTimes(1)
  })
  it('5 秒内新消息合并，重放不重复弹窗', async () => {
    startMessageSession('alice'); await flushPromises()
    getMessageSummary.mockResolvedValue(summary(2, [{id: 2, messageId: 2, title: '第二条', readAt: null}, ...summary().recent]))
    await refreshMessages()
    expect(messageState.notice.count).toBe(1)
    getMessageSummary.mockResolvedValue(summary(3, [{id: 3, messageId: 3, title: '第三条', readAt: null}, {id: 2, messageId: 2, readAt: null}, ...summary().recent]))
    await refreshMessages()
    expect(messageState.notice.count).toBe(2)
    await refreshMessages()
    expect(messageState.notice.count).toBe(2)
  })
  it('切换账号后丢弃旧账号的在途响应', async () => {
    let finishOld
    getMessageSummary.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve }))
    startMessageSession('alice')
    getMessageSummary.mockResolvedValue(summary(0, []))
    startMessageSession('bob'); await flushPromises()
    finishOld(summary(99)); await flushPromises()
    expect(messageState.unreadCount).toBe(0)
    expect(messageState.recent).toEqual([])
    stopMessageSession()
    expect(messageState.notice).toBe(null)
  })
  it('补查失败保留现有数据，并允许恢复', async () => {
    startMessageSession('alice'); await flushPromises()
    getMessageSummary.mockRejectedValueOnce(new Error('断网'))
    await refreshMessages()
    expect(messageState.unreadCount).toBe(1)
    expect(messageState.error).toBeTruthy()
    await refreshMessages()
    expect(messageState.error).toBe('')
  })
  it('周期补查发现权限变化会触发目录刷新', async () => {
    const listener = vi.fn(); window.addEventListener('gak:permissions-changed', listener)
    startMessageSession('alice'); await flushPromises()
    getMessageSummary.mockResolvedValue({...summary(), permissionRevision: '1'})
    await vi.advanceTimersByTimeAsync(30000)
    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener('gak:permissions-changed', listener)
  })
})
