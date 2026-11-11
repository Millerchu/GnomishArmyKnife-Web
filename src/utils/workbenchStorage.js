export function userStorageKey(key, userId) {
  return userId == null || userId === '' ? key : `${key}:${userId}`
}

export function readUserStorage(storage, key, userId) {
  const scopedKey = userStorageKey(key, userId)
  const scoped = storage.getItem(scopedKey)
  if (scoped !== null || scopedKey === key) return scoped
  const legacy = storage.getItem(key)
  // 仅迁移一次，保留旧键供其他账号迁移。写入受限时仍允许本次读取旧值。
  if (legacy !== null) {
    try { storage.setItem(scopedKey, legacy) } catch { /* 受限存储。 */ }
  }
  return legacy
}

export function normalizeWorkbenchOrder(order) {
  return Array.isArray(order) ? [...new Set(order.filter(key => typeof key === 'string' && key.trim()))] : []
}
