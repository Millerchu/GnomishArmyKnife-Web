import test from 'node:test'
import assert from 'node:assert/strict'
import {QUICK_CREATE_TYPES, resolveQuickCreateTypes} from '../quickCreateRegistry.js'

test('医院就诊快捷新增支持可选自付金额', () => {
  const visit = QUICK_CREATE_TYPES.find(item => item.typeCode === 'HEALTH_VISIT')
  const amount = visit.fields.find(field => field.key === 'amount')
  assert.equal(visit.defaults().amount, '')
  assert.equal(amount.required, false)
  assert.equal(amount.min, 0)
  assert.equal(amount.step, '0.01')
})

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

test('password memo category is loaded from its dictionary usage', () => {
  const passwordMemo = QUICK_CREATE_TYPES.find((item) => item.typeCode === 'PASSWORD_MEMO')
  const categoryField = passwordMemo.fields.find((field) => field.key === 'category')

  assert.equal(categoryField.type, 'dictionary-select')
  assert.equal(categoryField.required, true)
  assert.deepEqual(categoryField.dictionaryUsage, {
    appCode: 'APP_PASSWORD_MEMO',
    moduleCode: 'PASSWORD_MEMO',
    bizFieldCode: 'category'
  })
})

test('work log quick create defaults every work item to completed', () => {
  const workLog = QUICK_CREATE_TYPES.find((item) => item.typeCode === 'WORK_LOG')
  const statusField = workLog.fields.find((field) => field.key === 'status')

  assert.deepEqual(workLog.defaults().workItems, [{content: '', status: 'COMPLETED'}])
  assert.equal(statusField, undefined)
})
