// @vitest-environment happy-dom

import {flushPromises, mount} from '@vue/test-utils'
import {nextTick} from 'vue'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import HealthRecord from '../HealthRecord.vue'
import {
  createHealthRecord,
  createHealthReport,
  createHealthVisit,
  getHealthVisit,
  updateHealthVisit,
  getHealthSummary,
  getHealthTrends,
  listHealthRecords,
  listHealthReports,
  listHealthVisits
} from '@/api/healthRecord'

const mountedWrappers = []
const route = vi.hoisted(() => ({query: {}}))

vi.mock('vue-router', () => ({
  useRouter: () => ({push: vi.fn()}),
  useRoute: () => route
}))

vi.mock('@/api/healthRecord', () => ({
  createHealthRecord: vi.fn(),
  createHealthReport: vi.fn(),
  createHealthVisit: vi.fn(),
  getHealthVisit: vi.fn(),
  deleteHealthRecord: vi.fn(),
  deleteHealthReport: vi.fn(),
  deleteHealthVisit: vi.fn(),
  getHealthSummary: vi.fn(),
  getHealthTrends: vi.fn(),
  listHealthRecords: vi.fn(),
  listHealthReports: vi.fn(),
  listHealthVisits: vi.fn(),
  updateHealthRecord: vi.fn(),
  updateHealthReport: vi.fn(),
  updateHealthVisit: vi.fn(),
  uploadHealthReportFile: vi.fn()
}))

function buildApiResponse(payload) {
  return {data: {code: 200, message: 'success', data: payload}}
}

function createDeferred() {
  let resolvePromise
  const promise = new Promise((resolve) => {
    resolvePromise = resolve
  })
  return {promise, resolve: resolvePromise}
}

function mountPage() {
  const wrapper = mount(HealthRecord, {
    attachTo: document.body,
    global: {stubs: {transition: true}}
  })
  mountedWrappers.push(wrapper)
  return wrapper
}

beforeEach(() => {
  vi.resetAllMocks()
  route.query = {}
  vi.stubGlobal('alert', vi.fn())
  getHealthSummary.mockResolvedValue(buildApiResponse({}))
  getHealthTrends.mockResolvedValue(buildApiResponse({points: []}))
  listHealthRecords.mockResolvedValue(buildApiResponse({list: []}))
  listHealthReports.mockResolvedValue(buildApiResponse({list: []}))
  listHealthVisits.mockResolvedValue(buildApiResponse({list: []}))
  createHealthRecord.mockResolvedValue(buildApiResponse({id: 1}))
  createHealthVisit.mockResolvedValue(buildApiResponse({id: 2}))
  updateHealthVisit.mockResolvedValue(buildApiResponse({id: 2}))
  createHealthReport.mockResolvedValue(buildApiResponse({id: 3}))
})

afterEach(() => {
  while (mountedWrappers.length > 0) {
    mountedWrappers.pop().unmount()
  }
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

const successfulSubmitCases = [
  {
    name: '健康指标',
    openMethod: 'openCreateRecordDialog',
    submitMethod: 'submitRecordDialog',
    panelClass: 'health-record-dialog',
    formKey: 'recordForm',
    initialValues: {measureDate: '2026-07-12', note: '晨起'},
    resetFields: {measureDate: '', note: ''}
  },
  {
    name: '医院就诊',
    openMethod: 'openCreateVisitDialog',
    submitMethod: 'submitVisitDialog',
    panelClass: 'health-visit-dialog',
    formKey: 'visitForm',
    initialValues: {visitDate: '2026-07-12', hospitalName: '市医院'},
    resetFields: {visitDate: '', hospitalName: ''}
  },
  {
    name: '健康报告',
    openMethod: 'openCreateReportDialog',
    submitMethod: 'submitReportDialog',
    panelClass: 'health-report-dialog',
    formKey: 'reportForm',
    initialValues: {examDate: '2026-07-12', reportTitle: '年度体检'},
    resetFields: {examDate: '', reportTitle: ''}
  }
]

describe('就诊金额记录', () => {
  it('提交自付金额并在成功后清空表单', async () => {
    const wrapper = mountPage()
    await flushPromises()
    wrapper.vm.openCreateVisitDialog()
    Object.assign(wrapper.vm.visitForm, {visitDate: '2026-10-04', hospitalName: '测试医院', chiefComplaint: '复查', amount: '128.50'})
    await wrapper.vm.submitVisitDialog()
    expect(createHealthVisit).toHaveBeenCalledWith(expect.objectContaining({amount: 128.5}))
    expect(wrapper.vm.visitForm.amount).toBe('')
  })

  it('回填历史金额并把清空提交为 null', async () => {
    const wrapper = mountPage()
    await flushPromises()
    wrapper.vm.openEditVisitDialog({id: '900000000000000111', visitDate: '2026-10-04', hospitalName: '测试医院', amount: 128.5})
    expect(wrapper.vm.visitForm.amount).toBe(128.5)
    wrapper.vm.visitForm.amount = ''
    await wrapper.vm.submitVisitDialog()
    expect(updateHealthVisit).toHaveBeenCalledWith('900000000000000111', expect.objectContaining({amount: null}))
  })

  it.each(['-1', '1.001', '10000000000', 'NaN'])('拒绝非法金额 %s', async (amount) => {
    const wrapper = mountPage()
    await flushPromises()
    wrapper.vm.visitForm.amount = amount
    await wrapper.vm.submitVisitDialog()
    expect(createHealthVisit).not.toHaveBeenCalled()
    expect(updateHealthVisit).not.toHaveBeenCalled()
    expect(alert).toHaveBeenCalledWith(expect.stringContaining('最多两位小数'))
  })

  it('列表区分未填金额与零金额', async () => {
    listHealthVisits.mockResolvedValue(buildApiResponse({list: [
      {id: '1', hospitalName: '甲医院', amount: null},
      {id: '2', hospitalName: '乙医院', amount: 0},
      {id: '3', hospitalName: '丙医院', amount: 128.5}
    ]}))
    const wrapper = mountPage()
    await flushPromises()
    const rows = wrapper.findAll('.visit-amount')
    expect(rows.map(row => row.text())).toEqual(['实际自付：未记录金额', '实际自付：¥0.00', '实际自付：¥128.50'])
  })

  it('从来源账单打开分页之外的就诊，保留长 ID', async () => {
    route.query = {recordId: '900000000000000111'}
    getHealthVisit.mockResolvedValue(buildApiResponse({id: route.query.recordId, hospitalName: '历史医院', amount: 128.5}))
    const wrapper = mountPage()
    await flushPromises()
    expect(getHealthVisit).toHaveBeenCalledWith('900000000000000111')
    expect(wrapper.vm.showVisitDialog).toBe(true)
    expect(wrapper.vm.visitForm.hospitalName).toBe('历史医院')
    expect(wrapper.vm.visitForm.amount).toBe(128.5)
  })
})

describe('HealthRecord MacDialog integration', () => {
  it.each(successfulSubmitCases)('$name 保存成功后关闭弹窗并重置表单', async ({
    openMethod,
    submitMethod,
    panelClass,
    formKey,
    initialValues,
    resetFields
  }) => {
    const wrapper = mountPage()
    await flushPromises()

    wrapper.vm[openMethod]()
    Object.assign(wrapper.vm[formKey], initialValues)
    await nextTick()

    expect(document.body.querySelector(`.mac-dialog-panel.${panelClass}`)).not.toBeNull()
    await wrapper.vm[submitMethod]()
    await flushPromises()
    await nextTick()

    expect(document.body.querySelector(`.mac-dialog-panel.${panelClass}`)).toBeNull()
    expect(wrapper.vm[formKey]).toMatchObject(resetFields)
  })

  it('健康指标提交未完成时阻止用户手动关闭', async () => {
    const deferred = createDeferred()
    createHealthRecord.mockReturnValue(deferred.promise)
    const wrapper = mountPage()
    await flushPromises()

    wrapper.vm.openCreateRecordDialog()
    wrapper.vm.recordForm.measureDate = '2026-07-12'
    await nextTick()
    const submitPromise = wrapper.vm.submitRecordDialog()
    await nextTick()

    const panel = document.body.querySelector('.mac-dialog-panel.health-record-dialog')
    expect(panel.querySelector('.mac-window-dot.close').disabled).toBe(true)
    panel.querySelector('.mac-window-dot.close').click()
    expect(document.body.querySelector('.mac-dialog-panel.health-record-dialog')).not.toBeNull()

    deferred.resolve(buildApiResponse({id: 1}))
    await submitPromise
  })
})
