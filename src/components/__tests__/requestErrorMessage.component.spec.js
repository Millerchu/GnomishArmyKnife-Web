// @vitest-environment happy-dom
import {flushPromises, mount} from '@vue/test-utils'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import RequestErrorMessage from '../RequestErrorMessage.vue'

const traceId = '0123456789abcdef0123456789abcdef'
const message = '保存失败'
const error = {response: {status: 500}, traceId}
let wrapper
let execCommand
const execCommandDescriptor = Object.getOwnPropertyDescriptor(document, 'execCommand')
const fixtures = []
beforeEach(() => {
  execCommand = vi.fn().mockReturnValue(false)
  Object.defineProperty(document, 'execCommand', {configurable: true, value: execCommand})
})
afterEach(() => {
  wrapper?.unmount()
  fixtures.splice(0).forEach(element => element.remove())
  document.getSelection()?.removeAllRanges()
  vi.unstubAllGlobals()
  if (execCommandDescriptor) Object.defineProperty(document, 'execCommand', execCommandDescriptor)
  else delete document.execCommand
})

it('复制按钮只复制编号并显示成功，按钮不会提交表单', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', {clipboard: {writeText}})
  wrapper = mount(RequestErrorMessage, {props: {message, error}})
  expect(wrapper.text()).toContain(`${message}\n追踪编号：${traceId}，可在系统日志中精确查询`)
  expect(wrapper.get('button').attributes('type')).toBe('button')
  await wrapper.get('button').trigger('click')
  await flushPromises()
  expect(writeText).toHaveBeenCalledExactlyOnceWith(traceId)
  expect(wrapper.get('[role="status"]').text()).toBe('已复制')
  expect(execCommand).not.toHaveBeenCalled()
})

it.each(['missing', 'rejected', 'thrown'])('剪贴板 %s 时回退复制成功并清理临时元素', async mode => {
  const writeText = vi.fn(() => {
    if (mode === 'thrown') throw new Error('denied')
    return Promise.reject(new Error('denied'))
  })
  vi.stubGlobal('navigator', mode === 'missing' ? {} : {clipboard: {writeText}})
  let temporaryTextarea
  execCommand.mockImplementation(() => {
    temporaryTextarea = document.activeElement
    expect(temporaryTextarea.tagName).toBe('TEXTAREA')
    expect(temporaryTextarea.value).toBe(traceId)
    expect(temporaryTextarea.selectionStart).toBe(0)
    expect(temporaryTextarea.selectionEnd).toBe(traceId.length)
    return true
  })
  wrapper = mount(RequestErrorMessage, {props: {message, error}})
  await wrapper.get('button').trigger('click')
  await flushPromises()
  expect(execCommand).toHaveBeenCalledExactlyOnceWith('copy')
  expect(wrapper.get('[role="status"]').text()).toBe('已复制')
  expect(wrapper.text()).not.toContain('复制失败')
  expect(temporaryTextarea.isConnected).toBe(false)
  expect(wrapper.get('button').element.disabled).toBe(false)
})

it.each(['false', 'throw'])('回退复制 %s 时保留编号、提示手工复制并清理临时元素', async result => {
  vi.stubGlobal('navigator', {clipboard: {writeText: vi.fn().mockRejectedValue(new Error('denied'))}})
  let temporaryTextarea
  execCommand.mockImplementation(() => {
    temporaryTextarea = document.activeElement
    if (result === 'throw') throw new Error('copy failed')
    return false
  })
  wrapper = mount(RequestErrorMessage, {props: {message, error}})
  await wrapper.get('button').trigger('click')
  await flushPromises()
  expect(execCommand).toHaveBeenCalledExactlyOnceWith('copy')
  expect(wrapper.get('[role="status"]').text()).toBe('复制失败，请选中编号手动复制')
  expect(wrapper.get('span').text()).toContain(traceId)
  expect(wrapper.get('p').classes()).toContain('has-trace-id')
  expect(wrapper.get('button').element.disabled).toBe(false)
  expect(temporaryTextarea.isConnected).toBe(false)
})

it.each([true, false])('回退复制结果为 %s 后恢复原输入焦点及选区', async result => {
  vi.stubGlobal('navigator', {})
  execCommand.mockReturnValue(result)
  const input = document.createElement('input')
  input.value = '原有输入内容'
  document.body.appendChild(input)
  fixtures.push(input)
  input.focus()
  input.setSelectionRange(1, 4, 'backward')
  wrapper = mount(RequestErrorMessage, {props: {message, error}})
  await wrapper.get('button').trigger('click')
  await flushPromises()
  expect(execCommand).toHaveBeenCalledExactlyOnceWith('copy')
  expect(document.activeElement).toBe(input)
  expect(input.selectionStart).toBe(1)
  expect(input.selectionEnd).toBe(4)
  expect(input.selectionDirection).toBe('backward')
})

it('回退复制后恢复原页面文本选区', async () => {
  vi.stubGlobal('navigator', {})
  const paragraph = document.createElement('p')
  paragraph.textContent = '原有页面选区'
  document.body.appendChild(paragraph)
  fixtures.push(paragraph)
  const selection = document.getSelection()
  const range = document.createRange()
  range.setStart(paragraph.firstChild, 1)
  range.setEnd(paragraph.firstChild, 4)
  selection.addRange(range)
  execCommand.mockImplementation(() => {
    selection.removeAllRanges()
    return true
  })
  wrapper = mount(RequestErrorMessage, {props: {message, error}})
  await wrapper.get('button').trigger('click')
  await flushPromises()
  expect(execCommand).toHaveBeenCalledExactlyOnceWith('copy')
  expect(selection.toString()).toBe('有页面')
  expect(selection.getRangeAt(0).startContainer).toBe(paragraph.firstChild)
})

it.each([{response: {status: 500}}, {response: {status: 400}, traceId}, null])('无编号或非 5xx 保持原文案及无复制按钮', failure => {
  wrapper = mount(RequestErrorMessage, {props: {message, error: failure}})
  expect(wrapper.text()).toBe(message)
  expect(wrapper.find('button').exists()).toBe(false)
})

it('复制期间切换错误时，不将旧结果显示在新错误中', async () => {
  let resolveCopy
  vi.stubGlobal('navigator', {clipboard: {writeText: () => new Promise(resolve => { resolveCopy = resolve })}})
  wrapper = mount(RequestErrorMessage, {props: {message, error}})
  await wrapper.get('button').trigger('click')
  await wrapper.setProps({error: {...error, traceId: 'f'.repeat(32)}})
  resolveCopy()
  await flushPromises()
  expect(wrapper.find('[role="status"]').exists()).toBe(false)
  expect(wrapper.text()).toContain('f'.repeat(32))
})
