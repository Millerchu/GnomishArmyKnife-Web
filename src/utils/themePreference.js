export const THEME_STORAGE_KEY = 'gak_theme_preference'

export const THEME_PREFERENCE = Object.freeze({
  DARK: 'dark',
  LIGHT: 'light',
  SYSTEM: 'system'
})

const SUPPORTED_THEME_PREFERENCES = new Set(Object.values(THEME_PREFERENCE))
const SUPPORTED_APPLIED_THEMES = new Set([
  THEME_PREFERENCE.DARK,
  THEME_PREFERENCE.LIGHT
])

export function normalizeThemePreference(preference) {
  return SUPPORTED_THEME_PREFERENCES.has(preference)
    ? preference
    : THEME_PREFERENCE.DARK
}

export function resolveThemePreference(preference, prefersDark = false) {
  const normalizedPreference = normalizeThemePreference(preference)
  if (normalizedPreference === THEME_PREFERENCE.SYSTEM) {
    return prefersDark ? THEME_PREFERENCE.DARK : THEME_PREFERENCE.LIGHT
  }
  return normalizedPreference
}

// 切换入口应依据页面已经应用的颜色模式，避免历史 system 偏好造成方向相反。
export function getAppliedTheme(root = globalThis.document?.documentElement) {
  const appliedTheme = root?.dataset?.theme
  return SUPPORTED_APPLIED_THEMES.has(appliedTheme)
    ? appliedTheme
    : THEME_PREFERENCE.DARK
}

function readStoredPreference(storage) {
  try {
    return storage?.getItem(THEME_STORAGE_KEY)
  } catch {
    return null
  }
}

function persistPreference(storage, preference) {
  try {
    storage?.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // 浏览器禁用本地存储时仍应正常应用本次主题，不中断页面启动。
  }
}

function detectSystemDarkMode(matchMedia) {
  try {
    return Boolean(matchMedia?.('(prefers-color-scheme: dark)').matches)
  } catch {
    return false
  }
}

export function applyThemePreference(preference, options = {}) {
  const normalizedPreference = normalizeThemePreference(preference)
  const root = options.root ?? globalThis.document?.documentElement
  const storage = options.storage ?? globalThis.localStorage
  const matchMedia = options.matchMedia ?? globalThis.window?.matchMedia?.bind(globalThis.window)
  const resolvedTheme = resolveThemePreference(
    normalizedPreference,
    detectSystemDarkMode(matchMedia)
  )

  if (root) {
    root.dataset.theme = resolvedTheme
    root.dataset.themePreference = normalizedPreference
    root.style.colorScheme = resolvedTheme
  }

  if (options.persist !== false) {
    persistPreference(storage, normalizedPreference)
  }

  return {preference: normalizedPreference, resolvedTheme}
}

// 主题按钮只提供深浅二态，切换后将 system 收敛为明确的用户选择。
export function toggleThemePreference(options = {}) {
  const root = options.root ?? globalThis.document?.documentElement
  const appliedTheme = getAppliedTheme(root)
  const nextPreference = appliedTheme === THEME_PREFERENCE.DARK
    ? THEME_PREFERENCE.LIGHT
    : THEME_PREFERENCE.DARK

  return applyThemePreference(nextPreference, {
    ...options,
    root
  })
}

export function initializeTheme(options = {}) {
  const storage = options.storage ?? globalThis.localStorage
  const storedPreference = readStoredPreference(storage)
  return applyThemePreference(storedPreference, {
    ...options,
    storage,
    persist: false
  })
}
