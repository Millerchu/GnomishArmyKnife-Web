import request from '@/api/request'

/**
 * 获取当前用户在 NAS 上保存的全部随身乐器练习片段。
 */
export function listInstrumentPracticeTakes() {
  return request.get('/instrument-practice/takes')
}

/**
 * 保存一段事件式练习录音。达到每乐器三十段上限时，后端会返回被覆盖的最旧片段标识。
 */
export function createInstrumentPracticeTake(data) {
  return request.post('/instrument-practice/takes', data)
}

/**
 * 删除当前用户拥有的一段练习录音。
 */
export function deleteInstrumentPracticeTake(takeId) {
  return request.delete(`/instrument-practice/takes/${takeId}`)
}
