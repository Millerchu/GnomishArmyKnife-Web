import axios from 'axios'
import {AUTH_TOKEN_STORAGE_KEY, clearAuthState} from '@/utils/authStorage'
import {buildAppPath} from '@/utils/appPaths'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || buildAppPath('api')
const PUBLIC_REQUEST_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/captcha',
  '/auth/password-public-key',
  '/auth/nas-sso/exchange',
  '/auth/logout',
  '/knowledge-base/public-highlights'
]
let authRedirecting = false

function isPublicAuthRequest(url = '') {
  return PUBLIC_REQUEST_PATHS.some((path) => url.includes(path))
}

function isAuthExpiredCode(code = '') {
  const normalized = String(code || '').trim().toUpperCase()
  return [
    '401',
    '40101',
    '40102',
    'UNAUTHORIZED',
    'TOKEN_EXPIRED',
    'TOKEN_INVALID',
    'LOGIN_EXPIRED',
    'NOT_LOGIN',
    'NO_LOGIN'
  ].includes(normalized)
}

function isAuthExpiredMessage(message = '') {
  const normalized = String(message || '').trim().toLowerCase()
  return [
    '登录超时',
    '登录已过期',
    '未登录',
    '请重新登录',
    'token已过期',
    'token过期',
    'token无效',
    '认证失败',
    '认证已过期'
  ].some((item) => normalized.includes(item.toLowerCase()))
}

function redirectToAuthentication() {
  if (authRedirecting) {
    return
  }
  authRedirecting = true
  clearAuthState(localStorage)
  const authenticationPath = buildAppPath()
  if (window.location.pathname !== authenticationPath) {
    window.location.replace(authenticationPath)
    return
  }
  window.location.reload()
}

function shouldForceLogout(payload, status, url = '') {
  if (isPublicAuthRequest(url)) {
    return false
  }

  if (status === 401) {
    return true
  }

  const code = payload?.code || payload?.errorCode || ''
  const message = payload?.message || payload?.msg || payload?.error || ''

  return isAuthExpiredCode(code) || isAuthExpiredMessage(message)
}

// 全局请求实例统一处理基础路径、超时和登录态透传。
const request = axios.create({
  baseURL: apiBaseUrl,
  timeout: 8000,
  withCredentials: true
})

request.interceptors.request.use((config) => {
  // 登录成功后自动附带 Bearer Token，业务接口无需重复处理鉴权头。
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  (response) => {
    if (shouldForceLogout(response?.data, response?.status, response?.config?.url || '')) {
      redirectToAuthentication()
      return Promise.reject(new Error('登录状态已失效'))
    }
    return response
  },
  (error) => {
    if (shouldForceLogout(error?.response?.data, error?.response?.status, error?.config?.url || '')) {
      redirectToAuthentication()
      return Promise.reject(new Error('登录状态已失效'))
    }
    return Promise.reject(error)
  }
)

export default request
