// @vitest-environment happy-dom

import {flushPromises, mount} from '@vue/test-utils'
import {nextTick} from 'vue'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import Home from '../Home.vue'
import {getCurrentUserAccessibleApps} from '@/api/permission'
import {getMyAvatarAttachments} from '@/api/attachment'

const routerPush = vi.fn()
const mountedWrappers = []
let mobileViewportMatches = true

vi.mock('vue-router', () => ({
  useRouter: () => ({push: routerPush})
}))

vi.mock('@/api/permission', () => ({
  getCurrentUserAccessibleApps: vi.fn()
}))

vi.mock('@/api/attachment', () => ({
  getMyAvatarAttachments: vi.fn(),
  saveMyAvatarAttachments: vi.fn()
}))

vi.mock('@/api/systemUser', () => ({
  listSystemUsers: vi.fn(),
  updateSystemUser: vi.fn()
}))

vi.mock('@/api/auth', () => ({
  changePasswordApi: vi.fn(),
  getPasswordPublicKeyApi: vi.fn()
}))

vi.mock('@/utils/rsaEncrypt', () => ({
  encryptPasswordByPublicKey: vi.fn(() => 'encrypted-password')
}))

function buildApiResponse(payload) {
  return {data: {code: 200, message: 'success', data: payload}}
}

function createMemoryStorage() {
  const storedValues = new Map()
  return {
    get length() {
      return storedValues.size
    },
    clear() {
      storedValues.clear()
    },
    getItem(key) {
      return storedValues.has(key) ? storedValues.get(key) : null
    },
    key(index) {
      return [...storedValues.keys()][index] ?? null
    },
    removeItem(key) {
      storedValues.delete(key)
    },
    setItem(key, value) {
      storedValues.set(key, String(value))
    }
  }
}

async function mountHome() {
  const wrapper = mount(Home, {
    attachTo: document.body,
    global: {
      stubs: {
        AppIconImage: {template: '<span />'},
        AuthenticatedImage: {template: '<span />'},
        AttachmentManager: {template: '<div />'},
        MacDialog: {
          props: ['modelValue'],
          template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>'
        },
        QuickCreateDialog: {template: '<div />'},
        ThemeToggle: {template: '<button type="button" aria-label="切换主题" />'},
        Transition: true
      }
    }
  })
  mountedWrappers.push(wrapper)
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  mobileViewportMatches = true
  vi.resetAllMocks()
  routerPush.mockReset()
  vi.stubGlobal('localStorage', createMemoryStorage())
  localStorage.setItem('token', 'component-test-token')
  localStorage.setItem('user', JSON.stringify({
    id: '1001',
    username: 'mobile-user',
    displayName: '移动用户',
    roleCode: 'USER'
  }))
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: mobileViewportMatches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })))
  getCurrentUserAccessibleApps.mockResolvedValue(buildApiResponse({
    featureCodes: ['APP_WORK_LOG'],
    permissionSource: 'BACKEND'
  }))
  getMyAvatarAttachments.mockResolvedValue(buildApiResponse([]))
})

afterEach(() => {
  while (mountedWrappers.length > 0) {
    mountedWrappers.pop().unmount()
  }
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('Home mobile behavior', () => {
  it('disables tool dragging through the same 720px breakpoint used by CSS', async () => {
    const wrapper = await mountHome()

    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 720px)')
    expect(wrapper.vm.isMobileViewport).toBe(true)
    expect(wrapper.get('.tool-item').attributes('draggable')).toBe('false')

    mobileViewportMatches = false
    window.dispatchEvent(new Event('resize'))
    await nextTick()

    expect(wrapper.vm.isMobileViewport).toBe(false)
    expect(wrapper.get('.tool-item').attributes('draggable')).toBe('true')
  })

  it('opens the system disclosure and restores trigger focus when Escape closes it', async () => {
    const wrapper = await mountHome()
    const trigger = wrapper.get('.system-menu-toggle')

    expect(trigger.attributes('aria-expanded')).toBe('false')
    await trigger.trigger('click')

    expect(trigger.attributes('aria-expanded')).toBe('true')
    const firstAction = wrapper.get('.system-dropdown-item')
    firstAction.element.focus()
    expect(document.activeElement).toBe(firstAction.element)

    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}))
    await nextTick()

    expect(wrapper.find('.system-menu-dropdown').exists()).toBe(false)
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger.element)
  })
})
