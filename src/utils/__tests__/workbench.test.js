import test from 'node:test'
import assert from 'node:assert/strict'
import {moveWorkbenchCard, normalizeWorkbenchLayout, readWorkbenchLayout} from '../workbenchLayout.js'
import {highlightCommand, workbenchCommands} from '../workbenchCommands.js'
import {formatTodoDueDate, localDate, summarizeWeek, weekDates} from '../workbenchData.js'
import {resolvePermissionViewState} from '../permissionAccess.js'
import {getLogPersonDay} from '../workLogCalendar.js'
import {normalizeWorkbenchOrder, readUserStorage, userStorageKey} from '../workbenchStorage.js'

test('工作台人天与日志页口径相同：请假与在途为零，条目完整时按条目求和', () => {
  const dates = weekDates(new Date(2026, 10, 11))
  const logs = [
    {logDate: dates[0], typeCodes: ['LEAVE'], personDay: 1},
    {logDate: dates[1], typeCodes: ['SICK_LEAVE'], personDay: 1},
    {logDate: dates[2], location: '出差在途', personDay: 1},
    {logDate: dates[3], personDay: 9, workItems: [{personDay: '0.25'}, {personDay: 0.5}]}
  ]
  const result = summarizeWeek(logs, dates)
  assert.deepEqual(result.days.slice(0, 4).map(day => day.personDay), [0, 0, 0, 0.75])
  logs.forEach((log, i) => assert.equal(result.days[i].personDay, getLogPersonDay(log)))
  assert.equal(result.total, logs.reduce((sum, log) => sum + getLogPersonDay(log), 0))
})

test('排序清理重复、空串、空白及非字符串，保留历史应用键', () => {
  assert.deepEqual(normalizeWorkbenchOrder(['todo', '', '  ', 'todo', null, 1, 'health', 'old']), ['todo', 'health', 'old'])
  assert.deepEqual(normalizeWorkbenchOrder({}), [])
})

for (const key of ['gak_workbench_layout_v1', 'gak_workbench_dock_collapsed_v1', 'home_tool_custom_order']) {
  test(`${key} 按用户隔离，旧值仅迁移一次且保留旧键，无 id 使用原键`, () => {
    const values = new Map([[key, 'legacy']])
    const storage = {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value)}
    assert.equal(readUserStorage(storage, key, '9223372036854775807'), 'legacy')
    assert.equal(values.get(`${key}:9223372036854775807`), 'legacy')
    values.set(key, 'later-legacy')
    assert.equal(readUserStorage(storage, key, '9223372036854775807'), 'legacy')
    assert.equal(readUserStorage(storage, key, 'other'), 'later-legacy')
    assert.equal(values.get(key), 'later-legacy')
    assert.equal(readUserStorage(storage, key), 'later-legacy')
    assert.equal(userStorageKey(key, ''), key)
    values.set(`${key}:other`, '')
    assert.equal(readUserStorage(storage, key, 'other'), '')
  })
}

test('布局迁移忽略未知与重复键，并补充新增卡片', () => {
  assert.deepEqual(normalizeWorkbenchLayout({order: ['health', 'old', 'health'], hidden: ['health', 'old', 'health']}), {version: 1, order: ['health', 'todo', 'workLog', 'bills'], hidden: ['health']})
})
test('损坏存储恢复默认布局', () => {
  assert.deepEqual(readWorkbenchLayout({getItem: () => '{bad'}), normalizeWorkbenchLayout())
  assert.deepEqual(normalizeWorkbenchLayout({order: 'bad', hidden: true}), normalizeWorkbenchLayout())
})
test('卡片移动跳过未授权键，越界与未知键保持原布局', () => {
  const initial = normalizeWorkbenchLayout()
  assert.deepEqual(moveWorkbenchCard(initial, 'todo', 1, ['todo', 'health']).order, ['health', 'workLog', 'bills', 'todo'])
  assert.deepEqual(moveWorkbenchCard(initial, 'todo', -1), initial)
  assert.deepEqual(moveWorkbenchCard(initial, 'unknown', 1), initial)
})
test('命令默认取六个应用四个新增，输入后搜索全量并排除系统路由', () => {
  const apps = Array.from({length: 8}, (_, i) => ({key: String(i), name: `应用${i}`, route: `/app${i}`}))
  apps.push({key: 'sys', name: '应用管理', route: '/system/apps'})
  const types = Array.from({length: 6}, (_, i) => ({typeCode: String(i), appName: `类型${i}`, label: `记录${i}`}))
  const result = workbenchCommands(apps, types)
  assert.equal(result.filter(item => item.kind === 'app').length, 6)
  assert.equal(result.filter(item => item.kind === 'create').length, 4)
  assert.equal(workbenchCommands(apps, types, '应用7')[0].route, '/app7')
  assert.equal(workbenchCommands(apps, types, '类型5')[0].typeCode, '5')
  assert.deepEqual(workbenchCommands(apps, types, '管理'), [])
  assert.deepEqual(workbenchCommands(apps, types, '天气'), [])
})
test('高亮支持多处命中、忽略大小写，保留文本内容', () => {
  assert.deepEqual(highlightCommand('Ab ab', 'aB'), [{text: 'Ab', hit: true}, {text: ' ', hit: false}, {text: 'ab', hit: true}])
  assert.equal(highlightCommand('<img>', 'img').map(item => item.text).join(''), '<img>')
})
test('按本地日期计算跨年周，逐日汇总人天并忽略周外日志', () => {
  const dates = weekDates(new Date(2026, 0, 1))
  assert.equal(dates[0], '2025-12-29')
  assert.equal(dates[6], '2026-01-04')
  assert.equal(localDate(new Date(2026, 0, 1)), '2026-01-01')
  const result = summarizeWeek([{logDate: dates[0], personDay: '0.5'}, {logDate: dates[0], personDay: '0.2'}, {logDate: '2026-01-10', personDay: 5}], dates)
  assert.equal(result.days[0].personDay, 0.7)
  assert.equal(result.total, 0.7)
})
test('优先采用显式 accessibleFeatureCodes，包括空授权', () => {
  assert.deepEqual(resolvePermissionViewState({accessibleFeatureCodes: [], featureCodes: ['OLD']}).accessibleFeatureCodes, [])
  assert.deepEqual(resolvePermissionViewState({accessibleFeatureCodes: ['APP_TODO_LIST', 'APP_TODO_LIST']}).accessibleFeatureCodes, ['APP_TODO_LIST'])
})

test('待办按本地日期显示今天和明天，不受当天时刻影响', () => {
  for (const now of [new Date(2026, 10, 11, 0, 5), new Date(2026, 10, 11, 23, 55)]) {
    assert.equal(formatTodoDueDate('2026-11-11', now), '今天')
    assert.equal(formatTodoDueDate('2026-11-12', now), '明天')
  }
})
test('待办其他日期显示月日与星期，包括过去日期', () => {
  const now = new Date(2026, 10, 11)
  assert.equal(formatTodoDueDate('2026-11-13', now), '11月13日 周五')
  assert.equal(formatTodoDueDate('2026-11-10', now), '11月10日 周二')
  assert.equal(formatTodoDueDate('2026-11-15', now), '11月15日 周日')
})
test('待办明天计算支持跨月、跨年与闰日', () => {
  assert.equal(formatTodoDueDate('2026-12-01', new Date(2026, 10, 30, 23, 59)), '明天')
  assert.equal(formatTodoDueDate('2027-01-01', new Date(2026, 11, 31)), '明天')
  assert.equal(formatTodoDueDate('2028-02-29', new Date(2028, 1, 28)), '明天')
})
test('待办夏令时切换前后仍以日历日期计算明天', () => {
  assert.equal(formatTodoDueDate('2026-03-09', new Date(2026, 2, 8, 23, 30)), '明天')
  assert.equal(formatTodoDueDate('2026-11-02', new Date(2026, 10, 1, 0, 30)), '明天')
})
test('待办缺少日期或收到无效日期时显示未设日期', () => {
  for (const value of [null, undefined, '', 'bad', '2026-02-30', '2026-13-01', '2026-00-11', '2026-11-00', '2026-11-11T00:00:00Z']) {
    assert.equal(formatTodoDueDate(value, new Date(2026, 10, 11)), '未设日期')
  }
})
