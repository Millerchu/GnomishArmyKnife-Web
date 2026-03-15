import request from '@/api/request'

// 健康模块覆盖指标记录、趋势摘要、体检报告和报告上传。
export function listHealthRecords(params) {
  return request.get('/health-records', {params})
}

export function createHealthRecord(data) {
  return request.post('/health-records', data)
}

export function updateHealthRecord(id, data) {
  return request.put(`/health-records/${id}`, data)
}

export function deleteHealthRecord(id) {
  return request.delete(`/health-records/${id}`)
}

export function getHealthSummary(params) {
  return request.get('/health-records/summary', {params})
}

export function getHealthTrends(params) {
  return request.get('/health-records/trends', {params})
}

export function listHealthReports(params) {
  return request.get('/health-records/reports', {params})
}

export function createHealthReport(data) {
  return request.post('/health-records/reports', data)
}

export function updateHealthReport(id, data) {
  return request.put(`/health-records/reports/${id}`, data)
}

export function deleteHealthReport(id) {
  return request.delete(`/health-records/reports/${id}`)
}

// 体检报告文件单独上传，业务表单只保存文件名和可访问地址。
export function uploadHealthReportFile(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/health-records/reports/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}
