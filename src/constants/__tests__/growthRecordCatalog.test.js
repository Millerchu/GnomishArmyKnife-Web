import test from 'node:test'
import assert from 'node:assert/strict'
import {USER_APP_DEFINITIONS} from '../appCatalog.js'
import {resolveFeatureAppIcon, inferIconChromaKey} from '../appIconAssets.js'

test('芽记应用目录和SVG标识使用一致的平台契约', () => {
  const app = USER_APP_DEFINITIONS.find(item => item.featureCode === 'APP_GROWTH_RECORD')
  assert.equal(app.name,'芽记')
  assert.equal(app.route,'/growth-record')
  assert.equal(app.dataSourceMode,'REAL')
  assert.equal(app.securityLevel,'CONFIDENTIAL')
  assert.equal(resolveFeatureAppIcon(app.featureCode).iconUrl,'/app-icons/app-growth-record.svg')
  assert.equal(resolveFeatureAppIcon(app.featureCode).iconChromaKey,'')
  assert.equal(inferIconChromaKey('/app-icons/app-growth-record.svg'),'')
})
