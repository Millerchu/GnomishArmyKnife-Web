import request from './request'

const base = '/ai-subscriptions'
export const listBudgets = month => request.get(`${base}/budgets`, {params: {month}})
export const saveBudget = budget => request.put(`${base}/budgets`, budget)
export const getBillLink = id => request.get(`${base}/payments/${id}/bill-link`)
export const billCandidates = id => request.get(`${base}/payments/${id}/bill-candidates`)
export const linkPayment = (id, existingBillId) => request.post(`${base}/payments/${id}/bill-link`, {existingBillId})
export const unlinkPayment = id => request.delete(`${base}/payments/${id}/bill-link`)
export const checkReminders = () => request.post(`${base}/reminders/check`)
