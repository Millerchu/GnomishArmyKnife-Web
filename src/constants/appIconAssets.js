const APP_ICON_CHROMA_KEY = '#ff00ff'
const APP_ICON_PUBLIC_BASE_PATH = '/app-icons'

const APP_ICON_ASSET_MAP = {
  APP_CALCULATOR: 'app-calculator.png',
  APP_WORK_LOG: 'app-work-log.png',
  APP_PASSWORD_MEMO: 'app-password-memo.png',
  APP_TODO_LIST: 'app-todo-list.png',
  APP_FUEL_STATS: 'app-fuel-stats.png',
  APP_WOW_CHARACTER: 'app-wow-character.png',
  APP_PERSONAL_BILLS: 'app-personal-bills.png',
  APP_KNOWLEDGE_BASE: 'app-knowledge-base.png',
  APP_SOFTWARE_REPO: 'app-software-repo.png',
  APP_HEALTH_RECORD: 'app-health-record.png',
  APP_INSTRUMENT_PRACTICE: 'app-instrument-practice.webp',
  APP_DATA_DICTIONARY: 'app-data-dictionary.png'
}

const LEGACY_TEXT_ICON_MAP = {
  APP_CALCULATOR: '计算',
  APP_WORK_LOG: '日志',
  APP_PASSWORD_MEMO: '密码',
  APP_TODO_LIST: '待办',
  APP_FUEL_STATS: '油耗',
  APP_WOW_CHARACTER: '魔兽',
  APP_PERSONAL_BILLS: '账单',
  APP_KNOWLEDGE_BASE: '经验',
  APP_SOFTWARE_REPO: '软件',
  APP_HEALTH_RECORD: '健康',
  APP_DATA_DICTIONARY: '字典'
}

const GENERIC_APP_ICON_FILE_NAME = 'app-generic.png'

function buildPublicAssetIcon(fileName) {
  const iconChromaKey = /\.webp$/i.test(fileName) ? '' : APP_ICON_CHROMA_KEY
  return {
    iconType: 'URL',
    iconUrl: `${APP_ICON_PUBLIC_BASE_PATH}/${fileName}`,
    iconStorageType: 'PUBLIC_ASSET',
    iconFileName: fileName,
    iconChromaKey
  }
}

export function resolveFeatureAppIcon(featureCode = '') {
  const fileName = APP_ICON_ASSET_MAP[`${featureCode || ''}`.trim().toUpperCase()]
  return fileName ? buildPublicAssetIcon(fileName) : null
}

export function resolveGenericAppIcon() {
  return buildPublicAssetIcon(GENERIC_APP_ICON_FILE_NAME)
}

export function isLegacyTextIconSeed(featureCode = '', iconText = '') {
  const normalizedFeatureCode = `${featureCode || ''}`.trim().toUpperCase()
  const normalizedIconText = `${iconText || ''}`.trim()
  return Boolean(normalizedFeatureCode)
    && Boolean(normalizedIconText)
    && LEGACY_TEXT_ICON_MAP[normalizedFeatureCode] === normalizedIconText
}

export function inferIconChromaKey(iconUrl = '') {
  const normalizedIconUrl = `${iconUrl || ''}`
  return normalizedIconUrl.startsWith(APP_ICON_PUBLIC_BASE_PATH) && !/\.webp(?:[?#]|$)/i.test(normalizedIconUrl)
    ? APP_ICON_CHROMA_KEY
    : ''
}
