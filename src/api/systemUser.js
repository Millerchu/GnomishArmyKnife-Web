import request from '@/api/request'

export function listSystemUsers(params) {
  return request.get('/system/users', {params})
}

export function createSystemUser(data) {
  return request.post('/system/users', data)
}

export function updateSystemUser(id, data) {
  return request.put(`/system/users/${id}`, data)
}

export function deleteSystemUser(id) {
  return request.delete(`/system/users/${id}`)
}

export function updateSystemUserStatus(id, data) {
  return request.patch(`/system/users/${id}/status`, data)
}

export function resetSystemUserPassword(id, data) {
  return request.post(`/system/users/${id}/reset-password`, data)
}
