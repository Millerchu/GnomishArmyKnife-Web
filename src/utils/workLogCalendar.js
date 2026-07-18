const WEEK_TEXT = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const WORK_LOG_TYPE_TONE_MAP = {
  NORMAL: 'normal',
  OVERTIME: 'overtime',
  LEAVE: 'leave',
  SICK_LEAVE: 'sick-leave',
  CITY_BUSINESS_TRIP: 'city-business-trip',
  OUT_OF_CITY_BUSINESS_TRIP: 'business-trip',
  BUSINESS_TRIP: 'business-trip',
  OTHER: 'other'
}
const WORK_ITEM_NUMBER_PREFIX = /^\s*(?:(?:\d+)[.、)]|[（(]\d+[）)])\s*/

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

export function getWorkLogTypeTone(typeCode) {
  return WORK_LOG_TYPE_TONE_MAP[typeCode] || 'other'
}

export function parseWorkItemEntries(value) {
  if (!value) {
    return []
  }
  return String(value)
    .split(/\r?\n/)
    .map((item) => item.replace(WORK_ITEM_NUMBER_PREFIX, '').trim())
    .filter(Boolean)
}

export function serializeWorkItemEntries(entries = []) {
  return entries
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join('\n')
}

export function mergeLogsByIdentity(logGroups = []) {
  const mergedMap = new Map()
  logGroups.flat().forEach((item) => {
    if (!item?.logDate) {
      return
    }
    const identity = item.id != null
      ? `id:${item.id}`
      : `fallback:${item.userId || ''}:${item.logDate}:${item.projectCode || ''}:${item.workItem || ''}`
    if (!mergedMap.has(identity)) {
      mergedMap.set(identity, item)
    }
  })
  return Array.from(mergedMap.values())
}

export function calculateLogStats(logs = [], formatters = {}) {
  const formatProjectText = formatters.formatProjectText || ((value) => value || '-')
  const formatLocationText = formatters.formatLocationText || ((value) => value || '-')

  const projects = []
  const locations = []
  const workDates = new Set()

  const personDayTotal = logs.reduce((total, item) => {
    if (item?.logDate) {
      workDates.add(item.logDate)
    }
    pushUniqueValue(projects, formatProjectText(item?.projectCode))
    pushUniqueValue(locations, formatLocationText(item?.location))
    return total + toNumber(item?.personDay, 0)
  }, 0)

  const overtimeHoursTotal = logs.reduce((total, item) => total + toNumber(item?.overtimeHours, 0), 0)
  const businessTripAllowanceTotal = logs.reduce(
    (total, item) => total + toNumber(item?.businessTripAllowanceAmount, 0),
    0
  )
  const reimbursedAllowanceTotal = logs.reduce((total, item) => {
    if (!item?.businessTripReimbursed) {
      return total
    }
    return total + toNumber(item?.businessTripAllowanceAmount, 0)
  }, 0)

  return {
    projects,
    locations,
    workDays: workDates.size,
    personDayTotal,
    overtimeHoursTotal,
    businessTripAllowanceTotal,
    reimbursedAllowanceTotal,
    unreimbursedAllowanceTotal: businessTripAllowanceTotal - reimbursedAllowanceTotal,
    logCount: logs.length,
    weekendLogCount: logs.filter((item) => isWeekendDate(item?.logDate)).length
  }
}

export function buildWeeklyReportGroups(logs = [], formatProjectText = (value) => value || '未关联项目') {
  const projectMap = new Map()
  const sortedLogs = logs.filter((item) => toNumber(item?.personDay, 0) !== 0).sort((previous, next) => {
    return String(previous?.logDate || '').localeCompare(String(next?.logDate || ''))
  })

  sortedLogs.forEach((item) => {
    const projectCode = item?.projectCode || 'NO_PROJECT'
    if (!projectMap.has(projectCode)) {
      projectMap.set(projectCode, {
        projectCode,
        projectText: projectCode === 'NO_PROJECT' ? '未关联项目' : formatProjectText(projectCode),
        items: [],
        itemSet: new Set()
      })
    }

    const project = projectMap.get(projectCode)
    parseWorkItemEntries(item?.workItem).forEach((workItem) => {
      if (project.itemSet.has(workItem)) {
        return
      }
      project.itemSet.add(workItem)
      project.items.push(workItem)
    })
  })

  return Array.from(projectMap.values())
    .filter((project) => project.items.length > 0)
    .map(({itemSet, ...project}) => project)
}

export function buildDateSummaryMap(days = [], logs = [], helpers = {}) {
  const formatProjectText = helpers.formatProjectText || ((value) => value || '-')
  const formatTypeCodeList = helpers.formatTypeCodeList || ((codes) => Array.isArray(codes) ? codes : [])
  const formatTypeEntryList = helpers.formatTypeEntryList || ((codes) => {
    return formatTypeCodeList(codes).map((formattedType, index) => {
      if (formattedType && typeof formattedType === 'object') {
        return formattedType
      }
      return {code: codes[index], label: formattedType}
    })
  })
  const joinUniqueValues = helpers.joinUniqueValues || ((values) => {
    const uniqueValues = Array.from(new Set(values.filter(Boolean)))
    return uniqueValues.length ? uniqueValues.join('、') : '-'
  })
  const groupedLogs = logs.reduce((grouped, item) => {
    if (!grouped[item.logDate]) {
      grouped[item.logDate] = []
    }
    grouped[item.logDate].push(item)
    return grouped
  }, {})

  return days.reduce((summary, day) => {
    const list = groupedLogs[day.date] || []
    const typeMap = new Map()
    const workItemSet = new Set()
    list.forEach((item) => {
      parseWorkItemEntries(item.workItem).forEach((workItem) => workItemSet.add(workItem))
      const codes = Array.isArray(item.typeCodes) ? item.typeCodes : []
      const formattedTypes = formatTypeEntryList(codes)
      codes.forEach((code, index) => {
        if (typeMap.has(code)) {
          return
        }
        const formattedType = formattedTypes[index]
        const label = typeof formattedType === 'object' ? formattedType.label : formattedType
        typeMap.set(code, {
          code,
          label: label || code,
          tone: getWorkLogTypeTone(code)
        })
      })
    })
    summary[day.date] = {
      count: list.length,
      inCurrentMonth: Boolean(day.inCurrentMonth),
      types: Array.from(typeMap.values()),
      workItems: Array.from(workItemSet),
      projectsText: joinUniqueValues(list.map((item) => formatProjectText(item.projectCode)).filter((item) => item && item !== '-')),
      personDayTotal: list.reduce((total, item) => total + toNumber(item.personDay, 0), 0),
      overtimeHoursTotal: list.reduce((total, item) => total + toNumber(item.overtimeHours, 0), 0),
      businessTripAllowanceTotal: list.reduce((total, item) => total + toNumber(item.businessTripAllowanceAmount, 0), 0)
    }
    return summary
  }, {})
}
