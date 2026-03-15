import request from '@/api/request'

// 科学计算器历史记录相关接口。
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
