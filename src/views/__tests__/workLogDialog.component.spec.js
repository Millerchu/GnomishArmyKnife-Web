// @vitest-environment happy-dom

import {flushPromises, mount} from '@vue/test-utils'
import {nextTick} from 'vue'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import WorkLog from '../WorkLog.vue'
import {listDataDictionaryOptionsByUsage} from '@/api/dataDictionary'
import {createWorkLog, getWeeklyBrief, listWorkLogs} from '@/api/workLog'

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

function buildApiResponse(payload) {
  return {
    data: {
      code: 200,
      message: 'success',
      data: payload
    }
  }
}

async function mountWorkLogAndOpenCreateDialog() {
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

  const createButton = wrapper.findAll('button')
    .find((buttonWrapper) => buttonWrapper.text() === '新增')
  expect(createButton).toBeDefined()
  await createButton.trigger('click')
  await nextTick()
  await nextTick()

  return wrapper
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createMemoryStorage())
  localStorage.setItem('user', JSON.stringify({
    id: '1001',
    username: 'component-test-user'
  }))
  vi.clearAllMocks()
  listDataDictionaryOptionsByUsage.mockImplementation(({bizFieldCode}) => {
    return Promise.resolve(buildApiResponse(dictionaryOptionsByField[bizFieldCode] || []))
  })
  createWorkLog.mockImplementation((payload) => Promise.resolve(buildApiResponse({
    id: 501,
    overtimeHours: 0,
    businessTripAllowanceAmount: 0,
    ...payload
  })))
  getWeeklyBrief.mockResolvedValue(buildApiResponse([]))
  listWorkLogs.mockResolvedValue(buildApiResponse([]))
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

    const panel = document.body.querySelector('.mac-dialog-panel.work-log-dialog')
    const form = panel.querySelector('form#work-log-dialog-form')
    const logDateInput = form.querySelector('input[type="date"]')
    const personDayInput = form.querySelector('input[type="number"][step="0.1"]')
    const workItemTextarea = form.querySelector('textarea[placeholder^="填写当天的工作内容"]')
    const submitButton = panel.querySelector('.mac-dialog-actions button[type="submit"]')

    logDateInput.value = '2026-07-10'
    logDateInput.dispatchEvent(new Event('input', {bubbles: true}))
    personDayInput.value = '0'
    personDayInput.dispatchEvent(new Event('input', {bubbles: true}))
    workItemTextarea.value = '完成 MacDialog 提交集成验证'
    workItemTextarea.dispatchEvent(new Event('input', {bubbles: true}))
    await nextTick()

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

  it('disables close entries while submitting but keeps maximize available', async () => {
    const wrapper = await mountWorkLogAndOpenCreateDialog()

    wrapper.vm.submitting = true
    await nextTick()

    const panel = document.body.querySelector('.mac-dialog-panel.work-log-dialog')
    expect(panel).not.toBeNull()
    expect(panel.querySelector('.mac-window-dot.close').disabled).toBe(true)
    expect(panel.querySelector('.mac-window-dot.minimize').disabled).toBe(true)
    expect(panel.querySelector('.mac-window-dot.zoom').disabled).toBe(false)
    expect(panel.querySelector('.mac-dialog-close').disabled).toBe(true)
    expect(panel.querySelector('.mac-dialog-actions .ghost-btn').disabled).toBe(true)
  })
})
