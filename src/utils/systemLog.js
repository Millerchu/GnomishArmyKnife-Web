const SOURCE_LABELS = {HTTP: 'HTTP 请求', ASYNC_TASK: '异步任务', SCHEDULER: '定时任务'}

export function systemLogSourceLabel(source) {
  return Object.hasOwn(SOURCE_LABELS, source) ? SOURCE_LABELS[source] : (source || '—')
}

export function formatSystemLogTime(value) {
  // 后端 LocalDateTime 是北京时间墙上时间，不经 Date/UTC 再次转换。
  return value ? String(value).replace('T', ' ') : '—'
}

export function emptySystemLogFilters() {
  return {occurredFrom: '', occurredTo: '', exceptionType: '', traceId: '', keyword: ''}
}

function normalizeTime(value) {
  if (!value) return ''
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value)
  if (!match) throw new Error('请输入有效的北京时间')
  const [, year, month, day, hour, minute, second = '00'] = match
  const leap = Number(year) % 4 === 0 && (Number(year) % 100 !== 0 || Number(year) % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (Number(year) < 1 || Number(month) < 1 || Number(month) > 12 || Number(day) < 1
    || Number(day) > days[Number(month) - 1] || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) {
    throw new Error('请输入有效的北京时间')
  }
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`
}

export function validateSystemLogTimeRange(filters) {
  try {
    const from = normalizeTime(filters.occurredFrom)
    const to = normalizeTime(filters.occurredTo)
    return from && to && from > to ? '开始时间不能晚于结束时间' : ''
  } catch (error) {
    return error.message
  }
}

export function buildSystemLogQuery(filters, pageNo = 1, pageSize = 20) {
  const error = validateSystemLogTimeRange(filters)
  if (error) throw new Error(error)
  const params = {pageNo, pageSize}
  for (const key of ['occurredFrom', 'occurredTo']) {
    const time = normalizeTime(filters[key])
    if (time) params[key] = time
  }
  for (const key of ['exceptionType', 'traceId', 'keyword']) {
    const value = String(filters[key] || '').trim()
    if (value) params[key] = value
  }
  return params
}

export function readSystemLogResponse(response) {
  const payload = response?.data
  if (String(payload?.code) !== '0') {
    const error = new Error('系统日志请求失败')
    error.code = String(payload?.code || '')
    error.status = response?.status
    throw error
  }
  return payload.data
}

export function systemLogErrorCode(error) {
  return String(error?.response?.status || error?.status || error?.response?.data?.code || error?.code || '')
}
