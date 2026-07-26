export const NAS_SSO_STATE_STORAGE_KEY = 'gak.nas-sso.state'

const NAS_SSO_BRIDGE_PATH = '/gak-sso/bridge.html'
const NAS_MANAGEMENT_PORT = '9999'
const NAS_SSO_WINDOW_NAME_PREFIX = 'gak-nas-sso:'
const STATE_PATTERN = /^[A-Za-z0-9_-]{32,128}$/
const STATE_BYTE_LENGTH = 32

function encodeBase64Url(bytes) {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/u, '')
}

export function generateNasSsoState(cryptoProvider = globalThis.crypto) {
  if (!cryptoProvider?.getRandomValues) {
    throw new Error('当前浏览器不支持安全随机数，无法启动单点登录')
  }
  const randomBytes = new Uint8Array(STATE_BYTE_LENGTH)
  cryptoProvider.getRandomValues(randomBytes)
  return encodeBase64Url(randomBytes)
}

export function isValidNasSsoState(state = '') {
  return STATE_PATTERN.test(`${state || ''}`)
}

export function resolveNasSsoBridgeUrl(
  configuredBridgeUrl = '',
  locationProvider = globalThis.location
) {
  if (configuredBridgeUrl) {
    return new URL(configuredBridgeUrl).toString()
  }
  if (!locationProvider?.origin || !locationProvider?.hostname) {
    throw new Error('无法识别当前访问地址')
  }

  const isNasGatewayOrigin = locationProvider.port === NAS_MANAGEMENT_PORT
    || locationProvider.hostname.endsWith('.ug.link')
  if (isNasGatewayOrigin) {
    return new URL(NAS_SSO_BRIDGE_PATH, locationProvider.origin).toString()
  }

  const nasOrigin = `${locationProvider.protocol}//${locationProvider.hostname}:${NAS_MANAGEMENT_PORT}`
  return new URL(NAS_SSO_BRIDGE_PATH, nasOrigin).toString()
}

export function buildNasSsoBridgeUrl(
  state,
  configuredBridgeUrl = '',
  locationProvider = globalThis.location
) {
  if (!isValidNasSsoState(state)) {
    throw new Error('单点登录状态参数无效')
  }
  const bridgeUrl = configuredBridgeUrl
    || import.meta.env?.VITE_NAS_SSO_BRIDGE_URL
  const targetUrl = new URL(resolveNasSsoBridgeUrl(bridgeUrl, locationProvider))
  targetUrl.searchParams.set('state', state)
  return targetUrl.toString()
}

export function storeNasSsoState(
  state,
  storage = sessionStorage,
  browsingContext = globalThis.window
) {
  if (!isValidNasSsoState(state)) {
    throw new Error('单点登录状态参数无效')
  }
  storage.setItem(NAS_SSO_STATE_STORAGE_KEY, state)
  if (browsingContext) {
    browsingContext.name = `${NAS_SSO_WINDOW_NAME_PREFIX}${state}`
  }
}

export function consumeNasSsoState(
  state,
  storage = sessionStorage,
  browsingContext = globalThis.window
) {
  const expectedState = storage.getItem(NAS_SSO_STATE_STORAGE_KEY) || ''
  const expectedWindowState = browsingContext?.name?.startsWith(NAS_SSO_WINDOW_NAME_PREFIX)
    ? browsingContext.name.slice(NAS_SSO_WINDOW_NAME_PREFIX.length)
    : ''
  storage.removeItem(NAS_SSO_STATE_STORAGE_KEY)
  if (browsingContext?.name?.startsWith(NAS_SSO_WINDOW_NAME_PREFIX)) {
    browsingContext.name = ''
  }
  return isValidNasSsoState(state)
    && (expectedState === state || expectedWindowState === state)
}
