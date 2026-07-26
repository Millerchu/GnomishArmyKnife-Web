// @vitest-environment happy-dom

import {describe, expect, it} from 'vitest'

describe('NAS SSO page contracts', () => {
  it('routes root through SSO and keeps the original login page at syslogin', async () => {
    const {default: routerSource} = await import('../../router/index.js?raw')

    expect(routerSource).toContain("{path: '/', component: () => import('../views/NasSsoStart.vue')}")
    expect(routerSource).toContain("{path: '/login', redirect: '/'}")
    expect(routerSource).toContain("{path: '/syslogin', component: () => import('../views/Login.vue')}")
    expect(routerSource).toContain("{path: '/nas-sso-callback', component: () => import('../views/NasSsoCallback.vue')}")
  })

  it('starts bridge navigation with state and exchanges callback before writing auth state', async () => {
    const [{default: startSource}, {default: callbackSource}] = await Promise.all([
      import('../NasSsoStart.vue?raw'),
      import('../NasSsoCallback.vue?raw')
    ])

    expect(startSource).toMatch(/generateNasSsoState\(\)[\s\S]*storeNasSsoState\(state\)[\s\S]*window\.location\.replace/)
    expect(callbackSource).toMatch(/consumeNasSsoState\(state\)[\s\S]*nasSsoExchangeApi\(\{code, state\}\)/)
    expect(callbackSource).toMatch(/writeAuthState\(localStorage, \{token, user\}\)[\s\S]*window\.location\.replace\(buildAppPath\('home'\)\)/)
    expect(callbackSource).toContain('resolveFailureReason(error)')
  })

  it('redirects expired sessions back to SSO and active logout to manual login', async () => {
    const [{default: requestSource}, {default: homeSource}] = await Promise.all([
      import('../../api/request.js?raw'),
      import('../Home.vue?raw')
    ])

    expect(requestSource).toContain('window.location.replace(authenticationPath)')
    expect(homeSource).toMatch(/await logoutApi\(\)[\s\S]*clearAuthState\(localStorage\)[\s\S]*router\.push\('\/syslogin'\)/)
  })
})
