import request from '@/api/request'

// 密码备忘录模块：列表维护与详情口令校验分开调用。
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

// 查看完整密码前需要再次校验当前登录用户密码。
export function verifyPasswordMemoAccess(id, data) {
  return request.post(`/password-memos/${id}/verify-access`, data)
}
