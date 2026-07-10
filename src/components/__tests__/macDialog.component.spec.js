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
  it('emits update, cancel and close in order from the close button', async () => {
    const eventOrder = []
    const wrapper = mountDialog({
      'onUpdate:modelValue': (value) => eventOrder.push(['update:modelValue', value]),
      onCancel: () => eventOrder.push(['cancel']),
      onClose: () => eventOrder.push(['close'])
    })

    await clickElement(document.body.querySelector('.mac-dialog-close'))

    expect(eventOrder).toEqual([
      ['update:modelValue', false],
      ['cancel'],
      ['close']
    ])
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('blocks every close and minimize entry while allowing maximize', async () => {
    const wrapper = mountDialog({closeDisabled: true})
    const panel = document.body.querySelector('.mac-dialog-panel')

    await clickElement(panel.querySelector('.mac-window-dot.close'))
    await clickElement(document.body.querySelector('.mac-dialog-close'))
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
  })
})
