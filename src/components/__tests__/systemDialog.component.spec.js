// @vitest-environment happy-dom

import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it} from 'vitest'

import SystemDialogHost from '../SystemDialogHost.vue'
import {alertDialog, confirmDialog} from '../systemDialog.js'

let wrapper

function mountDialogHost() {
  wrapper = mount(SystemDialogHost, {
    attachTo: document.body,
    global: {
      stubs: {
        transition: true
      }
    }
  })
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

describe('SystemDialogHost', () => {
  it('presents a destructive confirmation with safe default focus', async () => {
    mountDialogHost()

    const resultPromise = confirmDialog('这条记录将被永久删除。', {
      title: '删除记录？',
      confirmText: '删除记录'
    })
    await wrapper.vm.$nextTick()

    const dialog = document.body.querySelector('.system-dialog-card')
    expect(dialog.getAttribute('role')).toBe('alertdialog')
    expect(dialog.classList.contains('is-danger')).toBe(true)
    expect(dialog.textContent).toContain('删除记录？')
    expect(document.activeElement).toBe(document.body.querySelector('.system-dialog-button.secondary'))

    document.body.querySelector('.system-dialog-button.primary').click()
    await expect(resultPromise).resolves.toBe(true)
  })

  it('cancels confirmation with Escape and restores focus', async () => {
    mountDialogHost()
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()

    const resultPromise = confirmDialog('确认执行这项操作吗？')
    await wrapper.vm.$nextTick()
    document.body.querySelector('.system-dialog-card').dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true
    }))

    await expect(resultPromise).resolves.toBe(false)
    await wrapper.vm.$nextTick()
    expect(document.activeElement).toBe(trigger)
  })

  it('queues alerts and infers success presentation from message', async () => {
    mountDialogHost()

    const firstResult = alertDialog('保存成功')
    const secondResult = alertDialog('请输入任务标题')
    await wrapper.vm.$nextTick()

    expect(document.body.querySelector('.system-dialog-card').classList.contains('is-success')).toBe(true)
    expect(document.body.querySelector('.system-dialog-copy').textContent).toContain('保存成功')

    document.body.querySelector('.system-dialog-button.primary').click()
    await firstResult
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect(document.body.querySelector('.system-dialog-copy').textContent).toContain('请输入任务标题')

    document.body.querySelector('.system-dialog-button.primary').click()
    await secondResult
  })
})
