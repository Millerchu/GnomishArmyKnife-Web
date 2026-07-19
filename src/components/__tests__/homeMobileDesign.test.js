import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const homeSource = readFileSync(new URL('../../views/Home.vue', import.meta.url), 'utf8')
const quickCreateSource = readFileSync(new URL('../QuickCreateDialog.vue', import.meta.url), 'utf8')
const attachmentManagerSource = readFileSync(new URL('../AttachmentManager.vue', import.meta.url), 'utf8')

test('主页以 720px 同步移动布局与拖拽禁用边界', () => {
  assert.match(homeSource, /window\.matchMedia\('\(max-width: 720px\)'\)\.matches/)
  assert.match(homeSource, /@media \(max-width: 720px\)/)
  assert.doesNotMatch(homeSource, /max-width: 640px/)
  assert.match(homeSource, /:draggable="!isMobileViewport"/)
  assert.match(homeSource, /\.grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\) !important;/)
})

test('主页移动桌面提供状态行、吸顶材质和安全区浮动新增入口', () => {
  assert.match(homeSource, /class="mobile-tool-status"[^>]*aria-live="polite"/)
  assert.match(homeSource, /<h1>我的工具<\/h1>/)
  assert.match(homeSource, /\.top-bar\s*\{[\s\S]*?position:\s*sticky;/)
  assert.match(homeSource, /env\(safe-area-inset-top\)/)
  assert.match(homeSource, /env\(safe-area-inset-bottom\)/)
  assert.match(homeSource, /class="mobile-quick-create"[\s\S]*?<span>快速新增<\/span>/)
  assert.match(homeSource, /--mobile-control-size:\s*44px;/)
})

test('系统菜单以 disclosure 分组从右上锚点过渡并暴露展开状态', () => {
  assert.match(homeSource, /<Transition name="system-menu-material">/)
  assert.match(homeSource, /:aria-expanded="showSystemMenu"/)
  assert.match(homeSource, /id="home-system-menu"[\s\S]*?role="group"/)
  assert.doesNotMatch(homeSource, /role="menuitem"/)
  assert.match(homeSource, /transform-origin:\s*calc\(100% - 22px\) 0;/)
  assert.match(homeSource, /\.system-menu-material-enter-from,[\s\S]*?\.system-menu-material-leave-to/)
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
