import test from 'node:test'
import assert from 'node:assert/strict'

import {sortHomeTools} from '../homeToolOrder.js'

const catalogTools = [
  {key: 'calculator', order: 1, usageCount: 0},
  {key: 'work-log', order: 2, usageCount: 5},
  {key: 'todo-list', order: 3, usageCount: 2}
]

test('default home order stays stable when usage count changes', () => {
  const result = sortHomeTools(catalogTools, [])

  assert.deepEqual(result.map((item) => item.key), ['calculator', 'work-log', 'todo-list'])
})

test('custom home order takes priority over catalog order', () => {
  const result = sortHomeTools(catalogTools, ['todo-list', 'calculator', 'work-log'])

  assert.deepEqual(result.map((item) => item.key), ['todo-list', 'calculator', 'work-log'])
})

test('apps missing from custom order keep catalog order at the end', () => {
  const result = sortHomeTools(catalogTools, ['todo-list'])

  assert.deepEqual(result.map((item) => item.key), ['todo-list', 'calculator', 'work-log'])
})
