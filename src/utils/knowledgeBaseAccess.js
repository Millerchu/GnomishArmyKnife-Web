export const KNOWLEDGE_STATUS = Object.freeze({
  PENDING: 'PENDING',
  PUBLISHED: 'PUBLISHED',
  REJECTED: 'REJECTED'
})

export const KNOWLEDGE_VIEW = Object.freeze({
  PUBLISHED: 'published',
  MY_SUBMISSIONS: 'my-submissions',
  PENDING_REVIEW: 'pending-review'
})

const ADMIN_ROLE_CODE = 'ADMIN'

export function normalizeKnowledgeTags(value) {
  if (Array.isArray(value)) {
    return value.map((item) => `${item || ''}`.trim()).filter(Boolean)
  }
  if (!value) {
    return []
  }
  return `${value}`
    .split(/[，,、/\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function normalizeKnowledgeEntry(item = {}) {
  return {
    id: item.id,
    ownerUserId: item.ownerUserId ?? item.ownerId ?? null,
    title: item.title || '',
    category: item.category || item.categoryName || '',
    scenario: item.scenario || '',
    source: item.source || item.sourceName || '',
    tags: normalizeKnowledgeTags(item.tags || item.tagsText),
    summary: item.summary || '',
    content: item.content || '',
    status: `${item.status || KNOWLEDGE_STATUS.PUBLISHED}`.toUpperCase(),
    reviewedBy: item.reviewedBy ?? null,
    reviewedAt: item.reviewedAt || '',
    reviewRemark: item.reviewRemark || '',
    createdAt: item.createdAt || '',
    updatedAt: item.updatedAt || ''
  }
}

export function normalizeCurrentUser(source = {}) {
  return {
    id: source.id ?? source.userId ?? null,
    username: source.username || '',
    roleCode: `${source.roleCode || source.role || 'USER'}`.toUpperCase()
  }
}

export function isKnowledgeAdmin(user) {
  return normalizeCurrentUser(user).roleCode === ADMIN_ROLE_CODE
}

export function canEditKnowledgeEntry(entry, user) {
  const normalizedEntry = normalizeKnowledgeEntry(entry)
  const currentUser = normalizeCurrentUser(user)
  if (isKnowledgeAdmin(currentUser)) {
    return true
  }
  const isOwner = `${normalizedEntry.ownerUserId ?? ''}` === `${currentUser.id ?? ''}`
  return isOwner && [KNOWLEDGE_STATUS.PENDING, KNOWLEDGE_STATUS.REJECTED].includes(normalizedEntry.status)
}

export function canDeleteKnowledgeEntry(entry, user) {
  const normalizedEntry = normalizeKnowledgeEntry(entry)
  const currentUser = normalizeCurrentUser(user)
  if (isKnowledgeAdmin(currentUser)) {
    return true
  }
  const isOwner = `${normalizedEntry.ownerUserId ?? ''}` === `${currentUser.id ?? ''}`
  return isOwner && normalizedEntry.status !== KNOWLEDGE_STATUS.PUBLISHED
}

export function getKnowledgeStatusMeta(status) {
  const normalizedStatus = `${status || KNOWLEDGE_STATUS.PUBLISHED}`.toUpperCase()
  if (normalizedStatus === KNOWLEDGE_STATUS.PENDING) {
    return { label: '待审核', tone: 'pending' }
  }
  if (normalizedStatus === KNOWLEDGE_STATUS.REJECTED) {
    return { label: '已驳回', tone: 'rejected' }
  }
  return { label: '已发布', tone: 'published' }
}
