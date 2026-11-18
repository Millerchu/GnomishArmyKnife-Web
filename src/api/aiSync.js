import request from '@/api/request'

export const getAiSyncConnection = id => request.get(`/ai-subscriptions/accounts/${id}/sync-connection`)
export const saveAiSyncConnection = (id, data) => request.put(`/ai-subscriptions/accounts/${id}/sync-connection`, data)
export const revokeAiSyncConnection = id => request.delete(`/ai-subscriptions/accounts/${id}/sync-connection`)
export const runAiSync = id => request.post(`/ai-subscriptions/accounts/${id}/sync`)
export const dailyAiSyncCheck = () => request.post('/ai-subscriptions/sync/daily-check')
export const getAiSyncJob = id => request.get(`/ai-subscriptions/sync/jobs/${id}`)
