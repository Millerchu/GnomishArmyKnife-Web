// @vitest-environment happy-dom

import {describe, expect, it} from 'vitest'

import {expectMacDialogMigration} from './dialogMigrationContract.js'

const pageContracts = [
  {
    name: '油耗统计',
    loadSource: () => import('../FuelStats.vue?raw'),
    dialogCount: 2,
    formIds: ['fuel-record-dialog-form'],
    panelClasses: ['fuel-record-dialog', 'fuel-record-detail-dialog'],
    closeDisabledBindings: ['submitting', 'false']
  },
  {
    name: '经验库',
    loadSource: () => import('../KnowledgeBase.vue?raw'),
    dialogCount: 2,
    formIds: ['knowledge-entry-dialog-form'],
    panelClasses: ['knowledge-entry-dialog', 'knowledge-entry-detail-dialog'],
    closeDisabledBindings: ['submitting', 'detailLoading || reviewSubmitting']
  },
  {
    name: '密码备忘录',
    loadSource: () => import('../PasswordMemo.vue?raw'),
    dialogCount: 3,
    formIds: ['password-memo-edit-dialog-form', 'password-memo-update-password-form', 'password-memo-verify-form'],
    panelClasses: ['password-memo-edit-dialog', 'password-memo-update-password-dialog', 'password-memo-verify-dialog'],
    closeDisabledBindings: ['submitting', 'updatingPassword', 'detailLoading || verifyingPassword']
  },
  {
    name: '主页个人中心与退出确认',
    loadSource: () => import('../Home.vue?raw'),
    dialogCount: 2,
    formIds: ['home-profile-dialog-form', 'home-password-dialog-form'],
    panelClasses: ['home-profile-dialog', 'home-logout-dialog'],
    closeDisabledBindings: ['dialogLoading', 'false']
  }
]

describe('详情与安全弹窗迁移契约', () => {
  it.each(pageContracts)('$name 使用共享 MacDialog 并保留业务操作', async ({loadSource, ...contract}) => {
    const {default: source} = await loadSource()

    expectMacDialogMigration(source, contract)
  })

  it('主页退出请求打开共享确认弹窗，不再使用浏览器原生确认框', async () => {
    const {default: source} = await import('../Home.vue?raw')

    expect(source).not.toContain('window.confirm')
    expect(source).not.toContain('logoutDialogRef')
    expect(source).toMatch(/const requestLogout = \(\) => \{\s*logoutPending\.value = true\s*\}/)
  })
})
