import request from '@/api/request'

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

export function clearCompletedTodoTasks() {
  return request.delete('/todo-items/completed')
}
