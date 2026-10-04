import test from 'node:test'
import assert from 'node:assert/strict'
import { newTravelRecord, cloneTravelRecord, travelPayload, validateTravelRecord } from '../travelRecords.js'

test('历史记录未知金额保持空值，零元保持零', () => {
  const form = { ...newTravelRecord(), departure: '南京', arrival: '上海', departureDate: '2010-01-02' }
  assert.equal(validateTravelRecord(form), '')
  assert.equal(travelPayload(form).paidAmount, null)
  form.paidAmount = '0'
  assert.equal(travelPayload(form).paidAmount, 0)
  assert.equal(validateTravelRecord(form), '')
})
test('复制和改签不复用账单、附件、幂等键', () => {
  const original = {
    ...newTravelRecord(),
    id: '123',
    version: 3,
    bills: [{ id: '8' }],
    attachments: [{ id: '9' }],
    paidAmount: 100,
    refundAmount: 20,
  }
  const copy = cloneTravelRecord(original)
  assert.notEqual(copy.requestKey, original.requestKey)
  assert.equal(copy.id, undefined)
  assert.equal(copy.paidAmount, null)
  assert.deepEqual(copy.attachments, [])
  assert.equal(copy.previousRecordId, null)
  assert.equal(cloneTravelRecord(original, true).previousRecordId, '123')
})
test('付款日期须明确选择，退款即使不同步也要填日期', () => {
  const form = {
    ...newTravelRecord(),
    departure: '南京',
    arrival: '上海',
    departureDate: '2026-01-02',
    paidAmount: 100,
  }
  assert.match(validateTravelRecord(form), /支付日期/)
  form.useDepartureDate = true
  assert.equal(validateTravelRecord(form), '')
  form.refundAmount = 30
  form.syncBill = false
  assert.match(validateTravelRecord(form), /退款日期/)
  form.refundAmount = 101
  assert.match(validateTravelRecord(form), /不能超过/)
})
test('附件保留长整型字符串ID，清空分组使用null', () => {
  const payload = travelPayload({
    ...newTravelRecord(),
    groupId: '',
    attachments: [{ id: '900000000000000123' }],
  })
  assert.equal(payload.groupId, null)
  assert.deepEqual(payload.attachmentIds, ['900000000000000123'])
})
