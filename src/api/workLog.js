import request from '@/api/request'

// 工作日志模块：日志 CRUD 与周报摘要统计共用一组接口。
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

// 周摘要接口预留给后续周报概览或统计面板使用。
export function getWeeklyBrief(params) {
  return request.get('/work-logs/weekly-brief', { params })
}
