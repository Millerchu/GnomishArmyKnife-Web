const PUBLIC_ROUTES = new Set(['/login', '/register'])
const DEFAULT_AUTHENTICATED_PATH = '/home'
const DEFAULT_GUEST_PATH = '/login'

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
    return authenticated && normalizedPath === DEFAULT_GUEST_PATH
      ? DEFAULT_AUTHENTICATED_PATH
      : null
  }

  return authenticated ? null : DEFAULT_GUEST_PATH
}
