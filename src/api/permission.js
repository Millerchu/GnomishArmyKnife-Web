import request from '@/api/request'

// 权限管理模块：应用目录、用户授权和主页可见应用加载。
export function listPermissionUsers(params) {
  return request.get('/system/permissions/users', {params})
}

export function listPermissionApps(params) {
  return request.get('/system/permissions/apps', {params})
}

export function getUserAppPermissions(userId) {
  return request.get(`/system/permissions/users/${userId}/app-permissions`)
}

export function saveUserAppPermissions(userId, data) {
  return request.put(`/system/permissions/users/${userId}/app-permissions`, data)
}

export function getCurrentUserAccessibleApps() {
  return request.get('/system/permissions/current-user/apps')
}
