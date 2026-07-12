import test from 'node:test'
import assert from 'node:assert/strict'
import {QUICK_CREATE_TYPES, resolveQuickCreateTypes} from '../quickCreateRegistry.js'

test('quick create registry exposes all thirteen business create types', () => {
  assert.equal(QUICK_CREATE_TYPES.length, 13)
  assert.equal(new Set(QUICK_CREATE_TYPES.map((item) => item.typeCode)).size, 13)
})

test('quick create types are filtered by granted feature codes', () => {
  const result = resolveQuickCreateTypes(['APP_TODO_LIST', 'APP_PERSONAL_BILLS', 'APP_CALCULATOR'])
  assert.deepEqual(result.map((item) => item.typeCode), ['TODO_ITEM', 'PERSONAL_BILL', 'ANNUAL_BUDGET'])
})

test('calculator and system capabilities never appear in quick create registry', () => {
  const featureCodes = new Set(QUICK_CREATE_TYPES.map((item) => item.featureCode))
  assert.equal(featureCodes.has('APP_CALCULATOR'), false)
  assert.equal(Array.from(featureCodes).some((code) => code.startsWith('SYSTEM_')), false)
})
