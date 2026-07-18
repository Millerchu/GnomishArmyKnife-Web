// @vitest-environment happy-dom

import {mount} from '@vue/test-utils'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {THEME_STORAGE_KEY} from '../../utils/themePreference'
import ThemeToggle from '../ThemeToggle.vue'

function setInitialTheme(theme, preference = theme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.dataset.themePreference = preference
  document.documentElement.style.colorScheme = theme
}

function createStorage() {
  const values = new Map()
  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value))
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createStorage())
  setInitialTheme('dark')
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete document.documentElement.dataset.theme
  delete document.documentElement.dataset.themePreference
  document.documentElement.style.colorScheme = ''
})

describe('ThemeToggle', () => {
  it('深色主题下展示太阳和切换为浅色主题的可访问名称', () => {
    const wrapper = mount(ThemeToggle)
    const button = wrapper.get('button')

    expect(button.attributes('aria-label')).toBe('切换为浅色主题')
    expect(button.attributes('title')).toBe('切换为浅色主题')
    expect(wrapper.find('[data-theme-icon="sun"]').exists()).toBe(true)
    expect(wrapper.find('[data-theme-icon="moon"]').exists()).toBe(false)
  })

  it('连续点击同步主题、偏好、colorScheme 和本地存储', async () => {
    const wrapper = mount(ThemeToggle)
    const button = wrapper.get('button')
    localStorage.setItem('token', 'keep-token')
    localStorage.setItem('user', '{"username":"theme-user"}')

    await button.trigger('click')

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.dataset.themePreference).toBe('light')
    expect(document.documentElement.style.colorScheme).toBe('light')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    expect(localStorage.getItem('token')).toBe('keep-token')
    expect(localStorage.getItem('user')).toBe('{"username":"theme-user"}')
    expect(button.attributes('aria-label')).toBe('切换为深色主题')
    expect(button.attributes('title')).toBe('切换为深色主题')
    expect(wrapper.find('[data-theme-icon="moon"]').exists()).toBe(true)

    await button.trigger('click')

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.dataset.themePreference).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(button.attributes('aria-label')).toBe('切换为浅色主题')
    expect(wrapper.find('[data-theme-icon="sun"]').exists()).toBe(true)
  })

  it('历史 system 偏好按实际浅色状态切换为显式深色', async () => {
    setInitialTheme('light', 'system')
    localStorage.setItem(THEME_STORAGE_KEY, 'system')
    const wrapper = mount(ThemeToggle)

    expect(wrapper.find('[data-theme-icon="moon"]').exists()).toBe(true)
    await wrapper.get('button').trigger('click')

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.dataset.themePreference).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })
})
