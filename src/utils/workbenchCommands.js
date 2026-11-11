import {isSystemMenuOnlyRoute} from './systemMenuRoute.js'

const NON_TEXT_INPUT_TYPES = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'hidden', 'image'])

// 不读取全局焦点；继承的编辑状态以浏览器 isContentEditable 为准。
export function isEditableTarget(target) {
  const element = target?.nodeType === 3 ? target.parentElement : target
  if (element?.isContentEditable) return true
  const tag = element?.tagName?.toLowerCase()
  if (tag === 'textarea' || tag === 'select') return true
  return tag === 'input' && !NON_TEXT_INPUT_TYPES.has((element.type || 'text').toLowerCase())
}

export function workbenchCommands(apps, types, query = '') {
  const needle = query.trim().toLocaleLowerCase()
  const matches = label => !needle || label.toLocaleLowerCase().includes(needle)
  const appCommands = apps.filter(app => app.route && !isSystemMenuOnlyRoute(app.route))
    .map(app => ({key: `app:${app.key}`, kind: 'app', label: app.name, description: app.description, route: app.route, app}))
    .filter(item => matches(item.label))
  const createCommands = types.filter(type => !isSystemMenuOnlyRoute(type.route || ''))
    .map(type => ({key: `create:${type.typeCode}`, kind: 'create', label: `快速新增 ${type.appName} · ${type.label}`, description: type.appName, typeCode: type.typeCode}))
    .filter(item => matches(item.label))
  return needle ? [...appCommands, ...createCommands] : [...appCommands.slice(0, 6), ...createCommands.slice(0, 4)]
}

// 使用文本节点高亮，搜索内容不作为 HTML，避免引入标记或脚本。
export function highlightCommand(label, query) {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return [{text: label, hit: false}]
  const parts = []
  let start = 0
  let index = label.toLocaleLowerCase().indexOf(needle)
  while (index >= 0) {
    if (index > start) parts.push({text: label.slice(start, index), hit: false})
    parts.push({text: label.slice(index, index + needle.length), hit: true})
    start = index + needle.length
    index = label.toLocaleLowerCase().indexOf(needle, start)
  }
  if (start < label.length) parts.push({text: label.slice(start), hit: false})
  return parts
}
