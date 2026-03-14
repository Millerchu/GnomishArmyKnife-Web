import request from '@/api/request'

export function listCalculatorHistories(params) {
  return request.get('/tools/calculator/histories', {params})
}

export function saveCalculatorHistory(data) {
  return request.post('/tools/calculator/histories', data)
}

export function deleteCalculatorHistory(id) {
  return request.delete(`/tools/calculator/histories/${id}`)
}

export function clearCalculatorHistories() {
  return request.delete('/tools/calculator/histories')
}
