import request from '@/api/request'

export function createWorkLog(data) {
  return request.post('/work-logs', data)
}

export function updateWorkLog(id, data) {
  return request.put(`/work-logs/${id}`, data)
}

export function deleteWorkLog(id) {
  return request.delete(`/work-logs/${id}`)
}

export function getWorkLogDetail(id) {
  return request.get(`/work-logs/${id}`)
}

export function listWorkLogs(params) {
  return request.get('/work-logs', { params })
}

export function getWeeklyBrief(params) {
  return request.get('/work-logs/weekly-brief', { params })
}
