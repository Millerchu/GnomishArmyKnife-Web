import {readUserStorage} from './workbenchStorage.js'

export const WORKBENCH_LAYOUT_KEY = 'gak_workbench_layout_v1'
export const WORKBENCH_CARDS = [
  {key: 'todo', title: '今日待办', featureCode: 'APP_TODO_LIST'},
  {key: 'workLog', title: '工作日志', featureCode: 'APP_WORK_LOG'},
  {key: 'bills', title: '本月账单', featureCode: 'APP_PERSONAL_BILLS'},
  {key: 'health', title: '健康', featureCode: 'APP_HEALTH_RECORD'}
]

// 忽略旧版本未知键，新增卡片补在末尾，重复键只保留第一次。
export function normalizeWorkbenchLayout(raw) {
  const keys = WORKBENCH_CARDS.map(card => card.key)
  const order = Array.isArray(raw?.order) ? raw.order : []
  return {
    version: 1,
    order: [...new Set([...order.filter(key => keys.includes(key)), ...keys])],
    hidden: Array.isArray(raw?.hidden) ? [...new Set(raw.hidden.filter(key => keys.includes(key)))] : []
  }
}

export function readWorkbenchLayout(storage, userId) {
  try { return normalizeWorkbenchLayout(JSON.parse(readUserStorage(storage, WORKBENCH_LAYOUT_KEY, userId))) }
  catch { return normalizeWorkbenchLayout() }
}

export function moveWorkbenchCard(layout, key, offset, allowedKeys = layout.order) {
  const next = normalizeWorkbenchLayout(layout)
  const visible = next.order.filter(item => allowedKeys.includes(item))
  const index = visible.indexOf(key)
  const target = visible[index + offset]
  if (index < 0 || !target) return next
  const from = next.order.indexOf(key)
  const to = next.order.indexOf(target)
  ;[next.order[from], next.order[to]] = [next.order[to], next.order[from]]
  return next
}
