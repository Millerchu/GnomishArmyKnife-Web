import test from 'node:test'
import assert from 'node:assert/strict'

import {
  MAX_WOW_CHARACTER_LEVEL,
  shouldShowEndgameSections
} from '../wowCharacterDisplay.js'

test('shouldShowEndgameSections only enables weekly vault and season records for max level characters', () => {
  assert.equal(MAX_WOW_CHARACTER_LEVEL, 90)
  assert.equal(shouldShowEndgameSections(90), true)
  assert.equal(shouldShowEndgameSections('90'), true)
  assert.equal(shouldShowEndgameSections(89), false)
  assert.equal(shouldShowEndgameSections(null), false)
})
