// @vitest-environment happy-dom
import {beforeEach, expect, it, vi} from 'vitest'
import {flushPromises, mount} from '@vue/test-utils'
import {ref} from 'vue'
import AiSubscriptions from '../AiSubscriptions.vue'
import * as api from '@/api/aiSubscriptions'
const access = vi.hoisted(() => ({value: null}))
vi.mock('@/composables/useWorkbenchAccess', () => ({useWorkbenchAccess: () => access.value}))
vi.mock('@/api/aiSubscriptions', async importOriginal => {
  const original = await importOriginal()
  return {...original, ...Object.fromEntries(['listAiTools', 'listAiAccounts', 'listAiSubscriptions', 'listAiUsageRecords', 'listAiPayments', 'getAiSummary'].map(name => [name, vi.fn()]))}
})
const ok = data => ({data: {code: '0', data}})
const mountPage = () => mount(AiSubscriptions, {global: {stubs: {RouterLink: {template: '<a><slot/></a>'}, MacDialog: true, AiIntegrationsPanel: true}}})
beforeEach(() => {
  vi.clearAllMocks()
  access.value = {loading: ref(false), source: ref('server'), featureCodes: ref(['APP_AI_SUBSCRIPTION']), reload: vi.fn()}
  api.listAiTools.mockResolvedValue(ok([{code: 'CHATGPT', name: 'ChatGPT', syncNote: '手动记录'}]))
  api.listAiAccounts.mockResolvedValue(ok([{id: '9007199254740993', toolCode: 'CHATGPT', alias: '工作账号'}]))
  api.listAiSubscriptions.mockResolvedValue(ok([]))
  api.listAiUsageRecords.mockResolvedValue(ok([{id: 'u1', accountId: '9007199254740993', kind: 'API', mode: 'INCREMENT', quantity: '5', unit: 'tokens', cost: null, currency: 'USD', status: 'REVIEW', reason: '部分重叠'}]))
  api.listAiPayments.mockResolvedValue(ok([]))
  api.getAiSummary.mockResolvedValue(ok({month: '2026-11', hasRecords: true, complete: false, missingReasons: ['费用未知'], currencies: [{currency: 'USD', confirmedCost: '10', cashExpense: '30', monthlyCommitment: '20', estimatedCost: '0'}]}))
})
it('无应用权限不读取业务数据', async () => {
  access.value.featureCodes.value = []
  const wrapper = mountPage(); await flushPromises()
  expect(wrapper.text()).toContain('尚未获得智订访问权限')
  expect(api.listAiAccounts).not.toHaveBeenCalled()
})
it('三种金额独立展示并提示统计不完整，用量展示排除原因', async () => {
  const wrapper = mountPage(); await flushPromises()
  expect(wrapper.text()).toContain('本月确认成本')
  expect(wrapper.text()).toContain('本月现金支出')
  expect(wrapper.text()).toContain('月均订阅承诺')
  expect(wrapper.text()).toContain('汇总不完整：费用未知')
  await wrapper.findAll('nav button').find(button => button.text() === '用量与费用').trigger('click')
  expect(wrapper.text()).toContain('待核对 · 未计入：部分重叠')
  expect(wrapper.text()).toContain('未记录')
  await wrapper.findAll('nav button').find(button => button.text() === '续费日历').trigger('click')
  expect(wrapper.text()).toContain('未来 30 天没有符合条件的续费事件')
})
it('接口失败显示错误而不是空记录，重试可恢复', async () => {
  api.listAiAccounts.mockRejectedValueOnce(new Error('服务暂不可用'))
  const wrapper = mountPage(); await flushPromises()
  expect(wrapper.text()).toContain('服务暂不可用')
  await wrapper.findAll('button').find(button => button.text() === '重试').trigger('click'); await flushPromises()
  expect(wrapper.text()).not.toContain('服务暂不可用')
  expect(wrapper.text()).toContain('本月确认成本')
})
