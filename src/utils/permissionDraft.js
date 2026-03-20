const PERMISSION_DRAFT_STORAGE_KEY = 'permission_management_user_app_draft'

function normalizeFeatureCodes(list) {
  if (!Array.isArray(list)) {
    return []
  }
  return Array.from(new Set(list.filter(Boolean).map((item) => `${item}`)))
}

export function readPermissionDraftMap() {
  try {
    const raw = localStorage.getItem(PERMISSION_DRAFT_STORAGE_KEY)
    const parsed = JSON.parse(raw || '{}')
    if (!parsed || typeof parsed !== 'object') {
      return {}
    }
    return Object.entries(parsed).reduce((result, [userId, appCodes]) => {
      result[userId] = normalizeFeatureCodes(appCodes)
      return result
    }, {})
  } catch (error) {
    return {}
  }
}

export function persistPermissionDraftMap(map) {
  localStorage.setItem(PERMISSION_DRAFT_STORAGE_KEY, JSON.stringify(map))
}

export function getDraftFeatureCodesForUser(userId) {
  if (userId === null || userId === undefined || userId === '') {
    return []
  }
  const map = readPermissionDraftMap()
  return normalizeFeatureCodes(map[`${userId}`] || [])
}

export function saveDraftFeatureCodesForUser(userId, featureCodes) {
  if (userId === null || userId === undefined || userId === '') {
    return
  }
  const map = readPermissionDraftMap()
  map[`${userId}`] = normalizeFeatureCodes(featureCodes)
  persistPermissionDraftMap(map)
}
