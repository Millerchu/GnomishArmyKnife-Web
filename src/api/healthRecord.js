import request from '@/api/request'

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

export function uploadHealthReportFile(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/health-records/reports/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}
