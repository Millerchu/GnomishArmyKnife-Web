// @vitest-environment happy-dom

import {flushPromises, mount} from '@vue/test-utils'
import {nextTick} from 'vue'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import RequirementBoard from '../RequirementBoard.vue'
import QuickCreateDialog from '../QuickCreateDialog.vue'
import MacDialog from '../MacDialog.vue'
import FuelStats from '@/views/FuelStats.vue'
import {updateFuelVehicle} from '@/api/fuelStats'
import {listDataDictionaryOptionsByUsage} from '@/api/dataDictionary'
import {getRequirementItemDetail, updateRequirementItem, updateRequirementItemProgress} from '@/api/requirementBoard'
import {confirmDialog} from '../systemDialog'

vi.mock('@/api/requirementBoard', () => ({
  listRequirementItems: vi.fn(async () => ({data: {list: [], total: 0}})),
  listRequirementApps: vi.fn(async () => ({data: []})),
  getRequirementItemDetail: vi.fn(),
  updateRequirementItem: vi.fn(),
  updateRequirementItemProgress: vi.fn(),
  createRequirementItem: vi.fn(),
  deleteRequirementItem: vi.fn()
}))
vi.mock('@/api/dataDictionary', () => ({listDataDictionaryOptionsByUsage: vi.fn()}))
vi.mock('vue-router', () => ({useRouter: () => ({push: vi.fn()})}))
vi.mock('@/api/fuelStats', () => ({
  createFuelVehicle: vi.fn(), updateFuelVehicle: vi.fn(), deleteFuelVehicle: vi.fn(),
  createFuelRecord: vi.fn(), updateFuelRecord: vi.fn(), deleteFuelRecord: vi.fn(),
  listFuelVehicles: vi.fn(async () => ({data: []})),
  listFuelRecords: vi.fn(async () => ({data: {list: [], total: 0}})),
  getFuelReports: vi.fn(async () => ({data: {}})),
  getFuelSummary: vi.fn(async () => ({data: {}})),
  getLatestFuelPrices: vi.fn(async () => ({data: {}}))
}))

vi.mock('../systemDialog', () => ({confirmDialog: vi.fn()}))

const wrappers = []
const requirement = {
  id: '100', creatorUserId: '1', title: '测试需求', description: '原始说明',
  type: 'REQUIREMENT', priority: 'MEDIUM', appCode: '', status: 'PENDING_REVIEW',
  version: 1, attachments: [], progressLogs: []
}

function mountComponent(component, props) {
  const wrapper = mount(component, {attachTo: document.body, props})
  wrappers.push(wrapper)
  return wrapper
}

async function openRequirement() {
  const wrapper = mountComponent(RequirementBoard, {currentUser: {id: '1'}})
  await flushPromises()
  await wrapper.vm.openDetailDialog(requirement)
  await flushPromises()
  return wrapper
}

async function closeDetail(wrapper) {
  wrapper.findAllComponents(MacDialog)[1].vm.requestClose()
  await nextTick()
}

beforeEach(() => {
  vi.clearAllMocks()
  getRequirementItemDetail.mockResolvedValue({data: {...requirement}})
})

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  document.body.innerHTML = ''
})

describe('业务弹窗未保存保护', () => {
  it('closes an asynchronously loaded requirement without asking', async () => {
    let finishLoading
    getRequirementItemDetail.mockReturnValue(new Promise((resolve) => { finishLoading = resolve }))
    const wrapper = mountComponent(RequirementBoard, {currentUser: {id: '1'}})
    await flushPromises()
    const opening = wrapper.vm.openDetailDialog(requirement)
    await nextTick()
    expect(document.body.textContent).toContain('正在读取反馈详情')
    finishLoading({data: {...requirement}})
    await opening
    await flushPromises()
    await closeDetail(wrapper)
    expect(wrapper.vm.showDetailDialog).toBe(false)
    expect(document.querySelector('.mac-dialog-confirm-card')).toBeNull()
  })

  it('does not treat entering edit mode as a change', async () => {
    const wrapper = await openRequirement()
    wrapper.vm.startContentEdit()
    await nextTick()
    await closeDetail(wrapper)
    expect(wrapper.vm.showDetailDialog).toBe(false)
  })

  it('protects progress drafts and allows restoring the original values', async () => {
    const wrapper = await openRequirement()
    wrapper.vm.progressForm.status = 'PLANNED'
    await nextTick()
    await closeDetail(wrapper)
    expect(document.querySelector('.mac-dialog-confirm-card')).not.toBeNull()
    document.querySelector('.mac-dialog-confirm-keep').click()
    wrapper.vm.progressForm.status = requirement.status
    await nextTick()
    await closeDetail(wrapper)
    expect(wrapper.vm.showDetailDialog).toBe(false)
  })

  it('closes after saving progress and still protects subsequent remarks', async () => {
    updateRequirementItemProgress.mockResolvedValue({data: {...requirement, status: 'PLANNED', version: 2}})
    const wrapper = await openRequirement()
    wrapper.vm.progressForm.status = 'PLANNED'
    await wrapper.vm.submitProgressUpdate()
    await nextTick()
    expect(wrapper.vm.detailDirty).toBe(false)
    wrapper.vm.progressForm.remark = '下一步安排'
    await nextTick()
    await closeDetail(wrapper)
    expect(document.querySelector('.mac-dialog-confirm-card')).not.toBeNull()
    document.querySelector('.mac-dialog-confirm-keep').click()
    wrapper.vm.progressForm.remark = ''
    await nextTick()
    await closeDetail(wrapper)
    expect(wrapper.vm.showDetailDialog).toBe(false)
  })

  it('preserves dirty state after a failed save', async () => {
    updateRequirementItem.mockRejectedValue(new Error('保存失败'))
    const wrapper = await openRequirement()
    wrapper.vm.startContentEdit()
    wrapper.vm.requirementForm.title = '修改后的需求'
    await wrapper.vm.submitContentUpdate()
    await nextTick()
    await closeDetail(wrapper)
    expect(document.querySelector('.mac-dialog-confirm-card')).not.toBeNull()
    expect(wrapper.vm.showDetailDialog).toBe(true)
  })

  it('resets content dirty state after saving without losing a separate progress draft', async () => {
    updateRequirementItem.mockResolvedValue({data: {...requirement, title: '已保存', version: 2}})
    const wrapper = await openRequirement()
    wrapper.vm.progressForm.remark = '待更新的进度说明'
    wrapper.vm.startContentEdit()
    wrapper.vm.requirementForm.title = '已保存'
    await wrapper.vm.submitContentUpdate()
    await nextTick()
    expect(wrapper.vm.progressForm.remark).toBe('待更新的进度说明')
    expect(wrapper.vm.detailDirty).toBe(true)
    wrapper.vm.progressForm.remark = ''
    await nextTick()
    await closeDetail(wrapper)
    expect(wrapper.vm.showDetailDialog).toBe(false)
  })

  it('keeps edited content when cancel is declined and discards only after confirmation', async () => {
    const wrapper = await openRequirement()
    wrapper.vm.startContentEdit()
    wrapper.vm.requirementForm.title = '未保存标题'
    confirmDialog.mockResolvedValueOnce(false)
    await wrapper.vm.cancelContentEdit()
    expect(wrapper.vm.detailEditing).toBe(true)
    expect(wrapper.vm.requirementForm.title).toBe('未保存标题')
    confirmDialog.mockResolvedValueOnce(true)
    await wrapper.vm.cancelContentEdit()
    await nextTick()
    expect(wrapper.vm.detailEditing).toBe(false)
    expect(wrapper.vm.detailDirty).toBe(false)
  })

  it('protects attachment-only changes in the requirement editor', async () => {
    const wrapper = await openRequirement()
    wrapper.vm.startContentEdit()
    wrapper.vm.formAttachments = [{id: 'attachment-1'}]
    await nextTick()
    await closeDetail(wrapper)
    expect(document.querySelector('.mac-dialog-confirm-card')).not.toBeNull()
  })

  it('refreshes vehicle baselines when selecting an existing vehicle and saving', async () => {
    updateFuelVehicle.mockResolvedValue({data: {}})
    const wrapper = mountComponent(FuelStats)
    await flushPromises()
    await wrapper.vm.openVehicleDialog()
    await nextTick()
    wrapper.vm.openVehicleEdit({id: 'car-1', vehicleName: '测试车辆', energyType: 'FUEL', defaultFuelType: '95', defaultVehicle: true})
    await nextTick()
    await nextTick()
    const dialog = wrapper.findAllComponents(MacDialog)[2]
    expect(dialog.vm.shouldConfirmClose()).toBe(false)
    wrapper.vm.vehicleForm.vehicleName = '修改名称'
    await nextTick()
    expect(dialog.vm.shouldConfirmClose()).toBe(true)
    await wrapper.vm.submitVehicle()
    expect(updateFuelVehicle).toHaveBeenCalledWith('car-1', expect.objectContaining({vehicleName: '修改名称'}))
    await nextTick()
    expect(dialog.vm.shouldConfirmClose()).toBe(false)
    dialog.vm.requestClose()
    await nextTick()
    expect(wrapper.vm.showVehicleDialog).toBe(false)
  })

  it('does not mark partially loaded quick-create defaults as unsaved edits', async () => {
    let finishOptions
    listDataDictionaryOptionsByUsage.mockImplementation((usage) => usage === 'FAILED'
      ? Promise.reject(new Error('选项加载失败'))
      : new Promise((resolve) => { finishOptions = resolve }))
    const wrapper = mountComponent(QuickCreateDialog, {
      modelValue: true,
      types: [{
        typeCode: 'TEST', appName: '测试', label: '测试', defaults: () => ({first: '', second: ''}),
        fields: [
          {key: 'first', label: '第一项', type: 'dictionary-select', dictionaryUsage: 'FAILED'},
          {key: 'second', label: '第二项', type: 'dictionary-select', dictionaryUsage: 'SUCCESS'}
        ]
      }]
    })
    await nextTick()
    const picker = document.querySelector('.type-picker select')
    picker.value = 'TEST'
    picker.dispatchEvent(new Event('change', {bubbles: true}))
    await flushPromises()
    expect(picker.disabled).toBe(true)
    finishOptions({data: [{itemValue: 'default', itemLabel: '默认项', isDefault: true}]})
    await flushPromises()
    expect(picker.disabled).toBe(false)
    wrapper.getComponent(MacDialog).vm.requestClose()
    await nextTick()
    expect(document.querySelector('.mac-dialog-confirm-card')).toBeNull()
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('asks only once when discarding a quick-create draft', async () => {
    const wrapper = mountComponent(QuickCreateDialog, {
      modelValue: true,
      types: [{typeCode: 'TEST', appName: '测试', label: '测试', defaults: () => ({title: ''}), fields: [{key: 'title', label: '标题', type: 'text'}]}]
    })
    await flushPromises()
    const picker = document.querySelector('.type-picker select')
    picker.value = 'TEST'
    picker.dispatchEvent(new Event('change', {bubbles: true}))
    await flushPromises()
    const input = document.querySelector('#quick-create-form input')
    input.value = '新草稿'
    input.dispatchEvent(new Event('input', {bubbles: true}))
    await nextTick()
    wrapper.getComponent(MacDialog).vm.requestClose()
    await nextTick()
    expect(document.querySelectorAll('.mac-dialog-confirm-card')).toHaveLength(1)
    document.querySelector('.mac-dialog-confirm-discard').click()
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    expect(confirmDialog).not.toHaveBeenCalled()
    await wrapper.setProps({modelValue: false})
    await wrapper.setProps({modelValue: true})
    await nextTick()
    expect(document.querySelector('.type-picker select').value).toBe('')
    wrapper.getComponent(MacDialog).vm.requestClose()
    await nextTick()
    expect(document.querySelector('.mac-dialog-confirm-card')).toBeNull()
  })
})
