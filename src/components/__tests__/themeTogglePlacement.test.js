import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const homeSource = readFileSync(new URL('../../views/Home.vue', import.meta.url), 'utf8')

test('主页右上角在日期与系统菜单之间挂载主题切换按钮', () => {
  const topRightStart = homeSource.indexOf('<div class="top-right-wrap">')
  const dateIndex = homeSource.indexOf('<span class="current-date">', topRightStart)
  const themeToggleIndex = homeSource.indexOf('<ThemeToggle', topRightStart)
  const systemMenuIndex = homeSource.indexOf('<div ref="systemMenuRef"', topRightStart)

  assert.ok(topRightStart >= 0)
  assert.ok(dateIndex > topRightStart)
  assert.ok(themeToggleIndex > dateIndex)
  assert.ok(systemMenuIndex > themeToggleIndex)
  assert.match(homeSource, /import ThemeToggle from '@\/components\/ThemeToggle\.vue'/)
})
