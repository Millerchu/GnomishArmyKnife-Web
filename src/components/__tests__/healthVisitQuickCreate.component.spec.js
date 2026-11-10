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
  vi.unstubAllGlobals()
})

describe('就诊快捷新增金额', () => {
  it.each([
    [500, '0123456789abcdef0123456789abcdef', true],
    [500, undefined, false],
    [400, '0123456789abcdef0123456789abcdef', false]
  ])('提交失败保留原提示，仅带编号的 5xx 可复制：%s / %s', async (status, traceId, hasTrace) => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {clipboard: {writeText}})
    createHealthVisit.mockRejectedValueOnce({response: {status, data: {message: '保存就诊失败'}}, traceId})
    const wrapper = mount(QuickCreateDialog, {
      props: {modelValue: true, types: QUICK_CREATE_TYPES.filter(type => type.typeCode === 'HEALTH_VISIT')},
      global: {stubs: {MacDialog: {template: '<div><slot/><slot name="footer"/></div>'}}}
    })
    wrappers.push(wrapper)
    await wrapper.find('.type-picker select').setValue('HEALTH_VISIT')
    await flushPromises()
    await wrapper.find('#quick-create-form').trigger('submit')
    await flushPromises()
    const notice = wrapper.get('.form-error')
    expect(notice.text()).toContain('保存就诊失败')
    expect(notice.find('button').exists()).toBe(hasTrace)
    if (hasTrace) {
      expect(notice.text()).toContain(`追踪编号：${traceId}，可在系统日志中精确查询`)
      await notice.get('button').trigger('click')
      await flushPromises()
      expect(writeText).toHaveBeenCalledExactlyOnceWith(traceId)
    } else {
      expect(notice.text()).toBe('保存就诊失败')
    }
    expect(wrapper.emitted('success')).toBeUndefined()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

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
