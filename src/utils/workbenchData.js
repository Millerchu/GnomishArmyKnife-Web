import {getLogPersonDay} from './workLogCalendar.js'

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function formatTodoDueDate(dueDate, now = new Date()) {
  if (typeof dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return '未设日期'
  const [year, month, day] = dueDate.split('-').map(Number)
  // 后端返回 LocalDate，按本地日历解析，避免 ISO 日期被当作 UTC 午夜。
  const date = new Date(year, month - 1, day)
  if (localDate(date) !== dueDate) return '未设日期'
  if (dueDate === localDate(now)) return '今天'
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  if (dueDate === localDate(tomorrow)) return '明天'
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${month}月${day}日 ${weekdays[date.getDay()]}`
}

export function weekDates(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  start.setDate(start.getDate() - (start.getDay() + 6) % 7)
  return Array.from({length: 7}, (_, i) => {
    const day = new Date(start)
    day.setDate(day.getDate() + i)
    return localDate(day)
  })
}

export function summarizeWeek(logs, dates) {
  const days = dates.map(date => ({date, personDay: logs.filter(log => log.logDate === date)
    .reduce((sum, log) => sum + getLogPersonDay(log), 0)}))
  return {days, total: days.reduce((sum, day) => sum + day.personDay, 0)}
}

export const money = value => value == null ? '—' : `¥${Number(value).toLocaleString('zh-CN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
export const decimal = value => Number(value).toLocaleString('zh-CN', {maximumFractionDigits: 2})
export const percent = value => value == null ? '—' : `${decimal(Number(value) * 100)}%`
