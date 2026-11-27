// @vitest-environment happy-dom

import {flushPromises, mount} from '@vue/test-utils'
import {nextTick} from 'vue'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import HealthReportDetailsDialog from '../HealthReportDetailsDialog.vue'
import {
  getHealthRecord,
  getHealthReportDetails,
  listHealthRecords,
  saveHealthReportDetails
} from '@/api/healthRecord'

const mountedWrappers = []

vi.mock('@/api/healthRecord', () => ({
  getHealthRecord: vi.fn(),
  getHealthReportDetails: vi.fn(),
  listHealthRecords: vi.fn(),
  saveHealthReportDetails: vi.fn()
}))

function buildApiResponse(payload) {
  return {data: {code: '0', message: 'success', data: payload}}
}

function mountDialog(props = {modelValue: true, reportId: '900000000000000301'}) {
  const wrapper = mount(HealthReportDetailsDialog, {
    props,
    attachTo: document.body,
    global: {stubs: {transition: true, AttachmentGallery: true}}
  })
  mountedWrappers.push(wrapper)
  return wrapper
}

beforeEach(() => {
  vi.resetAllMocks()
  getHealthReportDetails.mockResolvedValue(buildApiResponse({
    report: {
      id: '900000000000000301',
      examDate: '2026-05-10',
      hospitalName: '合成体检中心',
      reportTitle: '2026年度体检',
      attachments: []
    },
    revision: 1,
    linkedRecordId: null,
    items: [
      {
        group: 'URINALYSIS',
        itemCode: 'urineSpecificGravity',
        name: '尿比重',
        resultType: 'NUMBER',
        resultText: '1.012',
        numericValue: '1.012',
        unit: null,
        referenceText: '1.015–1.025',
        abnormalFlag: 'LOW',
        sourcePage: 3
      },
      {
        group: 'IMAGING',
        itemCode: 'renalCyst',
        name: '右肾囊肿',
        resultType: 'TEXT',
        resultText: '<0.05',
        numericValue: null,
        unit: null,
        referenceText: null,
        abnormalFlag: 'UNSPECIFIED',
        sourcePage: null
      }
    ]
  }))
  listHealthRecords.mockResolvedValue(buildApiResponse({
    list: [
      {id: '900000000000000101', measureDate: '2026-05-10', weightKg: 78.0, bmi: 25.18, note: '体检当天'}
    ],
    total: 1
  }))
  getHealthRecord.mockResolvedValue(buildApiResponse({
    id: '900000000000000101',
    measureDate: '2026-05-10',
    weightKg: 78.0,
    bmi: 25.18,
    note: '体检当天'
  }))
  saveHealthReportDetails.mockResolvedValue(buildApiResponse({
    report: {
      id: '900000000000000301',
      examDate: '2026-05-10',
      hospitalName: '合成体检中心',
      reportTitle: '2026年度体检',
      attachments: []
    },
    revision: 2,
    linkedRecordId: '900000000000000101',
    items: []
  }))
})

afterEach(() => {
  while (mountedWrappers.length > 0) {
    mountedWrappers.pop().unmount()
  }
  document.body.innerHTML = ''
})

describe('HealthReportDetailsDialog', () => {
  it('加载明细并按报告日期分页查询候选核心指标，筛选后保存仍提交完整清单', async () => {
    const wrapper = mountDialog()
    await flushPromises()
    await nextTick()

    expect(getHealthReportDetails).toHaveBeenCalledWith('900000000000000301')
    expect(listHealthRecords).toHaveBeenCalledWith({pageNo: 1, pageSize: 20, measureDate: '2026-05-10'})

    // 筛选仅显示 IMAGING（1 项可见），但保存时必须提交全部 2 项
    const groupFilter = document.body.querySelector('select[aria-label="按类别筛选"]')
    groupFilter.value = 'IMAGING'
    groupFilter.dispatchEvent(new Event('change'))
    await nextTick()
    expect(document.body.querySelectorAll('.detail-item-row')).toHaveLength(1)

    // 选择关联核心指标
    const selectBtn = Array.from(document.body.querySelectorAll('.candidate-row button'))
      .find((btn) => btn.textContent.includes('选择关联'))
    selectBtn.click()
    await nextTick()

    // 保存
    const saveBtn = document.body.querySelector('.mac-dialog-panel.health-report-details-dialog .action-btn')
    saveBtn.click()
    await flushPromises()

    expect(saveHealthReportDetails).toHaveBeenCalledWith('900000000000000301', expect.objectContaining({
      expectedRevision: 1,
      linkedRecordId: '900000000000000101',
      items: expect.arrayContaining([
        expect.objectContaining({itemCode: 'urineSpecificGravity', resultText: '1.012', sourcePage: 3}),
        expect.objectContaining({itemCode: 'renalCyst', resultText: '<0.05'})
      ])
    }))
    expect(saveHealthReportDetails.mock.calls[0][1].items).toHaveLength(2)
    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('保存遇到版本冲突时保留未保存草稿并显示重新加载按钮', async () => {
    saveHealthReportDetails.mockRejectedValueOnce({
      response: {data: {code: 'HEALTH_REPORT_DETAIL_CONFLICT', message: '报告明细已被更新，请重新加载后再保存'}}
    })
    mountDialog()
    await flushPromises()
    await nextTick()

    // 添加一项自定义明细
    const addCustomBtn = Array.from(document.body.querySelectorAll('button'))
      .find((btn) => btn.textContent.includes('新增自定义项'))
    addCustomBtn.click()
    await nextTick()

    const rows = document.body.querySelectorAll('.detail-item-row')
    const lastRow = rows[rows.length - 1]
    const inputs = lastRow.querySelectorAll('input')
    inputs[0].value = '自定义项目'
    inputs[0].dispatchEvent(new Event('input'))
    inputs[1].value = '正常'
    inputs[1].dispatchEvent(new Event('input'))
    await nextTick()

    const saveBtn = document.body.querySelector('.mac-dialog-panel.health-report-details-dialog .action-btn')
    saveBtn.click()
    await flushPromises()
    await nextTick()

    expect(document.body.textContent).toContain('报告明细已被更新')
    expect(document.body.textContent).toContain('重新加载最新明细')
    expect(document.body.querySelectorAll('.detail-item-row')).toHaveLength(3)
  })
})
