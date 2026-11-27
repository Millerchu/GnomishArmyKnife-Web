export const REPORT_ITEM_GROUPS = [
  { code: 'GENERAL', label: '一般检查' },
  { code: 'LIPID', label: '血脂' },
  { code: 'LIVER', label: '肝功能' },
  { code: 'KIDNEY', label: '肾功能' },
  { code: 'CBC', label: '血常规' },
  { code: 'URINALYSIS', label: '尿常规' },
  { code: 'IMAGING', label: '影像' },
  { code: 'ECG', label: '心电图' },
  { code: 'SPECIALTY', label: '专项检查' },
  { code: 'OTHER', label: '其他' }
]

export const REPORT_RESULT_TYPES = [
  { code: 'NUMBER', label: '数值' },
  { code: 'QUALITATIVE', label: '定性' },
  { code: 'TEXT', label: '文本' }
]

export const REPORT_ABNORMAL_FLAGS = [
  { code: 'UNSPECIFIED', label: '未标记' },
  { code: 'NORMAL', label: '正常' },
  { code: 'HIGH', label: '偏高' },
  { code: 'LOW', label: '偏低' },
  { code: 'ABNORMAL', label: '异常' }
]

export const REPORT_CATALOG_ITEMS = [
  // GENERAL
  { group: 'GENERAL', itemCode: 'bmiReported', name: '报告 BMI', defaultUnit: 'kg/m²', defaultResultType: 'NUMBER' },
  { group: 'GENERAL', itemCode: 'heightCm', name: '身高', defaultUnit: 'cm', defaultResultType: 'NUMBER' },
  { group: 'GENERAL', itemCode: 'weightKg', name: '体重', defaultUnit: 'kg', defaultResultType: 'NUMBER' },
  { group: 'GENERAL', itemCode: 'bodyFatRate', name: '体脂率', defaultUnit: '%', defaultResultType: 'NUMBER' },
  { group: 'GENERAL', itemCode: 'systolicPressure', name: '收缩压', defaultUnit: 'mmHg', defaultResultType: 'NUMBER' },
  { group: 'GENERAL', itemCode: 'diastolicPressure', name: '舒张压', defaultUnit: 'mmHg', defaultResultType: 'NUMBER' },
  { group: 'GENERAL', itemCode: 'heartRate', name: '静息心率', defaultUnit: '次/分', defaultResultType: 'NUMBER' },

  // LIPID
  { group: 'LIPID', itemCode: 'atherogenicIndex', name: '动脉粥样硬化指数', defaultUnit: '', defaultResultType: 'NUMBER' },
  { group: 'LIPID', itemCode: 'totalCholesterol', name: '总胆固醇', defaultUnit: 'mmol/L', defaultResultType: 'NUMBER' },
  { group: 'LIPID', itemCode: 'triglycerides', name: '甘油三酯', defaultUnit: 'mmol/L', defaultResultType: 'NUMBER' },
  { group: 'LIPID', itemCode: 'hdlCholesterol', name: '高密度脂蛋白胆固醇', defaultUnit: 'mmol/L', defaultResultType: 'NUMBER' },
  { group: 'LIPID', itemCode: 'ldlCholesterol', name: '低密度脂蛋白胆固醇', defaultUnit: 'mmol/L', defaultResultType: 'NUMBER' },

  // LIVER
  { group: 'LIVER', itemCode: 'alkalinePhosphatase', name: '碱性磷酸酶', defaultUnit: 'U/L', defaultResultType: 'NUMBER' },
  { group: 'LIVER', itemCode: 'astAltRatio', name: 'AST/ALT 比值', defaultUnit: '', defaultResultType: 'NUMBER' },
  { group: 'LIVER', itemCode: 'totalBilirubin', name: '总胆红素', defaultUnit: 'μmol/L', defaultResultType: 'NUMBER' },
  { group: 'LIVER', itemCode: 'directBilirubin', name: '直接胆红素', defaultUnit: 'μmol/L', defaultResultType: 'NUMBER' },
  { group: 'LIVER', itemCode: 'indirectBilirubin', name: '间接胆红素', defaultUnit: 'μmol/L', defaultResultType: 'NUMBER' },
  { group: 'LIVER', itemCode: 'totalProtein', name: '总蛋白', defaultUnit: 'g/L', defaultResultType: 'NUMBER' },
  { group: 'LIVER', itemCode: 'albumin', name: '白蛋白', defaultUnit: 'g/L', defaultResultType: 'NUMBER' },
  { group: 'LIVER', itemCode: 'globulin', name: '球蛋白', defaultUnit: 'g/L', defaultResultType: 'NUMBER' },
  { group: 'LIVER', itemCode: 'albuminGlobulinRatio', name: '白球比', defaultUnit: '', defaultResultType: 'NUMBER' },
  { group: 'LIVER', itemCode: 'alanineAminotransferase', name: '谷丙转氨酶', defaultUnit: 'U/L', defaultResultType: 'NUMBER' },
  { group: 'LIVER', itemCode: 'aspartateAminotransferase', name: '谷草转氨酶', defaultUnit: 'U/L', defaultResultType: 'NUMBER' },
  { group: 'LIVER', itemCode: 'gammaGlutamylTransferase', name: 'γ-谷氨酰转移酶', defaultUnit: 'U/L', defaultResultType: 'NUMBER' },

  // KIDNEY
  { group: 'KIDNEY', itemCode: 'serumCreatinine', name: '血肌酐', defaultUnit: 'μmol/L', defaultResultType: 'NUMBER' },
  { group: 'KIDNEY', itemCode: 'urea', name: '尿素', defaultUnit: 'mmol/L', defaultResultType: 'NUMBER' },
  { group: 'KIDNEY', itemCode: 'ureaNitrogen', name: '尿素氮', defaultUnit: 'mmol/L', defaultResultType: 'NUMBER' },
  { group: 'KIDNEY', itemCode: 'egfr', name: '估算肾小球滤过率', defaultUnit: '', defaultResultType: 'NUMBER' },
  { group: 'KIDNEY', itemCode: 'uricAcid', name: '尿酸', defaultUnit: 'μmol/L', defaultResultType: 'NUMBER' },

  // CBC
  { group: 'CBC', itemCode: 'whiteBloodCellCount', name: '白细胞计数', defaultUnit: '', defaultResultType: 'NUMBER' },
  { group: 'CBC', itemCode: 'redBloodCellCount', name: '红细胞计数', defaultUnit: '', defaultResultType: 'NUMBER' },
  { group: 'CBC', itemCode: 'hemoglobin', name: '血红蛋白', defaultUnit: '', defaultResultType: 'NUMBER' },
  { group: 'CBC', itemCode: 'hematocrit', name: '红细胞压积', defaultUnit: '', defaultResultType: 'NUMBER' },
  { group: 'CBC', itemCode: 'plateletCount', name: '血小板计数', defaultUnit: '', defaultResultType: 'NUMBER' },
  { group: 'CBC', itemCode: 'plateletcrit', name: '血小板压积', defaultUnit: '%', defaultResultType: 'NUMBER' },
  { group: 'CBC', itemCode: 'plateletDistributionWidth', name: '血小板分布宽度', defaultUnit: '', defaultResultType: 'NUMBER' },

  // URINALYSIS
  { group: 'URINALYSIS', itemCode: 'urineSpecificGravity', name: '尿比重', defaultUnit: '', defaultResultType: 'NUMBER' },
  { group: 'URINALYSIS', itemCode: 'urinePh', name: '尿 pH', defaultUnit: '', defaultResultType: 'NUMBER' },
  { group: 'URINALYSIS', itemCode: 'urineProtein', name: '尿蛋白', defaultUnit: '', defaultResultType: 'QUALITATIVE' },
  { group: 'URINALYSIS', itemCode: 'urineOccultBlood', name: '尿隐血', defaultUnit: '', defaultResultType: 'QUALITATIVE' },
  { group: 'URINALYSIS', itemCode: 'urineGlucose', name: '尿糖', defaultUnit: '', defaultResultType: 'QUALITATIVE' },
  { group: 'URINALYSIS', itemCode: 'urineKetone', name: '尿酮体', defaultUnit: '', defaultResultType: 'QUALITATIVE' },
  { group: 'URINALYSIS', itemCode: 'urineLeukocyte', name: '尿白细胞', defaultUnit: '', defaultResultType: 'QUALITATIVE' },
  { group: 'URINALYSIS', itemCode: 'urineNitrite', name: '尿亚硝酸盐', defaultUnit: '', defaultResultType: 'QUALITATIVE' },
  { group: 'URINALYSIS', itemCode: 'urineSediment', name: '尿沉渣镜检', defaultUnit: '', defaultResultType: 'TEXT' },

  // IMAGING
  { group: 'IMAGING', itemCode: 'fattyLiverGrade', name: '脂肪肝分级', defaultUnit: '', defaultResultType: 'TEXT' },
  { group: 'IMAGING', itemCode: 'liverCyst', name: '肝囊肿', defaultUnit: '', defaultResultType: 'TEXT' },
  { group: 'IMAGING', itemCode: 'gallbladderPolyp', name: '胆囊息肉', defaultUnit: '', defaultResultType: 'TEXT' },
  { group: 'IMAGING', itemCode: 'renalCyst', name: '肾囊肿', defaultUnit: '', defaultResultType: 'TEXT' },
  { group: 'IMAGING', itemCode: 'thyroidTiRads', name: '甲状腺 TI-RADS', defaultUnit: '', defaultResultType: 'TEXT' },
  { group: 'IMAGING', itemCode: 'prostateFinding', name: '前列腺超声所见', defaultUnit: '', defaultResultType: 'TEXT' },
  { group: 'IMAGING', itemCode: 'chestImaging', name: '胸部影像', defaultUnit: '', defaultResultType: 'TEXT' },
  { group: 'IMAGING', itemCode: 'cervicalSpineImaging', name: '颈椎影像', defaultUnit: '', defaultResultType: 'TEXT' },
  { group: 'IMAGING', itemCode: 'echocardiogram', name: '心脏超声', defaultUnit: '', defaultResultType: 'TEXT' },

  // ECG
  { group: 'ECG', itemCode: 'ecgConclusion', name: '心电图结论', defaultUnit: '', defaultResultType: 'TEXT' },
  { group: 'ECG', itemCode: 'ecgPr', name: 'PR 间期', defaultUnit: 'ms', defaultResultType: 'NUMBER' },
  { group: 'ECG', itemCode: 'ecgQrs', name: 'QRS 时限', defaultUnit: 'ms', defaultResultType: 'NUMBER' },
  { group: 'ECG', itemCode: 'ecgQt', name: 'QT 间期', defaultUnit: 'ms', defaultResultType: 'NUMBER' },
  { group: 'ECG', itemCode: 'ecgQtc', name: 'QTc', defaultUnit: 'ms', defaultResultType: 'NUMBER' },
  { group: 'ECG', itemCode: 'ecgAxis', name: '电轴', defaultUnit: '°', defaultResultType: 'NUMBER' },

  // SPECIALTY
  { group: 'SPECIALTY', itemCode: 'visualAcuity', name: '视力', defaultUnit: '', defaultResultType: 'TEXT' },
  { group: 'SPECIALTY', itemCode: 'oralFinding', name: '口腔所见', defaultUnit: '', defaultResultType: 'TEXT' },
  { group: 'SPECIALTY', itemCode: 'entFinding', name: '耳鼻喉所见', defaultUnit: '', defaultResultType: 'TEXT' },
  { group: 'SPECIALTY', itemCode: 'afp', name: '甲胎蛋白', defaultUnit: '', defaultResultType: 'NUMBER' },
  { group: 'SPECIALTY', itemCode: 'cea', name: '癌胚抗原', defaultUnit: '', defaultResultType: 'NUMBER' },
  { group: 'SPECIALTY', itemCode: 'hbsAg', name: '乙肝表面抗原', defaultUnit: '', defaultResultType: 'QUALITATIVE' },
  { group: 'SPECIALTY', itemCode: 'fastingGlucose', name: '空腹血糖', defaultUnit: 'mmol/L', defaultResultType: 'NUMBER' }
]

const NUMBER_RESULT_REGEX = /^-?\d{1,10}(?:\.\d{1,8})?$/

export function getGroupLabel(groupCode) {
  return REPORT_ITEM_GROUPS.find((item) => item.code === groupCode)?.label || groupCode
}

export function getAbnormalFlagLabel(flagCode) {
  return REPORT_ABNORMAL_FLAGS.find((item) => item.code === flagCode)?.label || ''
}

export function getCatalogItemsByGroup(groupCode) {
  return REPORT_CATALOG_ITEMS.filter((item) => item.group === groupCode)
}

export function validateReportDetailItems(items) {
  const errors = {}
  if (!Array.isArray(items)) {
    return { valid: false, message: '明细列表格式非法', rowErrors: errors }
  }
  if (items.length > 200) {
    return { valid: false, message: '每份报告最多保存 200 项明细', rowErrors: errors }
  }
  let firstError = ''
  items.forEach((item, index) => {
    const rowErr = {}
    const name = String(item.name || '').trim()
    if (!name || name.length > 80) {
      rowErr.name = '项目名称需为 1–80 字符'
    }
    const resultText = String(item.resultText ?? '').trim()
    if (!resultText) {
      rowErr.resultText = '原始结果不能为空'
    } else if (item.resultType === 'NUMBER' && !NUMBER_RESULT_REGEX.test(resultText)) {
      rowErr.resultText = '数值格式非法（最多 10 位整数和 8 位小数，含比较符请选文本）'
    } else if (item.resultType === 'QUALITATIVE' && resultText.length > 80) {
      rowErr.resultText = '定性结果不能超过 80 字符'
    } else if (item.resultType === 'TEXT' && resultText.length > 1000) {
      rowErr.resultText = '文本结果不能超过 1000 字符'
    }
    if (String(item.unit || '').trim().length > 24) {
      rowErr.unit = '单位不能超过 24 字符'
    }
    if (String(item.referenceText || '').trim().length > 160) {
      rowErr.referenceText = '参考区间不能超过 160 字符'
    }
    if (String(item.sourceFileLabel || '').trim().length > 255) {
      rowErr.sourceFileLabel = '来源文件不能超过 255 字符'
    }
    if (item.sourcePage !== '' && item.sourcePage !== null && item.sourcePage !== undefined) {
      const pageText = String(item.sourcePage).trim()
      const pageNum = Number(pageText)
      if (!/^\d+$/.test(pageText) || pageNum < 1 || pageNum > 9999) {
        rowErr.sourcePage = '页码需为 1–9999 整数'
      }
    }
    if (Object.keys(rowErr).length > 0) {
      errors[item._uid ?? index] = rowErr
      if (!firstError) {
        firstError = `第 ${index + 1} 项：${Object.values(rowErr)[0]}`
      }
    }
  })
  return {
    valid: Object.keys(errors).length === 0,
    message: firstError,
    rowErrors: errors
  }
}
