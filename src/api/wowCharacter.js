import request from '@/api/request'

export function listWowCharacters(params) {
  return request.get('/wow-characters', {params})
}

export function createWowCharacter(data) {
  return request.post('/wow-characters', data)
}

export function updateWowCharacter(id, data) {
  return request.put(`/wow-characters/${id}`, data)
}

export function deleteWowCharacter(id) {
  return request.delete(`/wow-characters/${id}`)
}

export function getWowCharacterOverview(params) {
  return request.get('/wow-characters/overview', {params})
}
