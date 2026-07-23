import test from 'node:test'
import assert from 'node:assert/strict'

import {USER_APP_DEFINITIONS} from '../appCatalog.js'
import {resolveFeatureAppIcon} from '../appIconAssets.js'

test('instrument practice app exposes the platform catalog contract', () => {
  const definition = USER_APP_DEFINITIONS.find((item) => item.featureCode === 'APP_INSTRUMENT_PRACTICE')

  assert.deepEqual(definition, {
    key: 'instrument-practice',
    name: '随身乐器',
    featureCode: 'APP_INSTRUMENT_PRACTICE',
    route: '/instrument-practice',
    category: '音乐练习',
    dataSourceMode: 'REAL',
    securityLevel: 'PUBLIC',
    encryptionMode: 'NONE',
    enabled: true,
    sortNo: 120,
    description: '在手机上演奏古筝、吉他和乌克丽丽，并使用节拍器与录制回放练习。'
  })
})

test('instrument practice app resolves its generated public icon asset', () => {
  assert.deepEqual(resolveFeatureAppIcon('app_instrument_practice'), {
    iconType: 'URL',
    iconUrl: '/app-icons/app-instrument-practice.webp',
    iconStorageType: 'PUBLIC_ASSET',
    iconFileName: 'app-instrument-practice.webp',
    iconChromaKey: ''
  })
})
