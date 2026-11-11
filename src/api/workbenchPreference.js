import request from '@/api/request'

export function getWorkbenchPreferences() {
  return request.get('/workbench/preferences')
}

// 与现有 API 一致保留 Axios response；409 最新文档可由 error.response.data.data 读取。
export function saveWorkbenchPreferences({version, schemaVersion, payload}) {
  return request.put('/workbench/preferences', {version, schemaVersion, payload})
}
