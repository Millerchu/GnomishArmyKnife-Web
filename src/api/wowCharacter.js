import request from '@/api/request'

// WoW 角色模块：角色列表维护和首页概览统计接口。
export function listWowCharacters(params) {
  return request.get('/wow-characters', {params})
}

export function createWowCharacter(data) {
  return request.post('/wow-characters', data)
}

export function updateWowCharacter(id, data) {
  return request.put(`/wow-characters/${id}`, data)
}

export function resetWowCharacterWeeklyProgress(id) {
  return request.post(`/wow-characters/${id}/weekly-reset`)
}

export function resetAllWowCharacterWeeklyProgress() {
  return request.post('/wow-characters/weekly-reset')
}

export function deleteWowCharacter(id) {
  return request.delete(`/wow-characters/${id}`)
}

export function getWowCharacterOverview(params) {
  return request.get('/wow-characters/overview', {params})
}

export function getWowSeasonInfo() {
  return request.get('/wow-characters/season')
}

export function resetWowMythicSeason() {
  return request.post('/wow-characters/mythic-season-reset')
}

export function listWowCharacterMythicSeasonHistory(id) {
  return request.get(`/wow-characters/${id}/mythic-season-history`)
}

export function listWowSpecializationGuides() {
  return request.get('/wow-specialization-guides')
}

export function updateWowSpecializationGuide(id, data) {
  return request.put(`/wow-specialization-guides/${id}`, data)
}
