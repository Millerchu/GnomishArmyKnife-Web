<template>
  <MacDialog :model-value="true" title="系统日志详情" subtitle="发生时间均为北京时间" width="680px" panel-class="system-log-detail-drawer" mobile-presentation="fullScreen" :dirty="false" close-on-mask @update:model-value="emit('close')">
    <div class="system-log-detail-content" :aria-busy="loading">
      <p v-if="loading" role="status">正在加载日志详情…</p>
      <MacEmptyState v-else-if="missing" title="该日志已不存在" description="可关闭详情并刷新列表。"><button type="button" @click="emit('refresh')">关闭并刷新列表</button></MacEmptyState>
      <MacEmptyState v-else-if="failed" title="日志详情加载失败，请重试" description="已加载的列表不受影响。"><button type="button" @click="loadDetail">重试</button></MacEmptyState>
      <template v-else-if="detail">
        <dl class="system-log-detail-fields">
          <div><dt>发生时间（北京时间）</dt><dd>{{ formatSystemLogTime(detail.occurredAt) }}</dd></div>
          <div><dt>来源</dt><dd>{{ systemLogSourceLabel(detail.source) }}</dd></div>
          <div class="wide"><dt>异常类型</dt><dd>{{ detail.exceptionType || '—' }}</dd></div>
          <div><dt>请求方法</dt><dd>{{ detail.httpMethod || '—' }}</dd></div>
          <div><dt>路径</dt><dd>{{ detail.requestPath || '—' }}</dd></div>
          <div class="wide"><dt>追踪编号</dt><dd>{{ detail.traceId || '—' }}</dd></div>
          <div class="wide"><dt>脱敏摘要</dt><dd>{{ detail.summary || '—' }}</dd></div>
        </dl>
        <section class="system-log-stack" aria-label="异常堆栈">
          <div class="system-log-stack-heading"><h4>堆栈</h4><div>
            <button type="button" :disabled="!hasStack" :aria-expanded="expanded" aria-controls="system-log-stack-text" @click="expanded = !expanded">{{ expanded ? '收起' : '展开' }}</button>
            <button type="button" :disabled="!hasStack || copying" @click="copyStack">复制堆栈</button>
          </div></div>
          <p v-if="detail.stackTruncated === true" class="system-log-truncated">堆栈已截断，仅展示已保存内容</p>
          <pre v-if="hasStack" id="system-log-stack-text" :class="{expanded}" tabindex="0">{{ detail.stackTrace }}</pre>
          <p v-else>无可展示的堆栈</p>
          <p v-if="copyMessage" role="status">{{ copyMessage }}</p>
        </section>
      </template>
    </div>
    <template #footer><button type="button" @click="emit('close')">关闭</button></template>
  </MacDialog>
</template>

<script setup>
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import MacDialog from '@/components/MacDialog.vue'
import MacEmptyState from '@/components/MacEmptyState.vue'
import {getSystemLog} from '@/api/systemLog'
import {formatSystemLogTime, readSystemLogResponse, systemLogErrorCode, systemLogSourceLabel} from '@/utils/systemLog'

const props = defineProps({id: {type: String, required: true}, returnFocus: {type: Object, default: null}})
const emit = defineEmits(['close', 'refresh', 'forbidden'])
const detail = ref(null)
const loading = ref(true)
const missing = ref(false)
const failed = ref(false)
const expanded = ref(false)
const copying = ref(false)
const copyMessage = ref('')
const hasStack = computed(() => Boolean(detail.value?.stackTrace?.trim()))
let sequence = 0
let oldBodyOverflow = ''
let oldRootOverflow = ''
let mounted = false

async function loadDetail() {
  const current = ++sequence
  detail.value = null
  loading.value = true
  missing.value = false
  failed.value = false
  expanded.value = false
  copying.value = false
  copyMessage.value = ''
  try {
    const data = readSystemLogResponse(await getSystemLog(props.id))
    if (current === sequence) detail.value = data
  } catch (error) {
    if (current !== sequence) return
    const code = systemLogErrorCode(error)
    if (code === '403') emit('forbidden')
    else if (code === '404') missing.value = true
    else failed.value = true
  } finally {
    if (current === sequence) loading.value = false
  }
}

async function copyStack() {
  if (!hasStack.value || copying.value) return
  const current = sequence
  copying.value = true
  copyMessage.value = ''
  try {
    await navigator.clipboard.writeText(detail.value.stackTrace)
    if (current === sequence) copyMessage.value = '已复制'
  } catch {
    if (current === sequence) copyMessage.value = '复制失败，请选中文本手动复制'
  } finally {
    if (current === sequence) copying.value = false
  }
}

function panel() { return document.querySelector('.system-log-detail-drawer') }
function trapFocus(event) {
  const drawer = panel()
  if (event.key !== 'Tab' || !drawer) return
  // 仅抽屉中可见的关闭控件、内容和底栏参加焦点循环。
  const controls = [...drawer.querySelectorAll('.close:not(:disabled), .system-log-detail-content button:not(:disabled), pre[tabindex], .mac-dialog-actions button')]
  const first = controls[0] || drawer
  const last = controls.at(-1) || drawer
  if (event.shiftKey && (document.activeElement === first || document.activeElement === drawer || !drawer.contains(document.activeElement))) {
    event.preventDefault(); last.focus()
  } else if (!event.shiftKey && (document.activeElement === last || !drawer.contains(document.activeElement))) {
    event.preventDefault(); first.focus()
  }
}
function keepFocusInside(event) {
  const drawer = panel()
  if (drawer && !drawer.contains(event.target)) drawer.focus()
}

watch(() => props.id, loadDetail, {immediate: true})
onMounted(async () => {
  mounted = true
  oldBodyOverflow = document.body.style.overflow
  oldRootOverflow = document.documentElement.style.overflow
  document.body.style.overflow = 'hidden'
  document.documentElement.style.overflow = 'hidden'
  document.addEventListener('keydown', trapFocus)
  document.addEventListener('focusin', keepFocusInside)
  await nextTick()
  if (mounted) panel()?.focus()
})
onBeforeUnmount(() => {
  mounted = false
  sequence++
  document.removeEventListener('keydown', trapFocus)
  document.removeEventListener('focusin', keepFocusInside)
  document.body.style.overflow = oldBodyOverflow
  document.documentElement.style.overflow = oldRootOverflow
  const trigger = props.returnFocus
  nextTick(() => {
    if (trigger?.isConnected && !trigger.disabled) trigger.focus()
    else document.querySelector('.system-log-page nav a')?.focus()
  })
})
</script>

<style>
/* 仅调整此详情实例的布局；MacDialog 的主题、遮罩和关闭行为继续复用。 */
.mac-dialog-mask.mobile-presentation-full-screen:has(> .mac-dialog-panel.system-log-detail-drawer) { padding: 0; justify-content: flex-end; overscroll-behavior: contain; }
.mac-dialog-mask > .mac-dialog-panel.system-log-detail-drawer.mobile-presentation-full-screen { box-sizing: border-box; height: 100dvh; max-height: 100dvh; width: min(680px, 100vw) !important; max-width: 100vw !important; margin: 0; border-radius: 20px 0 0 20px; transform: none !important; }
.system-log-detail-drawer .mac-dialog-head { cursor: default; }
.system-log-detail-drawer .mac-window-dot.minimize, .system-log-detail-drawer .mac-window-dot.zoom { display: none; }
.system-log-detail-drawer .mac-dialog-body { overscroll-behavior: contain; }
.system-log-detail-drawer button { min-height: 40px; padding: 8px 14px; border: 1px solid var(--theme-border-strong); border-radius: 12px; color: var(--theme-text); background: var(--theme-surface-raised); cursor: pointer; font: inherit; }
.system-log-detail-drawer .mac-window-dot { padding: 0; border: 0; background: transparent; }
.system-log-detail-drawer button:disabled { opacity: .5; cursor: not-allowed; }
.system-log-detail-drawer:focus-visible, .system-log-detail-drawer button:focus-visible, .system-log-detail-drawer pre:focus-visible { outline: 3px solid var(--theme-focus-ring); outline-offset: -3px; }
.system-log-detail-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px 18px; margin: 0 0 28px; }
.system-log-detail-fields .wide { grid-column: 1 / -1; }
.system-log-detail-fields dt { margin-bottom: 7px; color: var(--theme-text-muted); font-size: 12px; }
.system-log-detail-fields dd { margin: 0; overflow-wrap: anywhere; white-space: pre-wrap; user-select: text; line-height: 1.65; }
.system-log-stack-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.system-log-stack-heading h4 { margin: 0; }
.system-log-stack-heading > div { display: flex; flex-wrap: wrap; gap: 8px; }
.system-log-stack pre { max-height: 220px; overflow: auto; overscroll-behavior: contain; padding: 16px; border: 1px solid var(--theme-border); border-radius: 12px; background: var(--theme-surface-muted); color: var(--theme-text); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12px; line-height: 1.7; white-space: pre; user-select: text; }
.system-log-stack pre.expanded { max-height: 65dvh; }
.system-log-truncated { color: var(--theme-text-muted); font-size: 13px; }
@media (max-width: 720px) { .mac-dialog-mask > .mac-dialog-panel.system-log-detail-drawer.mobile-presentation-full-screen { border-radius: 0; width: 100vw !important; } .system-log-detail-fields { grid-template-columns: 1fr; } }
</style>
