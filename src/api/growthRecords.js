import request from '@/api/request'

const childrenPath = '/growth-records/children'
export const listGrowthChildren = () => request.get(childrenPath)
export const createGrowthChild = (payload) => request.post(childrenPath, payload)
export const updateGrowthChild = (id, payload) => request.put(`${childrenPath}/${id}`, payload)
export const deleteGrowthChild = (id) => request.delete(`${childrenPath}/${id}`)

const recordsPath = (childId, type) => `${childrenPath}/${childId}/${type}`
export const listGrowthMeasurements = (childId) => request.get(recordsPath(childId, 'measurements'))
export const createGrowthMeasurement = (childId, payload) => request.post(recordsPath(childId, 'measurements'), payload)
export const updateGrowthMeasurement = (childId, id, payload) => request.put(`${recordsPath(childId, 'measurements')}/${id}`, payload)
export const deleteGrowthMeasurement = (childId, id) => request.delete(`${recordsPath(childId, 'measurements')}/${id}`)
export const listGrowthVaccinations = (childId) => request.get(recordsPath(childId, 'vaccinations'))
export const createGrowthVaccination = (childId, payload) => request.post(recordsPath(childId, 'vaccinations'), payload)
export const updateGrowthVaccination = (childId, id, payload) => request.put(`${recordsPath(childId, 'vaccinations')}/${id}`, payload)
export const deleteGrowthVaccination = (childId, id) => request.delete(`${recordsPath(childId, 'vaccinations')}/${id}`)
export const listGrowthMilestones = (childId) => request.get(recordsPath(childId, 'milestones'))
export const createGrowthMilestone = (childId, payload) => request.post(recordsPath(childId, 'milestones'), payload)
export const updateGrowthMilestone = (childId, id, payload) => request.put(`${recordsPath(childId, 'milestones')}/${id}`, payload)
export const deleteGrowthMilestone = (childId, id) => request.delete(`${recordsPath(childId, 'milestones')}/${id}`)
