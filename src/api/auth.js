import request from '@/api/request'

// 认证模块：验证码、公钥、登录和注册都从这里发起。
export function getCaptchaApi() {
  return request.get('/auth/captcha')
}

export function getPasswordPublicKeyApi() {
  return request.get('/auth/password-public-key')
}

export function loginApi(data) {
  return request.post('/auth/login', data)
}

export function registerApi(data) {
  return request.post('/auth/register', data)
}
