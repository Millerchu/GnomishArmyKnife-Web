// @vitest-environment happy-dom

import {describe, expect, it} from 'vitest'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'

const compactFormContracts = [
  {name: '用户管理', loadSource: () => import('../UserManagement.vue?raw'), formId: 'user-edit-dialog-form'},
  {name: '数据字典', loadSource: () => import('../DataDictionary.vue?raw'), formId: 'dictionary-editor-dialog-form'},
  {name: '字典项', loadSource: () => import('../DataDictionary.vue?raw'), formId: 'dictionary-item-dialog-form'},
  {name: '加油记录', loadSource: () => import('../FuelStats.vue?raw'), formId: 'fuel-record-dialog-form'},
  {name: '健康指标', loadSource: () => import('../HealthRecord.vue?raw'), formId: 'health-record-dialog-form'},
  {name: '医院就诊', loadSource: () => import('../HealthRecord.vue?raw'), formId: 'health-visit-dialog-form'},
  {name: '健康报告', loadSource: () => import('../HealthRecord.vue?raw'), formId: 'health-report-dialog-form'},
  {name: '个人中心', loadSource: () => import('../Home.vue?raw'), formId: 'home-profile-dialog-form'},
  {name: '知识库', loadSource: () => import('../KnowledgeBase.vue?raw'), formId: 'knowledge-entry-dialog-form'},
  {name: '密码备忘录', loadSource: () => import('../PasswordMemo.vue?raw'), formId: 'password-memo-edit-dialog-form'},
  {name: '年度预算', loadSource: () => import('../PersonalBills.vue?raw'), formId: 'personal-budget-dialog-form'},
  {name: '软件', loadSource: () => import('../SoftwareRepo.vue?raw'), formId: 'software-dialog-form'},
  {name: '软件版本', loadSource: () => import('../SoftwareRepo.vue?raw'), formId: 'software-version-dialog-form'},
  {name: '待办任务', loadSource: () => import('../TodoList.vue?raw'), formId: 'todo-task-dialog-form'},
  {name: '工作日志', loadSource: () => import('../WorkLog.vue?raw'), formId: 'work-log-dialog-form'}
]

describe('业务弹窗紧凑布局契约', () => {
  it.each(compactFormContracts)('$name 表单使用响应式密度网格', async ({loadSource, formId}) => {
    const {default: source} = await loadSource()
    const formTagPattern = new RegExp(`<form[^>]*id="${formId}"[^>]*class="[^"]*dialog-density-grid[^"]*"`)

    expect(source).toMatch(formTagPattern)
  })

  it('公共密度网格按桌面、平板、手机逐级收敛', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/styles/macos-ui.css'), 'utf8')

    expect(source).toContain('--dialog-grid-columns: 3')
    expect(source).toContain('.dialog-density-grid.dialog-grid-cols-4')
    expect(source).toContain('@media (max-width: 960px)')
    expect(source).toContain('@media (max-width: 640px)')
    expect(source).toContain('.dialog-density-grid > .dialog-grid-group')
    expect(source).toContain('.dialog-density-grid .dialog-span-all')
  })

  it('应用管理和详情型弹窗也提升桌面信息密度', async () => {
    const [{default: appSource}, {default: fuelSource}, {default: passwordSource}] = await Promise.all([
      import('../AppManagement.vue?raw'),
      import('../FuelStats.vue?raw'),
      import('../PasswordMemo.vue?raw')
    ])

    expect(appSource).toMatch(/\.editor-grid\s*\{[^}]*repeat\(4,/s)
    expect(fuelSource).toMatch(/\.detail-grid\s*\{[^}]*repeat\(4,/s)
    expect(passwordSource).toMatch(/\.detail-grid\s*\{[^}]*repeat\(3,/s)
  })

  it('工作日志将基础字段合并为一行并移除重复类型标签', async () => {
    const {default: source} = await import('../WorkLog.vue?raw')
    const compactMetadataGroup = source.match(/<div class="form-inline-grid dialog-grid-group">([\s\S]*?)<\/div>/)?.[1] || ''

    expect(compactMetadataGroup).toContain('日期')
    expect(compactMetadataGroup).toContain('人天')
    expect(compactMetadataGroup).toContain('地点')
    expect(compactMetadataGroup).toContain('所属项目')
    expect(source).not.toContain('class="selected-type-row')
    expect(source).toMatch(/日志类型[\s\S]*禅道编号/)
  })
})
