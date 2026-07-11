// @vitest-environment happy-dom

import {describe, expect, it} from 'vitest'

const pageContracts = [
  {
    name: '用户管理',
    loadSource: () => import('../UserManagement.vue?raw'),
    dialogCount: 2,
    formIds: ['user-edit-dialog-form', 'user-password-dialog-form']
  },
  {
    name: '应用管理',
    loadSource: () => import('../AppManagement.vue?raw'),
    dialogCount: 1,
    formIds: []
  },
  {
    name: '数据字典',
    loadSource: () => import('../DataDictionary.vue?raw'),
    dialogCount: 2,
    formIds: ['dictionary-editor-dialog-form', 'dictionary-item-dialog-form']
  }
]

describe('系统管理弹窗迁移契约', () => {
  it.each(pageContracts)('$name 仅使用共享 MacDialog', async ({loadSource, dialogCount, formIds}) => {
    const {default: source} = await loadSource()

    expect(source.match(/<MacDialog\b/g)).toHaveLength(dialogCount)
    expect(source).toContain("import MacDialog from '@/components/MacDialog.vue'")
    expect(source).not.toContain('class="dialog-mask"')
    expect(source).not.toContain('class="dialog-close"')
    expect(source).not.toMatch(/>\s*取消\s*<\/button>/)

    for (const formId of formIds) {
      expect(source).toContain(`id="${formId}"`)
      expect(source).toContain(`form="${formId}"`)
    }
  })

  it('保留会改变表单内容的辅助操作', async () => {
    const [{default: userSource}, {default: appSource}] = await Promise.all([
      import('../UserManagement.vue?raw'),
      import('../AppManagement.vue?raw')
    ])

    expect(userSource).toMatch(/@click="fillRandomPassword"[\s\S]*随机生成/)
    expect(appSource).toMatch(/@click="resetEditor"[\s\S]*重置/)
  })

  it('所有系统弹窗都传递关闭锁定状态', async () => {
    const sources = await Promise.all(pageContracts.map(async ({loadSource}) => {
      const {default: source} = await loadSource()
      return source
    }))
    const dialogMarkup = sources.join('\n')

    expect(dialogMarkup.match(/:close-disabled=/g)).toHaveLength(5)
  })
})
