// @vitest-environment happy-dom
import {flushPromises, mount} from '@vue/test-utils'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import QuickCreateDialog from '../QuickCreateDialog.vue'
import {QUICK_CREATE_TYPES} from '@/constants/quickCreateRegistry'
import {createWorkLog, listWorkLogs} from '@/api/workLog'
import {listDataDictionaryOptionsByUsage} from '@/api/dataDictionary'

vi.mock('@/api/workLog', () => ({createWorkLog: vi.fn(), listWorkLogs: vi.fn()}))
vi.mock('@/api/dataDictionary', () => ({listDataDictionaryOptionsByUsage: vi.fn()}))
const wrappers = []
beforeEach(() => {
  listWorkLogs.mockResolvedValue({data: {data: []}})
  listDataDictionaryOptionsByUsage.mockResolvedValue({data: {data: [
    {itemValue: 'NORMAL', itemLabel: '正常', isDefault: true},
    {itemValue: 'LEAVE', itemLabel: '请假'},
    {itemValue: 'OFFICE', itemLabel: '办公室'},
    {itemValue: 'GAK', itemLabel: '项目'}
  ]}})
  createWorkLog.mockResolvedValue({data: {data: {id: '99'}}})
})
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); vi.resetAllMocks() })
async function open() {
  const wrapper = mount(QuickCreateDialog, {
    props: {modelValue: true, currentUser: {id: '1'}, types: QUICK_CREATE_TYPES.filter(type => type.typeCode === 'WORK_LOG')},
    global: {stubs: {MacDialog: {template: '<div><slot/><slot name="footer"/></div>'}}}
  })
  wrappers.push(wrapper)
  await wrapper.find('.type-picker select').setValue('WORK_LOG')
  await flushPromises()
  return wrapper
}
it('submits effort per content item and derives the total', async () => {
  const wrapper = await open()
  await wrapper.find('.work-item-row input[type="text"]').setValue('联调')
  await wrapper.find('.work-item-row input[type="number"]').setValue('0.3')
  await wrapper.find('#quick-create-form').trigger('submit')
  await flushPromises()
  expect(createWorkLog).toHaveBeenCalledWith(expect.objectContaining({personDay: 0.3, workItems: [{content: '联调', status: 'COMPLETED', personDay: 0.3}]}))
})
it('allows leave with no content and supplies the leave affiliation', async () => {
  const wrapper = await open()
  const checks = wrapper.findAll('.dictionary-checks input')
  await checks[0].setValue(false)
  await checks[1].setValue(true)
  await wrapper.find('.field-personDay input').setValue('0.5')
  await wrapper.find('#quick-create-form').trigger('submit')
  await flushPromises()
  expect(createWorkLog).toHaveBeenCalledWith(expect.objectContaining({projectCode: 'LEAVE', location: '居家', personDay: 0.5, workItems: []}))
})
