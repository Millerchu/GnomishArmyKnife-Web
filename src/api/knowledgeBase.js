import request from '@/api/request'

// 经验库模块：列表、详情、增删改和首页随机 Banner 推荐。
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

export function getKnowledgeHighlights(params) {
  return request.get('/knowledge-base/highlights', {params})
}
