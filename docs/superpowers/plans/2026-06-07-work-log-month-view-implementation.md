# Work Log Month View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a month view to the existing work log page with independent monthly stats and a full month calendar.

**Architecture:** Extract reusable date and aggregation helpers into `src/utils/workLogCalendar.js` so month-grid and monthly-stat behavior is covered by Node tests. Keep `src/views/WorkLog.vue` as the single page component, adding `week/month` view state, month loading via existing `listWorkLogs`, and month-specific CSS that matches the current dense work-log surface.

**Tech Stack:** Vue 3 Composition API, Vite, Node built-in test runner, existing Axios work-log API wrapper.

---

### Task 1: Add Tested Calendar Utility Functions

**Files:**
- Create: `src/utils/workLogCalendar.js`
- Create: `src/utils/__tests__/workLogCalendar.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/utils/__tests__/workLogCalendar.test.js` with tests for:

```js
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
  assert.equal(shiftMonthByOffset(new Date('2026-01-31T00:00:00'), -1).getFullYear(), 2025)
  assert.equal(shiftMonthByOffset(new Date('2026-01-31T00:00:00'), -1).getMonth(), 11)
  assert.equal(shiftMonthByOffset(new Date('2026-12-31T00:00:00'), 1).getFullYear(), 2027)
  assert.equal(shiftMonthByOffset(new Date('2026-12-31T00:00:00'), 1).getMonth(), 0)
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
    {logDate: '2026-05-01', typeCodes: ['NORMAL'], projectCode: 'GAK', location: '上海办公室', personDay: 1, overtimeHours: 2},
    {logDate: '2026-05-02', typeCodes: ['NORMAL', 'BUSINESS_TRIP'], projectCode: 'GAK', location: '客户现场', personDay: 0.5, overtimeHours: 1.5},
    {logDate: '2026-05-03', typeCodes: ['LEAVE'], projectCode: 'OPS', location: '居家', personDay: 0, overtimeHours: 0}
  ], {
    formatProjectText: (value) => ({GAK: '工具项目', OPS: '运维'}[value] || value),
    formatLocationText: (value) => value,
    formatTypeCodeList: (codes) => codes.map((code) => ({NORMAL: '正常工作', BUSINESS_TRIP: '出差', LEAVE: '请假'}[code] || code))
  })

  assert.deepEqual(result.projects, ['工具项目', '运维'])
  assert.deepEqual(result.statuses, ['正常工作', '出差', '请假'])
  assert.equal(result.workDays, 3)
  assert.equal(result.logCount, 3)
  assert.equal(result.weekendLogCount, 2)
  assert.equal(result.personDayTotal, 1.5)
  assert.equal(result.overtimeHoursTotal, 3.5)
})
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test`

Expected: FAIL because `src/utils/workLogCalendar.js` does not exist.

- [ ] **Step 3: Implement utility functions**

Create `src/utils/workLogCalendar.js` exporting:

```js
export function formatDate(date) {
  // Return YYYY-MM-DD using local calendar date parts.
}

export function parseDate(text) {
  // Return new Date(`${text}T00:00:00`) so local date math stays stable.
}

export function shiftMonthByOffset(baseDate, offset) {
  // Return the first day of the target month at local midnight.
}

export function getMonthRange(baseDate) {
  // Return {startDate, endDate, year, month} for the natural month.
}

export function buildMonthCalendarDays(baseDate) {
  // Return Monday-first day objects: {date, dayNumber, weekLabel, inCurrentMonth}.
}

export function calculateLogStats(logs, formatters) {
  // Return projects, statuses, locations, workDays, personDayTotal,
  // overtimeHoursTotal, logCount, weekendLogCount.
}

export function buildDateSummaryMap(days, logs, helpers) {
  // Return per-date summaries with count, typeLabels, projectsText,
  // workItemsText, personDayTotal, overtimeHoursTotal, and inCurrentMonth.
}
```

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test`

Expected: PASS with the new work-log calendar tests included.

### Task 2: Wire Month View State and Data Loading

**Files:**
- Modify: `src/views/WorkLog.vue`
- Modify: `src/utils/workLogCalendar.js`

- [ ] **Step 1: Add tested helper import**

Import the utility functions into `WorkLog.vue` and remove duplicated local date helpers only where the shared helpers cover existing behavior.

- [ ] **Step 2: Add month state**

Add `calendarView`, `monthOffset`, `monthlyLogs`, `monthDays`, `monthlyStats`, and `monthSummaryMap` in `setup()`.

- [ ] **Step 3: Add month fetch**

Add `fetchMonthlyLogs()` that calls `listWorkLogs` with `getMonthRange(monthReferenceDate.value).startDate` and `.endDate`, normalizes logs, and sorts by `logDate`.

- [ ] **Step 4: Update navigation and focus**

Add `switchCalendarView(view)`, `changeCalendarRange(delta)`, `changeMonth(delta)`, and update `focusLogDate()` so month view refreshes and selects the saved log date.

- [ ] **Step 5: Run tests**

Run: `npm test`

Expected: PASS.

### Task 3: Render Month View UI

**Files:**
- Modify: `src/views/WorkLog.vue`

- [ ] **Step 1: Add view toggle and dynamic tags**

Add a segmented control for `周视图 / 月视图`, update hero tags to show current week or month range, and update action buttons to use current view navigation.

- [ ] **Step 2: Add monthly stats panel**

Render `本月统计` when `calendarView === 'month'`, using the same metrics as week stats but reading `monthlyStats`.

- [ ] **Step 3: Add month calendar grid**

Render `monthDays` in a 7-column grid when month view is active. Non-current-month cells are muted and do not open detail. Current-month cells show log count, type chips, project text, work summary, person-day total, overtime total, and double-click detail behavior.

- [ ] **Step 4: Keep week view behavior**

Wrap the existing week stats panel and week calendar grid in `calendarView === 'week'` conditions.

- [ ] **Step 5: Run build**

Run: `npm run build`

Expected: Vite build exits with code 0.

### Task 4: Final Verification

**Files:**
- No new files.

- [ ] **Step 1: Run full frontend tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run frontend build**

Run: `npm run build`

Expected: build exits with code 0.

- [ ] **Step 3: Inspect diff**

Run: `git diff --stat && git diff -- src/views/WorkLog.vue src/utils/workLogCalendar.js src/utils/__tests__/workLogCalendar.test.js`

Expected: diff only touches work-log month view implementation and tests.
