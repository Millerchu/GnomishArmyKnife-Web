import {normalizeWorkbenchLayout, WORKBENCH_CARDS, WORKBENCH_LAYOUT_KEY} from './workbenchLayout.js'
import {readUserStorage} from './workbenchStorage.js'

export const WORKBENCH_GRID_KEY = 'gak_workbench_grid_v2'
export const WORKBENCH_SCHEMA_VERSION = 1
export const DOCK_COLLAPSED_KEY = 'gak_workbench_dock_collapsed_v1'
export const DOCK_ORDER_KEY = 'home_tool_custom_order'
export const GRID_SIZES = Object.freeze({S: {w: 4, h: 2}, M: {w: 6, h: 3}, L: {w: 8, h: 4}})
const defaultSizes = {todo: 'L', workLog: 'S', bills: 'S', health: 'S', fuel: 'S', knowledge: 'S'}
const defaultPositions = {todo: [0, 0], workLog: [0, 4], bills: [8, 0], health: [8, 2], fuel: [4, 4], knowledge: [8, 4]}
const keys = WORKBENCH_CARDS.map(card => card.key)
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const integer = value => Number.isInteger(value) && value >= -2147483648 && value <= 2147483647
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
export const cloneLayout = value => JSON.parse(JSON.stringify(value))

export function snapGridSize(w, h) {
  return Object.keys(GRID_SIZES).reduce((best, size) => {
    const distance = name => (w - GRID_SIZES[name].w) ** 2 + (h - GRID_SIZES[name].h) ** 2
    return distance(size) < distance(best) ? size : best
  }, 'S')
}
export function cardsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}
function firstSpace(card, placed) {
  for (let y = 0; y <= 48 - card.h; y++) {
    for (let x = 0; x <= 12 - card.w; x++) {
      const candidate = {...card, x, y}
      if (!placed.some(other => cardsOverlap(candidate, other))) return candidate
    }
  }
  // 六张最大档卡也只占 24 行，正常输入始终能在 48 行内找到位置。
  throw new Error('工作台布局没有可用位置')
}
export function packGridCards(cards) {
  const ordered = [...cards.filter(card => !card.hidden), ...cards.filter(card => card.hidden)]
  const placed = ordered.reduce((placed, card) => [...placed, firstSpace({...card}, placed)], [])
  return cards.map(card => placed.find(item => item.id === card.id))
}
// 桌面操作卡优先占目标格；每次操作都会紧凑其余卡片（重力回填），隐藏卡最后安置。
// 移动端换位使用 preserveOthers，只对目标卡避让，保持其余卡的桌面坐标。
export function settleGridCards(cards, priorityId, {preserveOthers = false} = {}) {
  if (preserveOthers) {
    return cards.map(card => {
      if (card.id !== priorityId) return {...card}
      const candidate = {...card, ...GRID_SIZES[card.size]}
      candidate.x = clamp(candidate.x, 0, 12 - candidate.w)
      candidate.y = clamp(candidate.y, 0, 48 - candidate.h)
      const obstacles = cards.filter(other => other.id !== priorityId && !other.hidden)
      return obstacles.some(other => cardsOverlap(candidate, other)) ? firstSpace(candidate, obstacles) : candidate
    })
  }
  const sorted = priorityId
    ? [...cards].sort((a, b) => Number(b.id === priorityId) - Number(a.id === priorityId) || a.y - b.y || a.x - b.x)
    : cards
  const ordered = [...sorted.filter(card => !card.hidden), ...sorted.filter(card => card.hidden)]
  const placed = []
  for (const card of ordered) {
    const candidate = {...card, ...GRID_SIZES[card.size]}
    candidate.x = clamp(Math.round(candidate.x), 0, 12 - candidate.w)
    candidate.y = clamp(Math.round(candidate.y), 0, 48 - candidate.h)
    const repack = priorityId && card.id !== priorityId
    placed.push(repack || placed.some(other => cardsOverlap(candidate, other)) ? firstSpace(candidate, placed) : candidate)
  }
  return cards.map(card => placed.find(item => item.id === card.id))
}

export const visualGridOrder = cards => [...cards].sort((a, b) => Number(a.hidden) - Number(b.hidden) || a.y - b.y || a.x - b.x)
// 阅读投影：隐藏卡不占格（调用方先过滤未授权卡），可见卡按原行列顺序向左上紧凑。
// 再补右侧 1–2 列窄缝；原始坐标与档位独立保留，绝不写回缓存或 PUT。
export function readingGridCards(cards) {
  const placed = packGridCards(visualGridOrder(cards.filter(card => !card.hidden)))
  return cards.filter(card => !card.hidden).map(original => {
    const card = placed.find(item => item.id === original.id)
    const gap = 12 - card.x - card.w
    if (gap < 1 || gap > 2) return {...card}
    const expanded = {...card, w: card.w + gap}
    return placed.some(other => other.id !== card.id && cardsOverlap(expanded, other)) ? {...card} : expanded
  })
}
export function defaultGridCards(legacy) {
  const {order, hidden} = normalizeWorkbenchLayout(legacy)
  const cards = order.map(id => {
    const [x, y] = defaultPositions[id]
    return {id, hidden: hidden.includes(id), size: defaultSizes[id], x, y, ...GRID_SIZES[defaultSizes[id]]}
  })
  // 默认六卡铺满 12×6；旧版定制顺序仍按原规则紧凑迁移，不改卡片数组顺序。
  return !hidden.length && order.every((id, index) => id === keys[index]) ? cards : packGridCards(cards)
}

export function normalizeDockOrder(order) {
  if (!Array.isArray(order)) return []
  const result = []
  for (const item of order) {
    if (typeof item !== 'string') continue
    const key = item.trim()
    // JSONB 不支持 NUL 与孤立代理字符；合法代理对（emoji）可以保留。
    if (!key || key.length > 64 || /\u0000|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(key) || result.includes(key)) continue
    result.push(key)
    if (result.length === 100) break
  }
  return result
}
function validCard(card) {
  if (!object(card) || !keys.includes(card.id) || typeof card.hidden !== 'boolean' || typeof card.size !== 'string' || !Object.hasOwn(GRID_SIZES, card.size)) return false
  const {w, h} = GRID_SIZES[card.size]
  return [card.x, card.y, card.w, card.h].every(integer) && card.x >= 0 && card.x + w <= 12 && card.y >= 0 && card.y + h <= 48
}
// 与服务端宽松读取一致地丢弃未知/非法项；缺少的已知卡片补默认且可见，返回独立本地副本。
export function applyWorkbenchPayload(payload, schemaVersion = 1) {
  const raw = schemaVersion === 1 && object(payload) ? payload : {}
  const cards = []
  if (Array.isArray(raw.cards)) {
    for (const card of raw.cards) {
      if (!validCard(card) || cards.some(item => item.id === card.id)) continue
      cards.push({id: card.id, hidden: card.hidden, size: card.size, x: card.x, y: card.y, ...GRID_SIZES[card.size]})
    }
  }
  for (const card of defaultGridCards()) if (!cards.some(item => item.id === card.id)) cards.push(card)
  const dock = object(raw.dock) ? raw.dock : {}
  const normalized = {cards: settleGridCards(cards), dock: {collapsed: dock.collapsed === true, order: normalizeDockOrder(dock.order)}}
  while (new TextEncoder().encode(JSON.stringify(normalized)).length > 16384 && normalized.dock.order.length) normalized.dock.order.pop()
  return {schemaVersion: WORKBENCH_SCHEMA_VERSION, ...normalized}
}
// 本地三项 -> 冻结契约 payload；不读写存储，也不把 schemaVersion/version 塞入 payload。
export function composeWorkbenchPayload(layout, collapsed, order) {
  const cards = Array.isArray(layout?.cards) ? layout.cards : defaultGridCards(layout)
  const normalized = applyWorkbenchPayload({cards, dock: {collapsed, order}})
  return {cards: normalized.cards, dock: normalized.dock}
}
function parse(raw) { try { return JSON.parse(raw) } catch { return null } }
export function readWorkbenchGrid(storage, userId) {
  let cached
  try { cached = parse(readUserStorage(storage, WORKBENCH_GRID_KEY, userId)) } catch { /* 受限存储使用默认。 */ }
  const read = key => { try { return readUserStorage(storage, key, userId) } catch { return null } }
  const collapsed = read(DOCK_COLLAPSED_KEY)
  const order = read(DOCK_ORDER_KEY)
  const layout = object(cached) && cached.schemaVersion === 1 ? applyWorkbenchPayload(cached) : {cards: defaultGridCards(parse(read(WORKBENCH_LAYOUT_KEY)))}
  return {schemaVersion: 1, ...composeWorkbenchPayload(layout, collapsed === null ? layout.dock?.collapsed : collapsed === 'true', order === null ? layout.dock?.order : parse(order))}
}

export function updateGridCard(cards, id, change) {
  return settleGridCards(cards.map(card => card.id === id ? {...card, ...change} : {...card}), id)
}
export function sortGridCard(cards, id, offset, allowedIds = keys) {
  const next = cloneLayout(cards)
  const allowed = visualGridOrder(next.filter(card => allowedIds.includes(card.id)))
  const index = allowed.findIndex(card => card.id === id)
  const card = allowed[index]
  const target = allowed[index + offset]
  // 隐藏卡排在末尾供恢复显示，不与可见卡换位，也不占可见网格。
  if (index < 0 || !target || card.hidden || target.hidden) return next
  const {x, y} = card
  card.x = target.x; card.y = target.y
  target.x = x; target.y = y
  // 小卡始终能放进大卡的原位置；只对换到小槽位的大卡做一次边界/碰撞安置。
  const settleId = card.w > target.w ? card.id : target.id
  return card.size === target.size ? next : settleGridCards(next, settleId, {preserveOthers: true})
}
export function gridAnnouncement(card, title) {
  return `${title}已移到第 ${card.y + 1} 行第 ${card.x + 1} 列，尺寸${{S: '小', M: '中', L: '大'}[card.size]}`
}
