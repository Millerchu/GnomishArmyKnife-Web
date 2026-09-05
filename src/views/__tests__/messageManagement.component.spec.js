// @vitest-environment happy-dom
import {mount, flushPromises} from '@vue/test-utils'
import {beforeEach, describe, it, expect, vi} from 'vitest'
vi.mock('../../api/messages', () => ({sendMessage: vi.fn(), listSentMessages: vi.fn(), listRecipientOptions: vi.fn(), listMessageRecipients: vi.fn()}))
vi.mock('../../features/messages/state', () => ({categoryLabels: {ANNOUNCEMENT: '系统公告'}, sourceLabel: () => '管理员', formatMessageTime: () => '', refreshMessages: vi.fn()}))
import MessageManagement from '../MessageManagement.vue'
import {sendMessage, listSentMessages, listRecipientOptions} from '../../api/messages'
const macDialog = {props: ['modelValue'], template: '<section v-if="modelValue"><slot/><slot name="footer"/></section>'}
const userId = '9223372036854775806'
describe('管理员预览与发送', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listRecipientOptions.mockResolvedValue({list: [{id: userId, username: 'alice', displayName: '甲'}], total: 1})
    listSentMessages.mockResolvedValue({list: [], total: 0})
  })
  function mountPage() { return mount(MessageManagement, {global: {stubs: {RouterLink: {template: '<a><slot/></a>'}, MacDialog: macDialog, MessageDetail: true}}}) }
  async function fillAndPreview(wrapper) {
    await flushPromises()
    await wrapper.find('input[maxlength="120"]').setValue('测试通知')
    await wrapper.find('textarea').setValue('这是一条测试正文')
    await wrapper.find('input[type="checkbox"]').setValue(true)
    await wrapper.find('form').trigger('submit')
  }
  it('预览不会发送，确认后保留大整数用户 ID', async () => {
    const wrapper = mountPage(); await fillAndPreview(wrapper)
    expect(sendMessage).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('1 位指定用户')
    sendMessage.mockResolvedValue(1)
    await wrapper.findAll('button').find(button => button.text() === '确认发送').trigger('click'); await flushPromises()
    expect(sendMessage.mock.calls[0][0].userIds).toEqual([userId])
    expect(wrapper.text()).toContain('消息已发送')
    wrapper.unmount()
  })
  it('网络失败重试沿用幂等键，不创建第二次发送操作', async () => {
    const wrapper = mountPage(); await fillAndPreview(wrapper)
    sendMessage.mockRejectedValueOnce(new Error('网络断开')).mockResolvedValueOnce(1)
    await wrapper.findAll('button').find(button => button.text() === '确认发送').trigger('click'); await flushPromises()
    const firstKey = sendMessage.mock.calls[0][0].idempotencyKey
    expect(wrapper.text()).toContain('网络断开')
    await wrapper.findAll('button').find(button => button.text() === '确认发送').trigger('click'); await flushPromises()
    expect(sendMessage.mock.calls[1][0].idempotencyKey).toBe(firstKey)
    wrapper.unmount()
  })
})
