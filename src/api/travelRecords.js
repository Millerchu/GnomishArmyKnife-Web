import request from '@/api/request'

export const listTravelRecords = (params) => request.get('/travel-records', { params })
export const getTravelRecord = (id) => request.get(`/travel-records/${id}`)
export const createTravelRecord = (data) => request.post('/travel-records', data)
export const updateTravelRecord = (id, data) => request.put(`/travel-records/${id}`, data)
export const deleteTravelRecord = (id, deleteBills) =>
  request.delete(`/travel-records/${id}`, { params: { deleteBills } })
export const getTravelSummary = (params) => request.get('/travel-records/summary', { params })
export const exportTravelRecords = (params) =>
  request.get('/travel-records/export', { params, responseType: 'blob' })
export const listTravelGroups = () => request.get('/travel-groups')
export const createTravelGroup = (data) => request.post('/travel-groups', data)
export const updateTravelGroup = (id, data) => request.put(`/travel-groups/${id}`, data)
export const deleteTravelGroup = (id) => request.delete(`/travel-groups/${id}`)
export const listBillCandidates = (params) => request.get('/travel-records/bill-candidates', { params })
