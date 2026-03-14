import request from '@/api/request'

export function updateProfileApi(data) {
  return request.put('/user/profile', data)
}

export function updatePasswordApi(data) {
  return request.put('/user/password', data)
}
