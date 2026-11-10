import test from 'node:test'
import assert from 'node:assert/strict'
import {buildSystemLogQuery, emptySystemLogFilters, formatSystemLogTime, readSystemLogResponse, systemLogErrorCode, systemLogSourceLabel, validateSystemLogTimeRange} from '../systemLog.js'

test('来源按契约映射，未知来源按原文本显示', () => {
  assert.equal(systemLogSourceLabel('HTTP'), 'HTTP 请求')
  assert.equal(systemLogSourceLabel('ASYNC_TASK'), '异步任务')
  assert.equal(systemLogSourceLabel('SCHEDULER'), '定时任务')
  assert.equal(systemLogSourceLabel('<script>unknown</script>'), '<script>unknown</script>')
  assert.equal(systemLogSourceLabel('constructor'), 'constructor')
  assert.equal(systemLogSourceLabel(null), '—')
})

test('北京时间校验允许相等、单边、无范围与长跨度，拒绝倒置和非法日期', () => {
  for (const [from, to] of [['', ''], ['2026-11-07T21:30', ''], ['', '2026-11-07T21:30:00'], ['2026-11-07T21:30', '2026-11-07T21:30:00'], ['2000-01-01T00:00', '2026-11-07T21:30']]) {
    assert.equal(validateSystemLogTimeRange({occurredFrom: from, occurredTo: to}), '')
  }
  assert.equal(validateSystemLogTimeRange({occurredFrom: '2026-11-08T00:00', occurredTo: '2026-11-07T23:59:59'}), '开始时间不能晚于结束时间')
  for (const value of ['2026-02-29T12:00', '2026-13-01T12:00', '2026-11-07T24:00', '2026-11-07T12:00Z', 'wrong']) {
    assert.equal(validateSystemLogTimeRange({occurredFrom: value}), '请输入有效的北京时间')
  }
  assert.equal(validateSystemLogTimeRange({occurredFrom: '2024-02-29T12:00'}), '')
})

test('参数仅含契约字段，补秒不做 UTC 转换，空字段省略', () => {
  assert.deepEqual(buildSystemLogQuery(emptySystemLogFilters()), {pageNo: 1, pageSize: 20})
  assert.deepEqual(buildSystemLogQuery({occurredFrom: '2026-11-07T21:30', occurredTo: '2026-11-08T00:00:01', exceptionType: ' demo.Error ', traceId: ' synthetic-trace ', keyword: ' test_% ', unsupported: 'ignored'}, 3, 50), {
    pageNo: 3, pageSize: 50, occurredFrom: '2026-11-07T21:30:00', occurredTo: '2026-11-08T00:00:01', exceptionType: 'demo.Error', traceId: 'synthetic-trace', keyword: 'test_%'
  })
  assert.throws(() => buildSystemLogQuery({occurredFrom: '2026-11-08T00:00', occurredTo: '2026-11-07T00:00'}), /开始时间不能晚于结束时间/)
  assert.equal(formatSystemLogTime('2026-11-07T21:30:00'), '2026-11-07 21:30:00')
})

test('分钟精度范围包含整分钟，显式秒数保持原样，校验与查询边界一致', () => {
  assert.deepEqual(buildSystemLogQuery({occurredFrom: '2026-11-07T21:30', occurredTo: '2026-11-07T21:30'}), {
    pageNo: 1, pageSize: 20, occurredFrom: '2026-11-07T21:30:00', occurredTo: '2026-11-07T21:30:59'
  })
  const filters = {occurredFrom: '2026-11-07T21:30:45', occurredTo: '2026-11-07T21:30'}
  assert.equal(validateSystemLogTimeRange(filters), '')
  assert.equal(buildSystemLogQuery(filters).occurredTo, '2026-11-07T21:30:59')
  assert.deepEqual(buildSystemLogQuery({occurredFrom: '2026-11-07T21:30:12', occurredTo: '2026-11-07T21:30:34'}), {
    pageNo: 1, pageSize: 20, occurredFrom: '2026-11-07T21:30:12', occurredTo: '2026-11-07T21:30:34'
  })
  assert.equal(buildSystemLogQuery({occurredTo: '2026-11-07T21:30:00'}).occurredTo, '2026-11-07T21:30:00')
  assert.equal(validateSystemLogTimeRange({occurredFrom: '2026-11-07T21:30:45', occurredTo: '2026-11-07T21:30:44'}), '开始时间不能晚于结束时间')
})

test('响应只接受成功码 0，保留 HTTP/业务错误码供权限与 404 状态使用', () => {
  const data = {list: [], total: 0}
  assert.equal(readSystemLogResponse({data: {code: '0', data}}), data)
  assert.throws(() => readSystemLogResponse({data: {code: '404'}}), error => systemLogErrorCode(error) === '404')
  assert.equal(systemLogErrorCode({response: {status: 403, data: {code: '403'}}}), '403')
  assert.equal(systemLogErrorCode({response: {data: {code: 'SYSTEM_LOG_QUERY_INVALID'}}}), 'SYSTEM_LOG_QUERY_INVALID')
})

test('2xx 响应按契约业务码识别错误，非 2xx 优先使用 HTTP 状态', () => {
  for (const code of [401, '401', 403, '403', 404, '404', 400, '400', 'SYSTEM_LOG_QUERY_INVALID']) {
    assert.throws(() => readSystemLogResponse({status: 200, data: {code}}), error => systemLogErrorCode(error) === String(code))
    assert.equal(systemLogErrorCode({response: {status: 200, data: {code}}}), String(code))
  }
  assert.equal(systemLogErrorCode({response: {status: 201, data: {code: '403'}}}), '403')
  for (const [status, code] of [[400, 'SYSTEM_LOG_QUERY_INVALID'], [403, '404'], [404, '403'], [500, 'SYSTEM_LOG_QUERY_INVALID']]) {
    assert.equal(systemLogErrorCode({response: {status, data: {code}}}), String(status))
    assert.throws(() => readSystemLogResponse({status, data: {code}}), error => systemLogErrorCode(error) === String(status))
  }
  assert.equal(systemLogErrorCode(new Error('network failure')), '')
})
