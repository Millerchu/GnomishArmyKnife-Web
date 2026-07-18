import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildDateSummaryMap,
  buildMonthCalendarDays,
  buildWeeklyReportGroups,
  calculateLogStats,
  getWorkLogTypeTone,
  getMonthRange,
  mergeLogsByIdentity,
  parseWorkItemEntries,
  serializeWorkItemEntries,
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

test('calculateLogStats aggregates month logs and de-duplicates projects', () => {
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
      overtimeHours: 1.5,
      businessTripAllowanceAmount: 160,
      businessTripReimbursed: false
    },
    {
      logDate: '2026-05-03',
      typeCodes: ['LEAVE'],
      projectCode: 'OPS',
      location: '居家',
      personDay: 0,
      overtimeHours: 0,
      businessTripAllowanceAmount: 110,
      businessTripReimbursed: true
    }
  ], {
    formatProjectText: (value) => ({GAK: '工具项目', OPS: '运维'}[value] || value),
    formatLocationText: (value) => value
  })

  assert.deepEqual(result.projects, ['工具项目', '运维'])
  assert.deepEqual(result.locations, ['上海办公室', '客户现场', '居家'])
  assert.equal(result.workDays, 3)
  assert.equal(result.logCount, 3)
  assert.equal(result.weekendLogCount, 2)
  assert.equal(result.personDayTotal, 1.5)
  assert.equal(result.overtimeHoursTotal, 3.5)
  assert.equal(result.businessTripAllowanceTotal, 270)
  assert.equal(result.reimbursedAllowanceTotal, 110)
  assert.equal(result.unreimbursedAllowanceTotal, 160)
})

test('buildWeeklyReportGroups groups projects chronologically and removes duplicate work items', () => {
  const result = buildWeeklyReportGroups([
    {
      logDate: '2026-07-10',
      projectCode: 'B',
      personDay: 0.5,
      workItem: '1. 联调接口\n2、回归测试'
    },
    {
      logDate: '2026-07-08',
      projectCode: 'A',
      personDay: 0.5,
      workItem: '需求梳理\n接口开发'
    },
    {
      logDate: '2026-07-09',
      projectCode: 'A',
      personDay: 0.5,
      workItem: '1. 接口开发\n2. 单元测试'
    },
    {
      logDate: '2026-07-11',
      projectCode: null,
      personDay: 0.5,
      workItem: '历史日志整理'
    },
    {
      logDate: '2026-07-12',
      projectCode: 'EMPTY',
      personDay: 0.5,
      workItem: '  '
    }
  ], (code) => ({A: 'A 项目', B: 'B 项目'}[code] || code))

  assert.deepEqual(result, [
    {
      projectCode: 'A',
      projectText: 'A 项目',
      items: ['需求梳理', '接口开发', '单元测试']
    },
    {
      projectCode: 'B',
      projectText: 'B 项目',
      items: ['联调接口', '回归测试']
    },
    {
      projectCode: 'NO_PROJECT',
      projectText: '未关联项目',
      items: ['历史日志整理']
    }
  ])
})

test('buildWeeklyReportGroups excludes zero person-day logs', () => {
  const result = buildWeeklyReportGroups([
    {
      logDate: '2026-07-08',
      projectCode: 'A',
      personDay: 0.5,
      workItem: '有效工作内容'
    },
    {
      logDate: '2026-07-09',
      projectCode: 'A',
      personDay: 0,
      workItem: '零人天工作内容'
    },
    {
      logDate: '2026-07-10',
      projectCode: 'B',
      personDay: '0',
      workItem: '字符串零人天工作内容'
    }
  ], (code) => `${code} 项目`)

  assert.deepEqual(result, [
    {
      projectCode: 'A',
      projectText: 'A 项目',
      items: ['有效工作内容']
    }
  ])
})

test('work item helpers split legacy numbered lines and serialize without persisted numbers', () => {
  assert.deepEqual(parseWorkItemEntries('1. 完成接口\n2、补充测试\n\n(3) 更新文档'), [
    '完成接口',
    '补充测试',
    '更新文档'
  ])
  assert.equal(serializeWorkItemEntries([' 完成接口 ', '', '补充测试']), '完成接口\n补充测试')
})

test('mergeLogsByIdentity keeps multiple projects on the same date and removes duplicate responses', () => {
  const result = mergeLogsByIdentity([
    [
      {id: 11, logDate: '2026-07-10', projectCode: 'GAK'},
      {id: 12, logDate: '2026-07-10', projectCode: 'CLIENT'}
    ],
    [
      {id: 11, logDate: '2026-07-10', projectCode: 'GAK'}
    ]
  ])

  assert.deepEqual(result.map((item) => item.id), [11, 12])
})

test('buildDateSummaryMap exposes colored type entries and de-duplicated daily work content', () => {
  const result = buildDateSummaryMap([
    {date: '2026-07-10'}
  ], [
    {
      id: 11,
      logDate: '2026-07-10',
      typeCodes: ['NORMAL', 'OVERTIME'],
      projectCode: 'GAK',
      workItem: '1. 完成接口联调\n2. 补充回归测试',
      personDay: 0.5,
      overtimeHours: 2
    },
    {
      id: 12,
      logDate: '2026-07-10',
      typeCodes: ['NORMAL'],
      projectCode: 'CLIENT',
      workItem: '完成接口联调\n整理上线清单',
      personDay: 0.5,
      overtimeHours: 0
    }
  ], {
    formatProjectText: (code) => code,
    formatTypeCodeList: (codes) => codes.map((code) => ({code, label: code}))
  })

  assert.deepEqual(result['2026-07-10'].types, [
    {code: 'NORMAL', label: 'NORMAL', tone: 'normal'},
    {code: 'OVERTIME', label: 'OVERTIME', tone: 'overtime'}
  ])
  assert.equal(result['2026-07-10'].projectsText, 'GAK、CLIENT')
  assert.equal(result['2026-07-10'].personDayTotal, 1)
  assert.deepEqual(result['2026-07-10'].workItems, [
    '完成接口联调',
    '补充回归测试',
    '整理上线清单'
  ])
})

test('getWorkLogTypeTone returns stable tones including legacy and unknown types', () => {
  assert.equal(getWorkLogTypeTone('NORMAL'), 'normal')
  assert.equal(getWorkLogTypeTone('OVERTIME'), 'overtime')
  assert.equal(getWorkLogTypeTone('BUSINESS_TRIP'), 'business-trip')
  assert.equal(getWorkLogTypeTone('UNKNOWN'), 'other')
})
