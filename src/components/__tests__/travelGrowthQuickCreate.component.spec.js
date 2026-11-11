// @vitest-environment happy-dom
import {flushPromises, mount} from '@vue/test-utils'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import QuickCreateDialog from '../QuickCreateDialog.vue'
import {resolveQuickCreateTypes} from '@/constants/quickCreateRegistry'
import {confirmDialog} from '@/components/systemDialog'
import {createTravelRecord} from '@/api/travelRecords'
import {createGrowthChild, createGrowthMeasurement, createGrowthMilestone, createGrowthVaccination, listGrowthChildren} from '@/api/growthRecords'

vi.mock('@/components/systemDialog', () => ({confirmDialog: vi.fn()}))
vi.mock('@/api/travelRecords', () => ({createTravelRecord: vi.fn()}))
vi.mock('@/api/growthRecords', () => ({
  listGrowthChildren: vi.fn(),
  createGrowthChild: vi.fn(),
  createGrowthMeasurement: vi.fn(),
  createGrowthVaccination: vi.fn(),
  createGrowthMilestone: vi.fn()
}))

const childId = '2123456789012345678'
const child = {id: childId, name: '测试宝宝', birthday: '2024-01-01'}
const wrappers = []

beforeEach(() => {
  listGrowthChildren.mockResolvedValue({data: {code: '0', data: [child]}})
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.resetAllMocks()
})

async function open(typeCode) {
  const wrapper = mount(QuickCreateDialog, {
    props: {modelValue: true, initialTypeCode: typeCode,
      types: resolveQuickCreateTypes(['APP_TRAVEL_RECORD', 'APP_GROWTH_RECORD'])},
    global: {stubs: {MacDialog: {template: '<div><slot/><slot name="footer"/></div>'}}}
  })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}

async function submit(wrapper) {
  await wrapper.get('#quick-create-form').trigger('submit')
  await flushPromises()
}

it('行笺校验起终点及日期，重复时沿用同一请求键确认保存', async () => {
  const wrapper = await open('TRAVEL_RECORD')
  await submit(wrapper)
  expect(createTravelRecord).not.toHaveBeenCalled()
  expect(wrapper.text()).toContain('请填写出发地、到达地和出发日期')
  await wrapper.get('.field-departure input').setValue('长沙')
  await wrapper.get('.field-arrival input').setValue('广州')
  await wrapper.get('.field-departureDate input').setValue('2026-11-11')
  createTravelRecord
    .mockRejectedValueOnce({response: {data: {code: 'TRAVEL_DUPLICATE', message: '存在相似行程'}}})
    .mockResolvedValueOnce({data: {code: '0'}})
  confirmDialog.mockResolvedValue(true)
  await submit(wrapper)

  expect(confirmDialog).toHaveBeenCalledOnce()
  expect(createTravelRecord).toHaveBeenCalledTimes(2)
  const [payload] = createTravelRecord.mock.calls[0]
  expect(payload).toMatchObject({departure: '长沙', arrival: '广州', departureDate: '2026-11-11',
    transportType: 'TRAIN', status: 'PLANNED', requestKey: expect.any(String), syncBill: false, attachmentIds: []})
  expect(createTravelRecord).toHaveBeenLastCalledWith({...payload, duplicateConfirmed: true})
  expect(wrapper.emitted('success')).toHaveLength(1)
})

it('芽记没有档案时阻止提交测量，并可切换到新增档案', async () => {
  listGrowthChildren.mockResolvedValueOnce({data: {data: []}})
  const wrapper = await open('GROWTH_MEASUREMENT')
  expect(wrapper.get('.field-childId').text()).toContain('新增宝宝档案')
  expect(wrapper.get('.quick-submit').element.disabled).toBe(true)
  await submit(wrapper)
  expect(createGrowthMeasurement).not.toHaveBeenCalled()
  await wrapper.get('.type-picker select').setValue('GROWTH_CHILD')
  await wrapper.get('.field-name input').setValue('测试宝宝')
  await wrapper.get('.field-birthday input').setValue(child.birthday)
  await submit(wrapper)
  expect(createGrowthChild).toHaveBeenCalledWith({name: '测试宝宝', birthday: child.birthday, gender: 'UNKNOWN', note: null})
})

it('芽记多个宝宝时要求选择，并使用字符串 ID 提交数值型测量', async () => {
  listGrowthChildren.mockResolvedValueOnce({data: {data: [child, {id: '9', name: '另一个宝宝'}]}})
  const wrapper = await open('GROWTH_MEASUREMENT')
  const picker = wrapper.get('.field-childId select')
  expect(picker.element.value).toBe('')
  await picker.setValue(childId)
  expect(wrapper.get('.field-measureDate input').attributes('min')).toBe(child.birthday)
  await submit(wrapper)
  expect(createGrowthMeasurement).not.toHaveBeenCalled()
  expect(wrapper.text()).toContain('至少填写一项')
  await wrapper.get('.field-weightKg input').setValue('9.4')
  await submit(wrapper)
  expect(createGrowthMeasurement).toHaveBeenCalledWith(childId, expect.objectContaining({
    weightKg: 9.4, heightCm: null, headCm: null
  }))
})

it('芽记接种计划允许未来日期，里程碑使用已选宝宝', async () => {
  const vaccine = await open('GROWTH_VACCINATION')
  expect(vaccine.get('.field-childId select').element.value).toBe(childId)
  expect(vaccine.get('.field-vaccinationDate input').attributes('max')).toBeTruthy()
  await vaccine.get('.field-status select').setValue('PLANNED')
  expect(vaccine.get('.field-vaccinationDate input').attributes('max')).toBeUndefined()
  await vaccine.get('.field-vaccineName input').setValue('测试疫苗')
  await submit(vaccine)
  expect(createGrowthVaccination).toHaveBeenCalledWith(childId, expect.objectContaining({
    vaccineName: '测试疫苗', dose: 1, status: 'PLANNED'
  }))

  const milestone = await open('GROWTH_MILESTONE')
  await milestone.get('.field-title input').setValue('第一次独立走路')
  await submit(milestone)
  expect(createGrowthMilestone).toHaveBeenCalledWith(childId, expect.objectContaining({title: '第一次独立走路'}))
})
