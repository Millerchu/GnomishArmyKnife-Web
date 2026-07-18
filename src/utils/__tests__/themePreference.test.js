import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyThemePreference,
  getAppliedTheme,
  initializeTheme,
  normalizeThemePreference,
  resolveThemePreference,
  toggleThemePreference,
  THEME_PREFERENCE,
  THEME_STORAGE_KEY
} from '../themePreference.js'

function createRoot() {
  return {dataset: {}, style: {}}
}

function createStorage(initialValue = null) {
  const values = new Map()
  if (initialValue !== null) {
    values.set(THEME_STORAGE_KEY, initialValue)
  }
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    values
  }
}

test('非法主题偏好回退为深色，避免页面出现未定义状态', () => {
  assert.equal(normalizeThemePreference('sepia'), THEME_PREFERENCE.DARK)
  assert.equal(normalizeThemePreference(null), THEME_PREFERENCE.DARK)
})

test('系统主题偏好根据媒体查询解析为当前颜色模式', () => {
  assert.equal(resolveThemePreference(THEME_PREFERENCE.SYSTEM, true), THEME_PREFERENCE.DARK)
  assert.equal(resolveThemePreference(THEME_PREFERENCE.SYSTEM, false), THEME_PREFERENCE.LIGHT)
})

test('读取根节点当前实际主题，缺失或非法状态回退为深色', () => {
  assert.equal(getAppliedTheme({dataset: {theme: 'light'}}), THEME_PREFERENCE.LIGHT)
  assert.equal(getAppliedTheme({dataset: {theme: 'dark'}}), THEME_PREFERENCE.DARK)
  assert.equal(getAppliedTheme({dataset: {theme: 'sepia'}}), THEME_PREFERENCE.DARK)
  assert.equal(getAppliedTheme(null), THEME_PREFERENCE.DARK)
})

test('切换主题时同步根节点并持久化用户偏好', () => {
  const root = createRoot()
  const storage = createStorage()

  const result = applyThemePreference(THEME_PREFERENCE.LIGHT, {root, storage})

  assert.deepEqual(result, {preference: 'light', resolvedTheme: 'light'})
  assert.equal(root.dataset.theme, 'light')
  assert.equal(root.dataset.themePreference, 'light')
  assert.equal(root.style.colorScheme, 'light')
  assert.equal(storage.values.get(THEME_STORAGE_KEY), 'light')
})

test('初始化主题读取保存的系统偏好且不重复写入存储', () => {
  const root = createRoot()
  const storage = createStorage(THEME_PREFERENCE.SYSTEM)
  let writeCount = 0
  const countingStorage = {
    getItem: storage.getItem,
    setItem: () => {
      writeCount += 1
    }
  }

  const result = initializeTheme({
    root,
    storage: countingStorage,
    matchMedia: () => ({matches: true})
  })

  assert.deepEqual(result, {preference: 'system', resolvedTheme: 'dark'})
  assert.equal(root.dataset.theme, 'dark')
  assert.equal(root.dataset.themePreference, 'system')
  assert.equal(writeCount, 0)
})

test('历史系统偏好按已解析主题切换为相反的显式偏好', () => {
  const root = createRoot()
  const storage = createStorage()
  root.dataset.theme = THEME_PREFERENCE.DARK
  root.dataset.themePreference = THEME_PREFERENCE.SYSTEM

  const lightResult = toggleThemePreference({root, storage})

  assert.deepEqual(lightResult, {preference: 'light', resolvedTheme: 'light'})
  assert.equal(root.dataset.theme, 'light')
  assert.equal(root.dataset.themePreference, 'light')
  assert.equal(root.style.colorScheme, 'light')
  assert.equal(storage.values.get(THEME_STORAGE_KEY), 'light')

  const darkResult = toggleThemePreference({root, storage})

  assert.deepEqual(darkResult, {preference: 'dark', resolvedTheme: 'dark'})
  assert.equal(root.dataset.theme, 'dark')
  assert.equal(root.dataset.themePreference, 'dark')
  assert.equal(root.style.colorScheme, 'dark')
  assert.equal(storage.values.get(THEME_STORAGE_KEY), 'dark')
})

test('存储读写异常时仍可初始化并切换当前页面主题', () => {
  const root = createRoot()
  const unavailableStorage = {
    getItem: () => {
      throw new Error('storage unavailable')
    },
    setItem: () => {
      throw new Error('storage unavailable')
    }
  }

  const initialized = initializeTheme({root, storage: unavailableStorage})
  assert.deepEqual(initialized, {preference: 'dark', resolvedTheme: 'dark'})

  const toggled = toggleThemePreference({root, storage: unavailableStorage})
  assert.deepEqual(toggled, {preference: 'light', resolvedTheme: 'light'})
  assert.equal(root.dataset.theme, 'light')
  assert.equal(root.dataset.themePreference, 'light')
  assert.equal(root.style.colorScheme, 'light')
})
