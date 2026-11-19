// @vitest-environment happy-dom
import {flushPromises, mount} from '@vue/test-utils'
import {expect, it, vi} from 'vitest'
import {createMemoryHistory, createRouter} from 'vue-router'
import {listLatestAiQuotas} from '@/api/aiSubscriptions'
import AiSubscriptionsCard from '../workbench/AiSubscriptionsCard.vue'

vi.mock('@/api/aiSubscriptions', () => ({listLatestAiQuotas: vi.fn()}))

it('工作台按快照方向画图，未启用状态和剩余绝对量单独展示', async () => {
  listLatestAiQuotas.mockResolvedValue({data: {code: '0', data: [{
    accountId: '10', toolCode: 'CHATGPT', alias: 'GPT', observedAt: '2026-11-19T10:00:00',
    windows: [{label: '5 小时限额', reading: 'REMAINING', percent: 82}]
  }, {
    accountId: '20', toolCode: 'GROK', alias: 'Grok', observedAt: '2026-11-19T11:00:00',
    windows: [{label: '每周用量', reading: 'USED', percent: 11}, {label: '额外用量', percent: null, resetHint: '未启用'}]
  }, {
    accountId: '30', toolCode: 'MUSE', alias: 'Muse', observedAt: '2026-11-19T12:00:00',
    windows: [{label: '额外额度', reading: 'USED', percent: 0, remaining: '1000000000', unit: '个口令'}]
  }]}})
  const component = {template: '<div />'}
  const router = createRouter({history: createMemoryHistory(), routes: [
    {path: '/', component}, {path: '/ai-subscriptions', component}
  ]})
  await router.push('/')
  const wrapper = mount(AiSubscriptionsCard, {global: {plugins: [router]}})
  await flushPromises()
  expect(wrapper.findAll('meter').map(item => item.attributes('value'))).toEqual(['82', '11', '0'])
  expect(wrapper.text()).toContain('剩余 82%')
  expect(wrapper.text()).toContain('已用 11%')
  expect(wrapper.text()).toContain('未启用')
  expect(wrapper.text()).toContain('剩余 1,000,000,000 个口令')
  await wrapper.get('.wb-link').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.fullPath).toBe('/ai-subscriptions?view=quota')
})
