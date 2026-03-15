import request from '@/api/request'

export function listSoftwarePackages(params) {
  return request.get('/software-packages', {params})
}

export function createSoftwarePackage(data) {
  return request.post('/software-packages', data)
}

export function updateSoftwarePackage(id, data) {
  return request.put(`/software-packages/${id}`, data)
}

export function deleteSoftwarePackage(id) {
  return request.delete(`/software-packages/${id}`)
}

export function createSoftwareVersion(packageId, data) {
  return request.post(`/software-packages/${packageId}/versions`, data)
}

export function uploadSoftwarePackageFile(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/software-packages/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export function updateSoftwareVersion(versionId, data) {
  return request.put(`/software-packages/versions/${versionId}`, data)
}

export function deleteSoftwareVersion(versionId) {
  return request.delete(`/software-packages/versions/${versionId}`)
}

export function getSoftwareRepoSummary(params) {
  return request.get('/software-packages/summary', {params})
}
