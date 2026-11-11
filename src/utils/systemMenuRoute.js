export function isSystemMenuOnlyRoute(route = '') {
  const normalized = `${route || ''}`.trim().toLowerCase()
  if (!normalized) {
    return false
  }

  if (normalized.startsWith('/system/') || normalized === '/system-log') {
    return true
  }

  return [
    '/data-dictionary',
    '/user-management',
    '/app-management',
    '/permission-management',
    '/data-migration'
  ].includes(normalized)
}

