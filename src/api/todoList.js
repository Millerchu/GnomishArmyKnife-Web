import request from '@/api/request'

// 待办列表模块：任务维护、状态流转、重要标记和批量清理已完成任务。
export function listTodoTasks(params) {
  return request.get('/todo-items', {params})
}

export function createTodoTask(data) {
  return request.post('/todo-items', data)
}

export function updateTodoTask(id, data) {
  return request.put(`/todo-items/${id}`, data)
}

export function deleteTodoTask(id) {
  return request.delete(`/todo-items/${id}`)
}

export function updateTodoTaskStatus(id, data) {
  return request.patch(`/todo-items/${id}/status`, data)
}

export function updateTodoTaskImportant(id, data) {
  return request.patch(`/todo-items/${id}/important`, data)
}

// 已完成清理走单独接口，避免前端逐条删除。
export function clearCompletedTodoTasks() {
  return request.delete('/todo-items/completed')
}
