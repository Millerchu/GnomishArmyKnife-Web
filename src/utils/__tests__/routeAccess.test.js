import test from 'node:test'
import assert from 'node:assert/strict'

import {resolveNavigationTarget} from '../routeAccess.js'

test('anonymous user visiting a protected route is redirected to login', () => {
  assert.equal(resolveNavigationTarget('/home', {token: '', user: null}), '/login')
})

test('logged-in user visiting login is redirected to home', () => {
  assert.equal(
    resolveNavigationTarget('/login', {
      token: 'access-token',
      user: {id: 1, username: 'tester'}
    }),
    '/home'
  )
})

test('public routes stay reachable without a token', () => {
  assert.equal(resolveNavigationTarget('/register', {token: '', user: null}), null)
})
