// @vitest-environment happy-dom

import {flushPromises, mount} from '@vue/test-utils'
import {nextTick} from 'vue'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import WorkLog from '../WorkLog.vue'
import {listDataDictionaryOptionsByUsage} from '@/api/dataDictionary'
import {
  createWorkLog,
  getWeeklyBrief,
  getWorkLogDetail,
  listWorkLogs,
  updateWorkLog
} from '@/api/workLog'

const routerPush = vi.fn()
const mountedWrappers = []

function createMemoryStorage() {
  const storedValues = new Map()
  return {
    get length() {
      return storedValues.size
    },
    clear() {
      storedValues.clear()
    },
    getItem(key) {
      return storedValues.has(key) ? storedValues.get(key) : null
    },
    key(index) {
      return [...storedValues.keys()][index] ?? null
    },
    removeItem(key) {
      storedValues.delete(key)
    },
    setItem(key, value) {
      storedValues.set(key, String(value))
    }
  }
}

vi.mock('vue-router', () => ({
  useRouter: () => ({push: routerPush})
}))

vi.mock('@/api/dataDictionary', () => ({
  listDataDictionaryOptionsByUsage: vi.fn()
}))

vi.mock('@/api/workLog', () => ({
  createWorkLog: vi.fn(),
  deleteWorkLog: vi.fn(),
  getWorkLogDetail: vi.fn(),
  getWeeklyBrief: vi.fn(),
  listWorkLogs: vi.fn(),
  updateWorkLog: vi.fn()
}))

const dictionaryOptionsByField = {
  typeCodes: [
    {
      itemCode: 'normal',
      itemLabel: '正常工作',
      itemValue: 'NORMAL',
      isDefault: true,
      sortNo: 1
    }
  ],
  location: [
    {
      itemCode: 'office',
      itemLabel: '办公室',
      itemValue: 'OFFICE',
      isDefault: true,
      sortNo: 1
    }
  ],
  projectCode: [
    {
      itemCode: 'project_alpha',
      itemLabel: '项目 Alpha',
      itemValue: 'PROJECT_ALPHA',
      isDefault: true,
      sortNo: 1
    }
  ]
}

const editLogDetail = {
  id: 88,
  userId: '1001',
  logDate: '2026-07-10',
  typeCodes: ['NORMAL'],
  location: 'OFFICE',
  projectCode: 'PROJECT_ALPHA',
  workItem: '编辑前的工作内容',
  zentaoNo: 'ZEN-88',
  personDay: 0,
  overtimeHours: 1.5,
  offWorkTime: '19:30:00',
  businessTripAllowanceScene: null,
  businessTripAllowanceAmount: 0,
  businessTripReimbursed: false,
  remark: '编辑前的备注'
}

function buildApiResponse(payload) {
  return {
    data: {
      code: 200,
      message: 'success',
      data: payload
    }
  }
}

function createDeferred() {
  let resolvePromise
  let rejectPromise
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })
  return {
    promise,
    resolve: resolvePromise,
    reject: rejectPromise
  }
}

function getDialogPanel() {
  return document.body.querySelector('.mac-dialog-panel.work-log-dialog')
}

function dispatchEscape() {
  document.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    cancelable: true
  }))
}

function expectDialogSubmissionLock(panel, locked) {
  expect(panel.querySelector('.mac-window-dot.close').disabled).toBe(locked)
  expect(panel.querySelector('.mac-window-dot.minimize').disabled).toBe(locked)
  expect(panel.querySelector('.mac-window-dot.zoom').disabled).toBe(false)
  expect(panel.querySelector('.mac-dialog-close').disabled).toBe(locked)
  expect(panel.querySelector('.mac-dialog-actions .ghost-btn').disabled).toBe(locked)
  expect(panel.querySelector('.mac-dialog-actions button[type="submit"]').disabled).toBe(locked)
}

async function mountWorkLog() {
  const wrapper = mount(WorkLog, {
    attachTo: document.body,
    global: {
      stubs: {
        transition: true
      }
    }
  })
  mountedWrappers.push(wrapper)
  await flushPromises()

  return wrapper
}

async function mountWorkLogAndOpenCreateDialog() {
  const wrapper = await mountWorkLog()

  const createButton = wrapper.findAll('button')
    .find((buttonWrapper) => buttonWrapper.text() === '新增')
  expect(createButton).toBeDefined()
  await createButton.trigger('click')
  await nextTick()
  await nextTick()

  return wrapper
}

async function fillValidCreateForm(panel, workItem = '完成 MacDialog 提交集成验证') {
  const form = panel.querySelector('form#work-log-dialog-form')
  const logDateInput = form.querySelector('input[type="date"]')
  const personDayInput = form.querySelector('input[type="number"][step="0.1"]')
  const workItemTextarea = form.querySelector('textarea[placeholder^="填写当天的工作内容"]')
  const submitButton = panel.querySelector('.mac-dialog-actions button[type="submit"]')

  logDateInput.value = '2026-07-10'
  logDateInput.dispatchEvent(new Event('input', {bubbles: true}))
  personDayInput.value = '0'
  personDayInput.dispatchEvent(new Event('input', {bubbles: true}))
  workItemTextarea.value = workItem
  workItemTextarea.dispatchEvent(new Event('input', {bubbles: true}))
  await nextTick()

  return {
    form,
    submitButton,
    workItemTextarea
  }
}

async function openEditDialog(wrapper) {
  await wrapper.vm.openEditDialog({
    id: editLogDetail.id,
    logDate: editLogDetail.logDate
  })
  await nextTick()
  await nextTick()
  return getDialogPanel()
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createMemoryStorage())
  localStorage.setItem('user', JSON.stringify({
    id: '1001',
    username: 'component-test-user'
  }))
  vi.resetAllMocks()
  listDataDictionaryOptionsByUsage.mockImplementation(({bizFieldCode}) => {
    return Promise.resolve(buildApiResponse(dictionaryOptionsByField[bizFieldCode] || []))
  })
  createWorkLog.mockImplementation((payload) => Promise.resolve(buildApiResponse({
    id: 501,
    overtimeHours: 0,
    businessTripAllowanceAmount: 0,
    ...payload
  })))
  getWorkLogDetail.mockResolvedValue(buildApiResponse(editLogDetail))
  getWeeklyBrief.mockResolvedValue(buildApiResponse([]))
  listWorkLogs.mockResolvedValue(buildApiResponse([]))
  updateWorkLog.mockImplementation((id, payload) => Promise.resolve(buildApiResponse({
    ...editLogDetail,
    ...payload,
    id
  })))
})

afterEach(() => {
  while (mountedWrappers.length > 0) {
    mountedWrappers.pop().unmount()
  }
  document.body.innerHTML = ''
  localStorage.clear()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('WorkLog MacDialog integration', () => {
  it('renders the create form and footer submit button in the teleported MacDialog', async () => {
    await mountWorkLogAndOpenCreateDialog()

    const panel = document.body.querySelector('.mac-dialog-panel.work-log-dialog')
    expect(panel).not.toBeNull()
    expect(panel.querySelector('.mac-dialog-title').textContent).toBe('新增工作日志')

    const form = panel.querySelector('form#work-log-dialog-form')
    const submitButton = panel.querySelector('.mac-dialog-actions button[type="submit"]')
    expect(form).not.toBeNull()
    expect(submitButton).not.toBeNull()
    expect(submitButton.getAttribute('form')).toBe('work-log-dialog-form')
    expect(form.contains(submitButton)).toBe(false)

    const fieldLabels = [...form.querySelectorAll('.form-field > span')]
      .map((label) => label.textContent.trim())
    expect(fieldLabels).toEqual(expect.arrayContaining([
      '日期',
      '人天',
      '日志类型',
      '地点',
      '所属项目',
      '工作内容',
      '备注'
    ]))
  })

  it('closes the teleported dialog from the footer cancel button', async () => {
    const wrapper = await mountWorkLogAndOpenCreateDialog()

    const cancelButton = document.body.querySelector(
      '.mac-dialog-panel.work-log-dialog .mac-dialog-actions .ghost-btn'
    )
    expect(cancelButton).not.toBeNull()

    cancelButton.click()
    await nextTick()
    await nextTick()

    expect(wrapper.vm.showDialog).toBe(false)
    expect(document.body.querySelector('.mac-dialog-panel.work-log-dialog')).toBeNull()
  })

  it('submits a valid create form from the teleported footer button', async () => {
    await mountWorkLogAndOpenCreateDialog()

    const panel = getDialogPanel()
    const {form, submitButton} = await fillValidCreateForm(panel)

    expect(submitButton.form).toBe(form)
    expect(form.checkValidity()).toBe(true)
    submitButton.click()
    await flushPromises()

    expect(createWorkLog).toHaveBeenCalledTimes(1)
    expect(createWorkLog).toHaveBeenCalledWith(expect.objectContaining({
      userId: '1001',
      logDate: '2026-07-10',
      typeCodes: ['NORMAL'],
      location: 'OFFICE',
      projectCode: 'PROJECT_ALPHA',
      workItem: '完成 MacDialog 提交集成验证',
      personDay: 0
    }))
  })

  it('loads and submits edited fields from the teleported footer button', async () => {
    const wrapper = await mountWorkLog()
    const panel = await openEditDialog(wrapper)
    const form = panel.querySelector('form#work-log-dialog-form')
    const [locationSelect, projectSelect] = form.querySelectorAll('select')
    const submitButton = panel.querySelector('.mac-dialog-actions button[type="submit"]')

    expect(getWorkLogDetail).toHaveBeenCalledWith(editLogDetail.id)
    expect(panel.querySelector('.mac-dialog-title').textContent).toBe('修改工作日志')
    expect(form.querySelector('input[type="date"]').value).toBe(editLogDetail.logDate)
    expect(form.querySelector('input[type="number"][step="0.1"]').value).toBe('0')
    expect(panel.querySelector('.multi-select-trigger').textContent).toContain('正常工作')
    expect(locationSelect.value).toBe(editLogDetail.location)
    expect(projectSelect.value).toBe(editLogDetail.projectCode)
    expect(form.querySelector('textarea[rows="4"]').value).toBe(editLogDetail.workItem)
    expect(form.querySelector('textarea[rows="2"]').value).toBe(editLogDetail.remark)
    expect(submitButton.form).toBe(form)
    expect(form.checkValidity()).toBe(true)

    submitButton.click()
    await flushPromises()

    expect(updateWorkLog).toHaveBeenCalledTimes(1)
    expect(updateWorkLog).toHaveBeenCalledWith(editLogDetail.id, expect.objectContaining({
      logDate: editLogDetail.logDate,
      typeCodes: editLogDetail.typeCodes,
      location: editLogDetail.location,
      projectCode: editLogDetail.projectCode,
      workItem: editLogDetail.workItem,
      zentaoNo: editLogDetail.zentaoNo,
      personDay: editLogDetail.personDay,
      offWorkTime: editLogDetail.offWorkTime,
      remark: editLogDetail.remark
    }))
    expect(wrapper.vm.showDialog).toBe(false)
    expect(getDialogPanel()).toBeNull()
  })

  it('closes the edit dialog from the footer cancel button', async () => {
    const wrapper = await mountWorkLog()
    const panel = await openEditDialog(wrapper)

    panel.querySelector('.mac-dialog-actions .ghost-btn').click()
    await nextTick()
    await nextTick()

    expect(wrapper.vm.showDialog).toBe(false)
    expect(getDialogPanel()).toBeNull()
    expect(updateWorkLog).not.toHaveBeenCalled()
  })

  it('locks every close entry during a pending create and closes after success', async () => {
    const createRequest = createDeferred()
    createWorkLog.mockReturnValueOnce(createRequest.promise)
    const wrapper = await mountWorkLogAndOpenCreateDialog()
    const panel = getDialogPanel()
    const mask = panel.closest('.mac-dialog-mask')
    const {form, submitButton} = await fillValidCreateForm(panel, '等待提交成功的工作内容')

    expect(form.checkValidity()).toBe(true)
    submitButton.click()
    await nextTick()

    expect(createWorkLog).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.submitting).toBe(true)
    expectDialogSubmissionLock(panel, true)

    panel.querySelector('.mac-window-dot.zoom').click()
    await nextTick()
    expect(panel.classList.contains('maximized')).toBe(true)

    mask.click()
    dispatchEscape()
    await nextTick()

    expect(wrapper.vm.showDialog).toBe(true)
    expect(getDialogPanel()).toBe(panel)

    createRequest.resolve(buildApiResponse({
      id: 502,
      overtimeHours: 0,
      businessTripAllowanceAmount: 0,
      ...createWorkLog.mock.calls[0][0]
    }))
    await flushPromises()

    expect(wrapper.vm.submitting).toBe(false)
    expect(wrapper.vm.showDialog).toBe(false)
    expect(getDialogPanel()).toBeNull()
  })

  it('unlocks and preserves the create form after a rejected request', async () => {
    const createRequest = createDeferred()
    const requestError = new Error('create request failed')
    const alertSpy = vi.fn()
    vi.stubGlobal('alert', alertSpy)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    createWorkLog.mockReturnValueOnce(createRequest.promise)
    const wrapper = await mountWorkLogAndOpenCreateDialog()
    const panel = getDialogPanel()
    const {form, submitButton, workItemTextarea} = await fillValidCreateForm(
      panel,
      '提交失败后保留的工作内容'
    )

    expect(form.checkValidity()).toBe(true)
    submitButton.click()
    await nextTick()

    expect(createWorkLog).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.submitting).toBe(true)
    expectDialogSubmissionLock(panel, true)

    createRequest.reject(requestError)
    await flushPromises()

    expect(alertSpy).toHaveBeenCalledWith('新增日志失败')
    expect(wrapper.vm.submitting).toBe(false)
    expect(wrapper.vm.showDialog).toBe(true)
    expect(getDialogPanel()).toBe(panel)
    expectDialogSubmissionLock(panel, false)
    expect(workItemTextarea.value).toBe('提交失败后保留的工作内容')
  })
})
