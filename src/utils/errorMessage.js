export function getErrorTraceId(error) {
  const status = error?.response?.status
  const traceId = error?.traceId
  return status >= 500 && status < 600
    && typeof traceId === 'string' && /^[0-9a-f]{32}$/.test(traceId) ? traceId : ''
}

// 调用方保留原有文案提取规则，仅为带合法编号的 HTTP 5xx 补充查询线索。
export function appendErrorTraceId(message, error) {
  const traceId = getErrorTraceId(error)
  return traceId ? `${message}\n追踪编号：${traceId}，可在系统日志中精确查询` : message
}
