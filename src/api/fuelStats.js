import request from '@/api/request'

// 油耗统计模块：加油记录、最新油价和报表都复用这一组接口。
export function listFuelRecords(params) {
  return request.get('/fuel-records', {params})
}

export function createFuelRecord(data) {
  return request.post('/fuel-records', data)
}

export function updateFuelRecord(id, data) {
  return request.put(`/fuel-records/${id}`, data)
}

export function deleteFuelRecord(id) {
  return request.delete(`/fuel-records/${id}`)
}

// 下面两个接口分别给概览卡片和图表报表提供数据。
export function getFuelSummary(params) {
  return request.get('/fuel-records/summary', {params})
}

export function getLatestFuelPrices(params) {
  return request.get('/fuel-records/latest-prices', {params})
}

export function getFuelReports(params) {
  return request.get('/fuel-records/reports', {params})
}
