const WEEK_TEXT = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function formatDate(date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDate(text) {
  return new Date(`${text}T00:00:00`)
}

export function shiftMonthByOffset(baseDate, offset) {
  return new Date(baseDate.getFullYear(), baseDate.getMonth() + offset, 1)
}

export function getMonthRange(baseDate) {
  const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
  const monthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0)

  return {
    startDate: formatDate(monthStart),
    endDate: formatDate(monthEnd),
    year: monthStart.getFullYear(),
    month: monthStart.getMonth() + 1
  }
}

export function buildMonthCalendarDays(baseDate) {
  const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
  const monthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0)
  const calendarStart = new Date(monthStart)
  const startDay = calendarStart.getDay()
  const startOffset = startDay === 0 ? -6 : 1 - startDay
  calendarStart.setDate(calendarStart.getDate() + startOffset)

  const calendarEnd = new Date(monthEnd)
  const endDay = calendarEnd.getDay()
  const endOffset = endDay === 0 ? 0 : 7 - endDay
  calendarEnd.setDate(calendarEnd.getDate() + endOffset)

  const days = []
  const current = new Date(calendarStart)
  while (current <= calendarEnd) {
    days.push({
      date: formatDate(current),
      dayNumber: current.getDate(),
      weekLabel: WEEK_TEXT[current.getDay()],
      inCurrentMonth: current.getMonth() === monthStart.getMonth()
    })
    current.setDate(current.getDate() + 1)
  }
  return days
}

function toNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function isWeekendDate(logDate) {
  if (!logDate) {
    return false
  }
  const day = parseDate(logDate).getDay()
  return day === 0 || day === 6
}

function pushUniqueValue(target, value) {
  if (value && value !== '-' && !target.includes(value)) {
    target.push(value)
  }
}

export function calculateLogStats(logs = [], formatters = {}) {
  const formatProjectText = formatters.formatProjectText || ((value) => value || '-')
  const formatLocationText = formatters.formatLocationText || ((value) => value || '-')
  const formatTypeCodeList = formatters.formatTypeCodeList || ((codes) => Array.isArray(codes) ? codes : [])

  const projects = []
  const statuses = []
  const locations = []
  const workDates = new Set()

  const personDayTotal = logs.reduce((total, item) => {
    if (item?.logDate) {
      workDates.add(item.logDate)
    }
    pushUniqueValue(projects, formatProjectText(item?.projectCode))
    pushUniqueValue(locations, formatLocationText(item?.location))
    formatTypeCodeList(item?.typeCodes).forEach((status) => pushUniqueValue(statuses, status))
    return total + toNumber(item?.personDay, 0)
  }, 0)

  const overtimeHoursTotal = logs.reduce((total, item) => total + toNumber(item?.overtimeHours, 0), 0)

  return {
    projects,
    statuses,
    locations,
    workDays: workDates.size,
    personDayTotal,
    overtimeHoursTotal,
    logCount: logs.length,
    weekendLogCount: logs.filter((item) => isWeekendDate(item?.logDate)).length
  }
}

export function buildDateSummaryMap(days = [], logs = [], helpers = {}) {
  const formatProjectText = helpers.formatProjectText || ((value) => value || '-')
  const formatTypeCodeList = helpers.formatTypeCodeList || ((codes) => Array.isArray(codes) ? codes : [])
  const joinUniqueValues = helpers.joinUniqueValues || ((values) => {
    const uniqueValues = Array.from(new Set(values.filter(Boolean)))
    return uniqueValues.length ? uniqueValues.join('、') : '-'
  })
  const shortText = helpers.shortText || ((text) => text || '-')

  const groupedLogs = logs.reduce((grouped, item) => {
    if (!grouped[item.logDate]) {
      grouped[item.logDate] = []
    }
    grouped[item.logDate].push(item)
    return grouped
  }, {})

  return days.reduce((summary, day) => {
    const list = groupedLogs[day.date] || []
    summary[day.date] = {
      count: list.length,
      inCurrentMonth: Boolean(day.inCurrentMonth),
      typeLabels: Array.from(new Set(list.flatMap((item) => formatTypeCodeList(item.typeCodes)).filter(Boolean))),
      projectsText: joinUniqueValues(list.map((item) => formatProjectText(item.projectCode)).filter((item) => item && item !== '-')),
      workItemsText: shortText(joinUniqueValues(list.map((item) => item.workItem))),
      personDayTotal: list.reduce((total, item) => total + toNumber(item.personDay, 0), 0),
      overtimeHoursTotal: list.reduce((total, item) => total + toNumber(item.overtimeHours, 0), 0)
    }
    return summary
  }, {})
}
