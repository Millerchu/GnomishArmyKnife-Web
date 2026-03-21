export const APP_PRESET_ICONS = [
  {
    key: 'grid',
    name: '应用宫格',
    svg: '<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.8"/><rect x="14" y="4" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.8"/><rect x="4" y="14" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.8"/><rect x="14" y="14" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.8"/></svg>'
  },
  {
    key: 'shield',
    name: '安全护盾',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3 5 6v5c0 4.8 2.9 8.7 7 10 4.1-1.3 7-5.2 7-10V6l-7-3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m9.2 12 1.8 1.8 3.8-4.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  },
  {
    key: 'chart',
    name: '图表分析',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 19h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M8 16V9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 16V5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M16 16v-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
  },
  {
    key: 'wallet',
    name: '账单钱包',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 16.5v-9Z" stroke="currentColor" stroke-width="1.8"/><path d="M15 12h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="15.5" cy="12" r="1" fill="currentColor"/></svg>'
  },
  {
    key: 'book',
    name: '知识书本',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M6 5.5A2.5 2.5 0 0 1 8.5 3H18v17H8.5A2.5 2.5 0 0 0 6 22V5.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M6 6h12" stroke="currentColor" stroke-width="1.8"/><path d="M9.5 8.5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
  },
  {
    key: 'folder',
    name: '软件仓库',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H10l1.8 2H17.5A2.5 2.5 0 0 1 20 10.5v6A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>'
  },
  {
    key: 'spark',
    name: '星光工具',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M18.5 4.5 19 6l1.5.5-1.5.5-.5 1.5-.5-1.5L16.5 6l1.5-.5.5-1.5Z" fill="currentColor"/></svg>'
  },
  {
    key: 'heart',
    name: '健康关怀',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 20s-6.5-3.9-8.5-8.2C2 8.8 3.8 5 7.6 5c2 0 3.3 1.1 4.4 2.5C13.1 6.1 14.4 5 16.4 5 20.2 5 22 8.8 20.5 11.8 18.5 16.1 12 20 12 20Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>'
  }
]

export function getPresetIconSvg(iconPreset) {
  return APP_PRESET_ICONS.find((item) => item.key === iconPreset)?.svg || ''
}
