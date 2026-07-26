const PUBLIC_ROUTES = new Set(['/', '/login', '/syslogin', '/register', '/nas-sso-callback'])
const AUTH_ENTRY_ROUTES = new Set(['/', '/login', '/syslogin', '/nas-sso-callback'])
const DEFAULT_AUTHENTICATED_PATH = '/home'
const DEFAULT_GUEST_PATH = '/'

export function isPublicRoute(path = '') {
  return PUBLIC_ROUTES.has(`${path || ''}`.trim())
}

export function hasAuthenticatedSession(authState = {}) {
  return Boolean(authState.token && authState.user)
}

export function resolveNavigationTarget(path = '', authState = {}) {
  const normalizedPath = `${path || ''}`.trim() || '/'
  const authenticated = hasAuthenticatedSession(authState)

  if (isPublicRoute(normalizedPath)) {
    return authenticated && AUTH_ENTRY_ROUTES.has(normalizedPath)
      ? DEFAULT_AUTHENTICATED_PATH
      : null
  }

  return authenticated ? null : DEFAULT_GUEST_PATH
}
