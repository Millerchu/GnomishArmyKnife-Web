import test from 'node:test'
import assert from 'node:assert/strict'

import {resolvePermissionViewState} from '../permissionAccess.js'

test('backend success keeps granted feature codes and backend source', () => {
  const result = resolvePermissionViewState({
    featureCodes: ['APP_TODO_LIST'],
    permissionSource: 'DIRECT'
  })

  assert.deepEqual(result, {
    accessibleFeatureCodes: ['APP_TODO_LIST'],
    appPermissionSource: 'backend'
  })
})

test('admin fallback source is preserved for frontend state rendering', () => {
  const result = resolvePermissionViewState({
    grantedFeatureCodes: ['APP_TODO_LIST', 'APP_CALCULATOR'],
    permissionSource: 'ADMIN_FALLBACK'
  })

  assert.deepEqual(result, {
    accessibleFeatureCodes: ['APP_TODO_LIST', 'APP_CALCULATOR'],
    appPermissionSource: 'admin-fallback'
  })
})

test('backend failure does not fall back to local drafts or full catalog', () => {
  const result = resolvePermissionViewState(null, new Error('network error'))

  assert.deepEqual(result, {
    accessibleFeatureCodes: [],
    appPermissionSource: 'unavailable'
  })
})
