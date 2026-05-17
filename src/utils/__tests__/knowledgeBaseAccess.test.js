import test from 'node:test'
import assert from 'node:assert/strict'

import {
  KNOWLEDGE_STATUS,
  canDeleteKnowledgeEntry,
  canEditKnowledgeEntry,
  getKnowledgeStatusMeta,
  normalizeKnowledgeEntry
} from '../knowledgeBaseAccess.js'
import {
  buildKnowledgeTickerItems,
  getNextTickerIndex
} from '../loginKnowledgeTicker.js'

test('normalizeKnowledgeEntry keeps review workflow fields', () => {
  const entry = normalizeKnowledgeEntry({
    id: 1,
    ownerUserId: 9,
    title: '经验标题',
    status: 'pending',
    reviewRemark: '需要补充示例',
    tagsText: '复盘,值守'
  })

  assert.equal(entry.status, KNOWLEDGE_STATUS.PENDING)
  assert.deepEqual(entry.tags, ['复盘', '值守'])
  assert.equal(entry.reviewRemark, '需要补充示例')
})

test('knowledge entry permissions match submission workflow', () => {
  const user = { id: 7, roleCode: 'USER' }
  const admin = { id: 9, roleCode: 'ADMIN' }
  const pendingEntry = { ownerUserId: 7, status: 'PENDING' }
  const publishedEntry = { ownerUserId: 7, status: 'PUBLISHED' }

  assert.equal(canEditKnowledgeEntry(pendingEntry, user), true)
  assert.equal(canDeleteKnowledgeEntry(pendingEntry, user), true)
  assert.equal(canEditKnowledgeEntry(publishedEntry, user), false)
  assert.equal(canDeleteKnowledgeEntry(publishedEntry, user), false)
  assert.equal(canEditKnowledgeEntry(publishedEntry, admin), true)
  assert.equal(canDeleteKnowledgeEntry(publishedEntry, admin), true)
})

test('knowledge status meta returns readable labels', () => {
  assert.deepEqual(getKnowledgeStatusMeta('PENDING'), { label: '待审核', tone: 'pending' })
  assert.deepEqual(getKnowledgeStatusMeta('REJECTED'), { label: '已驳回', tone: 'rejected' })
  assert.deepEqual(getKnowledgeStatusMeta('PUBLISHED'), { label: '已发布', tone: 'published' })
})

test('login ticker builds compact slogans and rotates safely', () => {
  const items = buildKnowledgeTickerItems([
    { id: 1, title: '经验一', summary: '这是第一条经验摘要' },
    { id: 2, title: '', summary: '缺标题应被忽略' }
  ])

  assert.equal(items.length, 1)
  assert.match(items[0].slogan, /经验一/)
  assert.equal(getNextTickerIndex(-1, items.length), 0)
  assert.equal(getNextTickerIndex(0, items.length), 0)
  assert.equal(getNextTickerIndex(3, 0), -1)
})
