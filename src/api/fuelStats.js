import request from '@/api/request'

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

export function getFuelSummary(params) {
  return request.get('/fuel-records/summary', {params})
}

export function getLatestFuelPrices(params) {
  return request.get('/fuel-records/latest-prices', {params})
}

export function getFuelReports(params) {
  return request.get('/fuel-records/reports', {params})
}
