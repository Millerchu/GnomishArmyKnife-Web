import {USER_APP_DEFINITIONS} from '@/constants/appCatalog'
import {inferIconChromaKey, isLegacyTextIconSeed, resolveFeatureAppIcon} from '@/constants/appIconAssets'

const APP_CATALOG_DRAFT_STORAGE_KEY = 'system_app_catalog_draft'

export function buildAppIconText(name = '') {
  return Array.from((name || '').replace(/\s+/g, '')).slice(0, 2).join('') || '应用'
}

export function normalizeSystemApp(source = {}, index = 0) {
  const featureCode = `${source.featureCode || source.appCode || source.code || ''}`.trim().toUpperCase()
  const name = `${source.name || source.appName || source.displayName || ''}`.trim() || '未命名应用'
  const route = source.route || source.routePath || source.path || ''
  const category = source.category || source.groupName || '未分类'
  const sourceIconType = `${source.iconType || ''}`.trim().toUpperCase()
  const defaultIconAsset = resolveFeatureAppIcon(featureCode)
  const sourceIconText = `${source.iconText || ''}`.trim()
  const defaultIconText = buildAppIconText(name)
  const hasConfiguredImage = Boolean(source.iconUrl || source.iconFileName || source.uploadedIconUrl)
  const hasConfiguredPreset = Boolean(source.iconPreset || source.iconKey)
  const isLegacyTextSeed = isLegacyTextIconSeed(featureCode, sourceIconText)
  const hasConfiguredCustomText = sourceIconType === 'TEXT' && sourceIconText && sourceIconText !== defaultIconText
  const shouldUseDefaultIconAsset = Boolean(defaultIconAsset)
    && !hasConfiguredImage
    && !hasConfiguredPreset
    && (!hasConfiguredCustomText || isLegacyTextSeed)
  const resolvedIconType = shouldUseDefaultIconAsset
    ? defaultIconAsset.iconType
    : sourceIconType
      || (source.iconPreset ? 'PRESET' : '')
      || (source.iconStorageType || source.uploadedIconUrl ? 'UPLOAD' : '')
      || (source.iconUrl ? 'URL' : 'TEXT')
  const enabled = typeof source.enabled === 'boolean'
    ? source.enabled
    : `${source.status || ''}`.toUpperCase() !== 'DISABLED'
  const sortNo = Number(source.sortNo ?? source.sort ?? (index + 1) * 10)
  const resolvedIconUrl = `${source.iconUrl || ''}`.trim() || defaultIconAsset?.iconUrl || ''
  const resolvedIconStorageType = `${source.iconStorageType || ''}`.trim() || defaultIconAsset?.iconStorageType || ''
  const resolvedIconFileName = `${source.iconFileName || source.fileName || ''}`.trim() || defaultIconAsset?.iconFileName || ''

  return {
    id: source.id ?? source.appId ?? `draft-${featureCode || index + 1}`,
    key: source.key || source.appKey || featureCode.toLowerCase().replace(/^app_/, '').replace(/_/g, '-') || `app-${index + 1}`,
    name,
    appCode: featureCode,
    featureCode,
    route,
    category,
    dataSourceMode: `${source.dataSourceMode || source.dataSourceType || source.sourceMode || 'REAL'}`.trim().toUpperCase(),
    securityLevel: source.securityLevel || source.appSecurityLevel || 'INTERNAL',
    encryptionMode: source.encryptionMode || source.encryptMode || 'NONE',
    iconType: resolvedIconType,
    iconPreset: source.iconPreset || source.iconKey || '',
    iconText: sourceIconText || defaultIconText,
    iconUrl: resolvedIconUrl,
    iconStorageType: resolvedIconStorageType,
    iconFileName: resolvedIconFileName,
    iconChromaKey: `${source.iconChromaKey || ''}`.trim() || inferIconChromaKey(resolvedIconUrl),
    enabled,
    sortNo: Number.isNaN(sortNo) ? (index + 1) * 10 : sortNo,
    description: source.description || source.remark || '',
    remark: source.remark || '',
    grantCount: Number(source.grantCount ?? source.permissionCount ?? 0),
    attachments: Array.isArray(source.attachments) ? source.attachments : [],
    iconAttachmentId: source.iconAttachmentId ?? source.attachments?.[0]?.id ?? null
  }
}

function sortAppCatalog(list) {
  return [...list].sort((prev, next) => {
    return Number(prev.sortNo || 0) - Number(next.sortNo || 0)
      || `${prev.name || ''}`.localeCompare(`${next.name || ''}`, 'zh-Hans-CN')
  })
}

export function buildDefaultAppCatalog() {
  return sortAppCatalog(USER_APP_DEFINITIONS.map((item, index) => normalizeSystemApp({
    ...item,
    id: index + 1,
    appCode: item.featureCode,
    enabled: true,
    sortNo: (index + 1) * 10
  }, index)))
}

export function readAppCatalogDraftList() {
  try {
    const raw = localStorage.getItem(APP_CATALOG_DRAFT_STORAGE_KEY)
    const parsed = JSON.parse(raw || '[]')
    if (!Array.isArray(parsed)) {
      return []
    }
    return sortAppCatalog(parsed.map((item, index) => normalizeSystemApp(item, index)).filter((item) => item.featureCode))
  } catch (error) {
    return []
  }
}

export function resolveAppCatalogList() {
  const draftList = readAppCatalogDraftList()
  return draftList.length ? draftList : buildDefaultAppCatalog()
}

export function persistAppCatalogDraftList(list) {
  const normalized = Array.isArray(list)
    ? list.map((item, index) => normalizeSystemApp(item, index)).filter((item) => item.featureCode)
    : []
  localStorage.setItem(APP_CATALOG_DRAFT_STORAGE_KEY, JSON.stringify(sortAppCatalog(normalized)))
}

export function mergeAppCatalogList(baseList, incomingList) {
  const catalogMap = new Map()
  baseList.forEach((item, index) => {
    const normalized = normalizeSystemApp(item, index)
    if (normalized.featureCode) {
      catalogMap.set(normalized.featureCode, normalized)
    }
  })
  incomingList.forEach((item, index) => {
    const normalized = normalizeSystemApp(item, index)
    if (!normalized.featureCode) {
      return
    }
    const current = catalogMap.get(normalized.featureCode) || {}
    catalogMap.set(normalized.featureCode, {
      ...current,
      ...normalized
    })
  })
  return sortAppCatalog(Array.from(catalogMap.values()))
}
