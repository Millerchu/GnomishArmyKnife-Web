// @vitest-environment happy-dom

import {mount} from '@vue/test-utils'
import {defineComponent, nextTick} from 'vue'
import {afterEach, describe, expect, it, vi} from 'vitest'

import MacDialog from '../MacDialog.vue'

const mountedWrappers = []

const SlotProbe = defineComponent({
  name: 'SlotProbe',
  template: `
    <div class="slot-probe">
      <input class="slot-input">
      <button class="slot-focus-target" type="button">焦点目标</button>
    </div>
  `
})

function mountDialog(props = {}, options = {}) {
  const wrapper = mount(MacDialog, {
    attachTo: document.body,
    props: {
      modelValue: true,
      title: '测试弹窗',
      ...props
    },
    slots: options.slots,
    global: {
      stubs: {
        transition: true
      }
    }
  })
  mountedWrappers.push(wrapper)
  return wrapper
}

async function clickElement(element) {
  element.click()
  await nextTick()
  await nextTick()
}

function dispatchEscape(defaultPrevented = false) {
  const event = new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    cancelable: true
  })
  if (defaultPrevented) {
    event.preventDefault()
  }
  document.dispatchEvent(event)
  return event
}

function getPanelByTitle(title) {
  return [...document.body.querySelectorAll('.mac-dialog-panel')]
    .find((panel) => panel.textContent.includes(title))
}

afterEach(() => {
  while (mountedWrappers.length > 0) {
    mountedWrappers.pop().unmount()
  }
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('MacDialog real component behavior', () => {
  it('emits update, cancel and close in order from the left window close control', async () => {
    const eventOrder = []
    const wrapper = mountDialog({
      'onUpdate:modelValue': (value) => eventOrder.push(['update:modelValue', value]),
      onCancel: () => eventOrder.push(['cancel']),
      onClose: () => eventOrder.push(['close'])
    })

    await clickElement(document.body.querySelector('.mac-window-dot.close'))

    expect(eventOrder).toEqual([
      ['update:modelValue', false],
      ['cancel'],
      ['close']
    ])
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('has no redundant right-side close button', async () => {
    mountDialog()

    expect(document.body.querySelector('.mac-dialog-close')).toBeNull()
    expect(document.body.querySelector('.mac-dialog-head')).not.toBeNull()
  })

  it('uses window presentation by default and exposes validated mobile modes', async () => {
    const wrapper = mountDialog()
    const presentationProp = MacDialog.props.mobilePresentation
    const mask = document.body.querySelector('.mac-dialog-mask')
    const panel = document.body.querySelector('.mac-dialog-panel')

    expect(presentationProp.default).toBe('window')
    expect(presentationProp.validator('window')).toBe(true)
    expect(presentationProp.validator('sheet')).toBe(true)
    expect(presentationProp.validator('fullScreen')).toBe(true)
    expect(presentationProp.validator('fullscreen')).toBe(false)
    expect(mask.classList.contains('mobile-presentation-window')).toBe(true)
    expect(panel.classList.contains('mobile-presentation-window')).toBe(true)

    await wrapper.setProps({mobilePresentation: 'sheet'})

    expect(mask.classList.contains('mobile-presentation-sheet')).toBe(true)
    expect(panel.classList.contains('mobile-presentation-sheet')).toBe(true)
    expect(panel.querySelectorAll('.mac-window-dot')).toHaveLength(3)

    await wrapper.setProps({mobilePresentation: 'fullScreen'})

    expect(mask.classList.contains('mobile-presentation-full-screen')).toBe(true)
    expect(panel.classList.contains('mobile-presentation-full-screen')).toBe(true)
  })

  it('does not close from an accidental mask click by default', async () => {
    const wrapper = mountDialog()
    const mask = document.body.querySelector('.mac-dialog-mask')

    await clickElement(mask)

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('asks for confirmation when editable values changed and keeps the form intact', async () => {
    const wrapper = mountDialog({}, {slots: {default: SlotProbe}})
    await nextTick()
    const input = document.body.querySelector('.slot-input')
    input.value = '已经填写的重要内容'
    input.focus()

    await clickElement(document.body.querySelector('.mac-window-dot.close'))

    const confirmation = document.body.querySelector('.mac-dialog-confirm-card')
    expect(confirmation).not.toBeNull()
    expect(confirmation.getAttribute('role')).toBe('alertdialog')
    expect(document.body.querySelector('.mac-dialog-panel').inert).toBe(true)
    expect(document.activeElement).toBe(document.body.querySelector('.mac-dialog-confirm-keep'))
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    await clickElement(document.body.querySelector('.mac-dialog-confirm-keep'))

    expect(document.body.querySelector('.mac-dialog-confirm-card')).toBeNull()
    expect(document.body.querySelector('.mac-dialog-panel').inert).toBe(false)
    expect(document.body.querySelector('.slot-input').value).toBe('已经填写的重要内容')
    expect(document.activeElement).toBe(input)
  })

  it('only closes a changed dialog after explicitly discarding changes', async () => {
    const wrapper = mountDialog({}, {slots: {default: SlotProbe}})
    await nextTick()
    document.body.querySelector('.slot-input').value = '待放弃内容'

    dispatchEscape()
    await nextTick()
    expect(document.body.querySelector('.mac-dialog-confirm-card')).not.toBeNull()
    expect(wrapper.emitted('close')).toBeUndefined()

    dispatchEscape()
    await nextTick()
    expect(document.body.querySelector('.mac-dialog-confirm-card')).toBeNull()
    expect(wrapper.emitted('close')).toBeUndefined()

    dispatchEscape()
    await nextTick()
    await clickElement(document.body.querySelector('.mac-dialog-confirm-discard'))

    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('restores a minimized changed dialog before asking for confirmation', async () => {
    const wrapper = mountDialog({}, {slots: {default: SlotProbe}})
    await nextTick()
    document.body.querySelector('.slot-input').value = '最小化后仍未保存'

    await clickElement(document.body.querySelector('.mac-window-dot.minimize'))
    expect(document.body.querySelector('.mac-dialog-mask').style.display).toBe('none')

    dispatchEscape()
    await nextTick()
    await nextTick()

    expect(document.body.querySelector('.mac-dialog-mask').style.display).not.toBe('none')
    expect(document.body.querySelector('.mac-dialog-confirm-card')).not.toBeNull()
    expect(wrapper.emitted('restore')).toHaveLength(1)
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('does not ask for confirmation after values are restored to their initial state', async () => {
    const wrapper = mountDialog({}, {slots: {default: SlotProbe}})
    await nextTick()
    const input = document.body.querySelector('.slot-input')
    input.value = '临时修改'
    input.value = ''

    await clickElement(document.body.querySelector('.mac-window-dot.close'))

    expect(document.body.querySelector('.mac-dialog-confirm-card')).toBeNull()
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('blocks every close and minimize entry while allowing maximize', async () => {
    const wrapper = mountDialog({closeDisabled: true})
    const panel = document.body.querySelector('.mac-dialog-panel')

    await clickElement(panel.querySelector('.mac-window-dot.close'))
    await clickElement(panel.querySelector('.mac-window-dot.minimize'))
    panel.closest('.mac-dialog-mask').click()
    dispatchEscape()
    await nextTick()

    expect(wrapper.emitted('close')).toBeUndefined()
    expect(wrapper.emitted('cancel')).toBeUndefined()
    expect(wrapper.emitted('minimize')).toBeUndefined()
    expect(document.body.querySelector('.mac-dialog-minimized')).toBeNull()

    await clickElement(panel.querySelector('.mac-window-dot.zoom'))

    expect(panel.classList.contains('maximized')).toBe(true)
    expect(wrapper.emitted('maximize-change')).toEqual([[true]])
  })

  it('moves the desktop dialog from the header and ignores window controls', async () => {
    const wrapper = mountDialog()
    const panel = document.body.querySelector('.mac-dialog-panel')
    const mask = panel.closest('.mac-dialog-mask')
    const header = panel.querySelector('.mac-dialog-head')
    const closeControl = panel.querySelector('.mac-window-dot.close')
    const originalInnerWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', {configurable: true, value: 1024})
    wrapper.vm.updateViewportWidth()
    panel.getBoundingClientRect = () => ({left: 200, top: 180, right: 920, bottom: 580})
    mask.getBoundingClientRect = () => ({left: 0, top: 0, right: 1200, bottom: 760})

    const dragStart = new MouseEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      button: 0,
      clientX: 400,
      clientY: 240
    })
    Object.defineProperty(dragStart, 'pointerId', {value: 1})
    header.dispatchEvent(dragStart)

    const dragMove = new MouseEvent('pointermove', {
      bubbles: true,
      clientX: 452,
      clientY: 268
    })
    Object.defineProperty(dragMove, 'pointerId', {value: 1})
    header.dispatchEvent(dragMove)
    await nextTick()

    expect(panel.style.getPropertyValue('--mac-dialog-drag-x')).toBe('52px')
    expect(panel.style.getPropertyValue('--mac-dialog-drag-y')).toBe('28px')

    const dragEnd = new MouseEvent('pointerup', {bubbles: true})
    Object.defineProperty(dragEnd, 'pointerId', {value: 1})
    header.dispatchEvent(dragEnd)
    expect(wrapper.vm.isDragging).toBe(false)

    const controlStart = new MouseEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      button: 0,
      clientX: 230,
      clientY: 205
    })
    Object.defineProperty(controlStart, 'pointerId', {value: 2})
    closeControl.dispatchEvent(controlStart)
    expect(wrapper.vm.isDragging).toBe(false)
    Object.defineProperty(window, 'innerWidth', {configurable: true, value: originalInnerWidth})
  })

  it('does not start a drag while maximized or on mobile', async () => {
    const wrapper = mountDialog()
    const panel = document.body.querySelector('.mac-dialog-panel')
    const header = panel.querySelector('.mac-dialog-head')
    const originalInnerWidth = window.innerWidth

    await clickElement(panel.querySelector('.mac-window-dot.zoom'))
    wrapper.vm.startDrag({
      button: 0,
      isPrimary: true,
      target: header,
      currentTarget: header,
      pointerId: 1,
      clientX: 300,
      clientY: 200,
      preventDefault: vi.fn()
    })
    expect(wrapper.vm.isDragging).toBe(false)

    await clickElement(panel.querySelector('.mac-window-dot.zoom'))
    Object.defineProperty(window, 'innerWidth', {configurable: true, value: 720})
    wrapper.vm.updateViewportWidth()
    wrapper.vm.startDrag({
      button: 0,
      isPrimary: true,
      target: header,
      currentTarget: header,
      pointerId: 2,
      clientX: 300,
      clientY: 200,
      preventDefault: vi.fn()
    })
    expect(wrapper.vm.isDragging).toBe(false)
    Object.defineProperty(window, 'innerWidth', {configurable: true, value: originalInnerWidth})
  })

  it('keeps slot DOM, input value and scroll position while restoring focus', async () => {
    const wrapper = mountDialog({}, {slots: {default: SlotProbe}})
    const panel = document.body.querySelector('.mac-dialog-panel')
    const mask = panel.closest('.mac-dialog-mask')
    const body = panel.querySelector('.mac-dialog-body')
    const input = panel.querySelector('.slot-input')
    const focusTarget = panel.querySelector('.slot-focus-target')

    input.value = '保留的输入'
    body.scrollTop = 137
    focusTarget.focus()
    expect(document.activeElement).toBe(focusTarget)

    await clickElement(panel.querySelector('.mac-window-dot.minimize'))

    const restoreButton = document.body.querySelector('.mac-dialog-minimized')
    expect(restoreButton).not.toBeNull()
    expect(restoreButton.getAttribute('aria-label')).toContain('测试弹窗')
    expect(document.activeElement).toBe(restoreButton)
    expect(document.body.querySelector('.mac-dialog-mask')).toBe(mask)
    expect(mask.style.display).toBe('none')
    expect(mask.inert).toBe(true)
    expect(panel.querySelector('.slot-input')).toBe(input)
    expect(input.value).toBe('保留的输入')
    expect(body.scrollTop).toBe(137)

    await clickElement(restoreButton)

    expect(document.body.querySelector('.mac-dialog-panel')).toBe(panel)
    expect(mask.style.display).not.toBe('none')
    expect(document.activeElement).toBe(focusTarget)
    expect(input.value).toBe('保留的输入')
    expect(body.scrollTop).toBe(137)
    expect(wrapper.emitted('minimize')).toHaveLength(1)
    expect(wrapper.emitted('restore')).toHaveLength(1)
  })

  it('only lets the topmost dialog handle Escape and offsets minimized docks', async () => {
    const firstWrapper = mountDialog({title: '第一个弹窗'})
    const secondWrapper = mountDialog({title: '第二个弹窗'})
    const firstPanel = getPanelByTitle('第一个弹窗')
    const secondPanel = getPanelByTitle('第二个弹窗')

    await clickElement(firstPanel.querySelector('.mac-window-dot.minimize'))
    await clickElement(secondPanel.querySelector('.mac-window-dot.minimize'))

    const docks = [...document.body.querySelectorAll('.mac-dialog-minimized')]
    expect(docks).toHaveLength(2)
    expect(docks[0].style.bottom).not.toBe('')
    expect(docks[0].style.bottom).not.toBe(docks[1].style.bottom)
    expect(document.body.querySelectorAll('.mac-dialog-mask')).toHaveLength(2)
    expect([...document.body.querySelectorAll('.mac-dialog-mask')]
      .every((mask) => mask.style.display === 'none')).toBe(true)

    dispatchEscape()
    await nextTick()

    expect(secondWrapper.emitted('close')).toHaveLength(1)
    expect(firstWrapper.emitted('close')).toBeUndefined()
  })

  it('ignores already prevented Escape events', async () => {
    const wrapper = mountDialog()

    dispatchEscape(true)
    await nextTick()

    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('registers keydown only while open and removes it on close or unmount', async () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
    const wrapper = mountDialog({modelValue: false})
    const keydownAdds = () => addEventListenerSpy.mock.calls
      .filter(([eventName]) => eventName === 'keydown')
    const keydownRemovals = () => removeEventListenerSpy.mock.calls
      .filter(([eventName]) => eventName === 'keydown')

    expect(keydownAdds()).toHaveLength(0)

    await wrapper.setProps({modelValue: true})
    expect(keydownAdds()).toHaveLength(1)

    await wrapper.setProps({modelValue: false})
    expect(keydownRemovals()).toHaveLength(1)

    await wrapper.setProps({modelValue: true})
    expect(keydownAdds()).toHaveLength(2)

    wrapper.unmount()
    mountedWrappers.splice(mountedWrappers.indexOf(wrapper), 1)
    expect(keydownRemovals()).toHaveLength(2)
  })

  it('applies maximized class and resets view state across model changes', async () => {
    const wrapper = mountDialog()
    const panel = document.body.querySelector('.mac-dialog-panel')

    await clickElement(panel.querySelector('.mac-window-dot.zoom'))
    expect(panel.classList.contains('maximized')).toBe(true)

    await wrapper.setProps({modelValue: false})
    expect(document.body.querySelector('.mac-dialog-panel')).toBeNull()

    await wrapper.setProps({modelValue: true})
    expect(document.body.querySelector('.mac-dialog-panel').classList.contains('maximized'))
      .toBe(false)
  })

  it('uses dynamic viewport fallbacks and safe-area-aware mobile sizing', async () => {
    const componentSource = await import('../MacDialog.vue?raw')

    expect(componentSource.default).toContain('100dvh')
    expect(componentSource.default).toContain('safe-area-inset-top')
    expect(componentSource.default).toContain('safe-area-inset-bottom')
    expect(componentSource.default).toContain('safe-area-inset-left')
    expect(componentSource.default).toContain('safe-area-inset-right')
    expect(componentSource.default).not.toMatch(/mac-window-controls[^}]*display:\s*none/s)
    expect(componentSource.default).toContain(
      '@media (max-width: 720px) and (max-height: 640px) and (orientation: landscape)'
    )
    expect(componentSource.default).toContain('prefers-reduced-transparency: reduce')
    expect(componentSource.default).toContain('prefers-contrast: more')
    expect(componentSource.default).toContain('prefers-reduced-motion: reduce')
  })
})
