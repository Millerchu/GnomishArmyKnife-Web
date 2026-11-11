import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const homeSource = readFileSync(new URL('../../views/Home.vue', import.meta.url), 'utf8')
const shellSource = readFileSync(new URL('../../composables/useHomeShell.js', import.meta.url), 'utf8')
const shellStyles = readFileSync(new URL('../workbench/homeShell.css', import.meta.url), 'utf8')
const workbenchSource = readFileSync(new URL('../workbench/WorkbenchPanel.vue', import.meta.url), 'utf8')
const dockSource = readFileSync(new URL('../workbench/AppDock.vue', import.meta.url), 'utf8')
const workbenchStyles = readFileSync(new URL('../workbench/workbench.css', import.meta.url), 'utf8')
const quickCreateSource = readFileSync(new URL('../QuickCreateDialog.vue', import.meta.url), 'utf8')
const attachmentManagerSource = readFileSync(new URL('../AttachmentManager.vue', import.meta.url), 'utf8')

test('主页以 720px 同步移动布局与拖拽禁用边界', () => {
  assert.match(shellSource, /window\.matchMedia\('\(max-width: 720px\)'\)\.matches/)
  assert.match(shellStyles, /@media \(max-width: 720px\)/)
  assert.doesNotMatch(homeSource + shellSource + shellStyles + workbenchStyles, /max-width: 640px/)
  assert.match(dockSource, /:draggable="!isMobileViewport"/)
  assert.match(workbenchStyles, /\.grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\) !important;/)
})

test('主页移动工作台提供问候日期、吸顶材质、安全区与三个操作入口', () => {
  assert.match(workbenchSource, /class="wb-mobile-date"/)
  assert.match(homeSource, /class="mobile-workbench-bar"/)
  assert.match(homeSource, /⌕ 搜索/)
  assert.match(homeSource, /▤ 看板/)
  assert.match(shellStyles, /\.top-bar\s*\{[\s\S]*?position:\s*sticky;/)
  assert.match(shellStyles, /env\(safe-area-inset-top\)/)
  assert.match(shellStyles, /env\(safe-area-inset-bottom\)/)
  assert.match(homeSource, /class="mobile-quick-create"[\s\S]*?＋ 快速新增<\/button>/)
  assert.match(shellStyles, /--mobile-control-size:\s*44px;/)
})

test('系统菜单以 disclosure 分组从右上锚点过渡并暴露展开状态', () => {
  assert.match(homeSource, /<Transition name="system-menu-material">/)
  assert.match(homeSource, /:aria-expanded="showSystemMenu"/)
  assert.match(homeSource, /id="home-system-menu"[\s\S]*?role="group"/)
  assert.doesNotMatch(homeSource, /role="menuitem"/)
  assert.match(shellStyles, /transform-origin:\s*calc\(100% - 22px\) 0;/)
  assert.match(shellStyles, /\.system-menu-material-enter-from,[\s\S]*?\.system-menu-material-leave-to/)
})

test('主页相关弹窗声明移动呈现方式且快速新增控件对齐 720px', () => {
  assert.match(homeSource, /panel-class="home-logout-dialog"\s+mobile-presentation="sheet"/)
  assert.match(homeSource, /panel-class="home-profile-dialog"\s+mobile-presentation="fullScreen"/)
  assert.match(quickCreateSource, /panel-class="quick-create-dialog"\s+mobile-presentation="fullScreen"/)
  assert.match(quickCreateSource, /@media \(max-width: 720px\)/)
  assert.match(quickCreateSource, /min-height:\s*44px;/)
  assert.match(quickCreateSource, /\.type-picker select option\s*\{[\s\S]*?font-size:\s*16px !important;/)
  assert.match(quickCreateSource, /\.type-picker select optgroup\s*\{[\s\S]*?font-size:\s*14px !important;/)
  assert.match(attachmentManagerSource, /@media \(max-width: 720px\)/)
  assert.match(attachmentManagerSource, /\.attachment-actions button\s*\{[\s\S]*?min-width:\s*44px;[\s\S]*?min-height:\s*44px;/)
})
