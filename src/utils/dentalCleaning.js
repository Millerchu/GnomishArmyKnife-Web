export function dentalToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date())
}

export function newDentalCleaning() {
  return {cleaningDate: dentalToday(), hospitalName: '', amount: '', note: ''}
}

export const DENTAL_CLEANING_FIELDS = [
  {key: 'cleaningDate', label: '洁牙日期', type: 'date', required: true},
  {key: 'hospitalName', label: '医院或诊所', type: 'text', required: true, maxlength: 64},
  {key: 'amount', label: '花费（元）', type: 'number', min: 0, max: 9999999999.99, step: '0.01'},
  {key: 'note', label: '备注', type: 'textarea', maxlength: 255}
]

export function dentalCleaningPayload(form) {
  return {
    cleaningDate: form.cleaningDate,
    hospitalName: form.hospitalName.trim(),
    amount: form.amount === '' || form.amount == null ? null : form.amount,
    note: form.note?.trim() || null
  }
}
