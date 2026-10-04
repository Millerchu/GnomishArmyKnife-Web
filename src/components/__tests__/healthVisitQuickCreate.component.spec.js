// @vitest-environment happy-dom
import {flushPromises, mount} from '@vue/test-utils'
import {afterEach, describe, expect, it, vi} from 'vitest'
import QuickCreateDialog from '../QuickCreateDialog.vue'
import {QUICK_CREATE_TYPES} from '@/constants/quickCreateRegistry'
import {createHealthVisit} from '@/api/healthRecord'

vi.mock('@/api/healthRecord', () => ({createHealthVisit: vi.fn(), createHealthRecord: vi.fn(), createHealthReport: vi.fn()}))
const wrappers = []
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.clearAllMocks()
})

describe('就诊快捷新增金额', () => {
  it.each([['128.50', 128.5], ['', null], ['0', 0]])('金额 %s 以正确类型提交', async (input, expected) => {
    createHealthVisit.mockResolvedValue({data: {data: {id: '900000000000000111'}}})
    const wrapper = mount(QuickCreateDialog, {
      props: {modelValue: true, types: QUICK_CREATE_TYPES.filter(type => type.typeCode === 'HEALTH_VISIT')},
      global: {stubs: {MacDialog: {template: '<div><slot/><slot name="footer"/></div>'}}}
    })
    wrappers.push(wrapper)
    await wrapper.find('.type-picker select').setValue('HEALTH_VISIT')
    await flushPromises()
    await wrapper.find('.field-hospitalName input').setValue('测试医院')
    await wrapper.find('.field-chiefComplaint textarea').setValue('复查')
    await wrapper.find('.field-amount input').setValue(input)
    await wrapper.find('#quick-create-form').trigger('submit')
    await flushPromises()
    expect(createHealthVisit).toHaveBeenCalledWith(expect.objectContaining({amount: expected, hospitalName: '测试医院'}))
    expect(wrapper.emitted('success')).toHaveLength(1)
  })
})
