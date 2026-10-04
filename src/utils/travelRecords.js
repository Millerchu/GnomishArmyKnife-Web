function newRequestKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export const TRANSPORT_TYPES = { TRAIN: '火车', FLIGHT: '飞机', BUS: '汽车', SHIP: '轮船', OTHER: '其他' }
export const TRAVEL_STATUSES = {
  PLANNED: '待出行',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  CHANGED: '已改签',
}
export const TRAVEL_PURPOSES = { TOURISM: '旅游', BUSINESS: '出差', FAMILY: '探亲', OTHER: '其他' }

export function newTravelRecord() {
  return {
    transportType: 'TRAIN',
    status: 'PLANNED',
    departure: '',
    arrival: '',
    departureDate: '',
    departureZone: 'Asia/Shanghai',
    arrivalZone: 'Asia/Shanghai',
    currency: 'CNY',
    syncBill: true,
    useDepartureDate: false,
    attachments: [],
    requestKey: newRequestKey(),
  }
}

export function cloneTravelRecord(record, changed = false) {
  const {
    id,
    version,
    bills,
    attachments,
    existingBillId,
    previousRecordId,
    paidAmount,
    refundAmount,
    paymentDate,
    refundDate,
    ...rest
  } = record
  return {
    ...rest,
    id: undefined,
    status: 'PLANNED',
    attachments: [],
    paidAmount: null,
    refundAmount: null,
    paymentDate: null,
    refundDate: null,
    previousRecordId: changed ? id : null,
    existingBillId: null,
    duplicateConfirmed: false,
    requestKey: newRequestKey(),
  }
}

export function travelPayload(form) {
  const { attachments, bills, ...data } = form
  for (const key of [
    'groupId',
    'existingBillId',
    'previousRecordId',
    'departureTime',
    'arrivalDate',
    'arrivalTime',
    'paymentDate',
    'refundDate',
    'purpose',
  ])
    if (data[key] === '') data[key] = null
  for (const key of ['paidAmount', 'refundAmount'])
    data[key] = data[key] === '' || data[key] == null ? null : Number(data[key])
  data.attachmentIds = (attachments || []).map((item) => item.id)
  return data
}

export function validateTravelRecord(form) {
  if (!form.departure?.trim() || !form.arrival?.trim() || !form.departureDate)
    return '请填写出发地、到达地和出发日期'
  for (const field of ['paidAmount', 'refundAmount']) {
    if (
      form[field] !== '' &&
      form[field] != null &&
      (!Number.isFinite(Number(form[field])) || Number(form[field]) < 0)
    )
      return '金额必须是大于等于零的数字'
  }
  if (Number(form.refundAmount || 0) > Number(form.paidAmount || 0)) return '退款金额不能超过支付金额'
  if (form.syncBill && Number(form.paidAmount) > 0 && !form.paymentDate && !form.useDepartureDate)
    return '请填写支付日期，或选择以出发日期代记'
  if (Number(form.refundAmount) > 0 && !form.refundDate) return '请填写退款日期'
  if (form.arrivalTime && !form.arrivalDate) return '填写到达时间时需要到达日期'
  if (!form.departureZone || !form.arrivalZone) return '请填写起终点时区'
  for (const zone of [form.departureZone, form.arrivalZone]) {
    try {
      new Intl.DateTimeFormat('zh-CN', { timeZone: zone || 'Asia/Shanghai' })
    } catch {
      return '请输入有效时区，例如 Asia/Shanghai 或 America/New_York'
    }
  }
  return ''
}
