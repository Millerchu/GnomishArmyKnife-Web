import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildMonthCalendarDays,
  calculateLogStats,
  getMonthRange,
  shiftMonthByOffset
} from '../workLogCalendar.js'

test('getMonthRange returns natural month boundaries across leap years', () => {
  assert.deepEqual(getMonthRange(new Date('2024-02-12T00:00:00')), {
    startDate: '2024-02-01',
    endDate: '2024-02-29',
    year: 2024,
    month: 2
  })
})

test('shiftMonthByOffset keeps calendar navigation stable across year boundaries', () => {
  const previousMonth = shiftMonthByOffset(new Date('2026-01-31T00:00:00'), -1)
  const nextMonth = shiftMonthByOffset(new Date('2026-12-31T00:00:00'), 1)

  assert.equal(previousMonth.getFullYear(), 2025)
  assert.equal(previousMonth.getMonth(), 11)
  assert.equal(nextMonth.getFullYear(), 2027)
  assert.equal(nextMonth.getMonth(), 0)
})

test('buildMonthCalendarDays starts on Monday and marks outside-month placeholders', () => {
  const result = buildMonthCalendarDays(new Date('2026-05-15T00:00:00'))

  assert.equal(result.length, 35)
  assert.deepEqual(result.slice(0, 7).map((item) => item.date), [
    '2026-04-27',
    '2026-04-28',
    '2026-04-29',
    '2026-04-30',
    '2026-05-01',
    '2026-05-02',
    '2026-05-03'
  ])
  assert.equal(result[0].inCurrentMonth, false)
  assert.equal(result[4].inCurrentMonth, true)
})

test('calculateLogStats aggregates month logs and de-duplicates projects and statuses', () => {
  const result = calculateLogStats([
    {
      logDate: '2026-05-01',
      typeCodes: ['NORMAL'],
      projectCode: 'GAK',
      location: '上海办公室',
      personDay: 1,
      overtimeHours: 2
    },
    {
      logDate: '2026-05-02',
      typeCodes: ['NORMAL', 'BUSINESS_TRIP'],
      projectCode: 'GAK',
      location: '客户现场',
      personDay: 0.5,
      overtimeHours: 1.5
    },
    {
      logDate: '2026-05-03',
      typeCodes: ['LEAVE'],
      projectCode: 'OPS',
      location: '居家',
      personDay: 0,
      overtimeHours: 0
    }
  ], {
    formatProjectText: (value) => ({GAK: '工具项目', OPS: '运维'}[value] || value),
    formatLocationText: (value) => value,
    formatTypeCodeList: (codes) => codes.map((code) => ({
      NORMAL: '正常工作',
      BUSINESS_TRIP: '出差',
      LEAVE: '请假'
    }[code] || code))
  })

  assert.deepEqual(result.projects, ['工具项目', '运维'])
  assert.deepEqual(result.statuses, ['正常工作', '出差', '请假'])
  assert.deepEqual(result.locations, ['上海办公室', '客户现场', '居家'])
  assert.equal(result.workDays, 3)
  assert.equal(result.logCount, 3)
  assert.equal(result.weekendLogCount, 2)
  assert.equal(result.personDayTotal, 1.5)
  assert.equal(result.overtimeHoursTotal, 3.5)
})
