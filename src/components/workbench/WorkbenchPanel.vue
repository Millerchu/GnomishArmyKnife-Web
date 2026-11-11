<template>
  <section class="workbench" :class="{'is-editing': editing}">
    <header class="wb-glass wb-heading">
      <div><h1>{{ greeting }}，{{ displayName }} <small>侏儒军刀 · 个人工作台</small></h1><p class="wb-mobile-date">{{ dateText }}</p><p v-if="todaySummary" class="wb-summary">{{ todaySummary }}</p></div>
      <div class="wb-heading-actions"><button type="button" class="wb-search-trigger" @click="openSearch">⌕ 搜索应用 <kbd>{{ shortcut }} K</kbd></button><button type="button" :aria-pressed="editing" :disabled="loading || source === 'unavailable' || saving" @click="editing ? finish() : beginEditing()">{{ waitingForSync ? '正在同步…' : saving ? '正在保存…' : editing ? '完成整理' : '☷ 整理工作台' }}</button><button class="wb-primary wb-quick-trigger" type="button" :disabled="loading || !types.length" @click="$emit('create', '')">＋ 快速新增</button></div>
    </header>
    <div v-if="syncNotice" class="wb-warning wb-sync-notice" role="status">{{ syncNotice }}</div>
    <WorkbenchConflictDialog v-if="conflict" :document="conflict" :saving="saving" :error="storageError" @dismiss="conflict = null" @cloud="useCloud" @overwrite="overwriteCloud" />
    <div v-if="source === 'admin-fallback' && !loading" class="wb-warning" role="status">管理员兜底目录 · 当前账号尚未写入正式授权，建议尽快在权限管理中补齐授权。</div>
    <div v-if="loading" class="wb-glass wb-page-state" role="status">正在读取当前账号的应用权限…</div>
    <div v-else-if="source === 'unavailable'" class="wb-glass wb-page-state" role="alert"><h2>权限不可用</h2><p>应用权限接口当前不可用，请先恢复后端权限服务。</p><button type="button" @click="$emit('retry-permissions')">重新读取权限</button></div>
    <div v-else-if="!tools.length" class="wb-glass wb-page-state"><h2>当前账号暂无可见应用</h2><p>请先在权限管理中完成授权。</p></div>
    <template v-else>
      <div v-if="editing" class="wb-organize"><div><strong>整理工作台</strong><p id="wb-edit-help">{{ mobile ? '用 ↑ ↓ 调整顺序，用开关显示或隐藏卡片。' : '拖动卡片手柄调整位置，拖动右下角缩放。聚焦卡片后用方向键移动，Shift＋方向键切换尺寸。' }} 完成整理后保存。</p><p v-if="dirty" class="wb-dirty" role="status">有未保存更改</p><p v-if="storageError" role="alert">{{ storageError }}</p></div><div class="wb-organize-actions"><button type="button" :disabled="saving" @click="resetLayout">恢复默认</button><button type="button" :disabled="saving" @click="cancel">取消</button></div></div>
      <p class="wb-sr-only" aria-live="polite" aria-atomic="true">{{ announcement }}</p>
      <WorkbenchGrid v-if="displayCards.length" :cards="displayCards" :mobile="mobile" :editing="editing && !saving" @change="changeGrid">
        <template #default="{card}">
        <section class="wb-glass wb-card" :class="{'is-hidden': card.hidden}" :data-card="card.id" :tabindex="editing ? 0 : undefined" :aria-label="`${card.title}，尺寸${sizeLabels[card.size]}`" :aria-describedby="editing ? 'wb-edit-help' : undefined" :aria-keyshortcuts="editing ? (mobile ? 'ArrowUp ArrowDown' : 'ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight') : undefined" @keydown.self="onCardKey($event, card)">
          <header class="wb-card-head">
            <span v-if="editing && !mobile" class="wb-drag-handle" aria-hidden="true">⠿</span>
            <AuthenticatedImage v-if="cardApp(card)?.iconType === 'UPLOAD' && cardApp(card)?.iconAttachmentId" :attachment-id="cardApp(card).iconAttachmentId" alt="" />
            <AppIconImage v-else-if="cardApp(card)?.iconUrl" :src="cardApp(card).iconUrl" :chroma-key="cardApp(card).iconChromaKey" alt="" /><h2>{{ card.title }}</h2>
            <button v-if="!editing && mobile && card.mobileFolded" type="button" class="wb-fold" :aria-label="`${folded[card.id] ? '展开' : '收起'}${card.title}`" :aria-expanded="!folded[card.id]" @click="folded[card.id] = !folded[card.id]">{{ folded[card.id] ? '▸' : '▾' }}</button>
          </header>
          <div v-if="editing" class="wb-edit-controls">
            <template v-if="mobile"><button type="button" :disabled="saving || card.hidden || displayCards.filter(item => !item.hidden)[0]?.id === card.id" :aria-label="`上移${card.title}`" @click="move(card.id, -1)">↑</button><button type="button" :disabled="saving || card.hidden || displayCards.filter(item => !item.hidden).at(-1)?.id === card.id" :aria-label="`下移${card.title}`" @click="move(card.id, 1)">↓</button></template>
            <template v-else><button v-for="size in ['S', 'M', 'L']" :key="size" type="button" :disabled="saving" :aria-pressed="card.size === size" :aria-label="`将${card.title}设为${sizeLabels[size]}号`" @click="resizeCard(card.id, size)">{{ size }}</button></template>
            <label><input type="checkbox" :disabled="saving" :checked="!card.hidden" :aria-label="`显示${card.title}`" @change="toggleCard(card.id)" />显示</label>
          </div>
          <p v-if="card.hidden && editing" class="wb-fine">此卡片已隐藏，阅读态不会显示。打开开关即可恢复。</p>
          <template v-else>
            <p v-if="mobile && folded[card.id] && !editing" class="wb-fold-summary">{{ foldedSummary(card.id) }}</p>
            <WorkbenchCardContent v-show="!mobile || !folded[card.id] || editing" :inert="editing">
              <component :is="components[card.id]" :refresh-key="refreshKey" @create="$emit('create', $event)" @state="states[card.id] = $event" />
            </WorkbenchCardContent>
          </template>
        </section>
        </template>
      </WorkbenchGrid>
      <p v-else-if="authorizedCards.length" class="wb-glass wb-page-state">卡片已全部隐藏，可在「整理工作台」中恢复显示。</p>
      <AppDock :tools="tools" :source="source" :is-mobile-viewport="mobile" @order="$emit('order', $event)" @notice="(...args) => $emit('notice', ...args)" />
    </template>
  </section>
</template>
<script setup>
import {computed, nextTick, reactive, ref, watch} from 'vue'
import {onBeforeRouteLeave} from 'vue-router'
import {confirmDialog} from '@/components/systemDialog'
import AppIconImage from '@/components/AppIconImage.vue'
import AuthenticatedImage from '@/components/AuthenticatedImage.vue'
import AppDock from './AppDock.vue'
import WorkbenchConflictDialog from './WorkbenchConflictDialog.vue'
import WorkbenchGrid from './WorkbenchGrid.vue'
import WorkbenchCardContent from './WorkbenchCardContent.vue'
import TodoCard from './TodoCard.vue'
import WorkLogCard from './WorkLogCard.vue'
import BillsCard from './BillsCard.vue'
import HealthCard from './HealthCard.vue'
import FuelCard from './FuelCard.vue'
import KnowledgeCard from './KnowledgeCard.vue'
import {WORKBENCH_CARDS} from '@/utils/workbenchLayout'
import {GRID_SIZES, gridAnnouncement, packGridCards, settleGridCards, sortGridCard, updateGridCard, visualGridOrder} from '@/utils/workbenchGrid'
import {useWorkbenchLayout} from '@/composables/useWorkbenchLayout'
import {consumption, money, percent} from '@/utils/workbenchData'
const props = defineProps({loading: Boolean, source: String, featureCodes: {type: Array, default: () => []}, tools: {type: Array, default: () => []}, types: {type: Array, default: () => []}, displayName: String, dateText: String, now: Date, mobile: Boolean, refreshKey: Number})
defineEmits(['create', 'retry-permissions', 'order', 'notice'])
const components = {todo: TodoCard, workLog: WorkLogCard, bills: BillsCard, health: HealthCard, fuel: FuelCard, knowledge: KnowledgeCard}
const {layout, hasCachedLayout, draft, current, editing, dirty, busy: saving, waitingForSync, error: storageError, notice: syncNotice, conflict, useCloud, overwriteCloud, begin, cancel, reset, finish} = useWorkbenchLayout()
onBeforeRouteLeave(() => !dirty.value || confirmDialog('放弃未保存的整理？', {confirmText: '放弃整理', cancelText: '继续整理'}))
const announcement = ref('')
const sizeLabels = {S: '小', M: '中', L: '大'}
const folded = reactive(Object.fromEntries(WORKBENCH_CARDS.map(card => [card.key, Boolean(card.mobileFolded)])))
const states = reactive({})
const shortcut = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'
const greeting = computed(() => { const hour = (props.now || new Date()).getHours(); return hour < 6 ? '夜深了' : hour < 12 ? '上午好' : hour < 18 ? '下午好' : '晚上好' })
const authorizedCards = computed(() => current.value.cards.map(item => ({...item, ...WORKBENCH_CARDS.find(card => card.key === item.id)})).filter(card => props.featureCodes.includes(card.featureCode)))
const displayCards = computed(() => {
  const cards = authorizedCards.value.filter(card => editing.value || !card.hidden)
  return props.mobile ? visualGridOrder(cards) : cards
})
// 默认/迁移布局及权限变化时紧凑排列；已保存坐标在刷新和断点切换时保留。
watch(() => [props.featureCodes.join(','), props.loading], (next, previous) => {
  const permissionChanged = previous?.[0] && next[0] !== previous[0]
  if (!editing.value && !props.loading && (!hasCachedLayout.value || permissionChanged)) compactAuthorized(layout.value)
}, {immediate: true})
function compactAuthorized(target) {
  const allowed = target.cards.filter(item => !item.hidden && props.featureCodes.includes(WORKBENCH_CARDS.find(card => card.key === item.id)?.featureCode))
  if (allowed.length === WORKBENCH_CARDS.length) return
  const packed = packGridCards(allowed)
  const settled = settleGridCards([...packed, ...target.cards.filter(card => !packed.some(item => item.id === card.id))])
  target.cards = target.cards.map(card => settled.find(item => item.id === card.id))
}
const todaySummary = computed(() => {
  if (props.loading || props.source === 'unavailable') return ''
  const visible = displayCards.value.map(card => card.id)
  if (!visible.includes('todo') || !visible.includes('workLog') || states.todo?.status !== 'ready' || states.workLog?.status !== 'ready') return ''
  const count = states.todo.data.summary?.today
  if (count == null) return ''
  return `今日${Number(count) ? `还有 ${count} 条待办` : '没有待办'}，工作日志${states.workLog.data.todayWritten ? '已写' : '未写'}。`
})
watch(() => props.loading, () => { Object.keys(states).forEach(key => delete states[key]) })
function beginEditing() { begin(); announcement.value = '' }
async function announce(id) {
  announcement.value = ''
  await nextTick()
  const card = draft.value?.cards.find(card => card.id === id)
  if (card) {
    const position = props.mobile ? {...card, x: 0, y: displayCards.value.findIndex(item => item.id === id)} : card
    announcement.value = gridAnnouncement(position, WORKBENCH_CARDS.find(card => card.key === id).title)
  }
}
function changeGrid(cards, id) {
  if (!editing.value || saving.value) return
  const changed = cards.map(({id, hidden, size, x, y, w, h}) => ({id, hidden, size, x, y, w, h}))
  const others = draft.value.cards.filter(card => !changed.some(item => item.id === card.id))
  const settled = settleGridCards([...changed, ...others], id)
  draft.value.cards = draft.value.cards.map(card => settled.find(item => item.id === card.id))
  announce(id)
}
function move(id, direction) {
  if (!editing.value || saving.value) return
  draft.value.cards = sortGridCard(draft.value.cards, id, direction, authorizedCards.value.map(card => card.id))
  announce(id)
}
function resizeCard(id, size) {
  if (!editing.value || props.mobile || saving.value) return
  const cards = updateGridCard(authorizedCards.value, id, {size})
  changeGrid(cards, id)
}
function toggleCard(id) {
  if (!editing.value || saving.value) return
  const card = draft.value.cards.find(card => card.id === id)
  card.hidden = !card.hidden
  announcement.value = `${WORKBENCH_CARDS.find(card => card.key === id).title}已${card.hidden ? '隐藏' : '显示'}`
  delete states[id]
}
function resetLayout() { reset(); compactAuthorized(draft.value); announcement.value = '已恢复默认布局，完成整理后保存' }
function onCardKey(event, card) {
  if (!editing.value || saving.value || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return
  if (props.mobile) {
    if (event.shiftKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()
    move(card.id, event.key === 'ArrowUp' ? -1 : 1)
  } else {
    event.preventDefault()
    const direction = ['ArrowUp', 'ArrowLeft'].includes(event.key) ? -1 : 1
    if (event.shiftKey) {
      const sizes = Object.keys(GRID_SIZES)
      resizeCard(card.id, sizes[Math.max(0, Math.min(2, sizes.indexOf(card.size) + direction))])
    } else {
      const change = ['ArrowLeft', 'ArrowRight'].includes(event.key) ? {x: card.x + direction} : {y: card.y + direction}
      changeGrid(updateGridCard(authorizedCards.value, card.id, change), card.id)
    }
  }
}
function openSearch() { window.dispatchEvent(new Event('gak:open-command')) }
function cardApp(card) { return props.tools.find(tool => tool.featureCode === card.featureCode) }
function foldedSummary(key) {
  const state = states[key]
  if (!state || state.status === 'loading') return '正在加载…'
  if (state.status === 'error') return '加载失败，展开后可重试'
  const data = state.data
  if (key === 'fuel') return data.hasRecords ? `本月实付 ${money(data.currentMonthAmount)} · 平均油耗 ${consumption(data.averageConsumption)}` : '暂无加油记录，展开可新增'
  if (key === 'knowledge') return data.list.length ? `最近已发布 ${data.list.length} 条 · ${data.list[0].title}` : '暂无已发布经验，展开可新增'
  return key === 'bills' ? `支出 ${money(data.currentMonthExpense)} · 收入 ${money(data.currentMonthIncome)} · 预算 ${Number(data.annualBudgetAmount) > 0 ? percent(data.annualBudgetUsageRate) : '未设置'}`
    : `最近测量 ${data.latestMeasureDate || '暂无'} · 就诊 ${data.lastVisitDate || '暂无'} · 报告 ${data.lastExamDate || '暂无'}`
}
</script>
<style src="./workbench.css"></style>
