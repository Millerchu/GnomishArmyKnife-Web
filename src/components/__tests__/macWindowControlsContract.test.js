import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const componentSource = readFileSync(
  new URL('../MacWindowControls.vue', import.meta.url),
  'utf8'
)

test('MacWindowControls exposes accessible close, minimize, and maximize controls', () => {
  assert.equal(componentSource.match(/<button\b[^>]*\btype="button"/g)?.length, 3)
  assert.match(componentSource, /role="group"\s+aria-label="弹窗窗口控制"/)

  assert.match(componentSource, /emits:\s*\[\s*['"]close['"]\s*,\s*['"]minimize['"]\s*,\s*['"]toggle-maximize['"]\s*\]/)
  assert.match(componentSource, /closeDisabled:\s*\{\s*type:\s*Boolean,\s*default:\s*false\s*\}/)
  assert.match(componentSource, /maximized:\s*\{\s*type:\s*Boolean,\s*default:\s*false\s*\}/)

  assert.match(componentSource, /class="mac-window-dot close"[^>]*:disabled="closeDisabled"[^>]*aria-label="取消并关闭弹窗"[^>]*title="取消并关闭"[^>]*@click="\$emit\('close'\)"/)
  assert.match(componentSource, /class="mac-window-dot minimize"[^>]*:disabled="closeDisabled"[^>]*aria-label="收起弹窗"[^>]*title="收起"[^>]*@click="\$emit\('minimize'\)"/)
  assert.match(componentSource, /class="mac-window-dot zoom"[^>]*:aria-label="maximized \? '还原弹窗' : '最大化弹窗'"[^>]*:title="maximized \? '还原' : '最大化'"[^>]*@click="\$emit\('toggle-maximize'\)"/)
  assert.doesNotMatch(componentSource, /class="mac-window-dot zoom"[^>]*:disabled/)

  assert.match(componentSource, />\s*×\s*<\/button>/)
  assert.match(componentSource, />\s*−\s*<\/button>/)
})
