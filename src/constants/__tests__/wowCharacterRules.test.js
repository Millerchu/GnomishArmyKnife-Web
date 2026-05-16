import test from 'node:test'
import assert from 'node:assert/strict'

import {WOW_SPEC_PRESETS} from '../wowCharacterRules.js'

test('demon hunter devourer spec uses localized label', () => {
  const devourerSpec = WOW_SPEC_PRESETS.find((item) => item.itemCode === 'devourer')

  assert.ok(devourerSpec)
  assert.equal(devourerSpec.itemLabel, '噬灭')
})
