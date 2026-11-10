// @vitest-environment happy-dom
import {afterEach, describe, expect, it, vi} from 'vitest'
import {AxiosError, AxiosHeaders} from 'axios'
import request from '@/api/request'

const traceId = '0123456789abcdef0123456789abcdef'
const rejectResponse = request.interceptors.response.handlers[0].rejected

afterEach(() => { vi.restoreAllMocks(); localStorage.clear() })

describe('请求错误追踪编号', () => {
  it('从 Axios 小写响应头挂载合法编号，保留原始错误及错误体', async () => {
    const response = {status: 500, data: {code: '500', message: '服务器内部错误'}, headers: new AxiosHeaders({'x-trace-id': traceId})}
    const error = new AxiosError('Request failed', 'ERR_BAD_RESPONSE', {url: '/todo-items'}, null, response)
    await expect(rejectResponse(error)).rejects.toBe(error)
    expect(error.traceId).toBe(traceId)
    expect(error.response).toBe(response)
    expect(response.data).toEqual({code: '500', message: '服务器内部错误'})
  })

  it.each([undefined, {}, ...['bad', traceId.toUpperCase(), ` ${traceId}`, `${traceId}\n`, traceId.slice(1), `${traceId}0`, [traceId], 123].map(value => ({'x-trace-id': value}))])('无头或非法头不挂载编号：%j', async headers => {
    const error = {response: {status: 500, data: {}, headers}}
    await expect(rejectResponse(error)).rejects.toBe(error)
    expect(error).not.toHaveProperty('traceId')
  })

  it('网络错误保持原样，成功响应不挂载编号', async () => {
    const error = new Error('Network Error')
    await expect(rejectResponse(error)).rejects.toBe(error)
    expect(error).not.toHaveProperty('traceId')
    const response = {status: 200, data: {code: '0'}, headers: {'x-trace-id': traceId}}
    expect(request.interceptors.response.handlers[0].fulfilled(response)).toBe(response)
    expect(response).not.toHaveProperty('traceId')
  })

  it('401 仍清理登录态并拒绝原有登录失效错误', async () => {
    localStorage.setItem('token', 'synthetic-token')
    localStorage.setItem('user', '{}')
    const replace = vi.spyOn(window.location, 'replace').mockImplementation(() => {})
    const error = {config: {url: '/todo-items'}, response: {status: 401, data: {}}}
    await expect(rejectResponse(error)).rejects.toThrow('登录状态已失效')
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
    expect(replace).toHaveBeenCalledWith('/login')
  })
})
