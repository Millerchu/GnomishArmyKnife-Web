export function extractAccessibleFeatureCodes(payload) {
  if (!payload) {
    return []
  }
  if (Array.isArray(payload)) {
    return Array.from(new Set(payload
      .map((item) => (typeof item === 'string' ? item : item?.featureCode || item?.code || item?.appCode))
      .filter(Boolean)))
  }

  const rawCodes = payload.featureCodes || payload.grantedFeatureCodes || payload.appCodes || payload.grantedAppCodes
  if (Array.isArray(rawCodes)) {
    return Array.from(new Set(rawCodes.filter(Boolean)))
  }

  const rawApps = payload.apps || payload.list || payload.items || []
  if (Array.isArray(rawApps)) {
    return Array.from(new Set(rawApps.map((item) => item?.featureCode || item?.code || item?.appCode).filter(Boolean)))
  }

  return []
}

function normalizePermissionSource(rawSource) {
  const source = `${rawSource || ''}`.trim().toUpperCase()
  if (source === 'ADMIN_FALLBACK') {
    return 'admin-fallback'
  }
  return 'backend'
}

export function resolvePermissionViewState(payload, error = null) {
  if (error) {
    return {
      accessibleFeatureCodes: [],
      appPermissionSource: 'unavailable'
    }
  }

  return {
    accessibleFeatureCodes: extractAccessibleFeatureCodes(payload),
    appPermissionSource: normalizePermissionSource(payload?.permissionSource)
  }
}
