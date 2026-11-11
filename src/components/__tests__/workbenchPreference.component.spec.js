// @vitest-environment happy-dom
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {AxiosError} from 'axios'
import request from '@/api/request'
import {getWorkbenchPreferences, saveWorkbenchPreferences} from '@/api/workbenchPreference'

const originalAdapter = request.defaults.adapter
const body = {version: 2, schemaVersion: 1, payload: {cards: [], dock: {collapsed: false, order: []}}}
const envelope = {code: '0', data: {...body, version: 3, updatedAt: '2026-11-11T12:00:00'}}
let adapter
let replace
beforeEach(() => {
  localStorage.setItem('token', 'test-token')
  localStorage.setItem('user', JSON.stringify({id: '9223372036854775807'}))
  adapter = vi.fn(async config => ({status: 200, statusText: 'OK', data: envelope, headers: {}, config}))
  request.defaults.adapter = adapter
  replace = vi.spyOn(window.location, 'replace').mockImplementation(() => {})
})
afterEach(() => { request.defaults.adapter = originalAdapter; localStorage.clear(); vi.restoreAllMocks() })

it('GET 不带额外参数，保留 Axios response 和服务端初始文档', async () => {
  const initial = {code: '0', data: {version: 0, schemaVersion: 1, payload: null}}
  adapter.mockImplementationOnce(async config => ({status: 200, data: initial, config, headers: {}}))
  const result = await getWorkbenchPreferences()
  expect(adapter).toHaveBeenCalledOnce()
  expect(adapter.mock.calls[0][0]).toMatchObject({method: 'get', url: '/workbench/preferences', headers: {Authorization: 'Bearer test-token'}})
  expect(adapter.mock.calls[0][0].params).toBeUndefined()
  expect(result.status).toBe(200)
  expect(result.data).toBe(initial)
})

it('PUT 仅发送 version/schemaVersion/payload，返回服务端新版本', async () => {
  const result = await saveWorkbenchPreferences({...body, userId: 'other', user_id: 'other'})
  const config = adapter.mock.calls[0][0]
  expect(config).toMatchObject({method: 'put', url: '/workbench/preferences'})
  expect(JSON.parse(config.data)).toEqual(body)
  expect(result.data).toBe(envelope)
})

it.each([0, 2])('version=%s 的 409 使用后端契约原文，最新文档 data 可取且不登出', async version => {
  const conflict = {code: 'WORKBENCH_PREFERENCE_VERSION_CONFLICT', message: '布局已在其他设备更新，请查看后选择保留云端或用本地覆盖。', data: envelope.data}
  let failure
  adapter.mockImplementationOnce(async config => {
    failure = new AxiosError('Conflict', 'ERR_BAD_REQUEST', config, null, {status: 409, data: conflict, headers: {}, config})
    throw failure
  })
  let caught
  try { await saveWorkbenchPreferences({...body, version}) } catch (error) { caught = error }
  expect(caught).toBe(failure)
  expect(caught.response.status).toBe(409)
  expect(caught.response.data).toBe(conflict)
  expect(caught.response.data.message).toBe('布局已在其他设备更新，请查看后选择保留云端或用本地覆盖。')
  expect(caught.response.data.data).toBe(envelope.data)
  expect(localStorage.getItem('token')).toBe('test-token')
  expect(JSON.parse(localStorage.getItem('user')).id).toBe('9223372036854775807')
  expect(replace).not.toHaveBeenCalled()
})

it('网络失败仍交由调用方处理', async () => {
  const failure = new Error('Network Error')
  adapter.mockRejectedValueOnce(failure)
  await expect(getWorkbenchPreferences()).rejects.toBe(failure)
  expect(localStorage.getItem('token')).toBe('test-token')
  expect(replace).not.toHaveBeenCalled()
})

it('401 仍按原行为清理登录态并跳转', async () => {
  adapter.mockImplementationOnce(async config => { throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, {status: 401, data: {code: '401', message: '未登录'}, config}) })
  await expect(getWorkbenchPreferences()).rejects.toThrow('登录状态已失效')
  expect(localStorage.getItem('token')).toBeNull()
  expect(localStorage.getItem('user')).toBeNull()
  expect(replace).toHaveBeenCalledWith('/login')
})
