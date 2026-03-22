import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/captcha', '/auth/password-public-key']
let authRedirecting = false

function clearAuthState() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  sessionStorage.removeItem('currentUserPlainPassword')
}

function isPublicAuthRequest(url = '') {
  return PUBLIC_AUTH_PATHS.some((path) => url.includes(path))
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

function redirectToLogin() {
  if (authRedirecting) {
    return
  }
  authRedirecting = true
  clearAuthState()
  if (window.location.pathname !== '/login') {
    window.location.replace('/login')
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
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  (response) => {
    if (shouldForceLogout(response?.data, response?.status, response?.config?.url || '')) {
      redirectToLogin()
      return Promise.reject(new Error('登录状态已失效'))
    }
    return response
  },
  (error) => {
    if (shouldForceLogout(error?.response?.data, error?.response?.status, error?.config?.url || '')) {
      redirectToLogin()
      return Promise.reject(new Error('登录状态已失效'))
    }
    return Promise.reject(error)
  }
)

export default request
