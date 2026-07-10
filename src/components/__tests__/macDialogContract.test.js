import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const componentSource = readFileSync(
  new URL('../MacDialog.vue', import.meta.url),
  'utf8'
)

const extractStyleRule = (selector) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const ruleMatch = componentSource.match(
    new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`)
  )

  assert.ok(ruleMatch, `missing ${selector} style rule`)
  return ruleMatch[1]
}

test('MacDialog declares the view state contract and public window events', () => {
  assert.match(
    componentSource,
    /import\s*\{[\s\S]*DIALOG_VIEW_ACTION[\s\S]*canRequestDialogClose[\s\S]*createDialogViewState[\s\S]*reduceDialogViewState[\s\S]*\}\s*from\s*['"]\.\/macDialogState\.js['"]/
  )
  assert.match(componentSource, /closeDisabled\s*:\s*\{[\s\S]*?type:\s*Boolean[\s\S]*?default:\s*false[\s\S]*?\}/)
  assert.match(componentSource, /dialogViewState:\s*createDialogViewState\(\)/)

  const emitsMatch = componentSource.match(/emits:\s*\[([^\]]*)\]/)
  assert.ok(emitsMatch, 'missing emits declaration')
  const events = [...emitsMatch[1].matchAll(/['"]([^'"]+)['"]/g)]
    .map((eventMatch) => eventMatch[1])
    .sort()

  assert.deepEqual(events, [
    'cancel',
    'close',
    'maximize-change',
    'minimize',
    'restore',
    'update:modelValue'
  ])
})

test('MacDialog renders either the standard modal or unobstructed minimized restore bar', () => {
  assert.match(componentSource, /v-if="modelValue\s*&&\s*!isMinimized"[\s\S]*class="mac-dialog-mask"/)
  assert.match(
    componentSource,
    /<button\b(?=[^>]*v-else-if="modelValue\s*&&\s*isMinimized")(?=[^>]*class="mac-dialog-minimized")[^>]*>[\s\S]*?<\/button>/
  )
  assert.match(componentSource, /class="mac-dialog-minimized"[\s\S]*?aria-label="恢复弹窗"[\s\S]*?@click="restore"/)
  assert.match(componentSource, /mac-dialog-minimized-dot/)
  assert.match(componentSource, /\{\{\s*title\s*\}\}/)
  assert.match(componentSource, /<strong>点击恢复<\/strong>/)
  assert.match(
    extractStyleRule('.mac-dialog-leave-active.mac-dialog-mask'),
    /pointer-events:\s*none/
  )
})

test('MacDialog wires both close entries and macOS window controls to guarded actions', () => {
  const controlsMatch = componentSource.match(/<MacWindowControls\b[\s\S]*?\/>/)
  assert.ok(controlsMatch, 'missing MacWindowControls')
  assert.match(controlsMatch[0], /:close-disabled="closeDisabled"/)
  assert.match(controlsMatch[0], /:maximized="isMaximized"/)
  assert.match(controlsMatch[0], /@close="requestClose"/)
  assert.match(controlsMatch[0], /@minimize="minimize"/)
  assert.match(controlsMatch[0], /@toggle-maximize="toggleMaximize"/)

  const closeButtonMatch = componentSource.match(
    /<button\b(?=[^>]*class="mac-dialog-close")[^>]*>[\s\S]*?<\/button>/
  )
  assert.ok(closeButtonMatch, 'missing right close button')
  assert.match(closeButtonMatch[0], /:disabled="closeDisabled"/)
  assert.match(closeButtonMatch[0], /aria-label="取消并关闭弹窗"/)
  assert.match(closeButtonMatch[0], /@click="requestClose"/)
  assert.match(closeButtonMatch[0], />\s*×\s*<\/button>/)

  assert.match(componentSource, /handleMaskClick\(\)\s*\{[\s\S]*?this\.closeOnMask[\s\S]*?this\.requestClose\(\)/)
  assert.match(componentSource, /canRequestDialogClose\(\{[\s\S]*?modelValue:\s*this\.modelValue[\s\S]*?closeDisabled:\s*this\.closeDisabled/)
  assert.match(componentSource, /close\(\)\s*\{\s*this\.requestClose\(\)\s*\}/)
})

test('MacDialog reducers drive minimize restore maximize and reset behavior', () => {
  assert.match(componentSource, /reduceDialogViewState\([\s\S]*?DIALOG_VIEW_ACTION\.MINIMIZE[\s\S]*?this\.closeDisabled/)
  assert.match(componentSource, /reduceDialogViewState\([\s\S]*?DIALOG_VIEW_ACTION\.RESTORE/)
  assert.match(componentSource, /reduceDialogViewState\([\s\S]*?DIALOG_VIEW_ACTION\.TOGGLE_MAXIMIZE/)
  assert.match(componentSource, /reduceDialogViewState\([\s\S]*?DIALOG_VIEW_ACTION\.RESET/)
  assert.match(componentSource, /this\.\$emit\(['"]minimize['"]\)/)
  assert.match(componentSource, /this\.\$emit\(['"]restore['"]\)/)
  assert.match(componentSource, /this\.\$emit\(['"]maximize-change['"],\s*this\.dialogViewState\.maximized\)/)
  assert.match(componentSource, /this\.\$emit\(['"]cancel['"]\)/)
})

test('MacDialog panel exposes maximized state and viewport-safe sizing', () => {
  assert.match(
    componentSource,
    /:class="\[panelClass,\s*\{\s*maximized:\s*dialogViewState\.maximized\s*\}\]"/
  )
  assert.match(componentSource, /:style="\{\s*maxWidth:\s*width,\s*width:\s*width\s*\}"/)

  const maximizedRule = extractStyleRule('.mac-dialog-panel.maximized')
  assert.match(maximizedRule, /width:\s*calc\(100vw\s*-\s*32px\)/)
  assert.match(maximizedRule, /height:\s*calc\(100vh\s*-\s*32px\)/)
  assert.match(maximizedRule, /max-width:\s*none/)
  assert.match(maximizedRule, /max-height:\s*none/)
  assert.match(componentSource, /@media\s*\(max-width:\s*720px\)[\s\S]*calc\(100vw\s*-\s*16px\)[\s\S]*calc\(100vh\s*-\s*16px\)/)
})

test('MacDialog registers and cleans up Escape handling', () => {
  assert.match(componentSource, /mounted\(\)\s*\{[\s\S]*?document\.addEventListener\(['"]keydown['"],\s*this\.handleKeydown\)/)
  assert.match(componentSource, /beforeUnmount\(\)\s*\{[\s\S]*?document\.removeEventListener\(['"]keydown['"],\s*this\.handleKeydown\)/)
  assert.match(componentSource, /handleKeydown\(event\)\s*\{[\s\S]*?event\.key\s*===\s*['"]Escape['"][\s\S]*?this\.requestClose\(\)/)
  assert.match(componentSource, /watch:\s*\{[\s\S]*?modelValue\(\)\s*\{[\s\S]*?this\.resetViewState\(\)/)
})

test('MacDialog body uses stable thin scrollbars with a stronger hover thumb', () => {
  const bodyRule = extractStyleRule('.mac-dialog-body')
  assert.match(bodyRule, /min-height:\s*0/)
  assert.match(bodyRule, /overflow:\s*auto/)
  assert.match(bodyRule, /padding:\s*20px/)
  assert.match(bodyRule, /scrollbar-gutter:\s*stable/)
  assert.match(bodyRule, /scrollbar-width:\s*thin/)
  assert.match(bodyRule, /scrollbar-color:\s*rgba\([^)]+\)\s+rgba\([^)]+\)/)

  const scrollbarRule = extractStyleRule('.mac-dialog-body::-webkit-scrollbar')
  assert.match(scrollbarRule, /width:\s*6px/)
  assert.match(extractStyleRule('.mac-dialog-body::-webkit-scrollbar-track'), /background:\s*rgba\(/)
  assert.match(extractStyleRule('.mac-dialog-body::-webkit-scrollbar-thumb'), /border-radius:\s*999px/)
  assert.match(extractStyleRule('.mac-dialog-body::-webkit-scrollbar-thumb:hover'), /background:\s*rgba\(/)
})
