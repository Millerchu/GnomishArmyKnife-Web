// @vitest-environment happy-dom

import {flushPromises, mount} from '@vue/test-utils'
import {nextTick} from 'vue'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import PasswordMemo from '../PasswordMemo.vue'
import {
  getPasswordMemoDetail,
  listPasswordMemos,
  updatePasswordMemoPassword,
  verifyPasswordMemoAccess
} from '@/api/passwordMemo'

const mountedWrappers = []

vi.mock('vue-router', () => ({
  useRouter: () => ({push: vi.fn()})
}))

vi.mock('@/api/passwordMemo', () => ({
  createPasswordMemo: vi.fn(),
  deletePasswordMemo: vi.fn(),
  getPasswordMemoDetail: vi.fn(),
  listPasswordMemos: vi.fn(),
  updatePasswordMemo: vi.fn(),
  updatePasswordMemoPassword: vi.fn(),
  verifyPasswordMemoAccess: vi.fn()
}))

function buildApiResponse(payload) {
  return {data: {code: 200, message: 'success', data: payload}}
}

function createDeferred() {
  let rejectPromise
  const promise = new Promise((resolve, reject) => {
    rejectPromise = reject
  })
  return {promise, reject: rejectPromise}
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('alert', vi.fn())
  listPasswordMemos.mockResolvedValue(buildApiResponse({list: [], total: 0}))
  getPasswordMemoDetail.mockResolvedValue(buildApiResponse({
    id: 7,
    siteName: 'GitHub',
    siteUrl: 'https://github.com',
    username: 'gnome',
    maskedPassword: '******'
  }))
})

afterEach(() => {
  while (mountedWrappers.length > 0) {
    mountedWrappers.pop().unmount()
  }
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('PasswordMemo MacDialog integration', () => {
  it('安全验证期间锁定关闭，并在验证失败后保留详情与错误提示', async () => {
    const deferred = createDeferred()
    verifyPasswordMemoAccess.mockReturnValue(deferred.promise)
    const wrapper = mount(PasswordMemo, {
      attachTo: document.body,
      global: {stubs: {transition: true}}
    })
    mountedWrappers.push(wrapper)
    await flushPromises()

    await wrapper.vm.openDetailDialog({id: 7})
    await nextTick()
    await nextTick()

    const panel = document.body.querySelector('.mac-dialog-panel.password-memo-verify-dialog')
    expect(panel).not.toBeNull()
    const passwordInput = panel.querySelector('input[autocomplete="current-password"]')
    const verifyButton = panel.querySelector('button[form="password-memo-verify-form"]')
    passwordInput.value = 'wrong-password'
    passwordInput.dispatchEvent(new Event('input', {bubbles: true}))
    await nextTick()
    verifyButton.click()
    await nextTick()

    expect(panel.querySelector('.mac-window-dot.close').disabled).toBe(true)
    expect(panel.querySelector('.mac-window-dot.minimize').disabled).toBe(true)
    expect(verifyButton.disabled).toBe(true)
    panel.querySelector('.mac-window-dot.close').click()
    expect(document.body.querySelector('.mac-dialog-panel.password-memo-verify-dialog')).not.toBeNull()

    deferred.reject({response: {data: {message: '当前用户密码错误'}}})
    await flushPromises()
    await nextTick()

    expect(verifyPasswordMemoAccess).toHaveBeenCalledWith(7, {loginPassword: 'wrong-password'})
    expect(panel.textContent).toContain('当前用户密码错误')
    expect(panel.querySelector('.mac-window-dot.close').disabled).toBe(false)
    expect(document.body.querySelector('.mac-dialog-panel.password-memo-verify-dialog')).not.toBeNull()
  })

  it('校验成功后自动复制密码且页面仅保留首字符掩码', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {...navigator, clipboard: {writeText}})
    verifyPasswordMemoAccess.mockResolvedValue(buildApiResponse({
      password: 'gnome-secret',
      maskedPassword: 'g**********'
    }))
    const wrapper = mount(PasswordMemo, {
      attachTo: document.body,
      global: {stubs: {transition: true}}
    })
    mountedWrappers.push(wrapper)
    await flushPromises()

    await wrapper.vm.openDetailDialog({id: 7})
    await nextTick()
    const panel = document.body.querySelector('.mac-dialog-panel.password-memo-verify-dialog')
    const passwordInput = panel.querySelector('input[autocomplete="current-password"]')
    passwordInput.value = 'login-password'
    passwordInput.dispatchEvent(new Event('input', {bubbles: true}))
    panel.querySelector('button[form="password-memo-verify-form"]').click()
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith('gnome-secret')
    expect(panel.textContent).toContain('g**********')
    expect(panel.textContent).toContain('账号密码已自动复制到剪贴板')
    expect([...panel.querySelectorAll('button')].some((button) => button.textContent.trim() === '复制密码')).toBe(false)
  })

  it('专用更新密码表单调用独立接口', async () => {
    updatePasswordMemoPassword.mockResolvedValue(buildApiResponse({
      id: 7,
      siteName: 'GitHub',
      siteUrl: 'https://github.com',
      username: 'gnome',
      maskedPassword: '********',
      passwordHistory: [{id: 9, maskedPassword: '********'}]
    }))
    const wrapper = mount(PasswordMemo, {
      attachTo: document.body,
      global: {stubs: {transition: true}}
    })
    mountedWrappers.push(wrapper)
    await flushPromises()
    await wrapper.vm.openDetailDialog({id: 7})
    wrapper.vm.openUpdatePasswordDialog()
    wrapper.vm.passwordUpdateForm.newPassword = 'new-secret'
    wrapper.vm.passwordUpdateForm.confirmPassword = 'new-secret'

    await wrapper.vm.submitPasswordUpdate()

    expect(updatePasswordMemoPassword).toHaveBeenCalledWith(7, {newPassword: 'new-secret'})
    expect(wrapper.vm.activeDetail.passwordHistory).toHaveLength(1)
  })
})
