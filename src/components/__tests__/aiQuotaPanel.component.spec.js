// @vitest-environment happy-dom
import {flushPromises, mount} from '@vue/test-utils'
import {expect, it, vi} from 'vitest'
import AiQuotaPanel from '../ai-subscriptions/AiQuotaPanel.vue'
import {listAiQuotaSnapshots, saveAiQuotaSnapshot} from '@/api/aiSubscriptions'

vi.mock('@/api/aiSubscriptions', async importOriginal => ({
  ...await importOriginal(),
  listAiQuotaSnapshots: vi.fn(),
  saveAiQuotaSnapshot: vi.fn()
}))
const response = data => ({data: {code: '0', data}})

it('记录 Grok 周额度和 Bot 来源后显示独立读数，不汇总明细', async () => {
  listAiQuotaSnapshots.mockResolvedValueOnce(response([]))
  saveAiQuotaSnapshot.mockImplementationOnce(async snapshot => {
    const saved = {id: '20', ...snapshot}
    listAiQuotaSnapshots.mockResolvedValueOnce(response([saved]))
    return response(saved)
  })
  const wrapper = mount(AiQuotaPanel, {props: {
    accounts: [{id:'9007199254740997', alias:'个人', toolCode:'GROK'}], tools: [{code:'GROK', name:'Grok'}]
  }})
  await flushPromises()
  await wrapper.get('.quota-heading button').trigger('click')
  const [weekly, bot] = wrapper.findAll('fieldset')
  await weekly.get('input[type=number]').setValue('11')
  await bot.get('input[type=number]').setValue('11')
  await bot.get('.quota-breakdown button').trigger('click')
  await bot.get('.quota-row input[placeholder]').setValue('例行任务')
  await bot.get('.quota-row input[type=number]').setValue('5.8')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(saveAiQuotaSnapshot).toHaveBeenCalledWith(expect.objectContaining({
    accountId:'9007199254740997',
    windows:[
      expect.objectContaining({label:'每周用量', reading:'USED', percent:11}),
      expect.objectContaining({label:'Grok Bot 用量', percent:11, breakdown:[{group:'SOURCE', label:'例行任务', percent:5.8}]})
    ]
  }))
  expect(wrapper.text()).toContain('已用 11%')
  expect(wrapper.text()).toContain('例行任务5.8%')
})

it('切换账号后分别展示 ChatGPT 剩余额度与 Muse 的剩余数量', async () => {
  listAiQuotaSnapshots.mockResolvedValueOnce(response([{
    id:'1', observedAt:'2026-11-19T10:00:00', windows:[{label:'5 小时限额', reading:'REMAINING', percent:82}],
    resets:[{label:'完全重置', count:1, expiresAt:'2026-12-01T04:32:00'}]
  }])).mockResolvedValueOnce(response([{
    id:'2', observedAt:'2026-11-19T10:00:00', windows:[{label:'额外的使用额度', reading:'USED', percent:0, remaining:'1000000000', unit:'口令', resetHint:'从不过期'}]
  }]))
  const wrapper = mount(AiQuotaPanel, {props: {
    accounts:[{id:'1', alias:'ChatGPT', toolCode:'CHATGPT'}, {id:'2', alias:'Muse', toolCode:'MUSE'}], tools:[]
  }})
  await flushPromises()
  expect(wrapper.text()).toContain('剩余 82%')
  expect(wrapper.text()).toContain('2026-12-01 04:32 到期')
  await wrapper.get('.quota-account select').setValue('2')
  await flushPromises()
  expect(wrapper.text()).toContain('已用 0%')
  expect(wrapper.text()).toContain('剩余 1,000,000,000 口令')
  expect(wrapper.text()).not.toContain('82%')
})
