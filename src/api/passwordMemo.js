import request from '@/api/request'

export function listPasswordMemos(params) {
  return request.get('/password-memos', {params})
}

export function createPasswordMemo(data) {
  return request.post('/password-memos', data)
}

export function updatePasswordMemo(id, data) {
  return request.put(`/password-memos/${id}`, data)
}

export function deletePasswordMemo(id) {
  return request.delete(`/password-memos/${id}`)
}

export function getPasswordMemoDetail(id) {
  return request.get(`/password-memos/${id}`)
}

export function verifyPasswordMemoAccess(id, data) {
  return request.post(`/password-memos/${id}/verify-access`, data)
}
