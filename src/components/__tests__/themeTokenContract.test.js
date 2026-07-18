import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const themeStyles = readFileSync(
  new URL('../../styles/macos-ui.css', import.meta.url),
  'utf8'
)

function extractThemeTokens(blockPattern) {
  const block = themeStyles.match(blockPattern)?.[1] || ''
  return [...block.matchAll(/(--theme-[a-z0-9-]+)\s*:/g)]
    .map((match) => match[1])
    .sort()
}

test('深浅主题提供完全对称的语义 Token', () => {
  const darkTokens = extractThemeTokens(
    /:root,\s*:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/
  )
  const lightTokens = extractThemeTokens(
    /:root\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/
  )

  assert.ok(darkTokens.length > 0)
  assert.deepEqual(lightTokens, darkTokens)
  assert.ok(darkTokens.includes('--theme-on-accent'))
  assert.ok(darkTokens.includes('--theme-chart-grid'))
  assert.ok(darkTokens.includes('--theme-chart-axis'))
  assert.ok(darkTokens.includes('--theme-chart-point-stroke'))
})
