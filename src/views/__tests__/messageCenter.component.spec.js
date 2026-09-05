// @vitest-environment happy-dom
import {mount, flushPromises} from '@vue/test-utils'
import {beforeEach, describe, it, expect, vi} from 'vitest'
vi.mock('../../utils/authStorage', () => ({readAuthState: () => ({user: {roleCode: 'USER'}})}))
vi.mock('../../api/messages', () => ({listInbox: vi.fn(), getInboxMessage: vi.fn(), markMessageRead: vi.fn()}))
vi.mock('../../features/messages/state', () => ({messageState: {unreadCount: 1, revision: 0}, categoryLabels: {BUSINESS: '业务提醒'}, sourceLabel: () => '权限管理', formatMessageTime: value => value || '', refreshMessages: vi.fn(), readAllMessages: vi.fn()}))
vi.mock('vue-router', () => ({useRoute: () => ({query: {}}), useRouter: () => ({push: vi.fn(), replace: vi.fn()})}))
import MessageCenter from '../MessageCenter.vue'
import {listInbox, getInboxMessage, markMessageRead} from '../../api/messages'
const item = {id: 1, messageId: 1, category: 'BUSINESS', title: '测试消息', body: '<img src=x onerror=alert(1)>', source: 'PERMISSION', readAt: null}
describe('收件箱阅读语义', () => {
  beforeEach(() => { vi.clearAllMocks(); listInbox.mockResolvedValue({list: [item], total: 1}); getInboxMessage.mockResolvedValue(item); markMessageRead.mockResolvedValue() })
  function mountPage() { return mount(MessageCenter, {global: {stubs: {RouterLink: {template: '<a><slot/></a>'}, MessageDetail: true}}}) }
  it('列表加载不标记已读，正文按纯文本渲染', async () => {
    const wrapper = mountPage(); await flushPromises()
    expect(markMessageRead).not.toHaveBeenCalled()
    expect(wrapper.find('.messages-list img').exists()).toBe(false)
    expect(wrapper.text()).toContain('<img src=x onerror=alert(1)>')
    wrapper.unmount()
  })
  it('打开详情才提交已读并刷新摘要', async () => {
    const wrapper = mountPage(); await flushPromises()
    await wrapper.find('.messages-row-main').trigger('click'); await flushPromises()
    expect(getInboxMessage).toHaveBeenCalledWith(1)
    expect(markMessageRead).toHaveBeenCalledWith(1)
    wrapper.unmount()
  })
})
