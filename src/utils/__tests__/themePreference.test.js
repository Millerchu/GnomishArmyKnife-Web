import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyThemePreference,
  initializeTheme,
  normalizeThemePreference,
  resolveThemePreference,
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
