import test from 'node:test'
import assert from 'node:assert/strict'
import {appendErrorTraceId, getErrorTraceId} from '../errorMessage.js'

const traceId = '0123456789abcdef0123456789abcdef'
const message = '保存失败，请稍后重试。'

test('有合法追踪编号的 HTTP 5xx 在原提示后附加查询文案', () => {
  for (const status of [500, 503, 599]) {
    const error = {response: {status}, traceId}
    assert.equal(getErrorTraceId(error), traceId)
    assert.equal(appendErrorTraceId(message, error), `${message}\n追踪编号：${traceId}，可在系统日志中精确查询`)
  }
})

test('无头、非法编号、非 HTTP 5xx 和网络错误保持原文案', () => {
  for (const error of [
    undefined, new Error('network failure'), {response: {status: 500}},
    ...[200, 400, 401, 403, 499, 600].map(status => ({response: {status}, traceId})),
    ...['', traceId.toUpperCase(), ` ${traceId}`, `${traceId}\n`, 'bad', [traceId]].map(traceId => ({response: {status: 500}, traceId})),
    {traceId}
  ]) {
    assert.equal(getErrorTraceId(error), '')
    assert.equal(appendErrorTraceId(message, error), message)
  }
})
