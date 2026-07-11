// @vitest-environment happy-dom

import {describe, it} from 'vitest'

import {expectMacDialogMigration} from './dialogMigrationContract.js'

const pageContracts = [
  {
    name: '健康记录',
    loadSource: () => import('../HealthRecord.vue?raw'),
    dialogCount: 3,
    formIds: [
      'health-record-dialog-form',
      'health-visit-dialog-form',
      'health-report-dialog-form'
    ],
    panelClasses: [
      'health-record-dialog',
      'health-visit-dialog',
      'health-report-dialog'
    ],
    closeDisabledBindings: ['submitting', 'submitting', 'submitting']
  },
  {
    name: '魔兽角色与嵌套键位',
    loadSource: () => import('../WowCharacterStats.vue?raw'),
    dialogCount: 2,
    formIds: ['wow-character-dialog-form'],
    panelClasses: ['wow-character-dialog', 'wow-keybinding-dialog'],
    closeDisabledBindings: ['submitting', 'false']
  }
]

describe('复杂弹窗迁移契约', () => {
  it.each(pageContracts)('$name 使用共享 MacDialog 并保留业务操作', async ({loadSource, ...contract}) => {
    const {default: source} = await loadSource()

    expectMacDialogMigration(source, contract)
  })
})
