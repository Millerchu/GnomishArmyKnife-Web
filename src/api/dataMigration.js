import request from '@/api/request'

// 数据迁移模块：资源清单、任务列表、导出创建、导入上传和导出包下载。
export function getDataMigrationResources() {
  return request.get('/system/data-migrations/resources')
}

export function listDataMigrationTasks(params) {
  return request.get('/system/data-migrations/tasks', {params})
}

export function getDataMigrationTaskDetail(taskId) {
  return request.get(`/system/data-migrations/tasks/${taskId}`)
}

export function createDataMigrationExport(data) {
  return request.post('/system/data-migrations/exports', data)
}

export function downloadDataMigrationExport(taskId) {
  return request.get(`/system/data-migrations/tasks/${taskId}/download`, {
    responseType: 'blob'
  })
}

export function deleteDataMigrationTask(taskId) {
  return request.delete(`/system/data-migrations/tasks/${taskId}`)
}

export function createDataMigrationImport(formData) {
  return request.post('/system/data-migrations/imports', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}
