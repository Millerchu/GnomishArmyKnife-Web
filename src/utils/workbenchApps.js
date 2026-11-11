export {isSystemMenuOnlyRoute} from './systemMenuRoute.js'
import {normalizeSystemApp} from './appCatalogDraft.js'

const APP_COLOR_PALETTE = [
  ['#0f766e', '#2563eb'],
  ['#7c3aed', '#ec4899'],
  ['#b45309', '#f97316'],
  ['#047857', '#22c55e'],
  ['#1d4ed8', '#38bdf8'],
  ['#be123c', '#f43f5e'],
  ['#4338ca', '#8b5cf6'],
  ['#0f766e', '#14b8a6'],
  ['#9a3412', '#fb7185'],
  ['#1f2937', '#4b5563'],
  ['#854d0e', '#eab308']
]
export const TOOL_CUSTOM_ORDER_STORAGE_KEY = 'home_tool_custom_order'

export function unwrapData(res) {
  const payload = res?.data
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  return payload
}

function hashText(text) {
  return Array.from(text).reduce((total, char) => total + char.charCodeAt(0), 0)
}

function hexToRgba(hex, alpha) {
  const value = hex.replace('#', '')
  const normalized = value.length === 3
    ? value.split('').map((item) => item + item).join('')
    : value
  const red = parseInt(normalized.slice(0, 2), 16)
  const green = parseInt(normalized.slice(2, 4), 16)
  const blue = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function buildToolIconText(name) {
  const normalized = name.replace(/\s+/g, '')
  const chars = Array.from(normalized)
  return chars.slice(0, 2).join('')
}

export function buildToolEntry(item, index) {
  const palette = APP_COLOR_PALETTE[hashText(item.name) % APP_COLOR_PALETTE.length]
  return {
    ...item,
    order: index + 1,
    iconText: buildToolIconText(item.name),
    iconStyle: {
      background: `linear-gradient(135deg, ${palette[0]}, ${palette[1]})`,
      boxShadow: `0 12px 24px ${hexToRgba(palette[0], 0.35)}`
    }
  }
}

export function usesImageIcon(iconType) {
  return ['UPLOAD', 'URL'].includes(iconType)
}

export function extractAccessibleApps(payload) {
  if (!payload) {
    return []
  }
  if (Array.isArray(payload)) {
    return payload
      .filter((item) => item && typeof item === 'object')
      .map((item, index) => normalizeSystemApp(item, index))
      .filter((item) => item.featureCode)
  }

  const rawApps = payload.apps || payload.list || payload.items || []
  if (Array.isArray(rawApps)) {
    return rawApps
      .map((item, index) => normalizeSystemApp(item, index))
      .filter((item) => item.featureCode)
  }
  return []
}

