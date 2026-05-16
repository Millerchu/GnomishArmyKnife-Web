import test from 'node:test'
import assert from 'node:assert/strict'

import {
  AUTH_TOKEN_STORAGE_KEY,
  AUTH_USER_STORAGE_KEY,
  clearAuthState,
  readAuthState,
  writeAuthState
} from '../authStorage.js'

function createStorage() {
  const store = new Map()
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null
    },
    setItem(key, value) {
      store.set(key, String(value))
    },
    removeItem(key) {
      store.delete(key)
    }
  }
}

test('writeAuthState persists token and user without touching session storage', () => {
  const localStorage = createStorage()
  const sessionStorage = createStorage()

  writeAuthState(localStorage, {
    token: 'access-token',
    user: {id: 7, username: 'tester'}
  })

  assert.equal(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY), 'access-token')
  assert.equal(localStorage.getItem(AUTH_USER_STORAGE_KEY), JSON.stringify({id: 7, username: 'tester'}))
  assert.equal(sessionStorage.getItem('currentUserPlainPassword'), null)
})

test('readAuthState ignores malformed user payload and returns safe defaults', () => {
  const localStorage = createStorage()
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'token-value')
  localStorage.setItem(AUTH_USER_STORAGE_KEY, '{bad json}')

  assert.deepEqual(readAuthState(localStorage), {
    token: 'token-value',
    user: null
  })
})

test('clearAuthState removes persisted login token and user', () => {
  const localStorage = createStorage()
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'token-value')
  localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify({username: 'tester'}))

  clearAuthState(localStorage)

  assert.equal(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY), null)
  assert.equal(localStorage.getItem(AUTH_USER_STORAGE_KEY), null)
})
