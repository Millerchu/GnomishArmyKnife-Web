// @vitest-environment happy-dom
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {getSystemLog, listSystemLogs} from '@/api/systemLog'
import request from '@/api/request'
import router from '@/router'
import {USER_APP_DEFINITIONS, RESERVED_SYSTEM_CAPABILITIES} from '@/constants/appCatalog'
import {QUICK_CREATE_TYPES} from '@/constants/quickCreateRegistry'

vi.mock('@/api/request', () => ({default: {get: vi.fn()}}))
beforeEach(() => vi.clearAllMocks())

describe('系统日志契约接入', () => {
  it('复用 request，保留 Axios response 和字符串大整数 id', async () => {
    const response = {data: {code: '0', data: {list: [], total: 0}}}
    request.get.mockResolvedValue(response)
    const params = {pageNo: 2, pageSize: 20, occurredFrom: '2026-11-07T21:30:00'}
    expect(await listSystemLogs(params)).toBe(response)
    expect(request.get).toHaveBeenLastCalledWith('/system/logs', {params})
    await getSystemLog('9223372036854775806')
    expect(request.get).toHaveBeenLastCalledWith('/system/logs/9223372036854775806')
  })

  it('目录、管理员路由一致，移除预留能力且不提供快速新增', () => {
    expect(USER_APP_DEFINITIONS.find(app => app.featureCode === 'APP_SYSTEM_LOG')).toMatchObject({route: '/system-log', iconType: 'TEXT', iconText: '日志', category: '系统管理', dataSourceMode: 'REAL', sortNo: 150})
    expect(RESERVED_SYSTEM_CAPABILITIES.some(app => app.name === '系统日志')).toBe(false)
    expect(QUICK_CREATE_TYPES.some(type => type.featureCode === 'APP_SYSTEM_LOG')).toBe(false)
    expect(router.resolve('/system-log').meta).toMatchObject({requiresAdmin: true, showAdminDenied: true})
  })

  it('未登录走既有登录守卫，普通用户直达留给页面显示权限状态', async () => {
    localStorage.clear()
    await router.push('/system-log')
    expect(router.currentRoute.value.path).toBe('/login')
    localStorage.setItem('token', 'synthetic-session')
    localStorage.setItem('user', JSON.stringify({roleCode: 'USER'}))
    await router.push('/system-log')
    expect(router.currentRoute.value.path).toBe('/system-log')
  })
})
