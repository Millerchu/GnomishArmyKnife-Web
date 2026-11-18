import test from 'node:test'
import assert from 'node:assert/strict'
import {aiMoney, aiRenewals, aiSubscriptionStatus} from '../aiSubscriptions.js'
import {resolveQuickCreateTypes} from '../../constants/quickCreateRegistry.js'
test('智订未知金额不显示成零，原币不混算', () => {
  assert.equal(aiMoney(null, 'CNY'), '未记录')
  assert.equal(aiMoney('0', 'USD'), 'USD 0.00')
  assert.equal(aiMoney('123.456', 'CNY'), 'CNY 123.46')
})
test('关闭自动续费仍保留权益到期事件，7天区间右端不包含', () => {
  const subscription = {id: '9007199254740993', startDate: '2026-01-01', endDate: '2026-11-20', nextBillingDate: '2026-11-19', autoRenew: false, trialEndDate: '2026-11-25'}
  const events = aiRenewals([subscription], 7, '2026-11-18')
  assert.deepEqual(events.map(event => event.label), ['权益到期'])
  assert.equal(events[0].subscription.id, '9007199254740993')
  assert.equal(aiSubscriptionStatus(subscription, '2026-11-20'), '已到期')
})
test('智订三个快捷类型要求应用授权', () => {
  assert.deepEqual(resolveQuickCreateTypes(['APP_AI_SUBSCRIPTION']).map(item => item.aiKind), ['subscription', 'usage', 'payment'])
  assert.equal(resolveQuickCreateTypes([]).some(item => item.aiKind), false)
})
