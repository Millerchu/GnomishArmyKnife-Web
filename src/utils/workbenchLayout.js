import {readUserStorage} from './workbenchStorage.js'

export const WORKBENCH_LAYOUT_KEY = 'gak_workbench_layout_v1'
export const WORKBENCH_CARDS = [
  {key: 'todo', title: '今日待办', featureCode: 'APP_TODO_LIST', createType: 'TODO_ITEM', createLabel: '新增待办'},
  {key: 'workLog', title: '工作日志', featureCode: 'APP_WORK_LOG', createType: 'WORK_LOG', createLabel: '写今日日志'},
  {key: 'bills', title: '本月账单', featureCode: 'APP_PERSONAL_BILLS', createType: 'PERSONAL_BILL', createLabel: '记一笔', mobileFolded: true},
  {key: 'health', title: '健康', featureCode: 'APP_HEALTH_RECORD', createType: 'HEALTH_RECORD', createLabel: '记一条', mobileFolded: true},
  {key: 'fuel', title: '油耗统计', featureCode: 'APP_FUEL_STATS', createType: 'FUEL_RECORD', createLabel: '新增加油记录', mobileFolded: true},
  {key: 'knowledge', title: '经验库', featureCode: 'APP_KNOWLEDGE_BASE', createType: 'KNOWLEDGE_ENTRY', createLabel: '新增经验', mobileFolded: true},
  {key: 'aiSubscriptions', title: '智订 · AI Subs', featureCode: 'APP_AI_SUBSCRIPTION', createType: 'AI_SUBSCRIPTION', createLabel: '新增订阅', mobileFolded: true}
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
