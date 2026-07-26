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

// 车辆档案独立维护，录入能源记录时由页面直接复用车辆选项。
export function listFuelVehicles() {
  return request.get('/fuel-vehicles')
}

export function createFuelVehicle(data) {
  return request.post('/fuel-vehicles', data)
}

export function updateFuelVehicle(id, data) {
  return request.put(`/fuel-vehicles/${id}`, data)
}

export function deleteFuelVehicle(id) {
  return request.delete(`/fuel-vehicles/${id}`)
}
