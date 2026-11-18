export const AI_EDITOR_LABELS = {account: 'AI 账号', subscription: 'AI 订阅', usage: 'AI 用量', payment: 'AI 支付'}
export const AI_PAYMENT_LABELS = {SUBSCRIPTION: '订阅扣款', TOPUP: 'API 充值', SETTLEMENT: '后付费结算', REFUND: '退款'}
export const AI_USAGE_LABELS = {INCLUDED: '计入统计', REVIEW: '待核对 · 未计入', SUPERSEDED: '已被新快照替代', WITHDRAWN: '已撤回 · 未计入', EXCLUDED: '手动排除 · 未计入'}
export function aiToday() {
  return new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date())
}
export function aiMoney(value, currency = '') {
  if (value == null || value === '') return '未记录'
  const amount = Number(value)
  return Number.isFinite(amount) ? `${currency} ${amount.toLocaleString('zh-CN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`.trim() : '未记录'
}
export function aiSubscriptionStatus(subscription, today = aiToday()) {
  if (subscription.terminated) return '已终止'
  if (subscription.startDate > today) return '尚未开始'
  if (subscription.endDate <= today) return '已到期'
  if (subscription.trialEndDate > today) return '试用中'
  return '有效'
}
export function aiRenewals(subscriptions, days = 30, today = aiToday()) {
  const limit = new Date(`${today}T00:00:00Z`)
  limit.setUTCDate(limit.getUTCDate() + days)
  const end = limit.toISOString().slice(0, 10)
  return subscriptions.filter(item => !item.terminated).flatMap(item => [
    {date: item.autoRenew ? item.nextBillingDate : null, label: '预计扣费'},
    {date: item.endDate, label: '权益到期'},
    {date: item.trialEndDate, label: '试用结束'}
  ].filter(event => event.date && event.date >= today && event.date < end).map(event => ({...event, subscription: item})))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// 局域网 HTTP 不一定暴露 randomUUID；getRandomValues 仍可生成请求幂等标识。
export function aiRequestKey() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
