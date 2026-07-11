// @vitest-environment happy-dom

import {describe, it} from 'vitest'

import {expectMacDialogMigration} from './dialogMigrationContract.js'

const pageContracts = [
  {
    name: '待办列表',
    loadSource: () => import('../TodoList.vue?raw'),
    dialogCount: 1,
    formIds: ['todo-task-dialog-form'],
    panelClasses: ['todo-editor-dialog'],
    closeDisabledBindings: ['submitting']
  },
  {
    name: '软件仓库',
    loadSource: () => import('../SoftwareRepo.vue?raw'),
    dialogCount: 2,
    formIds: ['software-dialog-form', 'software-version-dialog-form'],
    panelClasses: ['software-editor-dialog', 'software-version-dialog'],
    closeDisabledBindings: ['submitting', 'submitting']
  },
  {
    name: '个人账单',
    loadSource: () => import('../PersonalBills.vue?raw'),
    dialogCount: 2,
    formIds: ['personal-bill-dialog-form', 'personal-budget-dialog-form'],
    panelClasses: ['personal-bill-dialog', 'personal-budget-dialog'],
    closeDisabledBindings: ['submitting', 'budgetSubmitting']
  }
]

describe('业务 CRUD 弹窗迁移契约', () => {
  it.each(pageContracts)('$name 使用共享 MacDialog 并保留单一提交操作', async ({loadSource, ...contract}) => {
    const {default: source} = await loadSource()

    expectMacDialogMigration(source, contract)
  })
})
