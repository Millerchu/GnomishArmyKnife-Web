import request from '@/api/request'

// 经验库模块：公共经验、投稿审核和登录页推荐短句。
export function listKnowledgeEntries(params) {
  return request.get('/knowledge-base/entries', {params})
}

export function getKnowledgeEntryDetail(id) {
  return request.get(`/knowledge-base/entries/${id}`)
}

export function createKnowledgeEntry(data) {
  return request.post('/knowledge-base/entries', data)
}

export function updateKnowledgeEntry(id, data) {
  return request.put(`/knowledge-base/entries/${id}`, data)
}

export function deleteKnowledgeEntry(id) {
  return request.delete(`/knowledge-base/entries/${id}`)
}

export function publishKnowledgeEntry(id, data) {
  return request.put(`/knowledge-base/entries/${id}/publish`, data)
}

export function rejectKnowledgeEntry(id, data) {
  return request.put(`/knowledge-base/entries/${id}/reject`, data)
}

export function getKnowledgeHighlights(params) {
  return request.get('/knowledge-base/highlights', {params})
}

export function getPublicKnowledgeHighlights(params) {
  return request.get('/knowledge-base/public-highlights', {params})
}
