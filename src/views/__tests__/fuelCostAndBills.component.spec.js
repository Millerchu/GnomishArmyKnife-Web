// @vitest-environment happy-dom
import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FuelStats from '../FuelStats.vue'
import PersonalBills from '../PersonalBills.vue'

const mocks = vi.hoisted(() => ({
  route: { query: {} },
  push: vi.fn(),
  fuel: {
    listFuelRecords: vi.fn(), getFuelSummary: vi.fn(), getFuelReports: vi.fn(),
    getLatestFuelPrices: vi.fn(), listFuelVehicles: vi.fn(), getFuelRecord: vi.fn(),
    createFuelRecord: vi.fn(), updateFuelRecord: vi.fn(), deleteFuelRecord: vi.fn(),
    createFuelVehicle: vi.fn(), updateFuelVehicle: vi.fn(), deleteFuelVehicle: vi.fn(),
  },
  bills: {
    listPersonalBills: vi.fn(), getPersonalBillSummary: vi.fn(), listAnnualBudgets: vi.fn(),
    createAnnualBudget: vi.fn(), createPersonalBill: vi.fn(), deleteAnnualBudget: vi.fn(),
    deletePersonalBill: vi.fn(), updateAnnualBudget: vi.fn(), updatePersonalBill: vi.fn(),
  },
  dictionaries: vi.fn(),
}))
vi.mock('@/api/fuelStats', () => mocks.fuel)
vi.mock('@/api/personalBills', () => mocks.bills)
vi.mock('@/api/dataDictionary', () => ({ listDataDictionaryOptionsByUsage: mocks.dictionaries }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }), useRoute: () => mocks.route }))
const response = data => ({ data: { code: '0', data } })
const record = {
  id: '900000000000000111', vehicleName: '测试车辆', fuelDate: '2026-10-04',
  fuelTime: '2026-10-04T10:00:00', fuelType: '95', fillType: 'FULL',
  odometerKm: 1500, fuelVolume: 35, discountedAmount: 0, totalAmount: 250,
  consumptionDistanceKm: 500, consumptionFuelVolume: 45, consumptionAmount: 325,
  fuelConsumption: 9, costPerKm: 0.65, attachments: [],
}
const options = { global: { stubs: {
  MacDialog: { props: ['modelValue'], template: '<div v-if="modelValue"><slot/><slot name="footer"/></div>' },
  AttachmentManager: true, AttachmentGallery: true, PersonalCreditPanel: true,
} } }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.route.query = {}
  mocks.fuel.listFuelRecords.mockResolvedValue(response({ list: [record], total: 1 }))
  mocks.fuel.getFuelSummary.mockResolvedValue(response({ recentRecords: [record] }))
  mocks.fuel.getFuelReports.mockResolvedValue(response({}))
  mocks.fuel.getLatestFuelPrices.mockResolvedValue(response({}))
  mocks.fuel.listFuelVehicles.mockResolvedValue(response([]))
  mocks.fuel.getFuelRecord.mockResolvedValue(response(record))
  mocks.dictionaries.mockResolvedValue(response([]))
  mocks.bills.listPersonalBills.mockResolvedValue(response({ list: [{
    id: '200', sourceType: 'FUEL_RECORD', sourceId: record.id, sourceEntry: 'PAYMENT',
    billType: 'EXPENSE', categoryName: '交通', amount: 250, billDate: '2026-10-04',
  }], total: 1 }))
  mocks.bills.getPersonalBillSummary.mockResolvedValue(response({}))
  mocks.bills.listAnnualBudgets.mockResolvedValue(response([]))
})

describe('周期费用和来源账单', () => {
  it('显示就诊来源并跳转到健康记录，保留完整来源 ID', async () => {
    mocks.bills.listPersonalBills.mockResolvedValue(response({list: [{
      id: '300', sourceType: 'HEALTH_VISIT', sourceId: record.id, sourceEntry: 'PAYMENT',
      billType: 'EXPENSE', categoryName: '医疗', amount: 128.5, billDate: '2026-10-04'
    }], total: 1}))
    const wrapper = mount(PersonalBills, options)
    await flushPromises()
    expect(wrapper.find('.bill-row').text()).toContain('就诊支出')
    await wrapper.find('.bill-row').trigger('click')
    expect(mocks.push).toHaveBeenCalledWith({path: '/health', query: {recordId: record.id}})
    expect(wrapper.find('#personal-bill-dialog-form').exists()).toBe(false)
    wrapper.unmount()
  })
  it('显示每公里费用并独立渲染单位，实付为零不会回退到机显金额', async () => {
    const wrapper = mount(FuelStats, options)
    await flushPromises()
    expect(wrapper.find('.headline-stats').text()).toContain('0.650元/km')
    expect(wrapper.find('.headline-stats').text()).toContain('¥0.00')
    expect(wrapper.findAll('.metric-unit').some(unit => unit.text() === '元/km')).toBe(true)
    expect(wrapper.find('tbody').text()).toContain('0.650元/km')
    wrapper.unmount()
  })

  it('免费完整周期显示零费用，缺少完整周期显示横线', async () => {
    const first = { ...record, costPerKm: 0 }
    const open = { ...record, id: 'other', costPerKm: null, fuelConsumption: null }
    mocks.fuel.listFuelRecords.mockResolvedValue(response({ list: [first, open], total: 2 }))
    const wrapper = mount(FuelStats, options)
    await flushPromises()
    const rows = wrapper.findAll('tbody tr')
    expect(rows[0].findAll('td')[5].text()).toBe('0.000元/km')
    expect(rows[1].findAll('td')[5].text()).toBe('—')
    wrapper.unmount()
  })

  it('账单跳转可打开当前分页之外的指定记录并进入编辑', async () => {
    mocks.route.query = { recordId: record.id }
    mocks.fuel.listFuelRecords.mockResolvedValue(response({ list: [], total: 0 }))
    const wrapper = mount(FuelStats, options)
    await flushPromises()
    expect(mocks.fuel.getFuelRecord).toHaveBeenCalledWith(record.id)
    expect(wrapper.find('.detail-grid').text()).toContain('周期实付油费¥325.00')
    const edit = wrapper.findAll('button').find(button => button.text() === '编辑记录')
    expect(edit).toBeDefined()
    await edit.trigger('click')
    expect(wrapper.find('#fuel-record-dialog-form').exists()).toBe(true)
    wrapper.unmount()
  })

  it('来源账单标记油耗支出，点击跳到对应油耗记录', async () => {
    const wrapper = mount(PersonalBills, options)
    await flushPromises()
    expect(wrapper.find('.bill-row').text()).toContain('油耗支出')
    await wrapper.find('.bill-row').trigger('click')
    expect(mocks.push).toHaveBeenCalledWith({ path: '/fuel-stats', query: { recordId: record.id } })
    expect(wrapper.find('#personal-bill-dialog-form').exists()).toBe(false)
    wrapper.unmount()
  })
})
