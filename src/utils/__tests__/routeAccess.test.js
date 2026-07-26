import test from 'node:test'
import assert from 'node:assert/strict'

import {resolveNavigationTarget} from '../routeAccess.js'

test('anonymous user visiting a protected route is redirected to NAS SSO entry', () => {
  assert.equal(resolveNavigationTarget('/home', {token: '', user: null}), '/')
})

test('logged-in user visiting a login entry is redirected to home', () => {
  assert.equal(
    resolveNavigationTarget('/syslogin', {
      token: 'access-token',
      user: {id: 1, username: 'tester'}
    }),
    '/home'
  )
})

test('public routes stay reachable without a token', () => {
  assert.equal(resolveNavigationTarget('/register', {token: '', user: null}), null)
  assert.equal(resolveNavigationTarget('/nas-sso-callback', {token: '', user: null}), null)
})
