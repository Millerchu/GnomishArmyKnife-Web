import request from './request'

export function listSystemLogs(params) {
  return request.get('/system/logs', {params})
}

export function getSystemLog(id) {
  return request.get(`/system/logs/${encodeURIComponent(id)}`)
}
