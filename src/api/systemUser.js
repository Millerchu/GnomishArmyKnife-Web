import request from '@/api/request'

// 用户管理模块：列表、增删改、状态切换和重置密码统一从这里调用。
export function listSystemUsers(params) {
    return request.get('/system/users', {params})
}

export function createSystemUser(data) {
    return request.post('/system/users', data)
}

export function updateSystemUser(id, data) {
    return request.put(`/system/users/${id}`, data)
}

export function deleteSystemUser(id) {
    return request.delete(`/system/users/${id}`)
}

// 状态切换单独走 patch，便于和完整编辑表单区分。
export function updateSystemUserStatus(id, data) {
    return request.patch(`/system/users/${id}/status`, data)
}

// 重置密码接口保留独立入口，便于后续接入强制改密等策略。
export function resetSystemUserPassword(id, data) {
    return request.post(`/system/users/${id}/reset-password`, data)
}

0
