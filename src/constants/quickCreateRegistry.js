const today = () => new Date().toISOString().slice(0, 10)

const text = (key, label, required = false, extra = {}) => ({key, label, type: 'text', required, ...extra})
const number = (key, label, required = false, extra = {}) => ({key, label, type: 'number', required, ...extra})
const select = (key, label, options, required = false) => ({key, label, type: 'select', options, required})
const area = (key, label, extra = {}) => ({key, label, type: 'textarea', ...extra})
const dictionary = (key, label, featureCode, moduleCode, required = false, multiple = false) => ({
  key, label, type: multiple ? 'dictionary-multi' : 'dictionary-select', required,
  dictionaryUsage: {appCode: featureCode, moduleCode, bizFieldCode: key}
})

export const QUICK_CREATE_TYPES = [
  {
    typeCode: 'WORK_LOG', featureCode: 'APP_WORK_LOG', appName: '工作日志', label: '新增工作日志', api: 'workLog',
    defaults: () => ({logDate: today(), typeCodes: [], location: '', projectCode: '', workItems: [''], zentaoNo: '', personDay: 1, overtimeHours: 0, remark: ''}),
    fields: [
      {key: 'logDate', label: '日期', type: 'date', required: true},
      dictionary('typeCodes', '日志类型', 'APP_WORK_LOG', 'WORK_LOG', true, true),
      dictionary('location', '地点', 'APP_WORK_LOG', 'WORK_LOG', true),
      dictionary('projectCode', '所属项目', 'APP_WORK_LOG', 'WORK_LOG', true), number('personDay', '人天', true, {step: '0.1', min: 0}),
      {key: 'workItems', label: '工作内容', type: 'work-items', required: true}, text('zentaoNo', '禅道编号'),
      number('overtimeHours', '加班时长', false, {step: '0.5', min: 0}), area('remark', '备注')
    ]
  },
  {
    typeCode: 'PASSWORD_MEMO', featureCode: 'APP_PASSWORD_MEMO', appName: '密码备忘录', label: '新增账号备忘录', api: 'passwordMemo',
    defaults: () => ({siteName: '', siteUrl: '', username: '', password: '', registeredPhone: '', registeredEmail: '', remark: ''}),
    fields: [text('siteName', '网站名', true), text('siteUrl', '地址', true), text('username', '用户名'),
      text('password', '密码', true, {inputType: 'password'}), text('registeredPhone', '注册手机'),
      text('registeredEmail', '注册邮箱', false, {inputType: 'email'}), area('remark', '备注')]
  },
  {
    typeCode: 'TODO_ITEM', featureCode: 'APP_TODO_LIST', appName: '待办列表', label: '新增待办任务', api: 'todo',
    defaults: () => ({title: '', listCode: 'MY_DAY', importance: 'MEDIUM', status: 'TODO', important: false, dueDate: '', reminderAt: '', note: '', stepsText: ''}),
    fields: [text('title', '任务标题', true), select('listCode', '所属清单', [['MY_DAY', '我的一天'], ['PERSONAL', '个人'], ['WORK', '工作']]),
      select('importance', '优先级', [['LOW', '低'], ['MEDIUM', '中'], ['HIGH', '高']]),
      select('status', '状态', [['TODO', '待处理'], ['IN_PROGRESS', '进行中'], ['COMPLETED', '已完成']]),
      {key: 'important', label: '加入重要任务', type: 'checkbox'}, {key: 'dueDate', label: '截止日期', type: 'date'},
      {key: 'reminderAt', label: '提醒时间', type: 'datetime-local'}, area('stepsText', '子任务', {placeholder: '每行一个子任务'}), area('note', '备注')]
  },
  {
    typeCode: 'FUEL_RECORD', featureCode: 'APP_FUEL_STATS', appName: '油耗统计', label: '新增加油记录', api: 'fuel',
    defaults: () => ({vehicleName: '', fuelDate: today(), odometerKm: '', fuelVolume: '', totalAmount: '', discountedAmount: '', unitPrice: '', fuelType: '95', fillType: 'FULL', stationName: '', note: ''}),
    fields: [text('vehicleName', '车辆名称', true), {key: 'fuelDate', label: '加油日期', type: 'date', required: true},
      number('odometerKm', '当前里程(km)', true, {min: 0}), number('fuelVolume', '加油量(L)', true, {min: 0, step: '0.01'}),
      number('totalAmount', '加油金额', true, {min: 0, step: '0.01'}), number('discountedAmount', '优惠后金额', true, {min: 0, step: '0.01'}),
      number('unitPrice', '单价', false, {min: 0, step: '0.001'}), select('fuelType', '油号', [['92', '92号'], ['95', '95号'], ['98', '98号'], ['DIESEL', '柴油']]),
      select('fillType', '加油方式', [['FULL', '加满'], ['FIXED_AMOUNT', '定额'], ['FIXED_VOLUME', '定量']]), text('stationName', '油站名称'), area('note', '备注')]
  },
  {
    typeCode: 'WOW_CHARACTER', featureCode: 'APP_WOW_CHARACTER', appName: 'WoW角色统计', label: '新增角色', api: 'wow',
    defaults: () => ({characterName: '', className: '', specName: '', raceName: '', realmName: '', faction: 'HORDE', level: 90, itemLevel: 0, isFeatured: false, mythicBestLevel: 0, mythicDungeonName: '', professionPrimary: '', professionSecondary: '', note: ''}),
    fields: [text('characterName', '角色名', true), dictionary('className', '职业', 'APP_WOW_CHARACTER', 'WOW_CHARACTER', true),
      dictionary('specName', '专精', 'APP_WOW_CHARACTER', 'WOW_CHARACTER', true), dictionary('raceName', '种族', 'APP_WOW_CHARACTER', 'WOW_CHARACTER', true),
      text('realmName', '服务器', true), dictionary('faction', '阵营', 'APP_WOW_CHARACTER', 'WOW_CHARACTER', true), number('level', '等级', true, {min: 1, max: 90}),
      number('itemLevel', '装等', true, {min: 0, step: '0.01'}), {key: 'isFeatured', label: '作为主角色展示', type: 'checkbox'},
      number('mythicBestLevel', '当前钥匙层数', false, {min: 0}), dictionary('mythicDungeonName', '当前钥匙副本', 'APP_WOW_CHARACTER', 'WOW_CHARACTER'),
      dictionary('professionPrimary', '专业 1', 'APP_WOW_CHARACTER', 'WOW_CHARACTER'),
      {...dictionary('professionSecondary', '专业 2', 'APP_WOW_CHARACTER', 'WOW_CHARACTER'), dictionaryUsage: {appCode: 'APP_WOW_CHARACTER', moduleCode: 'WOW_CHARACTER', bizFieldCode: 'professionPrimary'}}, area('note', '备注')]
  },
  {
    typeCode: 'PERSONAL_BILL', featureCode: 'APP_PERSONAL_BILLS', appName: '个人账单', label: '快速记一笔', api: 'bill',
    defaults: () => ({billType: 'EXPENSE', categoryName: '', amount: '', accountName: '', paymentMethod: '', merchantName: '', billDate: today(), note: ''}),
    fields: [select('billType', '账单类型', [['EXPENSE', '支出'], ['INCOME', '收入']], true), dictionary('categoryName', '分类', 'APP_PERSONAL_BILLS', 'PERSONAL_BILLS', true), number('amount', '金额', true, {min: 0.01, step: '0.01', placeholder: '0.00'}),
      {key: 'billDate', label: '日期', type: 'date', required: true}, text('accountName', '账户'), dictionary('paymentMethod', '支付方式', 'APP_PERSONAL_BILLS', 'PERSONAL_BILLS'), text('merchantName', '商户 / 对象'), area('note', '备注')]
  },
  {
    typeCode: 'ANNUAL_BUDGET', featureCode: 'APP_PERSONAL_BILLS', appName: '个人账单', label: '新增年度预算', api: 'budget',
    defaults: () => ({year: new Date().getFullYear(), categoryName: '', annualLimit: '', alertThreshold: 0.8, note: ''}),
    fields: [number('year', '预算年份', true, {min: 2020, max: 2099}),
      {...dictionary('categoryName', '分类', 'APP_PERSONAL_BILLS', 'PERSONAL_BILLS', true), dictionaryUsage: {appCode: 'APP_PERSONAL_BILLS', moduleCode: 'PERSONAL_BILLS', bizFieldCode: 'budgetCategoryName'}}, number('annualLimit', '年度预算额度', true, {min: 0, step: '0.01'}),
      number('alertThreshold', '预警阈值', true, {min: 0.01, max: 1, step: '0.01'}), area('note', '备注')]
  },
  {
    typeCode: 'KNOWLEDGE_ENTRY', featureCode: 'APP_KNOWLEDGE_BASE', appName: '经验库', label: '新增经验', api: 'knowledge',
    defaults: () => ({title: '', category: '开发', scenario: '', source: '', tagsText: '', summary: '', content: ''}),
    fields: [text('title', '标题', true), select('category', '分类', [['开发', '开发'], ['运维', '运维'], ['产品', '产品'], ['生活', '生活'], ['其他', '其他']]),
      text('scenario', '适用场景', true), text('source', '来源'), text('tagsText', '标签', false, {placeholder: '多个标签用逗号分隔'}),
      area('summary', '摘要', {required: true}), area('content', '详细内容', {required: true, rows: 8})]
  },
  {
    typeCode: 'SOFTWARE_PACKAGE', featureCode: 'APP_SOFTWARE_REPO', appName: '软件仓库', label: '新增软件', api: 'software',
    defaults: () => ({softwareName: '', vendorName: '', categoryName: '', platformCode: 'WINDOWS', officialSite: '', description: ''}),
    fields: [text('softwareName', '软件名', true), text('vendorName', '厂商'), text('categoryName', '分类', true),
      select('platformCode', '平台', [['WINDOWS', 'Windows'], ['MACOS', 'macOS'], ['LINUX', 'Linux'], ['CROSS_PLATFORM', '跨平台']]), text('officialSite', '官网地址'), area('description', '描述')]
  },
  {
    typeCode: 'SOFTWARE_VERSION', featureCode: 'APP_SOFTWARE_REPO', appName: '软件仓库', label: '新增软件版本', api: 'softwareVersion', loadPackages: true,
    defaults: () => ({packageId: '', versionName: '', releaseChannel: 'STABLE', packageType: '', packageSize: '', releaseDate: today(), systemRequirement: '', localFileName: '', localFileUrl: '', downloadUrl: '', isRecommended: false, changelog: ''}),
    fields: [{key: 'packageId', label: '所属软件', type: 'package-select', required: true}, text('versionName', '版本号', true),
      select('releaseChannel', '发布通道', [['STABLE', '稳定版'], ['BETA', '测试版'], ['NIGHTLY', '每日构建']]), text('packageType', '包类型'), text('packageSize', '包大小'),
      {key: 'releaseDate', label: '发布日期', type: 'date'}, text('systemRequirement', '系统要求'), text('localFileName', '本地安装包文件名'),
      text('localFileUrl', '本地文件地址'), text('downloadUrl', '外部下载地址'), {key: 'isRecommended', label: '设为推荐版本', type: 'checkbox'}, area('changelog', '更新说明')]
  },
  {
    typeCode: 'HEALTH_RECORD', featureCode: 'APP_HEALTH_RECORD', appName: '健康', label: '新增健康指标', api: 'healthRecord',
    defaults: () => ({measureDate: today(), heightCm: '', weightKg: '', bodyFatRate: '', systolicPressure: '', diastolicPressure: '', totalCholesterol: '', triglycerides: '', hdlCholesterol: '', ldlCholesterol: '', fastingGlucose: '', heartRate: '', uricAcid: '', alanineAminotransferase: '', aspartateAminotransferase: '', gammaGlutamylTransferase: '', note: ''}),
    fields: [{key: 'measureDate', label: '测量日期', type: 'date', required: true}, ...['heightCm:身高(cm)', 'weightKg:体重(kg)', 'bodyFatRate:体脂率(%)', 'systolicPressure:收缩压', 'diastolicPressure:舒张压', 'totalCholesterol:总胆固醇', 'triglycerides:甘油三酯', 'hdlCholesterol:高密度脂蛋白', 'ldlCholesterol:低密度脂蛋白', 'fastingGlucose:空腹血糖', 'heartRate:心率', 'uricAcid:尿酸', 'alanineAminotransferase:谷丙转氨酶', 'aspartateAminotransferase:谷草转氨酶', 'gammaGlutamylTransferase:γ-谷氨酰转移酶'].map((item) => { const [key, label] = item.split(':'); return number(key, label, false, {min: 0, step: '0.01'}) }), area('note', '备注')]
  },
  {
    typeCode: 'HEALTH_VISIT', featureCode: 'APP_HEALTH_RECORD', appName: '健康', label: '新增医院就诊', api: 'healthVisit',
    defaults: () => ({visitDate: today(), hospitalName: '', departmentName: '', doctorName: '', visitType: '', chiefComplaint: '', diagnosisSummary: '', treatmentPlan: '', doctorAdvice: '', caseRecordFileName: '', caseRecordUrl: '', note: ''}),
    fields: [{key: 'visitDate', label: '就诊日期', type: 'date', required: true}, text('hospitalName', '医院名称', true), text('departmentName', '科室'), text('doctorName', '医生'),
      select('visitType', '就诊类型', [['OUTPATIENT', '门诊'], ['EMERGENCY', '急诊'], ['INPATIENT', '住院'], ['FOLLOW_UP', '复诊']]),
      area('chiefComplaint', '主诉'), area('diagnosisSummary', '诊断摘要'), area('treatmentPlan', '治疗方案'), area('doctorAdvice', '医嘱'),
      text('caseRecordFileName', '病历文件名'), text('caseRecordUrl', '病历文件地址'), area('note', '备注')]
  },
  {
    typeCode: 'HEALTH_REPORT', featureCode: 'APP_HEALTH_RECORD', appName: '健康', label: '新增健康报告', api: 'healthReport',
    defaults: () => ({visitId: '', examDate: today(), hospitalName: '', reportTitle: '', summary: '', doctorAdvice: '', reportFileName: '', reportUrl: ''}),
    fields: [text('visitId', '关联就诊 ID'), {key: 'examDate', label: '检查日期', type: 'date', required: true}, text('hospitalName', '医院名称'), text('reportTitle', '报告标题', true),
      area('summary', '报告摘要'), area('doctorAdvice', '医生建议'), text('reportFileName', '报告文件名'), text('reportUrl', '报告文件地址')]
  }
]

export function resolveQuickCreateTypes(featureCodes = []) {
  const allowed = new Set(featureCodes)
  return QUICK_CREATE_TYPES.filter((item) => allowed.has(item.featureCode))
}
