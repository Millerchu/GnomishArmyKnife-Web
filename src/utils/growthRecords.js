export const GROWTH_METRICS = [
  {key: 'heightCm', label: '身高', unit: 'cm'},
  {key: 'weightKg', label: '体重', unit: 'kg'},
  {key: 'headCm', label: '头围', unit: 'cm'}
]

export function localToday() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function dateStamp(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return NaN
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(0, 0, 0, 0)
  return date.toISOString().slice(0, 10) === value ? date.getTime() : NaN
}

// 按完整日历月计算；月末和闰年生日以目标月最后一天作为当月周年日。
export function ageText(birthday, at = localToday()) {
  const start = dateStamp(birthday), end = dateStamp(at)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return '—'
  const birth = new Date(start), date = new Date(end)
  let months = (date.getUTCFullYear() - birth.getUTCFullYear()) * 12 + date.getUTCMonth() - birth.getUTCMonth()
  const anniversary = (count) => {
    const result = new Date(start)
    result.setUTCDate(1)
    result.setUTCMonth(birth.getUTCMonth() + count)
    const next = new Date(result)
    next.setUTCMonth(next.getUTCMonth() + 1)
    next.setUTCDate(0)
    result.setUTCDate(Math.min(birth.getUTCDate(), next.getUTCDate()))
    return result.getTime()
  }
  if (anniversary(months) > end) months -= 1
  const days = Math.round((end - anniversary(months)) / 86400000)
  const years = Math.floor(months / 12), remainder = months % 12
  return [years ? `${years} 岁` : '', remainder ? `${remainder} 个月` : '', days ? `${days} 天` : ''].filter(Boolean).join(' ') || '出生当天'
}

function compareIds(left, right) {
  const a = String(left ?? ''), b = String(right ?? '')
  return a.length - b.length || a.localeCompare(b)
}

export function chronologicalMeasurements(records) {
  return [...records].sort((a, b) => (a.measureDate || '').localeCompare(b.measureDate || '')
    || (a.createdAt || '').localeCompare(b.createdAt || '') || compareIds(a.id, b.id))
}

export function hasMetric(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
}

// 差值逐指标寻找前一条有效测量，筛选年份后仍使用完整历史的比较结果。
export function measurementHistory(records) {
  const previous = {}
  return chronologicalMeasurements(records).map(record => {
    const deltas = {}
    for (const {key} of GROWTH_METRICS) {
      if (!hasMetric(record[key])) continue
      if (hasMetric(previous[key])) deltas[key] = Math.round((Number(record[key]) - previous[key]) * 100) / 100
      previous[key] = Number(record[key])
    }
    return {...record, deltas}
  }).reverse()
}

export function metricSummary(records, key) {
  const matching = chronologicalMeasurements(records).filter(record => hasMetric(record[key]))
  const latest = matching.at(-1), previous = matching.at(-2)
  return {value: latest?.[key] ?? null, date: latest?.measureDate || '', count: matching.length,
    delta: previous ? Math.round((Number(latest[key]) - Number(previous[key])) * 100) / 100 : null}
}

export function metricValue(value) {
  return hasMetric(value) ? String(Number(value)) : '—'
}
export function deltaText(value) {
  return hasMetric(value) ? `${Number(value) > 0 ? '+' : ''}${metricValue(value)}` : '暂无对比'
}

export function growthPayload(kind, form) {
  const optional = (value) => typeof value === 'string' ? value.trim() || null : value ?? null
  if (kind === 'child') return {name: form.name.trim(), birthday: form.birthday, gender: form.gender, note: optional(form.note)}
  if (kind === 'measurement') return {measureDate: form.measureDate,
    ...Object.fromEntries(GROWTH_METRICS.map(({key}) => [key, hasMetric(form[key]) ? Number(form[key]) : null])),
    recordedBy: optional(form.recordedBy), note: optional(form.note)}
  if (kind === 'vaccination') return {vaccineName: form.vaccineName.trim(), dose: Number(form.dose),
    vaccinationDate: form.vaccinationDate, status: form.status, institution: optional(form.institution), note: optional(form.note)}
  return {title: form.title.trim(), eventDate: form.eventDate, note: optional(form.note)}
}
