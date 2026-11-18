const windowsByTool = {
  CHATGPT: [
    {label: '5 小时限额', reading: 'REMAINING'},
    {label: '每周限额', reading: 'REMAINING'}
  ],
  GROK: [{label: '每周用量'}, {label: 'Grok Bot 用量'}, {label: '额外用量'}],
  MUSE: [{label: '免费版 · 每周额度', reading: 'USED'}, {label: '额外的使用额度', reading: 'USED'}]
}

export function quotaWindow(override = {}) {
  return {label: '', reading: 'USED', percent: '', resetAt: '', resetHint: '', periodLabel: '', remaining: '', unit: '', breakdown: [], ...override}
}

export function quotaPreset(tool) {
  return (windowsByTool[tool] ?? [{}]).map(window => quotaWindow(window))
}

export function quotaObservationTime(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(now).map(({type, value}) => [type, value]))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`
}

export function quotaPayload(accountId, observedAt, windows, resets) {
  const included = windows.filter(hasQuotaReading)
  return {
    accountId, observedAt,
    windows: included.map(window => ({
      ...window, percent: window.percent === '' ? null : window.percent,
      remaining: window.remaining || null, resetAt: window.resetAt || null
    })),
    resets: resets.map(reset => ({...reset, expiresAt: reset.expiresAt || null}))
  }
}

export const hasQuotaReading = window => window.percent !== '' || window.remaining !== '' || Boolean(window.resetHint)
export const quotaDateLabel = value => value?.replace('T', ' ').slice(0, 16) || '未记录'
