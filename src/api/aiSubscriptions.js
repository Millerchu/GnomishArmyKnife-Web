import request from '@/api/request'

const base = '/ai-subscriptions'
export const listAiTools = () => request.get(`${base}/tools`)
export const listAiAccounts = () => request.get(`${base}/accounts`)
export const createAiAccount = (payload) => request.post(`${base}/accounts`, payload)
export const updateAiAccount = (id, payload) => request.put(`${base}/accounts/${id}`, payload)
export const archiveAiAccount = (id) => request.delete(`${base}/accounts/${id}`)
export const listAiSubscriptions = () => request.get(`${base}/subscriptions`)
export const createAiSubscription = (payload) => request.post(`${base}/subscriptions`, payload)
export const updateAiSubscription = (id, payload) => request.put(`${base}/subscriptions/${id}`, payload)
export const terminateAiSubscription = (id) => request.delete(`${base}/subscriptions/${id}`)
export const listAiUsageRecords = () => request.get(`${base}/usage-records`)
export const createAiUsageRecord = (payload) => request.post(`${base}/usage-records`, payload)
export const resolveAiUsageRecord = (id, action) => request.post(`${base}/usage-records/${id}/resolution`, {action})
export const listAiPayments = () => request.get(`${base}/payments`)
export const createAiPayment = (payload) => request.post(`${base}/payments`, payload)
export const getAiSummary = (params) => request.get(`${base}/summary`, {params})
export const getAiInsights = month => request.get(`${base}/insights`, {params: {month}})
export const listAiPasswordMemoOptions = () => request.get(`${base}/password-memo-options`)
export const listAiQuotaSnapshots = accountId => request.get(`${base}/quota-snapshots`, {params: {accountId}})
export const saveAiQuotaSnapshot = snapshot => request.post(`${base}/quota-snapshots`, snapshot)

export function aiPayload(response) {
  const envelope = response?.data
  if (!envelope || String(envelope.code) !== '0') throw new Error(envelope?.message || '智订数据读取失败')
  return envelope.data
}
