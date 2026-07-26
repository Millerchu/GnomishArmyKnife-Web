import test from 'node:test'
import assert from 'node:assert/strict'

import {
  NAS_SSO_STATE_STORAGE_KEY,
  buildNasSsoBridgeUrl,
  consumeNasSsoState,
  generateNasSsoState,
  resolveNasSsoBridgeUrl,
  storeNasSsoState
} from '../nasSso.js'

function createMemoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  }
}

test('generated state is URL-safe and bridge URL only contains state', () => {
  const cryptoProvider = {
    getRandomValues(bytes) {
      bytes.fill(255)
      return bytes
    }
  }
  const state = generateNasSsoState(cryptoProvider)
  const bridgeUrl = new URL(buildNasSsoBridgeUrl(
    state,
    'http://greennas:9999/gak-sso/bridge.html'
  ))

  assert.match(state, /^[A-Za-z0-9_-]{32,128}$/)
  assert.equal(bridgeUrl.searchParams.get('state'), state)
  assert.deepEqual([...bridgeUrl.searchParams.keys()], ['state'])
})

test('bridge URL follows the UGOS gateway origin for external access', () => {
  const externalLocation = {
    hostname: 'dxp4800-2ed4.cn70.ug.link',
    origin: 'https://dxp4800-2ed4.cn70.ug.link',
    port: '',
    protocol: 'https:'
  }

  assert.equal(
    resolveNasSsoBridgeUrl('', externalLocation),
    'https://dxp4800-2ed4.cn70.ug.link/gak-sso/bridge.html'
  )
})

test('direct LAN web port resolves the bridge through NAS management port', () => {
  const internalLocation = {
    hostname: 'greennas',
    origin: 'http://greennas:18088',
    port: '18088',
    protocol: 'http:'
  }

  assert.equal(
    resolveNasSsoBridgeUrl('', internalLocation),
    'http://greennas:9999/gak-sso/bridge.html'
  )
})

test('state can only be consumed once and must match exactly', () => {
  const storage = createMemoryStorage()
  const browsingContext = {name: ''}
  const state = 'a'.repeat(43)
  storeNasSsoState(state, storage, browsingContext)

  assert.equal(storage.getItem(NAS_SSO_STATE_STORAGE_KEY), state)
  assert.equal(consumeNasSsoState('b'.repeat(43), storage, browsingContext), false)
  assert.equal(consumeNasSsoState(state, storage, browsingContext), false)
})

test('window name keeps state available across NAS cross-origin navigation', () => {
  const storage = createMemoryStorage()
  const browsingContext = {name: ''}
  const state = 'c'.repeat(43)
  storeNasSsoState(state, storage, browsingContext)
  storage.removeItem(NAS_SSO_STATE_STORAGE_KEY)

  assert.equal(consumeNasSsoState(state, storage, browsingContext), true)
  assert.equal(browsingContext.name, '')
})
