// @vitest-environment happy-dom

import {flushPromises, mount} from '@vue/test-utils'
import {nextTick} from 'vue'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import KnowledgeBase from '../KnowledgeBase.vue'
import {
  getKnowledgeEntryDetail,
  getKnowledgeHighlights,
  listKnowledgeEntries,
  publishKnowledgeEntry
} from '@/api/knowledgeBase'

const mountedWrappers = []
const pendingEntry = {
  id: 18,
  ownerUserId: 7,
  title: '待审核经验',
  category: '工作',
  scenario: '测试',
  summary: '审核弹窗状态测试',
  content: '完整内容',
  status: 'PENDING'
}

function createMemoryStorage() {
  const storedValues = new Map()
  return {
    clear: () => storedValues.clear(),
    getItem: (key) => storedValues.has(key) ? storedValues.get(key) : null,
    removeItem: (key) => storedValues.delete(key),
    setItem: (key, value) => storedValues.set(key, String(value))
  }
}

vi.mock('vue-router', () => ({
  useRouter: () => ({push: vi.fn()})
}))

vi.mock('@/api/knowledgeBase', () => ({
  createKnowledgeEntry: vi.fn(),
  deleteKnowledgeEntry: vi.fn(),
  getKnowledgeEntryDetail: vi.fn(),
  getKnowledgeHighlights: vi.fn(),
  listKnowledgeEntries: vi.fn(),
  publishKnowledgeEntry: vi.fn(),
  rejectKnowledgeEntry: vi.fn(),
  updateKnowledgeEntry: vi.fn()
}))

function buildApiResponse(payload) {
  return {data: {code: 200, message: 'success', data: payload}}
}

async function openPendingDetail() {
  const wrapper = mount(KnowledgeBase, {
    attachTo: document.body,
    global: {stubs: {transition: true}}
  })
  mountedWrappers.push(wrapper)
  await flushPromises()
  await wrapper.vm.openDetailDialog(pendingEntry)
  await nextTick()
  return wrapper
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('localStorage', createMemoryStorage())
  localStorage.setItem('user', JSON.stringify({id: 1, username: 'admin', roleCode: 'ADMIN'}))
  listKnowledgeEntries.mockResolvedValue(buildApiResponse({list: [], total: 0}))
  getKnowledgeHighlights.mockResolvedValue(buildApiResponse([]))
  getKnowledgeEntryDetail.mockResolvedValue(buildApiResponse(pendingEntry))
})

afterEach(() => {
  while (mountedWrappers.length > 0) {
    mountedWrappers.pop().unmount()
  }
  document.body.innerHTML = ''
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe('KnowledgeBase MacDialog review flow', () => {
  it('审核成功后关闭详情弹窗并清理当前详情', async () => {
    publishKnowledgeEntry.mockResolvedValue(buildApiResponse({}))
    const wrapper = await openPendingDetail()

    await wrapper.vm.reviewEntry(wrapper.vm.activeDetail, 'publish')
    await flushPromises()
    await nextTick()

    expect(publishKnowledgeEntry).toHaveBeenCalledWith(18, {reviewRemark: ''})
    expect(wrapper.vm.showDetailDialog).toBe(false)
    expect(wrapper.vm.activeDetail).toBeNull()
    expect(document.body.querySelector('.mac-dialog-panel.knowledge-entry-detail-dialog')).toBeNull()
  })

  it('审核失败后保留详情弹窗并解除关闭锁定', async () => {
    publishKnowledgeEntry.mockRejectedValue(new Error('publish failed'))
    const wrapper = await openPendingDetail()

    await wrapper.vm.reviewEntry(wrapper.vm.activeDetail, 'publish')
    await flushPromises()
    await nextTick()

    const panel = document.body.querySelector('.mac-dialog-panel.knowledge-entry-detail-dialog')
    expect(wrapper.vm.showDetailDialog).toBe(true)
    expect(wrapper.vm.activeDetail?.id).toBe(18)
    expect(wrapper.vm.reviewSubmitting).toBe(false)
    expect(panel).not.toBeNull()
    expect(panel.querySelector('.mac-window-dot.close').disabled).toBe(false)
  })
})
