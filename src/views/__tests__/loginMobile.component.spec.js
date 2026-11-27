// @vitest-environment happy-dom

import {flushPromises, mount} from '@vue/test-utils'
import {nextTick} from 'vue'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import Login from '../Login.vue'
import {changePasswordApi, getCaptchaApi, getPasswordPublicKeyApi, loginApi} from '@/api/auth'
import {getPublicKnowledgeHighlights} from '@/api/knowledgeBase'
import {readAuthState} from '@/utils/authStorage'

vi.mock('vue-router', () => ({
  useRouter: () => ({push: vi.fn()})
}))

vi.mock('@/api/auth', () => ({
  changePasswordApi: vi.fn(),
  getCaptchaApi: vi.fn(),
  logoutApi: vi.fn(),
  getPasswordPublicKeyApi: vi.fn(),
  loginApi: vi.fn()
}))

vi.mock('@/api/knowledgeBase', () => ({
  getPublicKnowledgeHighlights: vi.fn()
}))

vi.mock('@/utils/rsaEncrypt', () => ({
  encryptPasswordByPublicKey: vi.fn(() => 'encrypted-password')
}))

const mountedWrappers = []

function buildApiResponse(payload) {
  return {data: {code: 200, message: 'success', data: payload}}
}

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  getCaptchaApi.mockResolvedValue(buildApiResponse({image: 'data:image/png;base64,AA=='}))
  getPasswordPublicKeyApi.mockResolvedValue(buildApiResponse({publicKey: 'public-key'}))
  getPublicKnowledgeHighlights.mockResolvedValue(buildApiResponse([]))
})

afterEach(() => {
  while (mountedWrappers.length > 0) {
    mountedWrappers.pop().unmount()
  }
})

async function mountLogin() {
  const wrapper = mount(Login, {
    global: {
      stubs: {
        RouterLink: {
          props: ['to'],
          template: '<a><slot /></a>'
        }
      }
    }
  })
  mountedWrappers.push(wrapper)
  await flushPromises()
  return wrapper
}

describe('Login mobile accessibility', () => {
  it('为登录控件提供可访问名称和初始化忙碌状态', async () => {
    const wrapper = await mountLogin()

    expect(wrapper.get('label[for="login-username"]').text()).toBe('用户名')
    expect(wrapper.get('label[for="login-password"]').text()).toBe('密码')
    expect(wrapper.get('label[for="login-captcha"]').text()).toBe('验证码')
    expect(wrapper.get('#login-username').attributes('autocomplete')).toBe('username')
    expect(wrapper.get('#login-password').attributes('autocomplete')).toBe('current-password')
    expect(wrapper.get('.glass-box').attributes('aria-busy')).toBe('false')
    expect(wrapper.get('.captcha-box').attributes('aria-label')).toBe('刷新验证码')
    expect(wrapper.get('.captcha-image').attributes('src')).toBe('data:image/png;base64,AA==')

    wrapper.vm.loading = true
    await nextTick()

    expect(wrapper.get('.glass-box').attributes('aria-busy')).toBe('true')
  })

  it('强制改密会话先提交新密码，再回到登录表单', async () => {
    loginApi.mockResolvedValue(buildApiResponse({
      token: 'restricted-token', user: {id: '7', username: 'tester', forceChangePassword: true}
    }))
    changePasswordApi.mockResolvedValue(buildApiResponse(null))
    const wrapper = await mountLogin()
    await wrapper.get('#login-username').setValue('tester')
    await wrapper.get('#login-password').setValue('initial-password')
    await wrapper.get('#login-captcha').setValue('ABCD')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('.title').text()).toBe('修改密码')
    expect(readAuthState().token).toBe('restricted-token')
    await wrapper.get('[aria-label="当前密码"]').setValue('initial-password')
    await wrapper.get('[aria-label="新密码"]').setValue('updated-password')
    await wrapper.get('[aria-label="确认新密码"]').setValue('updated-password')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(changePasswordApi).toHaveBeenCalledWith({
      oldEncryptedPassword: 'encrypted-password', newEncryptedPassword: 'encrypted-password'
    })
    expect(readAuthState().token).toBe('')
    expect(wrapper.get('.title').text()).toBe('登录')
  })

  it('以即时播报区域反馈表单校验错误', async () => {
    const wrapper = await mountLogin()

    expect(wrapper.find('#login-error').exists()).toBe(false)
    await wrapper.get('form').trigger('submit')

    const errorTip = wrapper.get('#login-error')
    expect(errorTip.text()).toBe('请输入用户名')
    expect(errorTip.attributes('role')).toBe('alert')
    expect(errorTip.attributes('aria-live')).toBe('assertive')
  })

  it('允许键盘以标准按钮行为切换密码可见状态', async () => {
    const wrapper = await mountLogin()
    const toggleButton = wrapper.get('.password-toggle')

    expect(wrapper.get('#login-password').attributes('type')).toBe('password')
    expect(toggleButton.attributes('aria-label')).toBe('显示密码')
    expect(toggleButton.attributes('aria-pressed')).toBe('false')

    await toggleButton.trigger('click')

    expect(wrapper.get('#login-password').attributes('type')).toBe('text')
    expect(toggleButton.attributes('aria-label')).toBe('隐藏密码')
    expect(toggleButton.attributes('aria-pressed')).toBe('true')
  })
})
