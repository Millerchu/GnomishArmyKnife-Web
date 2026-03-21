import request from '@/api/request'

export function listSystemApps(params) {
  return request.get('/system/apps', {params})
}

export function createSystemApp(data) {
  return request.post('/system/apps', data)
}

export function updateSystemApp(appId, data) {
  return request.put(`/system/apps/${appId}`, data)
}

export function updateSystemAppStatus(appId, data) {
  return request.patch(`/system/apps/${appId}/status`, data)
}

export function uploadSystemAppIcon(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/system/apps/icon-upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}
