// @vitest-environment happy-dom

import {flushPromises, mount} from '@vue/test-utils'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import RequirementBoard from '../RequirementBoard.vue'
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

async function mountBoard() {
  const wrapper = mount(RequirementBoard, {
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
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('RequirementBoard', () => {
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
      description: '降低长期需求的管理成本'
    })
    expect(wrapper.emitted('notice')?.[0]).toEqual(['success', 'Bug已提交', 'Bug已共享给所有登录用户。'])
    expect(listRequirementItems).toHaveBeenCalledTimes(2)
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
      version: 1
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
