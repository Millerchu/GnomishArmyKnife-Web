const DEFAULT_APP_BASE_PATH = '/'

export function normalizeAppBasePath(basePath = DEFAULT_APP_BASE_PATH) {
  const trimmedPath = `${basePath || ''}`.trim()
  if (!trimmedPath || trimmedPath === '/') {
    return DEFAULT_APP_BASE_PATH
  }
  return `/${trimmedPath.replace(/^\/+|\/+$/gu, '')}/`
}

export function buildAppPath(path = '', basePath = import.meta.env.BASE_URL) {
  const normalizedBasePath = normalizeAppBasePath(basePath)
  const normalizedPath = `${path || ''}`.replace(/^\/+/u, '')
  return normalizedPath ? `${normalizedBasePath}${normalizedPath}` : normalizedBasePath
}
