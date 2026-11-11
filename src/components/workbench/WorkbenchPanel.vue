<template>
  <section class="workbench" :class="{'is-editing': editing}">
    <header class="wb-glass wb-heading">
      <div><h1>{{ greeting }}，{{ displayName }} <small>侏儒军刀 · 个人工作台</small></h1><p class="wb-mobile-date">{{ dateText }}</p><p v-if="todaySummary" class="wb-summary">{{ todaySummary }}</p></div>
      <div class="wb-heading-actions"><button type="button" class="wb-search-trigger" @click="openSearch">⌕ 搜索应用 <kbd>{{ shortcut }} K</kbd></button><button type="button" :disabled="loading || source === 'unavailable'" :aria-pressed="editing" @click="editing = !editing">{{ editing ? '完成整理' : '☷ 整理工作台' }}</button><button class="wb-primary wb-quick-trigger" type="button" :disabled="loading || !types.length" @click="$emit('create', '')">＋ 快速新增</button></div>
    </header>
    <div v-if="source === 'admin-fallback' && !loading" class="wb-warning" role="status">管理员兜底目录 · 当前账号尚未写入正式授权，建议尽快在权限管理中补齐授权。</div>
    <div v-if="loading" class="wb-glass wb-page-state" role="status">正在读取当前账号的应用权限…</div>
    <div v-else-if="source === 'unavailable'" class="wb-glass wb-page-state" role="alert"><h2>权限不可用</h2><p>应用权限接口当前不可用，请先恢复后端权限服务。</p><button type="button" @click="$emit('retry-permissions')">重新读取权限</button></div>
    <div v-else-if="!tools.length" class="wb-glass wb-page-state"><h2>当前账号暂无可见应用</h2><p>请先在权限管理中完成授权。</p></div>
    <template v-else>
      <div v-if="editing" class="wb-organize"><div><strong>整理工作台</strong><p>用开关显示或隐藏卡片，用 ↑ ↓ 调整顺序。布局只保存在本浏览器，换设备不会同步。</p><p v-if="storageError" role="alert">{{ storageError }}</p></div><button type="button" @click="resetLayout">恢复默认</button></div>
      <div v-if="displayCards.length" class="wb-cards" :class="`wb-count-${displayCards.length}`">
        <section v-for="(card, index) in displayCards" :key="card.key" class="wb-glass wb-card" :class="{'is-hidden': layout.hidden.includes(card.key)}" :data-card="card.key">
          <header class="wb-card-head">
            <span v-if="editing" class="wb-order">{{ index + 1 }}</span><AuthenticatedImage v-if="cardApp(card)?.iconType === 'UPLOAD' && cardApp(card)?.iconAttachmentId" :attachment-id="cardApp(card).iconAttachmentId" alt="" />
            <AppIconImage v-else-if="cardApp(card)?.iconUrl" :src="cardApp(card).iconUrl" :chroma-key="cardApp(card).iconChromaKey" alt="" /><h2>{{ card.title }}</h2>
            <template v-if="editing"><div class="wb-edit-controls"><button type="button" :disabled="index === 0" :aria-label="`上移${card.title}`" @click="move(card.key, -1)">↑</button><button type="button" :disabled="index === displayCards.length - 1" :aria-label="`下移${card.title}`" @click="move(card.key, 1)">↓</button><label><input type="checkbox" :checked="!layout.hidden.includes(card.key)" :aria-label="`显示${card.title}`" @change="toggleCard(card.key)" />显示</label></div></template>
            <button v-else-if="mobile && ['bills', 'health'].includes(card.key)" type="button" class="wb-fold" :aria-label="`${folded[card.key] ? '展开' : '收起'}${card.title}`" :aria-expanded="!folded[card.key]" @click="folded[card.key] = !folded[card.key]">{{ folded[card.key] ? '▸' : '▾' }}</button>
          </header>
          <p v-if="layout.hidden.includes(card.key) && editing" class="wb-fine">此卡片已隐藏，阅读态不会显示。打开开关即可恢复。</p>
          <template v-else>
            <p v-if="mobile && folded[card.key] && !editing" class="wb-fold-summary">{{ foldedSummary(card.key) }}</p>
            <div v-show="!mobile || !folded[card.key] || editing" class="wb-card-content" :inert="editing">
              <component :is="components[card.key]" :refresh-key="refreshKey" @create="$emit('create', $event)" @state="states[card.key] = $event" />
            </div>
          </template>
        </section>
      </div>
      <p v-else-if="authorizedCards.length" class="wb-glass wb-page-state">卡片已全部隐藏，可在「整理工作台」中恢复显示。</p>
      <AppDock :tools="tools" :source="source" :is-mobile-viewport="mobile" @order="$emit('order', $event)" @notice="(...args) => $emit('notice', ...args)" />
    </template>
  </section>
</template>
<script setup>
import {computed, reactive, ref, watch} from 'vue'
import AppIconImage from '@/components/AppIconImage.vue'
import AuthenticatedImage from '@/components/AuthenticatedImage.vue'
import AppDock from './AppDock.vue'
import TodoCard from './TodoCard.vue'
import WorkLogCard from './WorkLogCard.vue'
import BillsCard from './BillsCard.vue'
import HealthCard from './HealthCard.vue'
import {moveWorkbenchCard, normalizeWorkbenchLayout, WORKBENCH_CARDS, WORKBENCH_LAYOUT_KEY} from '@/utils/workbenchLayout'
import {useWorkbenchPreference} from '@/composables/useWorkbenchPreference'
import {money, percent} from '@/utils/workbenchData'
const props = defineProps({loading: Boolean, source: String, featureCodes: {type: Array, default: () => []}, tools: {type: Array, default: () => []}, types: {type: Array, default: () => []}, displayName: String, dateText: String, now: Date, mobile: Boolean, refreshKey: Number})
defineEmits(['create', 'retry-permissions', 'order', 'notice'])
const components = {todo: TodoCard, workLog: WorkLogCard, bills: BillsCard, health: HealthCard}
const editing = ref(false)
const {value: layout, save: saveLayout} = useWorkbenchPreference(WORKBENCH_LAYOUT_KEY, raw => normalizeWorkbenchLayout(JSON.parse(raw)))
const storageError = ref('')
const folded = reactive({bills: true, health: true})
const states = reactive({})
const shortcut = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'
const greeting = computed(() => { const hour = (props.now || new Date()).getHours(); return hour < 6 ? '夜深了' : hour < 12 ? '上午好' : hour < 18 ? '下午好' : '晚上好' })
const authorizedCards = computed(() => layout.value.order.map(key => WORKBENCH_CARDS.find(card => card.key === key)).filter(card => props.featureCodes.includes(card.featureCode)))
const displayCards = computed(() => authorizedCards.value.filter(card => editing.value || !layout.value.hidden.includes(card.key)))
const todaySummary = computed(() => {
  if (props.loading || props.source === 'unavailable') return ''
  const visible = displayCards.value.map(card => card.key)
  if (!visible.includes('todo') || !visible.includes('workLog') || states.todo?.status !== 'ready' || states.workLog?.status !== 'ready') return ''
  const count = states.todo.data.summary?.today
  if (count == null) return ''
  return `今日${Number(count) ? `还有 ${count} 条待办` : '没有待办'}，工作日志${states.workLog.data.todayWritten ? '已写' : '未写'}。`
})
watch(() => props.loading, () => { Object.keys(states).forEach(key => delete states[key]) })
function save(next) { storageError.value = saveLayout(next) ? '' : '浏览器暂不允许保存布局，本次调整仅在当前页面生效。' }
function move(key, direction) { save(moveWorkbenchCard(layout.value, key, direction, authorizedCards.value.map(card => card.key))) }
function toggleCard(key) { save({...layout.value, hidden: layout.value.hidden.includes(key) ? layout.value.hidden.filter(item => item !== key) : [...layout.value.hidden, key]}); delete states[key] }
function resetLayout() { save(normalizeWorkbenchLayout()) }
function openSearch() { window.dispatchEvent(new Event('gak:open-command')) }
function cardApp(card) { return props.tools.find(tool => tool.featureCode === card.featureCode) }
function foldedSummary(key) {
  const state = states[key]
  if (!state || state.status === 'loading') return '正在加载…'
  if (state.status === 'error') return '加载失败，展开后可重试'
  const data = state.data
  return key === 'bills' ? `支出 ${money(data.currentMonthExpense)} · 收入 ${money(data.currentMonthIncome)} · 预算 ${Number(data.annualBudgetAmount) > 0 ? percent(data.annualBudgetUsageRate) : '未设置'}`
    : `最近测量 ${data.latestMeasureDate || '暂无'} · 就诊 ${data.lastVisitDate || '暂无'} · 报告 ${data.lastExamDate || '暂无'}`
}
</script>
<style src="./workbench.css"></style>
