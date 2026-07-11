// @vitest-environment happy-dom

import {flushPromises, mount} from '@vue/test-utils'
import {nextTick} from 'vue'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import TodoList from '../TodoList.vue'
import {createTodoTask, listTodoTasks} from '@/api/todoList'

const mountedWrappers = []
const routerPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({push: routerPush})
}))

vi.mock('@/api/todoList', () => ({
  clearCompletedTodoTasks: vi.fn(),
  createTodoTask: vi.fn(),
  deleteTodoTask: vi.fn(),
  listTodoTasks: vi.fn(),
  updateTodoTask: vi.fn(),
  updateTodoTaskImportant: vi.fn(),
  updateTodoTaskStatus: vi.fn()
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

async function openCreateDialog() {
  const wrapper = mount(TodoList, {
    attachTo: document.body,
    global: {stubs: {transition: true}}
  })
  mountedWrappers.push(wrapper)
  await flushPromises()
  wrapper.vm.openCreateDialog()
  await nextTick()
  await nextTick()
  return wrapper
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('alert', vi.fn())
  listTodoTasks.mockResolvedValue(buildApiResponse({list: [], total: 0}))
})

afterEach(() => {
  while (mountedWrappers.length > 0) {
    mountedWrappers.pop().unmount()
  }
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('TodoList MacDialog integration', () => {
  it('提交期间锁定关闭，成功后自动关闭弹窗', async () => {
    const deferred = createDeferred()
    createTodoTask.mockReturnValue(deferred.promise)
    await openCreateDialog()

    const panel = document.body.querySelector('.mac-dialog-panel.todo-editor-dialog')
    expect(panel).not.toBeNull()
    const form = panel.querySelector('form#todo-task-dialog-form')
    const titleInput = form.querySelector('input[required]')
    const submitButton = panel.querySelector('.mac-dialog-actions button[type="submit"]')
    expect(submitButton.getAttribute('form')).toBe('todo-task-dialog-form')

    titleInput.value = '验证提交锁定'
    titleInput.dispatchEvent(new Event('input', {bubbles: true}))
    await nextTick()
    submitButton.click()
    await nextTick()

    expect(panel.querySelector('.mac-window-dot.close').disabled).toBe(true)
    expect(panel.querySelector('.mac-window-dot.minimize').disabled).toBe(true)
    expect(submitButton.disabled).toBe(true)
    panel.querySelector('.mac-window-dot.close').click()
    expect(document.body.querySelector('.mac-dialog-panel.todo-editor-dialog')).not.toBeNull()

    deferred.resolve(buildApiResponse({id: 1}))
    await flushPromises()
    await nextTick()

    expect(createTodoTask).toHaveBeenCalledTimes(1)
    expect(document.body.querySelector('.mac-dialog-panel.todo-editor-dialog')).toBeNull()
  })
})
