export const CORE_METRIC_FIELDS = [
  { key: 'heightCm', label: '身高(cm)', unit: 'cm', step: '0.1', decimals: 1, isInteger: false },
  { key: 'weightKg', label: '体重(kg)', unit: 'kg', step: '0.1', decimals: 1, isInteger: false },
  { key: 'bodyFatRate', label: '体脂率(%)', unit: '%', step: '0.1', decimals: 1, isInteger: false },
  { key: 'waistCm', label: '腰围(cm)', unit: 'cm', step: '0.1', decimals: 1, isInteger: false },
  { key: 'systolicPressure', label: '收缩压(mmHg)', unit: 'mmHg', step: '1', decimals: 0, isInteger: true },
  { key: 'diastolicPressure', label: '舒张压(mmHg)', unit: 'mmHg', step: '1', decimals: 0, isInteger: true },
  { key: 'heartRate', label: '静息心率(次/分)', unit: '次/分', step: '1', decimals: 0, isInteger: true },
  { key: 'totalCholesterol', label: '总胆固醇(mmol/L)', unit: 'mmol/L', step: '0.01', decimals: 2, isInteger: false },
  { key: 'triglycerides', label: '甘油三酯(mmol/L)', unit: 'mmol/L', step: '0.01', decimals: 2, isInteger: false },
  { key: 'hdlCholesterol', label: '高密度脂蛋白(HDL-C)(mmol/L)', unit: 'mmol/L', step: '0.01', decimals: 2, isInteger: false },
  { key: 'ldlCholesterol', label: '低密度脂蛋白(LDL-C)(mmol/L)', unit: 'mmol/L', step: '0.01', decimals: 2, isInteger: false },
  { key: 'fastingGlucose', label: '空腹血糖(mmol/L)', unit: 'mmol/L', step: '0.01', decimals: 2, isInteger: false },
  { key: 'uricAcid', label: '尿酸(μmol/L)', unit: 'μmol/L', step: '1', decimals: 0, isInteger: true },
  { key: 'alanineAminotransferase', label: '谷丙转氨酶(ALT)(U/L)', unit: 'U/L', step: '1', decimals: 0, isInteger: true },
  { key: 'aspartateAminotransferase', label: '谷草转氨酶(AST)(U/L)', unit: 'U/L', step: '1', decimals: 0, isInteger: true },
  { key: 'gammaGlutamylTransferase', label: 'γ-谷氨酰转移酶(γ-GT)(U/L)', unit: 'U/L', step: '1', decimals: 0, isInteger: true },
  { key: 'steps', label: '步数(步)', unit: '步', step: '1', decimals: 0, isInteger: true },
  { key: 'sleepHours', label: '睡眠时长(小时)', unit: '小时', step: '0.1', decimals: 1, isInteger: false, max: 24 },
  { key: 'activeEnergyKcal', label: '活动能量(kcal)', unit: 'kcal', step: '1', decimals: 0, isInteger: true },
  { key: 'exerciseMinutes', label: '锻炼时长(分钟)', unit: '分钟', step: '1', decimals: 0, isInteger: true },
  { key: 'distanceKm', label: '步行距离(km)', unit: 'km', step: '0.01', decimals: 2, isInteger: false },
  { key: 'bloodOxygen', label: '血氧饱和度(SpO2)(%)', unit: '%', step: '0.1', decimals: 1, isInteger: false, max: 100 },
  { key: 'hrvMs', label: '心率变异性(HRV)(ms)', unit: 'ms', step: '1', decimals: 0, isInteger: true },
  { key: 'vo2Max', label: '最大摄氧量(VO2Max)(mL/kg/min)', unit: 'mL/kg/min', step: '0.1', decimals: 1, isInteger: false }
]

export const TREND_METRIC_OPTIONS = [
  { key: 'heightCm', label: '身高', unit: 'cm', decimals: 1 },
  { key: 'weightKg', label: '体重', unit: 'kg', decimals: 1 },
  { key: 'bmi', label: '体质指数(BMI)', unit: 'kg/m²', decimals: 2, ref: { min: 18.5, max: 23.9, label: '健康区间 18.5–23.9 kg/m²' } },
  { key: 'bodyFatRate', label: '体脂率', unit: '%', decimals: 1, ref: { min: 10, max: 20, label: '理想参考 10–20%' } },
  { key: 'bloodPressure', label: '血压', unit: 'mmHg', decimals: 0, isDual: true, ref: { sysMax: 120, diaMax: 80, label: '正常高压 < 120 · 低压 < 80 mmHg' } },
  { key: 'heartRate', label: '静息心率', unit: '次/分', decimals: 0, ref: { min: 60, max: 100, label: '正常区间 60–100 次/分' } },
  { key: 'steps', label: '步数', unit: '步', decimals: 0, ref: { min: 8000, label: '建议目标 ≥ 8,000 步' } },
  { key: 'sleepHours', label: '睡眠时长', unit: '小时', decimals: 1, ref: { min: 7.0, max: 9.0, label: '建议区间 7.0–9.0 小时' } },
  { key: 'totalCholesterol', label: '总胆固醇', unit: 'mmol/L', decimals: 2, ref: { max: 5.20, label: '正常 < 5.20 mmol/L' } },
  { key: 'triglycerides', label: '甘油三酯', unit: 'mmol/L', decimals: 2, ref: { max: 1.70, label: '正常 < 1.70 mmol/L' } },
  { key: 'hdlCholesterol', label: '高密度脂蛋白(HDL-C)', unit: 'mmol/L', decimals: 2, ref: { min: 1.04, label: '正常 ≥ 1.04 mmol/L' } },
  { key: 'ldlCholesterol', label: '低密度脂蛋白(LDL-C)', unit: 'mmol/L', decimals: 2, ref: { max: 3.40, label: '正常 < 3.40 mmol/L' } },
  { key: 'fastingGlucose', label: '空腹血糖', unit: 'mmol/L', decimals: 2, ref: { min: 3.90, max: 6.10, label: '正常区间 3.90–6.10 mmol/L' } },
  { key: 'uricAcid', label: '尿酸', unit: 'μmol/L', decimals: 0, ref: { max: 420, label: '正常 ≤ 420 μmol/L' } },
  { key: 'alanineAminotransferase', label: '谷丙转氨酶(ALT)', unit: 'U/L', decimals: 0, ref: { max: 40, label: '正常 ≤ 40 U/L' } },
  { key: 'aspartateAminotransferase', label: '谷草转氨酶(AST)', unit: 'U/L', decimals: 0, ref: { max: 40, label: '正常 ≤ 40 U/L' } },
  { key: 'gammaGlutamylTransferase', label: 'γ-谷氨酰转移酶(γ-GT)', unit: 'U/L', decimals: 0, ref: { max: 50, label: '正常 ≤ 50 U/L' } },
  { key: 'waistCm', label: '腰围', unit: 'cm', decimals: 1, ref: { max: 90, label: '建议 < 90 cm' } },
  { key: 'activeEnergyKcal', label: '活动能量', unit: 'kcal', decimals: 0 },
  { key: 'exerciseMinutes', label: '锻炼时长', unit: '分钟', decimals: 0, ref: { min: 30, label: '建议 ≥ 30 分钟' } },
  { key: 'distanceKm', label: '步行距离', unit: 'km', decimals: 2 },
  { key: 'bloodOxygen', label: '血氧饱和度(SpO2)', unit: '%', decimals: 1, ref: { min: 95, max: 100, label: '正常区间 95–100%' } },
  { key: 'hrvMs', label: '心率变异性(HRV)', unit: 'ms', decimals: 0 },
  { key: 'vo2Max', label: '最大摄氧量(VO2Max)', unit: 'mL/kg/min', decimals: 1 }
]

export const PRIMARY_KPI_KEYS = [
  'heightCm',
  'weightKg',
  'bmi',
  'bodyFatRate',
  'bloodPressure',
  'heartRate',
  'steps',
  'sleepHours'
]

export const SECONDARY_METRIC_GROUPS = [
  {
    title: '血脂代谢',
    keys: ['totalCholesterol', 'triglycerides', 'hdlCholesterol', 'ldlCholesterol', 'fastingGlucose', 'uricAcid']
  },
  {
    title: '肝功体围',
    keys: ['alanineAminotransferase', 'aspartateAminotransferase', 'gammaGlutamylTransferase', 'waistCm']
  },
  {
    title: '运动生理',
    keys: ['activeEnergyKcal', 'exerciseMinutes', 'distanceKm', 'bloodOxygen', 'hrvMs', 'vo2Max']
  }
]

export const SOURCE_TYPE_LABELS = {
  MANUAL: '手动记录',
  APPLE_HEALTH: 'iOS 健康',
  EXAM_REPORT: '体检报告'
}

export const TREND_LIMIT_OPTIONS = [12, 24, 50]

export function hasMetricValue(value) {
  return value !== '' && value !== null && value !== undefined
}

export function createEmptyCoreMetricForm(measureDate = '') {
  const form = { measureDate, note: '' }
  for (const field of CORE_METRIC_FIELDS) {
    form[field.key] = ''
  }
  return form
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
    if (field.max !== undefined && num > field.max) {
      return `${field.label}不能大于 ${field.max}`
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
