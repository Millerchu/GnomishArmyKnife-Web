import request from '@/api/request'

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
