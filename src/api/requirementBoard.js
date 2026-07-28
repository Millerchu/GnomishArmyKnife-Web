import request from '@/api/request'

// 共享需求看板：所有接口均要求已登录，不依赖应用目录授权。
export function listRequirementItems(params) {
  return request.get('/requirement-items', {params})
}

export function listRequirementApps() {
  return request.get('/requirement-items/apps')
}

export function getRequirementItemDetail(id) {
  return request.get(`/requirement-items/${id}`)
}

export function createRequirementItem(data) {
  return request.post('/requirement-items', data)
}

export function updateRequirementItem(id, data) {
  return request.put(`/requirement-items/${id}`, data)
}

export function updateRequirementItemProgress(id, data) {
  return request.patch(`/requirement-items/${id}/progress`, data)
}

export function deleteRequirementItem(id, version) {
  return request.delete(`/requirement-items/${id}`, {params: {version}})
}
