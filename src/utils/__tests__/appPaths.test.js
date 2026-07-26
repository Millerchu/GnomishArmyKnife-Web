import test from 'node:test'
import assert from 'node:assert/strict'

import {buildAppPath, normalizeAppBasePath} from '../appPaths.js'

test('normalizes application base paths with one leading and trailing slash', () => {
  assert.equal(normalizeAppBasePath('/gak/'), '/gak/')
  assert.equal(normalizeAppBasePath('gak'), '/gak/')
  assert.equal(normalizeAppBasePath('/'), '/')
})

test('builds application and API paths below the configured base path', () => {
  assert.equal(buildAppPath('', '/gak/'), '/gak/')
  assert.equal(buildAppPath('/home', '/gak/'), '/gak/home')
  assert.equal(buildAppPath('api/auth/login', '/gak/'), '/gak/api/auth/login')
})
