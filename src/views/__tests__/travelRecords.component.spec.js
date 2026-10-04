// @vitest-environment happy-dom
import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TravelRecords from '../TravelRecords.vue'

const api = vi.hoisted(() => ({
  listTravelRecords: vi.fn(),
  listTravelGroups: vi.fn(),
  getTravelSummary: vi.fn(),
  getTravelRecord: vi.fn(),
  createTravelRecord: vi.fn(),
  updateTravelRecord: vi.fn(),
}))
vi.mock('@/api/travelRecords', () => api)
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }), useRoute: () => ({ query: {} }) }))
const result = (data) => ({ data: { code: '0', data } })
const record = {
  id: '900000000000000111',
  version: 0,
  requestKey: 'key',
  transportType: 'TRAIN',
  status: 'COMPLETED',
  departure: '南京',
  arrival: '上海',
  departureDate: '2010-01-02',
  departureZone: 'Asia/Shanghai',
  arrivalZone: 'Asia/Shanghai',
  currency: 'CNY',
  syncBill: true,
  useDepartureDate: false,
  attachments: [],
  bills: [],
}
const options = {
  global: {
    stubs: {
      MacDialog: {
        props: ['modelValue'],
        template: '<div v-if="modelValue"><slot/><slot name="footer"/></div>',
      },
      AttachmentManager: true,
      AttachmentGallery: true,
    },
  },
}
beforeEach(() => {
  vi.clearAllMocks()
  api.listTravelRecords.mockResolvedValue(result({ list: [record], total: 1 }))
  api.listTravelGroups.mockResolvedValue(result([]))
  api.getTravelSummary.mockResolvedValue(result({ completedCount: 1 }))
  api.getTravelRecord.mockResolvedValue(result(record))
  api.updateTravelRecord.mockResolvedValue(result(record))
})
describe('行程页面', () => {
  it('编辑详情不会克隆Vue代理失败，提交保留version和空金额', async () => {
    const wrapper = mount(TravelRecords, options)
    await flushPromises()
    await wrapper.find('.ticket-main').trigger('click')
    await flushPromises()
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '编辑')
      .trigger('click')
    expect(wrapper.find('#travel-form').exists()).toBe(true)
    await wrapper.find('#travel-form').trigger('submit')
    await flushPromises()
    expect(api.updateTravelRecord).toHaveBeenCalledWith(
      record.id,
      expect.objectContaining({ version: 0, paidAmount: null, attachmentIds: [] }),
    )
    wrapper.unmount()
  })
  it('业务码重复提示允许确认保存，重试使用同一requestKey', async () => {
    api.createTravelRecord
      .mockResolvedValueOnce({ data: { code: 'TRAVEL_DUPLICATE', message: '存在相同行程' } })
      .mockResolvedValueOnce(result(record))
    const wrapper = mount(TravelRecords, options)
    await flushPromises()
    await wrapper.find('.hero .primary').trigger('click')
    const fields = wrapper.findAll('#travel-form input[required]')
    await fields[0].setValue('南京')
    await fields[1].setValue('上海')
    await fields[2].setValue('2010-01-02')
    await wrapper.find('#travel-form').trigger('submit')
    await flushPromises()
    const firstKey = api.createTravelRecord.mock.calls[0][0].requestKey
    const confirm = wrapper.findAll('button').find((button) => button.text() === '确认仍然保存')
    expect(confirm).toBeDefined()
    await confirm.trigger('click')
    await flushPromises()
    expect(api.createTravelRecord.mock.calls[1][0]).toMatchObject({
      requestKey: firstKey,
      duplicateConfirmed: true,
    })
    wrapper.unmount()
  })
})
