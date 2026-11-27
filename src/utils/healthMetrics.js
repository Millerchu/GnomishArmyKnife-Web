export const CORE_METRIC_FIELDS = [
  { key: 'heightCm', label: '身高(cm)', unit: 'cm', step: '0.1', decimals: 1, isInteger: false },
  { key: 'weightKg', label: '体重(kg)', unit: 'kg', step: '0.1', decimals: 1, isInteger: false },
  { key: 'bodyFatRate', label: '体脂率(%)', unit: '%', step: '0.1', decimals: 1, isInteger: false },
  { key: 'systolicPressure', label: '收缩压(mmHg)', unit: 'mmHg', step: '1', decimals: 0, isInteger: true },
  { key: 'diastolicPressure', label: '舒张压(mmHg)', unit: 'mmHg', step: '1', decimals: 0, isInteger: true },
  { key: 'totalCholesterol', label: '总胆固醇(mmol/L)', unit: 'mmol/L', step: '0.01', decimals: 2, isInteger: false },
  { key: 'triglycerides', label: '甘油三酯(mmol/L)', unit: 'mmol/L', step: '0.01', decimals: 2, isInteger: false },
  { key: 'hdlCholesterol', label: '高密度脂蛋白(mmol/L)', unit: 'mmol/L', step: '0.01', decimals: 2, isInteger: false },
  { key: 'ldlCholesterol', label: '低密度脂蛋白(mmol/L)', unit: 'mmol/L', step: '0.01', decimals: 2, isInteger: false },
  { key: 'fastingGlucose', label: '空腹血糖(mmol/L)', unit: 'mmol/L', step: '0.01', decimals: 2, isInteger: false },
  { key: 'heartRate', label: '静息心率(次/分)', unit: '次/分', step: '1', decimals: 0, isInteger: true },
  { key: 'uricAcid', label: '尿酸(μmol/L)', unit: 'μmol/L', step: '1', decimals: 0, isInteger: true },
  { key: 'alanineAminotransferase', label: '谷丙转氨酶(U/L)', unit: 'U/L', step: '1', decimals: 0, isInteger: true },
  { key: 'aspartateAminotransferase', label: '谷草转氨酶(U/L)', unit: 'U/L', step: '1', decimals: 0, isInteger: true },
  { key: 'gammaGlutamylTransferase', label: 'γ-谷氨酰转移酶(U/L)', unit: 'U/L', step: '1', decimals: 0, isInteger: true }
]

export const TREND_METRIC_OPTIONS = [
  { key: 'weightKg', label: '体重', unit: 'kg', decimals: 1 },
  { key: 'bmi', label: 'BMI', unit: 'kg/m²', decimals: 2 },
  { key: 'bodyFatRate', label: '体脂率', unit: '%', decimals: 1 },
  { key: 'systolicPressure', label: '收缩压', unit: 'mmHg', decimals: 0 },
  { key: 'diastolicPressure', label: '舒张压', unit: 'mmHg', decimals: 0 },
  { key: 'totalCholesterol', label: '总胆固醇', unit: 'mmol/L', decimals: 2 },
  { key: 'triglycerides', label: '甘油三酯', unit: 'mmol/L', decimals: 2 },
  { key: 'hdlCholesterol', label: '高密度脂蛋白胆固醇', unit: 'mmol/L', decimals: 2 },
  { key: 'ldlCholesterol', label: '低密度脂蛋白胆固醇', unit: 'mmol/L', decimals: 2 },
  { key: 'fastingGlucose', label: '空腹血糖', unit: 'mmol/L', decimals: 2 },
  { key: 'uricAcid', label: '尿酸', unit: 'μmol/L', decimals: 0 },
  { key: 'alanineAminotransferase', label: '谷丙转氨酶', unit: 'U/L', decimals: 0 },
  { key: 'aspartateAminotransferase', label: '谷草转氨酶', unit: 'U/L', decimals: 0 },
  { key: 'gammaGlutamylTransferase', label: 'γ-谷氨酰转移酶', unit: 'U/L', decimals: 0 }
]

export const TREND_LIMIT_OPTIONS = [12, 24, 50]

export function hasMetricValue(value) {
  return value !== '' && value !== null && value !== undefined
}

export function validateCoreMetricForm(form) {
  let filledCount = 0
  for (const field of CORE_METRIC_FIELDS) {
    const raw = form?.[field.key]
    if (!hasMetricValue(raw)) {
      continue
    }
    filledCount += 1
    const text = String(raw).trim()
    if (field.isInteger) {
      if (!/^\d+$/.test(text)) {
        return `${field.label}须填写非负整数`
      }
      continue
    }
    const num = Number(text)
    if (!Number.isFinite(num) || num < 0) {
      return `${field.label}须填写不小于 0 的数字`
    }
  }
  if (filledCount === 0) {
    return '至少填写一项健康指标'
  }
  return ''
}

export function buildCoreMetricPayload(form) {
  const payload = {
    measureDate: form.measureDate,
    note: form.note ? String(form.note).trim() || null : null
  }
  for (const field of CORE_METRIC_FIELDS) {
    const raw = form?.[field.key]
    payload[field.key] = hasMetricValue(raw) ? Number(raw) : null
  }
  return payload
}
