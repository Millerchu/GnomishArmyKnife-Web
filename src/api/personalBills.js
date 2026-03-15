import request from '@/api/request'

// 个人账单模块已整合年度预算，所以账单与预算接口放在同一文件。
export function listPersonalBills(params) {
  return request.get('/personal-bills', {params})
}

export function createPersonalBill(data) {
  return request.post('/personal-bills', data)
}

export function updatePersonalBill(id, data) {
  return request.put(`/personal-bills/${id}`, data)
}

export function deletePersonalBill(id) {
  return request.delete(`/personal-bills/${id}`)
}

export function getPersonalBillSummary(params) {
  return request.get('/personal-bills/summary', {params})
}

// 预算接口挂在账单模块下，方便后端统一做年度执行率统计。
export function listAnnualBudgets(params) {
  return request.get('/personal-bills/budgets', {params})
}

export function createAnnualBudget(data) {
  return request.post('/personal-bills/budgets', data)
}

export function updateAnnualBudget(id, data) {
  return request.put(`/personal-bills/budgets/${id}`, data)
}

export function deleteAnnualBudget(id) {
  return request.delete(`/personal-bills/budgets/${id}`)
}
