import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const componentSource = readFileSync(
  new URL('../MacWindowControls.vue', import.meta.url),
  'utf8'
)

const extractButtonByClass = (className) => {
  const buttonPattern = new RegExp(
    `<button\\b(?=[^>]*\\bclass="mac-window-dot ${className}")[^>]*>[\\s\\S]*?<\\/button>`
  )
  const buttonMatch = componentSource.match(buttonPattern)

  assert.ok(buttonMatch, `missing ${className} control button`)
  return buttonMatch[0]
}

const extractObjectProperty = (propertyName) => {
  const propertyMatch = componentSource.match(new RegExp(`\\b${propertyName}\\s*:`))
  assert.ok(propertyMatch, `missing ${propertyName} property`)

  const openingBraceIndex = componentSource.indexOf('{', propertyMatch.index)
  assert.notEqual(openingBraceIndex, -1, `missing ${propertyName} configuration`)

  let braceDepth = 0
  for (let index = openingBraceIndex; index < componentSource.length; index += 1) {
    if (componentSource[index] === '{') {
      braceDepth += 1
    } else if (componentSource[index] === '}') {
      braceDepth -= 1
    }

    if (braceDepth === 0) {
      return componentSource.slice(openingBraceIndex, index + 1)
    }
  }

  assert.fail(`unclosed ${propertyName} configuration`)
}

const extractStyleRule = (selector) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const ruleMatch = componentSource.match(
    new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`)
  )

  assert.ok(ruleMatch, `missing ${selector} style rule`)
  return ruleMatch[1]
}

test('MacWindowControls exposes accessible window control buttons', () => {
  const controlsGroup = componentSource.match(
    /<div\b(?=[^>]*\bclass="mac-window-controls")[^>]*>/
  )?.[0]
  assert.ok(controlsGroup, 'missing window controls group')
  assert.match(controlsGroup, /\brole="group"/)
  assert.match(controlsGroup, /\baria-label="弹窗窗口控制"/)

  const closeButton = extractButtonByClass('close')
  assert.match(closeButton, /\btype="button"/)
  assert.match(closeButton, /:disabled="closeDisabled"/)
  assert.match(closeButton, /\baria-label="取消并关闭弹窗"/)
  assert.match(closeButton, /\btitle="取消并关闭"/)
  assert.match(closeButton, /@click="\$emit\('close'\)"/)
  assert.match(closeButton, />\s*×\s*<\/button>/)

  const minimizeButton = extractButtonByClass('minimize')
  assert.match(minimizeButton, /\btype="button"/)
  assert.match(minimizeButton, /:disabled="closeDisabled"/)
  assert.match(minimizeButton, /\baria-label="收起弹窗"/)
  assert.match(minimizeButton, /\btitle="收起"/)
  assert.match(minimizeButton, /@click="\$emit\('minimize'\)"/)
  assert.match(minimizeButton, />\s*−\s*<\/button>/)

  const zoomButton = extractButtonByClass('zoom')
  assert.match(zoomButton, /\btype="button"/)
  assert.doesNotMatch(zoomButton, /:disabled=/)
  assert.match(zoomButton, /:aria-label="maximized \? '还原弹窗' : '最大化弹窗'"/)
  assert.match(zoomButton, /:title="maximized \? '还原' : '最大化'"/)
  assert.match(zoomButton, /@click="\$emit\('toggle-maximize'\)"/)
  assert.match(zoomButton, />\s*\+\s*<\/button>/)
})

test('MacWindowControls declares independent props and exact emitted events', () => {
  const closeDisabledProperty = extractObjectProperty('closeDisabled')
  assert.match(closeDisabledProperty, /\btype:\s*Boolean\b/)
  assert.match(closeDisabledProperty, /\bdefault:\s*false\b/)

  const maximizedProperty = extractObjectProperty('maximized')
  assert.match(maximizedProperty, /\btype:\s*Boolean\b/)
  assert.match(maximizedProperty, /\bdefault:\s*false\b/)

  const emitsMatch = componentSource.match(/\bemits:\s*\[([^\]]*)\]/)
  assert.ok(emitsMatch, 'missing emits declaration')
  const emittedEvents = [...emitsMatch[1].matchAll(/['"]([^'"]+)['"]/g)]
    .map((eventMatch) => eventMatch[1])
    .sort()

  assert.deepEqual(emittedEvents, ['close', 'minimize', 'toggle-maximize'])
})

test('MacWindowControls keeps a 12px dot inside each 24px control target', () => {
  const controlsGroupRule = extractStyleRule('.mac-window-controls')
  assert.match(controlsGroupRule, /\bgap:\s*[1-9]\d*px\s*;/)

  const buttonRule = extractStyleRule('.mac-window-dot')
  assert.match(buttonRule, /\bwidth:\s*24px\s*;/)
  assert.match(buttonRule, /\bheight:\s*24px\s*;/)
  assert.match(buttonRule, /\bmin-width:\s*24px\s*;/)
  assert.match(buttonRule, /\bmin-height:\s*24px\s*;/)
  assert.match(buttonRule, /\bbackground:\s*transparent\s*;/)
  assert.match(buttonRule, /\bdisplay:\s*inline-flex\s*;/)
  assert.match(buttonRule, /\balign-items:\s*center\s*;/)
  assert.match(buttonRule, /\bjustify-content:\s*center\s*;/)

  const visibleDotRule = extractStyleRule('.mac-window-dot::before')
  assert.match(visibleDotRule, /\bwidth:\s*12px\s*;/)
  assert.match(visibleDotRule, /\bheight:\s*12px\s*;/)

  const closeDotRule = extractStyleRule('.mac-window-dot.close::before')
  assert.match(closeDotRule, /\bbackground:\s*#ff5f57\s*;/)

  const minimizeDotRule = extractStyleRule('.mac-window-dot.minimize::before')
  assert.match(minimizeDotRule, /\bbackground:\s*#febc2e\s*;/)

  const zoomDotRule = extractStyleRule('.mac-window-dot.zoom::before')
  assert.match(zoomDotRule, /\bbackground:\s*#28c840\s*;/)

  const disabledDotRule = extractStyleRule('.mac-window-dot:disabled::before')
  assert.match(disabledDotRule, /\bfilter:\s*grayscale\(0\.7\)\s*;/)
  assert.match(disabledDotRule, /\bopacity:\s*0\.45\s*;/)
})
