import request from '@/api/request'

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
