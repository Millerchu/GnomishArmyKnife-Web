// @vitest-environment happy-dom

import {flushPromises, mount} from '@vue/test-utils'
import {defineComponent, nextTick, ref} from 'vue'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import Home from '../Home.vue'
import {getCurrentUserAccessibleApps} from '@/api/permission'
import {getMyAvatarAttachments, saveMyAvatarAttachments} from '@/api/attachment'
import {updateSystemUser} from '@/api/systemUser'
import {getWeeklyBrief} from '@/api/workLog'
import WorkLogCard from '@/components/workbench/WorkLogCard.vue'
import {useWorkbenchAccess} from '@/composables/useWorkbenchAccess'

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

vi.mock('@/api/workLog', () => ({listUnfinishedWorkItems: vi.fn(async () => ({data: {data: []}})), getWeeklyBrief: vi.fn(async () => ({data: {data: []}}))}))

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

async function mountHome(component = Home) {
  const wrapper = mount(component, {
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
        MessageHost: {template: '<button type="button" aria-label="消息" />'},
        QuickCreateDialog: {template: '<div />'},
        RequirementBoard: {template: '<div />'},
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
    userId: '1001',
    apps: [],
    grantedFeatureCodes: ['APP_WORK_LOG'],
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
  it('保存个人资料触发 persistUser 后，后台刷新权限且日志卡不重新挂载', async () => {
    const wrapper = await mountHome()
    const card = wrapper.findComponent(WorkLogCard).vm.$.uid
    let finish
    getCurrentUserAccessibleApps.mockReturnValueOnce(new Promise(resolve => {finish = resolve}))
    updateSystemUser.mockResolvedValue(buildApiResponse({id: '1001', username: 'mobile-user', displayName: '新昵称'}))
    saveMyAvatarAttachments.mockResolvedValue(buildApiResponse([]))
    wrapper.vm.profileForm.displayName = '新昵称'
    await wrapper.vm.submitProfile(); await flushPromises()
    expect(wrapper.vm.appPermissionLoading).toBe(false)
    expect(JSON.parse(localStorage.getItem('user')).displayName).toBe('新昵称')
    expect(wrapper.findComponent(WorkLogCard).vm.$.uid).toBe(card)
    finish(buildApiResponse({userId: '1001', grantedFeatureCodes: ['APP_WORK_LOG'], apps: [], permissionSource: 'BACKEND'}))
    await flushPromises()
    expect(wrapper.findComponent(WorkLogCard).vm.$.uid).toBe(card)
    expect(getWeeklyBrief).toHaveBeenCalledOnce()
  })

  it('返回首页仅触发一次后台权限刷新，保留已有授权直到成功替换', async () => {
    const Provider = defineComponent({
      components: {Home},
      setup() { return {home: ref(true), ...useWorkbenchAccess(true)} },
      template: '<Home v-if="home"/><div v-else>其他页面</div>'
    })
    const wrapper = await mountHome(Provider)
    expect(getCurrentUserAccessibleApps).toHaveBeenCalledOnce()
    // 修改 setup 状态，模拟路由卸载与重新挂载。
    wrapper.vm.home = false; await nextTick()
    let finish
    getCurrentUserAccessibleApps.mockReturnValueOnce(new Promise(resolve => {finish = resolve}))
    wrapper.vm.home = true; await flushPromises()
    expect(getCurrentUserAccessibleApps).toHaveBeenCalledTimes(2)
    expect(wrapper.vm.loading).toBe(false)
    expect(wrapper.findComponent(WorkLogCard).exists()).toBe(true)
    expect(wrapper.text()).not.toContain('正在读取当前账号的应用权限')
    finish(buildApiResponse({userId: '1001', grantedFeatureCodes: [], apps: [], permissionSource: 'BACKEND'}))
    await flushPromises()
    expect(wrapper.findComponent(WorkLogCard).exists()).toBe(false)
    expect(wrapper.text()).toContain('当前账号暂无可见应用')
  })

  it('keeps message control separate and system menu last', async () => {
    const wrapper = await mountHome()
    const controlLabels = wrapper.find('.top-right-wrap').findAll('button')
      .map((button) => button.attributes('aria-label'))

    expect(controlLabels).toEqual(['切换主题', '消息', '系统菜单'])
  })

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

  it('opens system logs only for administrators with a backend app grant', async () => {
    localStorage.setItem('user', JSON.stringify({roleCode: 'ADMIN', username: 'synthetic-admin'}))
    getCurrentUserAccessibleApps.mockResolvedValue(buildApiResponse({grantedFeatureCodes: ['APP_SYSTEM_LOG'], permissionSource: 'BACKEND'}))
    const wrapper = await mountHome()
    expect(wrapper.findAll('.tool-item').some(tool => tool.text().includes('系统日志'))).toBe(false)
    await wrapper.get('.system-menu-toggle').trigger('click')
    const action = wrapper.findAll('.system-dropdown-item').find(item => item.text().includes('系统日志'))
    expect(action).toBeDefined()
    await action.trigger('click')
    expect(routerPush).toHaveBeenCalledWith('/system-log')
  })

  it.each([
    ['USER', {grantedFeatureCodes: ['APP_SYSTEM_LOG'], permissionSource: 'BACKEND'}],
    ['ADMIN', {grantedFeatureCodes: [], permissionSource: 'BACKEND'}],
    ['ADMIN', {grantedFeatureCodes: ['APP_SYSTEM_LOG'], permissionSource: 'ADMIN_FALLBACK'}],
    ['ADMIN', {grantedFeatureCodes: ['APP_SYSTEM_LOG'], apps: [{appCode: 'APP_SYSTEM_LOG', enabled: false}], permissionSource: 'BACKEND'}]
  ])('hides the system log menu without both role and enabled grant: %s, %j', async (roleCode, payload) => {
    localStorage.setItem('user', JSON.stringify({roleCode, username: 'synthetic-user'}))
    getCurrentUserAccessibleApps.mockResolvedValue(buildApiResponse(payload))
    const wrapper = await mountHome()
    await wrapper.get('.system-menu-toggle').trigger('click')
    expect(wrapper.findAll('.system-dropdown-item').some(item => item.text().includes('系统日志'))).toBe(false)
  })

  it('hides the system log menu when app permissions fail to load', async () => {
    localStorage.setItem('user', JSON.stringify({roleCode: 'ADMIN', username: 'synthetic-admin'}))
    getCurrentUserAccessibleApps.mockRejectedValue(new Error('synthetic network failure'))
    const wrapper = await mountHome()
    await wrapper.get('.system-menu-toggle').trigger('click')
    expect(wrapper.findAll('.system-dropdown-item').some(item => item.text().includes('系统日志'))).toBe(false)
  })

  it.each([{enabled: false}, {status: 'DISABLED'}])('hides logs for known inactive user state: %j', async (state) => {
    localStorage.setItem('user', JSON.stringify({roleCode: 'ADMIN', username: 'synthetic-admin', ...state}))
    getCurrentUserAccessibleApps.mockResolvedValue(buildApiResponse({grantedFeatureCodes: ['APP_SYSTEM_LOG'], permissionSource: 'BACKEND'}))
    const wrapper = await mountHome()
    await wrapper.get('.system-menu-toggle').trigger('click')
    expect(wrapper.findAll('.system-dropdown-item').some(item => item.text().includes('系统日志'))).toBe(false)
  })
})
