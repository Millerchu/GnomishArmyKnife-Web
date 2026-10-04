// @vitest-environment happy-dom

import {flushPromises, mount} from '@vue/test-utils'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import RequirementBoard from '../RequirementBoard.vue'
import {getAttachmentBlob, uploadAttachment} from '@/api/attachment'
import {
  createRequirementItem,
  getRequirementItemDetail,
  listRequirementApps,
  listRequirementItems,
  updateRequirementItem,
  updateRequirementItemProgress
} from '@/api/requirementBoard'

vi.mock('@/api/requirementBoard', () => ({
  listRequirementItems: vi.fn(),
  listRequirementApps: vi.fn(),
  getRequirementItemDetail: vi.fn(),
  createRequirementItem: vi.fn(),
  updateRequirementItem: vi.fn(),
  updateRequirementItemProgress: vi.fn(),
  deleteRequirementItem: vi.fn()
}))

vi.mock('@/api/attachment', () => ({
  uploadAttachment: vi.fn(),
  deleteAttachment: vi.fn(),
  getAttachmentBlob: vi.fn()
}))

function buildResponse(payload) {
  return {data: {code: 200, message: 'success', data: payload}}
}

function buildBoardPayload() {
  return {
    total: 2,
    statusCounts: [
      {status: 'PENDING_REVIEW', count: 1},
      {status: 'PLANNED', count: 1},
      {status: 'IN_PROGRESS', count: 0},
      {status: 'COMPLETED', count: 0},
      {status: 'DECLINED', count: 0}
    ],
    list: [
      {
        id: '100', creatorUserId: '1', creatorName: '小王', appCode: 'APP_TODO_LIST', appName: '待办清单',
        title: '支持导出需求', description: '按状态导出看板',
        type: 'REQUIREMENT', priority: 'HIGH', status: 'PENDING_REVIEW', version: 1,
        createdAt: '2026-07-28T09:30:00', updatedAt: '2026-07-28T09:30:00'
      },
      {
        id: '101', creatorUserId: '2', creatorName: '小李', appCode: 'APP_FUEL_STATS', appName: '油耗统计',
        title: '优化移动端布局', description: '',
        type: 'BUG', priority: 'LOW', status: 'PLANNED', version: 2,
        createdAt: '2026-07-27T09:30:00', updatedAt: '2026-07-27T09:30:00'
      }
    ]
  }
}

async function mountBoard(attachToBody = false) {
  const wrapper = mount(RequirementBoard, {
    ...(attachToBody ? {attachTo: document.body} : {}),
    props: {currentUser: {id: '1', roleCode: 'USER'}},
    global: {
      stubs: {
        MacDialog: {
          props: ['modelValue'],
          template: '<section v-if="modelValue"><slot /><slot name="footer" /></section>'
        }
      }
    }
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.resetAllMocks()
  listRequirementItems.mockResolvedValue(buildResponse(buildBoardPayload()))
  listRequirementApps.mockResolvedValue(buildResponse([
    {appCode: 'APP_USER_MANAGEMENT', appName: '用户管理'},
    {appCode: 'APP_USER_BOARD', appName: '用户看板'},
    {appCode: 'APP_TODO_LIST', appName: '待办清单'},
    {appCode: 'APP_FUEL_STATS', appName: '油耗统计'}
  ]))
  getAttachmentBlob.mockResolvedValue({data: new Blob(['image'], {type: 'image/png'})})
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('RequirementBoard', () => {
  it('plans feedback directly from the card without opening details', async () => {
    const updated = {...buildBoardPayload().list[0], status: 'PLANNED', version: 2}
    updateRequirementItemProgress.mockResolvedValue(buildResponse(updated))
    const wrapper = await mountBoard()
    await wrapper.get('.board-trigger').trigger('click')
    const payload = buildBoardPayload()
    payload.list[0] = updated
    payload.statusCounts = [{status: 'PLANNED', count: 2}]
    listRequirementItems.mockResolvedValue(buildResponse(payload))

    await wrapper.get('[data-quick-status="PLANNED"]').trigger('click')
    await flushPromises()

    expect(updateRequirementItemProgress).toHaveBeenCalledWith('100', {status: 'PLANNED', remark: null, version: 1})
    expect(getRequirementItemDetail).not.toHaveBeenCalled()
    expect(wrapper.find('.board-popover').exists()).toBe(true)
    expect(wrapper.findAll('.notice-card')[0].text()).toContain('已规划')
    expect(listRequirementItems).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })

  it.each([
    ['PENDING_REVIEW', 'IN_PROGRESS', '开始处理'],
    ['PLANNED', 'IN_PROGRESS', '开始处理'],
    ['PLANNED', 'COMPLETED', '完成'],
    ['IN_PROGRESS', 'COMPLETED', '完成'],
    ['COMPLETED', 'PENDING_REVIEW', '重新评估'],
    ['DECLINED', 'PENDING_REVIEW', '重新评估']
  ])('offers a direct action from %s to %s', async (status, target, label) => {
    const payload = buildBoardPayload()
    payload.list = [{...payload.list[0], status}]
    listRequirementItems.mockResolvedValue(buildResponse(payload))
    updateRequirementItemProgress.mockResolvedValue(buildResponse({...payload.list[0], status: target, version: 2}))
    const wrapper = await mountBoard()
    await wrapper.get('.board-trigger').trigger('click')
    const action = wrapper.get(`[data-quick-status="${target}"]`)
    expect(action.text()).toBe(label)
    await action.trigger('click')
    await flushPromises()
    expect(updateRequirementItemProgress).toHaveBeenCalledWith('100', {status: target, remark: null, version: 1})
    wrapper.unmount()
  })

  it('offers other statuses without nested buttons or opening details', async () => {
    updateRequirementItemProgress.mockResolvedValue(buildResponse({...buildBoardPayload().list[0], status: 'DECLINED', version: 2}))
    const wrapper = await mountBoard()
    await wrapper.get('.board-trigger').trigger('click')
    const card = wrapper.findAll('.notice-card')[0]
    expect(card.find('button button').exists()).toBe(false)
    await card.get('[data-other-status="DECLINED"]').trigger('click')
    await flushPromises()
    expect(updateRequirementItemProgress).toHaveBeenCalledWith('100', {status: 'DECLINED', remark: null, version: 1})
    expect(getRequirementItemDetail).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('prevents repeated submissions and keeps the board open while saving', async () => {
    let finishUpdate
    updateRequirementItemProgress.mockImplementation(() => new Promise(resolve => { finishUpdate = resolve }))
    const wrapper = await mountBoard()
    await wrapper.get('.board-trigger').trigger('click')
    vi.useFakeTimers()
    try {
      const action = wrapper.get('[data-quick-status="PLANNED"]')
      await action.trigger('click')
      expect(action.attributes('disabled')).toBeDefined()
      await action.trigger('click')
      await wrapper.get('.notice-board').trigger('mouseleave')
      vi.advanceTimersByTime(3000)
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.board-popover').exists()).toBe(true)
      expect(updateRequirementItemProgress).toHaveBeenCalledTimes(1)
      finishUpdate(buildResponse({...buildBoardPayload().list[0], status: 'PLANNED', version: 2}))
      await flushPromises()
    } finally {
      vi.useRealTimers()
      wrapper.unmount()
    }
  })

  it('retains the current status on a version conflict and permits retry', async () => {
    updateRequirementItemProgress.mockRejectedValue({response: {data: {message: '反馈已被其他用户更新，请刷新后重试'}}})
    const wrapper = await mountBoard()
    await wrapper.get('.board-trigger').trigger('click')
    await wrapper.get('[data-quick-status="PLANNED"]').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.notice-card')[0].get('.notice-status').text()).toContain('待评估')
    expect(wrapper.emitted('notice')?.[0]).toEqual(['error', '更新失败', '反馈已被其他用户更新，请刷新后重试'])
    expect(wrapper.get('[data-quick-status="PLANNED"]').attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  it('refreshes the active status filter after updating progress', async () => {
    const wrapper = await mountBoard()
    await wrapper.get('.board-trigger').trigger('click')
    await wrapper.findAll('.notice-status-filter button')[1].trigger('click')
    await flushPromises()
    updateRequirementItemProgress.mockResolvedValue(buildResponse({...buildBoardPayload().list[0], status: 'PLANNED', version: 2}))
    listRequirementItems.mockResolvedValue(buildResponse({total: 0, list: [], statusCounts: [{status: 'PLANNED', count: 2}]}))
    await wrapper.get('[data-quick-status="PLANNED"]').trigger('click')
    await flushPromises()
    expect(listRequirementItems).toHaveBeenLastCalledWith(expect.objectContaining({status: 'PENDING_REVIEW'}))
    expect(wrapper.findAll('.requirement-card')).toHaveLength(0)
    expect(wrapper.text()).toContain('2 条')
    wrapper.unmount()
  })

  it('keeps the saved result if refreshing the board fails', async () => {
    const wrapper = await mountBoard()
    await wrapper.get('.board-trigger').trigger('click')
    updateRequirementItemProgress.mockResolvedValue(buildResponse({...buildBoardPayload().list[0], status: 'PLANNED', version: 2}))
    listRequirementItems.mockRejectedValue(new Error('offline'))
    await wrapper.get('[data-quick-status="PLANNED"]').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.notice-card')[0].get('.notice-status').text()).toContain('已规划')
    expect(wrapper.get('.notice-inline-error').text()).toContain('重试')
    expect(wrapper.emitted('notice')?.[0]?.[0]).toBe('success')
    wrapper.unmount()
  })

  it('uses the returned version for the next action when list refresh fails', async () => {
    const wrapper = await mountBoard()
    await wrapper.get('.board-trigger').trigger('click')
    updateRequirementItemProgress.mockResolvedValue(buildResponse({...buildBoardPayload().list[0], status: 'PLANNED', version: 2}))
    listRequirementItems.mockRejectedValue(new Error('offline'))
    await wrapper.get('[data-quick-status="PLANNED"]').trigger('click')
    await flushPromises()
    updateRequirementItemProgress.mockResolvedValue(buildResponse({...buildBoardPayload().list[0], status: 'IN_PROGRESS', version: 3}))
    await wrapper.findAll('.notice-card')[0].get('[data-quick-status="IN_PROGRESS"]').trigger('click')
    await flushPromises()
    expect(updateRequirementItemProgress).toHaveBeenLastCalledWith('100', {status: 'IN_PROGRESS', remark: null, version: 2})
    expect(wrapper.findAll('.notice-card')[0].get('.notice-status').text()).toContain('进行中')
    wrapper.unmount()
  })

  it('pauses automatic hiding for an open status menu and supports Escape', async () => {
    const wrapper = await mountBoard(true)
    await wrapper.get('.board-trigger').trigger('click')
    vi.useFakeTimers()
    try {
      const menu = wrapper.findAll('.notice-other-status')[0]
      menu.element.open = true
      await menu.trigger('toggle')
      await wrapper.get('.notice-board').trigger('mouseleave')
      vi.advanceTimersByTime(3000)
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.board-popover').exists()).toBe(true)
      await menu.trigger('keydown', {key: 'Escape'})
      await menu.trigger('toggle')
      expect(menu.element.open).toBe(false)
      await wrapper.get('.notice-board').trigger('mouseleave')
      vi.advanceTimersByTime(2200)
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.board-popover').exists()).toBe(false)
    } finally {
      vi.useRealTimers()
      wrapper.unmount()
    }
  })

  it('loads shared cards and renders status totals', async () => {
    const wrapper = await mountBoard()

    expect(listRequirementItems).toHaveBeenCalledWith({
      pageNo: 1, pageSize: 50, keyword: '', status: '', appCode: '', priority: '', type: ''
    })
    expect(wrapper.findAll('.requirement-card')).toHaveLength(0)
    await wrapper.get('.board-trigger').trigger('click')
    expect(wrapper.findAll('.requirement-card')).toHaveLength(2)
    expect(wrapper.text()).toContain('支持导出需求')
    expect(wrapper.text()).toContain('用户看板')
    expect(wrapper.text()).toContain('Bug')
    expect(wrapper.text()).toContain('2 条')
    expect(wrapper.text()).toContain('待办清单')
  })

  it('hides the board a few seconds after the pointer leaves', async () => {
    const wrapper = await mountBoard()
    await wrapper.get('.board-trigger').trigger('click')
    vi.useFakeTimers()

    try {
      await wrapper.get('.notice-board').trigger('mouseleave')
      vi.advanceTimersByTime(2100)
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.board-popover').exists()).toBe(true)

      vi.advanceTimersByTime(100)
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.board-popover').exists()).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('submits a new shared requirement and refreshes the board', async () => {
    createRequirementItem.mockResolvedValue(buildResponse({id: '102'}))
    const wrapper = await mountBoard()

    await wrapper.get('.board-trigger').trigger('click')
    await wrapper.get('.notice-primary-button').trigger('click')
    await wrapper.findAll('#requirement-form select')[0].setValue('BUG')
    await wrapper.findAll('#requirement-form select')[1].setValue('APP_FUEL_STATS')
    await wrapper.findAll('#requirement-form select')[2].setValue('HIGH')
    await wrapper.get('#requirement-form input').setValue('支持批量归档')
    await wrapper.get('#requirement-form textarea').setValue('降低长期需求的管理成本')
    await wrapper.get('#requirement-form').trigger('submit')
    await flushPromises()

    expect(createRequirementItem).toHaveBeenCalledWith({
      appCode: 'APP_FUEL_STATS',
      type: 'BUG',
      priority: 'HIGH',
      title: '支持批量归档',
      description: '降低长期需求的管理成本',
      attachmentIds: []
    })
    expect(wrapper.emitted('notice')?.[0]).toEqual(['success', 'Bug已提交', 'Bug已共享给所有登录用户。'])
    expect(listRequirementItems).toHaveBeenCalledTimes(2)
  })

  it('binds uploaded images to the new feedback', async () => {
    uploadAttachment.mockResolvedValue(buildResponse({
      id: 501, image: true, contentType: 'image/png', originalFileName: '问题截图.png', thumbnailAvailable: false
    }))
    createRequirementItem.mockResolvedValue(buildResponse({id: '102'}))
    const wrapper = await mountBoard()

    await wrapper.get('.board-trigger').trigger('click')
    await wrapper.get('.notice-primary-button').trigger('click')
    await wrapper.findAll('#requirement-form select')[1].setValue('APP_TODO_LIST')
    await wrapper.get('#requirement-form input').setValue('上传问题截图')
    const fileInput = wrapper.get('#requirement-form input[type="file"]')
    Object.defineProperty(fileInput.element, 'files', {value: [new File(['image'], '问题截图.png', {type: 'image/png'})]})
    await fileInput.trigger('change')
    await flushPromises()
    await wrapper.get('#requirement-form').trigger('submit')
    await flushPromises()

    expect(uploadAttachment).toHaveBeenCalledWith(expect.any(File), 'IMAGE', expect.any(Function))
    expect(createRequirementItem).toHaveBeenCalledWith(expect.objectContaining({attachmentIds: [501]}))
  })

  it('filters the user board by feedback type', async () => {
    const wrapper = await mountBoard()

    await wrapper.get('.board-trigger').trigger('click')
    await wrapper.get('.notice-type-filter select').setValue('BUG')
    await flushPromises()

    expect(listRequirementItems).toHaveBeenLastCalledWith({
      pageNo: 1, pageSize: 50, keyword: '', status: '', appCode: '', priority: '', type: 'BUG'
    })
  })

  it('updates the feedback type when the creator edits an item', async () => {
    getRequirementItemDetail.mockResolvedValue(buildResponse({
      ...buildBoardPayload().list[0],
      progressLogs: []
    }))
    updateRequirementItem.mockResolvedValue(buildResponse({
      ...buildBoardPayload().list[0],
      type: 'BUG',
      version: 2,
      progressLogs: []
    }))
    const wrapper = await mountBoard()

    await wrapper.get('.board-trigger').trigger('click')
    await wrapper.get('.requirement-card').trigger('click')
    await flushPromises()
    await wrapper.get('.notice-plain-button').trigger('click')
    await wrapper.findAll('#requirement-edit-form select')[0].setValue('BUG')
    await wrapper.get('#requirement-edit-form').trigger('submit')
    await flushPromises()

    expect(updateRequirementItem).toHaveBeenCalledWith('100', {
      appCode: 'APP_TODO_LIST',
      type: 'BUG',
      priority: 'HIGH',
      title: '支持导出需求',
      description: '按状态导出看板',
      version: 1,
      attachmentIds: []
    })
    expect(wrapper.emitted('notice')?.[0]).toEqual(['success', 'Bug已更新', 'Bug内容、类型和所属应用已保存。'])
  })

  it('lets any logged-in user update a requirement progress', async () => {
    getRequirementItemDetail.mockResolvedValue(buildResponse({
      ...buildBoardPayload().list[0],
      progressLogs: [{id: '900', status: 'PENDING_REVIEW', remark: '提交需求', operatorName: '小王', createdAt: '2026-07-28T09:30:00'}]
    }))
    updateRequirementItemProgress.mockResolvedValue(buildResponse({
      ...buildBoardPayload().list[0],
      status: 'IN_PROGRESS',
      version: 2,
      progressLogs: []
    }))
    const wrapper = await mountBoard()

    await wrapper.get('.board-trigger').trigger('click')
    await wrapper.get('.requirement-card').trigger('click')
    await flushPromises()
    await wrapper.get('#requirement-progress-form select').setValue('IN_PROGRESS')
    await wrapper.get('#requirement-progress-form input').setValue('已开始处理')
    await wrapper.get('#requirement-progress-form').trigger('submit')
    await flushPromises()

    expect(updateRequirementItemProgress).toHaveBeenCalledWith('100', {
      status: 'IN_PROGRESS',
      remark: '已开始处理',
      version: 1
    })
    expect(wrapper.emitted('notice')?.[0]).toEqual(['success', '进度已同步', '需求已更新为“进行中”。'])
  })
})
