import {expect} from 'vitest'

export function expectMacDialogMigration(source, {
  dialogCount,
  formIds,
  panelClasses,
  closeDisabledBindings
}) {
  expect(source.match(/<MacDialog\b/g)).toHaveLength(dialogCount)
  expect(source).toContain("import MacDialog from '@/components/MacDialog.vue'")
  expect(source).not.toContain('class="dialog-mask"')
  expect(source).not.toContain('class="dialog-close"')
  expect(source).not.toMatch(/>\s*(取消|关闭)\s*<\/button>/)
  expect(source.match(/:close-disabled=/g)).toHaveLength(dialogCount)

  for (const formId of formIds) {
    expect(source).toContain(`id="${formId}"`)
    expect(source).toContain(`form="${formId}"`)
  }

  for (const panelClass of panelClasses) {
    expect(source).toContain(`panel-class="${panelClass}"`)
  }

  for (const binding of closeDisabledBindings) {
    expect(source).toContain(`:close-disabled="${binding}"`)
  }
}
