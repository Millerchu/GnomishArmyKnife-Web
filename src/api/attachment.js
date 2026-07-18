import request from '@/api/request'

export function uploadAttachment(file, usageType, onUploadProgress) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('usageType', usageType)
  return request.post('/attachments/upload', formData, {
    headers: {'Content-Type': 'multipart/form-data'},
    timeout: 60000,
    onUploadProgress
  })
}

export function deleteAttachment(attachmentId) {
  return request.delete(`/attachments/${attachmentId}`)
}

export function getMyAvatarAttachments() {
  return request.get('/attachments/avatar')
}

export function saveMyAvatarAttachments(attachmentIds) {
  return request.put('/attachments/avatar', {attachmentIds})
}

export function getAttachmentBlob(attachmentId, thumbnail = false) {
  const suffix = thumbnail ? 'thumbnail' : 'content'
  return request.get(`/attachments/${attachmentId}/${suffix}`, {
    responseType: 'blob',
    timeout: 60000
  })
}

export async function downloadAttachment(attachment) {
  const response = await getAttachmentBlob(attachment.id, false)
  const url = URL.createObjectURL(response.data)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = attachment.originalFileName || 'attachment'
  anchor.click()
  URL.revokeObjectURL(url)
}
