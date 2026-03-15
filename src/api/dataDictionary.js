import request from '@/api/request'

// 数据字典模块同时维护字典主表和字典项明细。
export function listDataDictionaries(params) {
  return request.get('/system/dictionaries', {params})
}

export function createDataDictionary(data) {
  return request.post('/system/dictionaries', data)
}

export function updateDataDictionary(id, data) {
  return request.put(`/system/dictionaries/${id}`, data)
}

export function deleteDataDictionary(id) {
  return request.delete(`/system/dictionaries/${id}`)
}

export function updateDataDictionaryStatus(id, data) {
  return request.patch(`/system/dictionaries/${id}/status`, data)
}

// 字典项接口全部挂在具体字典下，便于后端按主从关系组织路由。
export function listDataDictionaryItems(dictionaryId, params) {
  return request.get(`/system/dictionaries/${dictionaryId}/items`, {params})
}

export function createDataDictionaryItem(dictionaryId, data) {
  return request.post(`/system/dictionaries/${dictionaryId}/items`, data)
}

export function updateDataDictionaryItem(dictionaryId, itemId, data) {
  return request.put(`/system/dictionaries/${dictionaryId}/items/${itemId}`, data)
}

export function deleteDataDictionaryItem(dictionaryId, itemId) {
  return request.delete(`/system/dictionaries/${dictionaryId}/items/${itemId}`)
}

export function updateDataDictionaryItemStatus(dictionaryId, itemId, data) {
  return request.patch(`/system/dictionaries/${dictionaryId}/items/${itemId}/status`, data)
}
