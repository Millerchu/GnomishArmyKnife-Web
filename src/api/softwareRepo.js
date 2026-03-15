import request from '@/api/request'

// 软件仓库模块：软件主档、版本明细、概览统计和文件上传都从这里调用。
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

// 安装包文件先上传到文件服务，业务记录里只保存文件元信息和下载地址。
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
